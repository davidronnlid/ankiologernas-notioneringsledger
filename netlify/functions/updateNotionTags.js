const { Client } = require('@notionhq/client');

// Notion API tokens for each user (store in environment variables)
const NOTION_TOKENS = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Course page IDs for each user (these contain the databases)
const COURSE_PAGE_IDS = {
  'David': process.env.NOTION_COURSE_PAGE_DAVID,
  'Albin': process.env.NOTION_COURSE_PAGE_ALBIN,
  'Mattias': process.env.NOTION_COURSE_PAGE_MATTIAS
};

// User name to letter mapping
const USER_LETTERS = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

// Helper function to find or create database within a course page
async function findOrCreateDatabase(notion, coursePageId, userName) {
  try {
    // Get all blocks from the course page
    const blocks = await notion.blocks.children.list({
      block_id: coursePageId
    });

    // Look for existing database
    const existingDatabase = blocks.results.find(block => 
      block.type === 'child_database'
    );

    if (existingDatabase) {
      console.log(`✅ Found existing database in ${userName}'s course page`);
      return existingDatabase.id;
    }

    // Create new INLINE database on the page
    console.log(`📊 Creating new INLINE database in ${userName}'s course page`);
    const database = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: coursePageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Klinisk medicin 4 - Föreläsningar'
          }
        }
      ],
      properties: {
        'Name': {
          title: {}
        },
        'Föreläsning': {
          rich_text: {}
        },
        'Vems': {
          rich_text: {}
        },
        'Subject area': {
          select: {
            options: [
              { name: 'Global hälsa', color: 'blue' },
              { name: 'Geriatrik', color: 'orange' },
              { name: 'Öron-Näsa-Hals', color: 'yellow' },
              { name: 'Pediatrik', color: 'green' },
              { name: 'Oftalmologi', color: 'purple' },
              { name: 'Gynekologi & Obstetrik', color: 'pink' }
            ]
          }
        },
        'Person': {
          select: {
            options: [
              { name: 'D', color: 'red' },
              { name: 'A', color: 'green' },
              { name: 'M', color: 'yellow' }
            ]
          }
        },
        'Status': {
          select: {
            options: [
              { name: 'Bör göra', color: 'default' },
              { name: 'Ej ankiz', color: 'gray' },
              { name: 'Blå ankiz', color: 'blue' }
            ]
          }
        }
      },
      // CRITICAL: This ensures the database is created INLINE within the page
      is_inline: true
    });

    console.log(`✅ Created new database in ${userName}'s course page with ID: ${database.id}`);
    return database.id;
    
  } catch (error) {
    console.error(`❌ Failed to find/create database in ${userName}'s course page:`, error);
    throw error;
  }
}

// Helper function to create a new lecture page
async function createLecturePage(notion, databaseId, lectureTitle, lectureNumber, selectedByUser, action) {
  const userLetter = USER_LETTERS[selectedByUser];
  const initialVems = action === 'select' ? [userLetter] : [];
  
  try {
    const newPage = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Name': {
          title: [
            {
              text: {
                content: `${lectureNumber}. ${lectureTitle}`
              }
            }
          ]
        },
        'Föreläsning': {
          rich_text: [
            {
              text: {
                content: lectureTitle
              }
            }
          ]
        },
        'Vems': {
          rich_text: [
            {
              text: {
                content: initialVems.join(', ')
              }
            }
          ]
        }
      }
    });
    
    console.log(`✅ Created new lecture page: ${lectureTitle}`);
    return newPage;
  } catch (error) {
    console.error(`❌ Failed to create lecture page: ${lectureTitle}`, error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { lectureTitle, lectureNumber, selectedByUser, action } = JSON.parse(event.body);
    
    console.log(`🎯 Notion update request: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle}`);

    // Validate required fields
    if (!lectureTitle || !lectureNumber || !selectedByUser || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: lectureTitle, lectureNumber, selectedByUser, action' 
        })
      };
    }

    const userLetter = USER_LETTERS[selectedByUser];
    if (!userLetter) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `Unknown user: ${selectedByUser}. Expected David, Albin, or Mattias` 
        })
      };
    }

    // Update all three users' Notion databases
    const updateResults = [];
    
    for (const [userName, token] of Object.entries(NOTION_TOKENS)) {
      if (!token || !COURSE_PAGE_IDS[userName]) {
        console.warn(`⚠️ Missing Notion config for ${userName}`);
        updateResults.push({
          user: userName,
          success: false,
          error: 'Missing Notion configuration'
        });
        continue;
      }

      try {
        const notion = new Client({ auth: token });
        const coursePageId = COURSE_PAGE_IDS[userName];

        // Find or create the database within the course page
        const databaseId = await findOrCreateDatabase(notion, coursePageId, userName);

        // Search for the lecture in this user's database
        const response = await notion.databases.query({
          database_id: databaseId,
          filter: {
            or: [
              {
                property: 'Name',
                title: {
                  contains: lectureTitle
                }
              },
              {
                property: 'Name', 
                title: {
                  contains: `${lectureNumber}.`
                }
              },
              {
                property: 'Föreläsning',
                rich_text: {
                  contains: lectureTitle
                }
              }
            ]
          }
        });

        let pagesToUpdate = response.results;

        // If no matching lecture found, create a new one
        if (pagesToUpdate.length === 0) {
          console.log(`📝 Creating new lecture page in ${userName}'s database: ${lectureNumber}. ${lectureTitle}`);
          const newPage = await createLecturePage(notion, databaseId, lectureTitle, lectureNumber, selectedByUser, action);
          pagesToUpdate = [newPage];
        }

        // Update each matching page
        for (const page of pagesToUpdate) {
          const pageId = page.id;
          
          // Get current Vems tags
          const currentVemsText = page.properties.Vems?.rich_text?.[0]?.plain_text || '';
          const currentVemsNames = currentVemsText ? currentVemsText.split(', ') : [];
          
          let newVems = [...currentVemsNames];
          
          if (action === 'select') {
            // Add user letter if not already present
            if (!currentVemsNames.includes(userLetter)) {
              newVems.push(userLetter);
            }
          } else if (action === 'unselect') {
            // Remove user letter if present
            newVems = newVems.filter(letter => letter !== userLetter);
          }

          // Update the page with new Vems tags
          await notion.pages.update({
            page_id: pageId,
            properties: {
              'Vems': {
                rich_text: [
                  {
                    text: {
                      content: newVems.join(', ')
                }
                  }
                ]
              }
            }
          });

          console.log(`✅ Updated ${userName}'s Notion: ${lectureTitle} -> Vems: [${newVems.join(', ')}]`);
        }

        updateResults.push({
          user: userName,
          success: true,
          pagesUpdated: pagesToUpdate.length,
          created: response.results.length === 0 ? 1 : 0
        });

      } catch (userError) {
        console.error(`❌ Error updating ${userName}'s Notion:`, userError);
        updateResults.push({
          user: userName,
          success: false,
          error: userError.message
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: `Notion update completed for lecture: ${lectureTitle}`,
        results: updateResults,
        summary: {
          successfulUpdates: updateResults.filter(r => r.success).length,
          failedUpdates: updateResults.filter(r => !r.success).length,
          pagesCreated: updateResults.reduce((sum, r) => sum + (r.created || 0), 0)
        }
      })
    };

  } catch (error) {
    console.error('❌ Notion update error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      })
    };
  }
}; 