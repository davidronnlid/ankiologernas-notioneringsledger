import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

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
    imageDataUrl: string;
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { selectedLecture, flashcardGroups, user }: SyncFlashcardsRequest = req.body;

    console.log('🎯 Syncing flashcards to Notion:', {
      lecture: `${selectedLecture.lectureNumber}. ${selectedLecture.title}`,
      groups: flashcardGroups.length,
      user
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

    const results = [];
    const configuredUsers = Object.keys(NOTION_TOKENS).filter(userName => 
      NOTION_TOKENS[userName] && COURSE_PAGE_IDS[userName]
    );

    console.log(`🎯 Processing for users: ${configuredUsers.join(', ')}`);

    for (const userName of configuredUsers) {
      try {
        const notion = new Client({ auth: NOTION_TOKENS[userName]! });
        const pageId = COURSE_PAGE_IDS[userName]!;
        
        console.log(`📊 Processing for ${userName} with page ID: ${pageId}`);
        
        // Get the course page
        const coursePage = await notion.pages.retrieve({ page_id: pageId });
        console.log(`✅ Found course page for ${userName}`);
        
        // Find the lecture page by matching the title
        const lectureTitle = `${selectedLecture.lectureNumber}. ${selectedLecture.title}`;
        console.log(`🔍 Searching for lecture page: "${lectureTitle}"`);
        
        // Search for pages with the lecture title
        const searchResponse = await notion.search({
          query: lectureTitle,
          filter: {
            property: 'object',
            value: 'page'
          },
          page_size: 10
        });

        let lecturePage = null;
        
        // Look for exact title match in search results
        for (const page of searchResponse.results as any[]) {
          const pageTitle = (page as any).properties?.title?.title?.[0]?.text?.content || '';
          if (pageTitle === lectureTitle) {
            lecturePage = page;
            console.log(`✅ Found exact match for lecture: "${lectureTitle}"`);
            break;
          }
        }

        if (!lecturePage) {
          console.log(`❌ No lecture page found for: "${lectureTitle}"`);
          results.push({
            user: userName,
            success: false,
            error: `Lecture page not found: ${lectureTitle}`
          });
          continue;
        }

        // Add flashcard content to the lecture page
        console.log(`📝 Adding ${flashcardGroups.length} flashcard groups to lecture page`);
        
        // Get existing blocks to append to
        const existingBlocks = await notion.blocks.children.list({
          block_id: (lecturePage as any).id
        });

        // Create flashcard content blocks
        const flashcardBlocks: any[] = [];
        
        for (const group of flashcardGroups) {
          // Add group header
          flashcardBlocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `📋 ${group.question}`
                  }
                }
              ]
            }
          });

          // Add summary
          flashcardBlocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: group.summary,
                    annotations: {
                      italic: true,
                      color: 'gray'
                    }
                  }
                }
              ]
            }
          });

          // Add extracted text for each page
          for (const page of group.pages) {
            flashcardBlocks.push({
              object: 'block',
              type: 'heading_3',
              heading_3: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: `📄 Sida ${page.pageNumber} - Extraherad text`
                    }
                  }
                ]
              }
            });

            flashcardBlocks.push({
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: page.textContent
                    }
                  }
                ]
              }
            });

            // Add page image (if available)
            if (page.imageDataUrl) {
              // Convert data URL to base64
              const base64Data = page.imageDataUrl.split(',')[1];
              if (base64Data) {
                flashcardBlocks.push({
                  object: 'block',
                  type: 'image',
                  image: {
                    type: 'external',
                    external: {
                      url: `data:image/png;base64,${base64Data}`
                    }
                  }
                });
              }
            }
          }

          // Add separator between groups
          flashcardBlocks.push({
            object: 'block',
            type: 'divider',
            divider: {}
          });
        }

        // Append flashcard blocks to the lecture page
        if (flashcardBlocks.length > 0) {
          await notion.blocks.children.append({
            block_id: (lecturePage as any).id,
            children: flashcardBlocks as any
          });
          
          console.log(`✅ Successfully added ${flashcardBlocks.length} blocks to lecture page`);
        }

        results.push({
          user: userName,
          success: true,
          lectureTitle,
          groupsAdded: flashcardGroups.length,
          blocksAdded: flashcardBlocks.length
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
