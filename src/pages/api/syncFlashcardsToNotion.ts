import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

// Increase body size limit to handle grouped text and optional images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

// Notion API tokens for each user
const NOTION_TOKENS: Record<string, string | undefined> = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Main course page IDs for each user
const COURSE_PAGE_IDS: Record<string, string | undefined> = {
  'David': process.env.NOTION_COURSE_PAGE_DAVID,
  'Albin': process.env.NOTION_COURSE_PAGE_ALBIN,
  'Mattias': process.env.NOTION_COURSE_PAGE_MATTIAS
};

interface FlashcardGroup {
  id: string;
  question: string;
  pages: {
    pageNumber: number;
    textContent: string;
    imageDataUrl?: string;
  }[];
  summary: string;
}

interface SyncFlashcardsRequest {
  selectedLecture: {
    title: string;
    lectureNumber: number;
    course: string;
  };
  flashcardGroups: FlashcardGroup[];
  user: string;
  // Optional flags to control behavior
  mode?: 'text-only' | 'full';
  dryRun?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { selectedLecture, flashcardGroups, user, mode = 'full', dryRun = false }: SyncFlashcardsRequest = req.body;

    console.log('🎯 Syncing flashcards to Notion:', {
      lecture: `${selectedLecture.lectureNumber}. ${selectedLecture.title}`,
      groups: flashcardGroups.length,
      user,
      mode,
      dryRun
    });

    // Validate required fields
    if (!selectedLecture?.title || !flashcardGroups || flashcardGroups.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: selectedLecture.title and flashcardGroups'
      });
    }

    // Check if we have any valid configuration
    const hasAnyConfig = Object.values(NOTION_TOKENS).some(token => !!token) && 
                        Object.values(COURSE_PAGE_IDS).some(pageId => !!pageId);

    if (!hasAnyConfig) {
      console.error('❌ No Notion configuration found');
      return res.status(500).json({
        success: false,
        message: 'Notion integration not configured - missing NOTION_TOKEN_* and NOTION_COURSE_PAGE_* environment variables'
      });
    }

    const results: any[] = [];
    const configuredUsers = Object.keys(NOTION_TOKENS).filter(userName => 
      NOTION_TOKENS[userName] && COURSE_PAGE_IDS[userName]
    );

    console.log(`🎯 Processing for users: ${configuredUsers.join(', ')}`);

    // Helper: extract the title string regardless of database title property name
    const extractTitleFromProperties = (properties: any): string => {
      if (!properties) return '';
      // Find the title property dynamically
      for (const key of Object.keys(properties)) {
        const prop = properties[key];
        if (prop && prop.type === 'title') {
          const content = prop.title?.map((t: any) => t?.plain_text ?? t?.text?.content ?? '').join('');
          if (content) return content;
        }
      }
      // Fallback to common names
      const common = properties['Föreläsning']?.title?.[0]?.text?.content
        || properties['title']?.title?.[0]?.text?.content
        || '';
      return common;
    };

    // Helper: find the lecture page either by search or by querying the database on the course page
    const findLecturePageForUser = async (notion: Client, userName: string, lectureTitle: string, logs: string[]) => {
      logs.push(`🔍 Searching for lecture page: "${lectureTitle}"`);
      const searchResponse = await notion.search({
        query: lectureTitle,
        filter: { property: 'object', value: 'page' },
        page_size: 25
      });

      for (const page of searchResponse.results as any[]) {
        const title = extractTitleFromProperties((page as any).properties);
        if (title === lectureTitle) {
          logs.push(`✅ Found exact match in search: "${title}"`);
          return page as any;
        }
      }

      logs.push('⚠️ No exact match from search. Falling back to database query on the course page...');
      const coursePageId = COURSE_PAGE_IDS[userName]!;
      const children = await notion.blocks.children.list({ block_id: coursePageId });
      const databases = (children.results as any[]).filter((b) => (b as any).type === 'child_database');
      if (databases.length === 0) {
        logs.push('❌ No child databases found on the course page');
        return null;
      }

      for (const db of databases) {
        const dbId = (db as any).id;
        const dbInfo = await notion.databases.retrieve({ database_id: dbId });
        // Determine the title property name
        const titlePropName = Object.entries<any>(dbInfo.properties).find(([, v]) => (v as any).type === 'title')?.[0] as string | undefined;
        if (!titlePropName) continue;
        logs.push(`📚 Querying DB ${dbId} with title property "${titlePropName}"`);
        const q = await notion.databases.query({
          database_id: dbId,
          filter: { property: titlePropName, title: { equals: lectureTitle } },
          page_size: 5
        });
        if (q.results.length > 0) {
          logs.push(`✅ Found lecture page in database ${dbId}`);
          return q.results[0] as any;
        }
      }

      logs.push('❌ Lecture page not found in any database');
      return null;
    };

    for (const userName of configuredUsers) {
      try {
        const notion = new Client({ auth: NOTION_TOKENS[userName]! });
        const pageId = COURSE_PAGE_IDS[userName]!;
        
        console.log(`📊 Processing for ${userName} with page ID: ${pageId}`);
        const logs: string[] = [];
        
        // Get the course page
        const coursePage = await notion.pages.retrieve({ page_id: pageId });
        logs.push(`✅ Found course page for ${userName}`);
        
        // Find the lecture page by matching the title
        const lectureTitle = `${selectedLecture.lectureNumber}. ${selectedLecture.title}`;
        let lecturePage = await findLecturePageForUser(notion, userName, lectureTitle, logs);

        if (!lecturePage) {
          console.log(`❌ No lecture page found for: "${lectureTitle}"`);
          results.push({
            user: userName,
            success: false,
            error: `Lecture page not found: ${lectureTitle}`,
            logs
          });
          continue;
        }

        // Build toggle blocks: toggle title is the question; body contains summary, text, and optionally images
        const buildBlocks = async (): Promise<any[]> => {
          const blocks: any[] = [];
          const baseProto = (req.headers['x-forwarded-proto'] as string) || 'https';
          const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
          const baseUrl = `${baseProto}://${host}`;
          for (const group of flashcardGroups) {
            const children: any[] = [];
            // Per-page content: only extracted text (and optional image), no headings or summary
            for (const page of group.pages) {
              children.push({
                object: 'block',
                type: 'paragraph',
                paragraph: { rich_text: [{ type: 'text', text: { content: page.textContent } }] }
              });
              if (mode === 'full') {
                try {
                  let externalUrl: string | null = null;
                  if ((page as any).imageUrl) {
                    externalUrl = (page as any).imageUrl as string;
                    logs.push(`🖼️ Using pre-uploaded image URL`);
                  } else if (page.imageDataUrl && page.imageDataUrl.startsWith('data:image/')) {
                    // Skip in development where base is localhost; Notion requires public URL
                    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                      logs.push('Skipping image upload (localhost) – Notion kräver publik URL');
                    } else {
                      const storeUrl = `${baseUrl}/.netlify/functions/storeImage`;
                    const storeResp = await fetch(storeUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ imageDataUrl: page.imageDataUrl })
                    });
                    if (storeResp.ok) {
                      const { url } = await storeResp.json();
                      if (url) externalUrl = url;
                    } else {
                      const txt = await storeResp.text();
                      logs.push(`⚠️ Image store failed: ${storeResp.status} ${txt.slice(0,120)}`);
                    }
                    }
                  }
                  // Notion requires a fully-qualified, publicly accessible URL
                  if (externalUrl && /^https?:\/\//i.test(externalUrl)) {
                    children.push({ object: 'block', type: 'image', image: { type: 'external', external: { url: externalUrl } } });
                  } else if (externalUrl) {
                    logs.push(`⚠️ Skipping image: not a valid absolute URL → ${externalUrl}`);
                  }
                } catch (imgErr: any) {
                  logs.push(`⚠️ Image store exception: ${imgErr?.message || String(imgErr)}`);
                }
              }
            }
            blocks.push({
              object: 'block',
              type: 'toggle',
              toggle: { rich_text: [{ type: 'text', text: { content: `${group.question}` } }], children }
            });
          }
          return blocks;
        };

        if (!dryRun) {
          const blocks = await buildBlocks();
          logs.push(`🧱 Prepared ${blocks.length} toggle blocks`);
          // Notion limits append to 100 children per request
          const BATCH_SIZE = 90;
          for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
            const batch = blocks.slice(i, i + BATCH_SIZE);
            try {
              await notion.blocks.children.append({
                block_id: (lecturePage as any).id,
                children: batch as any
              });
              logs.push(`✅ Appended batch ${i / BATCH_SIZE + 1} (${batch.length} blocks)`);
            } catch (appendErr: any) {
              logs.push(`💥 Append error: ${appendErr?.body ? JSON.stringify(appendErr.body) : appendErr?.message || String(appendErr)}`);
              throw appendErr;
            }
          }
        } else {
          logs.push('🧪 Dry run enabled – not appending to Notion');
        }

        results.push({
          user: userName,
          success: true,
          lectureTitle,
          groupsAdded: flashcardGroups.length,
          blocksAdded: dryRun ? 0 : flashcardGroups.length,
          logs
        });

      } catch (error) {
        console.error(`❌ Error for ${userName}:`, error);
        results.push({
          user: userName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulUpdates = results.filter(r => r.success).length;
    const failedUpdates = results.filter(r => !r.success).length;

    const response = {
      success: successfulUpdates > 0,
      message: successfulUpdates === configuredUsers.length 
        ? 'Flashcards synced to all Notion pages successfully' 
        : `${successfulUpdates}/${configuredUsers.length} Notion pages updated`,
      results,
      summary: {
        successfulUpdates,
        failedUpdates,
        totalGroups: flashcardGroups.length
      }
    };

    console.log(`📊 Flashcard sync summary:`, response.summary);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in flashcard sync:', error);
    
    return res.status(500).json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      results: []
    });
  }
}
