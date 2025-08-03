const { Client } = require('@notionhq/client');

// Notion API tokens for each user (store in environment variables)
const NOTION_TOKENS = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Main course page IDs for each user (these will be the "Klinisk medicin 4" pages)
const COURSE_PAGE_IDS = {
  'David': process.env.NOTION_COURSE_PAGE_DAVID,
  'Albin': process.env.NOTION_COURSE_PAGE_ALBIN,
  'Mattias': process.env.NOTION_COURSE_PAGE_MATTIAS
};

// User name to letter mapping for tracking
const USER_LETTERS = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M',
  'System': '' // For bulk operations, no user letter needed
};

// Subject area emojis for better visual organization
const SUBJECT_AREA_EMOJIS = {
  'Pediatrik': '👶',
  'Geriatrik': '👴',
  'Global hälsa': '🌍',
  'Öron-Näsa-Hals': '👂',
  'Gynekologi & Obstetrik': '🤱',
  'Oftalmologi': '👁️'
};

// Helper function to get the specific course page for a user
async function getUserCoursePage(notion, userName) {
  try {
    const pageId = COURSE_PAGE_IDS[userName];
    
    if (!pageId) {
      throw new Error(`No course page ID configured for ${userName}. Please set NOTION_COURSE_PAGE_${userName.toUpperCase()} environment variable.`);
    }

    // Get the specific page by ID
    console.log(`🎯 Getting course page for ${userName}: ${pageId}`);
    const page = await notion.pages.retrieve({ page_id: pageId });
    
    console.log(`✅ Found course page for ${userName}`);
    return page;
    
  } catch (error) {
    // If page doesn't exist or no access, provide helpful error
    if (error.code === 'object_not_found') {
      throw new Error(`Course page not found for ${userName}. Please check:
        1. Page ID in NOTION_COURSE_PAGE_${userName.toUpperCase()} is correct
        2. Integration has access to the page
        3. Page exists in ${userName}'s Notion workspace`);
    }
    
    console.error(`❌ Failed to get course page for ${userName}:`, error);
    throw error;
  }
}

// Helper function to find or create a subject area section with database
async function findOrCreateSubjectSection(notion, coursePageId, subjectArea) {
  try {
    // Get all blocks from the course page
    const blocks = await notion.blocks.children.list({
      block_id: coursePageId
    });

    const emoji = SUBJECT_AREA_EMOJIS[subjectArea] || '📚';
    const sectionTitle = `${emoji} ${subjectArea}`;

    // Look for existing subject area section
    const existingSection = blocks.results.find(block => 
      block.type === 'toggle' && 
      block.toggle?.rich_text?.[0]?.text?.content?.includes(subjectArea)
    );

    if (existingSection) {
      console.log(`✅ Found existing section: ${sectionTitle}`);
      
      // Check if the section already has a database
      const sectionChildren = await notion.blocks.children.list({
        block_id: existingSection.id
      });
      
      const existingDatabase = sectionChildren.results.find(block => 
        block.type === 'child_database'
      );
      
      if (existingDatabase) {
        console.log(`✅ Found existing database in section: ${sectionTitle}`);
        return { section: existingSection, database: existingDatabase };
      }
    }

    // Create new section or update existing one with database
    let section = existingSection;
    
    if (!section) {
      console.log(`📝 Creating new section: ${sectionTitle}`);
      const newSection = await notion.blocks.children.append({
        block_id: coursePageId,
        children: [
          {
            object: 'block',
            type: 'toggle',
            toggle: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: sectionTitle
                  }
                }
              ],
              children: [
                {
                  object: 'block',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [
                      {
                        type: 'text',
                        text: {
                          content: `Föreläsningar inom ${subjectArea}`
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        ]
      });
      section = newSection.results[0];
    }

    // Create database within the section
    console.log(`📊 Creating database for: ${sectionTitle}`);
    const database = await notion.databases.create({
      parent: {
        type: 'block_id',
        block_id: section.id
      },
      title: [
        {
          type: 'text',
          text: {
            content: `Föreläsningar inom ${subjectArea}`
          }
        }
      ],
      properties: {
        'Föreläsning': {
          title: {}
        },
        'Nummer': {
          number: {
            format: 'number'
          }
        },
        'Status': {
          select: {
            options: [
              {
                name: 'Bör göra',
                color: 'default'
              },
              {
                name: 'Ej ankiz',
                color: 'gray'
              },
              {
                name: 'Blå ankiz',
                color: 'blue'
              },
              {
                name: 'A',
                color: 'green'
              },
              {
                name: 'M',
                color: 'yellow'
              },
              {
                name: 'D',
                color: 'red'
              }
            ]
          }
        },
        'Vald av': {
          multi_select: {
            options: [
              {
                name: 'David',
                color: 'red'
              },
              {
                name: 'Albin',
                color: 'green'
              },
              {
                name: 'Mattias',
                color: 'yellow'
              }
            ]
          }
        }
      }
    });

    console.log(`✅ Created database in section: ${sectionTitle}`);
    return { section, database };
    
  } catch (error) {
    console.error(`❌ Failed to find/create subject section: ${subjectArea}`, error);
    throw error;
  }
}

// Helper function to add or update lecture in database
async function addLectureToDatabase(notion, database, lectureTitle, lectureNumber, selectedByUser, action) {
  try {
    const userLetter = USER_LETTERS[selectedByUser];
    const databaseId = database.id;
    
    // Search for existing lecture in database with exact matching
    const existingPages = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Föreläsning',
        title: {
          contains: lectureTitle
        }
      }
    });

    // Find exact match by lecture number and title to prevent duplicates
    const lectureIdentifier = `${lectureNumber}. ${lectureTitle}`;
    const existingLecture = existingPages.results.find(page => {
      const pageTitle = page.properties?.Föreläsning?.title?.[0]?.text?.content || '';
      return pageTitle === lectureIdentifier || 
             pageTitle.includes(lectureTitle) && 
             page.properties?.Nummer?.number === lectureNumber;
    });

    if (existingLecture) {
      // Lecture already exists in database
      console.log(`📝 Found existing lecture: ${lectureNumber}. ${lectureTitle}`);
      
      if (action === 'bulk_add') {
        // For bulk_add, if lecture exists, just skip (no update needed)
        console.log(`✅ Lecture already exists in database - skipping bulk add`);
        return existingLecture;
      }

      // For select/unselect actions, update the existing lecture
      if (action === 'select' || action === 'unselect') {
        console.log(`🔄 Updating user selection for existing lecture: ${selectedByUser} ${action}`);
        
        // Get current "Vald av" selections
        const currentSelections = existingLecture.properties['Vald av']?.multi_select || [];
        let updatedSelections = [...currentSelections];
        
        if (action === 'select') {
          // Add user if not already selected
          if (!updatedSelections.find(sel => sel.name === selectedByUser)) {
            updatedSelections.push({ name: selectedByUser });
          } else {
            console.log(`📝 User ${selectedByUser} already selected this lecture`);
            return existingLecture;
          }
        } else if (action === 'unselect') {
          // Remove user from selections
          const initialLength = updatedSelections.length;
          updatedSelections = updatedSelections.filter(sel => sel.name !== selectedByUser);
          if (updatedSelections.length === initialLength) {
            console.log(`📝 User ${selectedByUser} was not selected for this lecture`);
            return existingLecture;
          }
        }

        // Determine status based on selections
        let status = 'Bör göra'; // Default status when no users selected
        if (updatedSelections.length > 0) {
          if (updatedSelections.length === 1) {
            const user = updatedSelections[0].name;
            status = user === 'David' ? 'D' : user === 'Albin' ? 'A' : 'M';
          } else {
            status = 'Blå ankiz'; // Multiple users selected
          }
        }

        await notion.pages.update({
          page_id: existingLecture.id,
          properties: {
            'Vald av': {
              multi_select: updatedSelections
            },
            'Status': {
              select: {
                name: status
              }
            }
          }
        });

        console.log(`✅ Updated user selection: ${lectureNumber}. ${lectureTitle} - ${selectedByUser} ${action}`);
        return existingLecture;
      }
      
      // For any other action, just return existing lecture without changes
      return existingLecture;
      
    } else {
      // Lecture doesn't exist in database
      
      if (action === 'bulk_add') {
        // Only bulk_add action should create new lectures
        console.log(`📝 Creating new lecture: ${lectureNumber}. ${lectureTitle}`);
        
        const newLecture = await notion.pages.create({
          parent: {
            database_id: databaseId
          },
          properties: {
            'Föreläsning': {
              title: [
                {
                  type: 'text',
                  text: {
                    content: `${lectureNumber}. ${lectureTitle}`
                  }
                }
              ]
            },
            'Nummer': {
              number: lectureNumber
            },
                      'Status': {
            select: {
              name: 'Bör göra'
            }
          },
            'Vald av': {
              multi_select: []
            }
          }
        });

        console.log(`✅ Created new lecture: ${lectureNumber}. ${lectureTitle}`);
        return newLecture;
        
      } else if (action === 'select' || action === 'unselect') {
        // User actions should NOT create new lectures, only update existing ones
        console.log(`⚠️ Cannot ${action} lecture that doesn't exist in database: ${lectureNumber}. ${lectureTitle}`);
        console.log(`💡 Lecture must be bulk-synced first before user selections can be applied`);
        return null;
        
      } else {
        console.log(`⚠️ Unknown action "${action}" for non-existing lecture: ${lectureNumber}. ${lectureTitle}`);
        return null;
      }
    }
  } catch (error) {
    console.error(`❌ Failed to add/update lecture: ${lectureTitle}`, error);
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
    let { lectureTitle, lectureNumber, selectedByUser, subjectArea, action } = JSON.parse(event.body);
    
    // Handle special mapping for dronnlid -> David (consistent with frontend)
    if (selectedByUser && selectedByUser.toLowerCase().includes('dronnlid')) {
      console.log(`🔄 Mapping dronnlid to David for backend processing`);
      selectedByUser = 'David';
    }
    
    console.log(`🎯 Notion page update: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle} (${subjectArea})`);

    // Validate required fields
    if (!lectureTitle || !lectureNumber || !selectedByUser || !subjectArea || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: lectureTitle, lectureNumber, selectedByUser, subjectArea, action' 
        })
      };
    }

    // Handle bulk_add action - just add the lecture without user tracking
    if (action === 'bulk_add') {
      selectedByUser = 'System'; // Override for bulk operations
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

    // Process updates for all users (each user has their own copy of the course page)
    const results = [];
    
    for (const [userName, token] of Object.entries(NOTION_TOKENS)) {
      if (!token) {
        console.warn(`⚠️ No Notion token found for ${userName}, skipping...`);
        results.push({
          user: userName,
          success: false,
          error: 'No Notion token configured'
        });
        continue;
      }

      try {
        const notion = new Client({ auth: token });
        
        // Step 1: Get the user's specific course page
        const coursePage = await getUserCoursePage(notion, userName);
        
        // Step 2: Find or create the subject area section with database
        const { section: subjectSection, database: subjectDatabase } = await findOrCreateSubjectSection(notion, coursePage.id, subjectArea);
        
        // Step 3: Add or update the lecture in the database
        const result = await addLectureToDatabase(notion, subjectDatabase, lectureTitle, lectureNumber, selectedByUser, action);
        
        if (result) {
          results.push({
            user: userName,
            success: true,
            pagesUpdated: 1,
            created: 0 // We'll track this properly later
          });
        } else {
          // This can happen when user tries to select/unselect a lecture that doesn't exist in the database
          results.push({
            user: userName,
            success: false,
            error: `Cannot ${action} lecture that doesn't exist in database. Bulk sync required first.`
          });
        }

        console.log(`✅ Successfully updated ${userName}'s Notion page`);
        
      } catch (error) {
        console.error(`❌ Failed to update ${userName}'s Notion page:`, error);
        results.push({
          user: userName,
          success: false,
          error: error.message
        });
      }
    }

    // Calculate summary
    const successfulUpdates = results.filter(r => r.success).length;
    const failedUpdates = results.filter(r => !r.success).length;
    const pagesCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);

    const response = {
      success: successfulUpdates > 0,
      message: successfulUpdates === 3 ? 'All Notion pages updated successfully' : 
               successfulUpdates > 0 ? `${successfulUpdates}/3 Notion pages updated` : 
               'No Notion pages could be updated',
      results,
      summary: {
        successfulUpdates,
        failedUpdates,
        pagesCreated
      }
    };

    console.log(`📊 Update summary:`, response.summary);

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Error in Notion page update function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Server error: ${error.message}`,
        results: [],
        summary: {
          successfulUpdates: 0,
          failedUpdates: 3,
          pagesCreated: 0
        }
      })
    };
  }
};