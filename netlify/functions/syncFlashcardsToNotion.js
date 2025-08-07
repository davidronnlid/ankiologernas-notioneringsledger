const { Client } = require('@notionhq/client');

// Notion API tokens for each user
const NOTION_TOKENS = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Main course page IDs for each user
const COURSE_PAGE_IDS = {
  'David': process.env.NOTION_COURSE_PAGE_DAVID,
  'Albin': process.env.NOTION_COURSE_PAGE_ALBIN,
  'Mattias': process.env.NOTION_COURSE_PAGE_MATTIAS
};

// Extract title from a Notion page result regardless of title property name
function extractPageTitle(page) {
  try {
    const props = page.properties || {};
    // Common cases: 'title' or 'Föreläsning'
    const candidates = [props.title, props['Föreläsning'], ...Object.values(props)];
    for (const prop of candidates) {
      if (prop && prop.type === 'title' && Array.isArray(prop.title) && prop.title[0]?.text?.content) {
        return prop.title[0].text.content;
      }
    }
  } catch {}
  return '';
}

async function getCourseDatabaseId(notion, coursePageId) {
  try {
    const blocks = await notion.blocks.children.list({ block_id: coursePageId });
    const dbBlock = blocks.results.find((b) => b.type === 'child_database');
    return dbBlock?.id || null;
  } catch (e) {
    console.warn('Could not get course database id:', e?.message || e);
    return null;
  }
}

exports.handler = async (event, context) => {
  console.log('syncFlashcardsToNotion invoked', {
    hasBody: !!event.body,
    bodyLen: event.body ? event.body.length : 0,
  });
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { selectedLecture, flashcardGroups, user } = JSON.parse(event.body);

    console.log('🎯 Syncing flashcards to Notion:', {
      lecture: `${selectedLecture.lectureNumber}. ${selectedLecture.title}`,
      groups: flashcardGroups.length,
      user
    });

    // Validate required fields
    if (!selectedLecture?.title || !flashcardGroups || flashcardGroups.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: selectedLecture.title and flashcardGroups'
        })
      };
    }

    // Check if we have any valid configuration
    const hasAnyConfig = Object.values(NOTION_TOKENS).some(token => !!token) && 
                        Object.values(COURSE_PAGE_IDS).some(pageId => !!pageId);

    if (!hasAnyConfig) {
      console.error('❌ No Notion configuration found');
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: 'Notion integration not configured - missing NOTION_TOKEN_* and NOTION_COURSE_PAGE_* environment variables'
        })
      };
    }

    const results = [];
    const configuredUsers = Object.keys(NOTION_TOKENS).filter(userName => 
      NOTION_TOKENS[userName] && COURSE_PAGE_IDS[userName]
    );

    console.log(`🎯 Processing for users: ${configuredUsers.join(', ')}`);

    for (const userName of configuredUsers) {
      try {
        const notion = new Client({ auth: NOTION_TOKENS[userName] });
        const pageId = COURSE_PAGE_IDS[userName];
        
        console.log(`📊 Processing for ${userName} with page ID: ${pageId}`);
        
        // Get the course page
        const coursePage = await notion.pages.retrieve({ page_id: pageId });
        console.log(`✅ Found course page for ${userName}`);
        
        // Find the lecture page by matching the title
        const lectureTitle = `${selectedLecture.lectureNumber}. ${selectedLecture.title}`;
        console.log(`🔍 Searching for lecture page: "${lectureTitle}"`);
        
        // Search for pages with the lecture title (workspace-wide)
        const searchResponse = await notion.search({ query: lectureTitle, filter: { property: 'object', value: 'page' }, page_size: 25 });

        let lecturePage = null;
        
        // Look for exact title match in search results (supports DB title prop)
        for (const page of searchResponse.results) {
          const pageTitle = extractPageTitle(page);
          if (pageTitle === lectureTitle) {
            lecturePage = page;
            console.log(`✅ Found exact match for lecture in search: "${lectureTitle}"`);
            break;
          }
        }

        // If still not found, try querying the course database directly
        if (!lecturePage) {
          const databaseId = await getCourseDatabaseId(notion, pageId);
          if (databaseId) {
            const dbQuery = await notion.databases.query({
              database_id: databaseId,
              filter: { property: 'Föreläsning', title: { equals: lectureTitle } },
              page_size: 1,
            });
            if (dbQuery.results && dbQuery.results[0]) {
              lecturePage = dbQuery.results[0];
              console.log(`✅ Found exact match for lecture in database query: "${lectureTitle}"`);
            }
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
          block_id: lecturePage.id
        });

        // Create flashcard content blocks
        const flashcardBlocks = [];
        
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

          // Add summary (fix annotations placement)
          flashcardBlocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: group.summary
                  },
                  annotations: {
                    italic: true,
                    color: 'gray'
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

            // Persist image to MongoDB (via Netlify function) and add image block with external URL
            try {
              if (page.imageDataUrl && typeof page.imageDataUrl === 'string' && page.imageDataUrl.startsWith('data:image/')) {
                const host = (event.headers && (event.headers['x-forwarded-host'] || event.headers.host)) || '';
                const base = process.env.URL || (host ? `https://${host}` : null);
                const storeUrl = base ? `${base}/.netlify/functions/storeImage` : null;
                if (!storeUrl) {
                  console.warn('No base URL available for storeImage; skipping image upload');
                } else {
                  const storeResp = await fetch(storeUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageDataUrl: page.imageDataUrl })
                  });
                  if (storeResp.ok) {
                    const { url } = await storeResp.json();
                    if (url) {
                      flashcardBlocks.push({
                        object: 'block',
                        type: 'image',
                        image: {
                          type: 'external',
                          external: { url }
                        }
                      });
                    }
                  } else {
                    console.warn('storeImage failed with status', storeResp.status);
                  }
                }
              }
            } catch (imgErr) {
              console.warn('Image store failed; continuing without image:', imgErr);
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
          try {
            await notion.blocks.children.append({ block_id: lecturePage.id, children: flashcardBlocks });
          } catch (appendErr) {
            console.error('Append blocks error:', appendErr?.body || appendErr?.message || appendErr);
            throw appendErr;
          }
          
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
          error: error.message
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

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Error in flashcard sync:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Server error: ${error.message}`,
        results: []
      })
    };
  }
};
