const { Client } = require('@notionhq/client');

// Notion API tokens for each user (store in environment variables)
const NOTION_TOKENS = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Main course page IDs for each user (these will contain the single database)
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

// Subject areas for Klinisk medicin 4
const SUBJECT_AREAS = [
  'Global hälsa',
  'Geriatrik', 
  'Pediatrik',
  'Öron-Näsa-Hals',
  'Gynekologi & Obstetrik',
  'Oftalmologi'
];

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

// Helper function to find or create a single database on the course page
async function findOrCreateCourseDatabase(notion, coursePageId, userName) {
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
      console.log(`✅ Found existing database on ${userName}'s course page`);
      // Return the database object with proper structure
      const fullDatabase = await notion.databases.retrieve({ database_id: existingDatabase.id });
      return fullDatabase;
    }

    // Create new database on the page
    console.log(`📊 Creating new database on ${userName}'s course page`);
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
        'Föreläsning': {
          title: {}
        },
        'Nummer': {
          number: {
            format: 'number'
          }
        },
        'Subject Area': {
          select: {
            options: SUBJECT_AREAS.map(area => ({ name: area, color: 'default' }))
          }
        },
        'Tag': {
          select: {
            options: [
              { name: 'Bör göra', color: 'default' },
              { name: 'Ej ankiz', color: 'gray' },
              { name: 'Blå ankiz', color: 'blue' }
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
        'Date and Time': { rich_text: {} },
        'URL': { url: {} }
      },
      // Enable list view by default
      is_inline: true
    });

    console.log(`🎯 Database created with ID: ${database.id}`);
    console.log(`✅ Created database on ${userName}'s course page`);
    return database;
    
  } catch (error) {
    console.error(`❌ Failed to find/create database on ${userName}'s course page:`, error);
    throw error;
  }
}

// Helper function to ensure database schema is up to date
async function ensureDatabaseSchema(notion, database, userName) {
  try {
    console.log(`📊 Checking database schema for ${userName}: ${database.id}`);
    
    const currentProperties = database.properties;
    const updates = {};
    let needsUpdate = false;

    // Required properties for our lecture tracking system
    const requiredProperties = {
      'Föreläsning': { title: {} },
      'Nummer': { number: { format: 'number' } },
      'Subject Area': {
        select: {
          options: SUBJECT_AREAS.map(area => ({ name: area, color: 'default' }))
        }
      },
      'Tag': {
        select: {
          options: [
            { name: 'Bör göra', color: 'default' },
            { name: 'Ej ankiz', color: 'gray' },
            { name: 'Blå ankiz', color: 'blue' }
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
      'Date and Time': { rich_text: {} },
      'URL': { url: {} }
    };

    // Check if we need to add/update any properties
    for (const [propName, propConfig] of Object.entries(requiredProperties)) {
      if (!currentProperties[propName]) {
        console.log(`➕ Adding missing property: ${propName}`);
        updates[propName] = propConfig;
        needsUpdate = true;
      } else if (propConfig.select && currentProperties[propName].select) {
        // Update select options if they don't match
        const currentOptions = currentProperties[propName].select.options || [];
        const currentOptionNames = currentOptions.map(opt => opt.name);
        const requiredOptionNames = propConfig.select.options.map(opt => opt.name);
        
        const missingOptions = requiredOptionNames.filter(name => !currentOptionNames.includes(name));
        if (missingOptions.length > 0) {
          console.log(`🔄 Updating select options for ${propName}: adding ${missingOptions.join(', ')}`);
          // Keep existing options and add new ones
          const allOptions = [...currentOptions, ...missingOptions.map(name => ({ name, color: 'default' }))];
          updates[propName] = {
            select: { options: allOptions }
          };
          needsUpdate = true;
        }
      }
    }

    // Apply updates if needed
    if (needsUpdate) {
      await notion.databases.update({
        database_id: database.id,
        properties: updates
      });
      console.log(`✅ Updated database schema for ${userName}`);
    } else {
      console.log(`✅ Database schema is up to date for ${userName}`);
    }

    return database;
    
  } catch (error) {
    console.error(`❌ Failed to ensure database schema for ${userName}:`, error);
    throw error;
  }
}

// Helper function to add or update lecture in database
async function addLectureToDatabase(notion, databaseId, lectureTitle, lectureNumber, subjectArea, selectedByUser, action) {
  try {
    const userLetter = USER_LETTERS[selectedByUser];
    
    // Search for existing lecture in database with exact matching
    console.log(`🔍 Searching for existing lecture: ${lectureNumber}. ${lectureTitle}`);
    const existingPages = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: 'Föreläsning',
            title: {
              contains: lectureTitle
            }
          },
          {
            property: 'Nummer',
            number: {
              equals: lectureNumber
            }
          }
        ]
      }
    });

    console.log(`📊 Found ${existingPages.results.length} potential matches`);

    const existingLecture = existingPages.results[0]; // Take first exact match

    if (existingLecture) {
      console.log(`✅ Found existing lecture: ${lectureNumber}. ${lectureTitle}`);
    } else {
      console.log(`❌ No existing lecture found for: ${lectureNumber}. ${lectureTitle}`);
    }

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
        
        // Get current person selection
        const currentPerson = existingLecture.properties['Person']?.select?.name || null;
        
        let newTag = 'Bör göra'; // Default tag
        let newPerson = null; // Default person (empty)
        
        if (action === 'select') {
          // Set person based on user
          if (selectedByUser === 'David') {
            newPerson = 'D';
          } else if (selectedByUser === 'Albin') {
            newPerson = 'A';
          } else if (selectedByUser === 'Mattias') {
            newPerson = 'M';
          }
          
          // If someone was already selected and it's different, it becomes Blå ankiz
          if (currentPerson && currentPerson !== newPerson) {
            newTag = 'Blå ankiz';
            newPerson = null; // Clear person when multiple users
          } else if (newPerson) {
            newTag = 'Bör göra'; // Keep default tag when single person selected
          }
        } else if (action === 'unselect') {
          // Remove selection - back to defaults
          newTag = 'Bör göra';
          newPerson = null;
        }

        const updateProperties = {
          'Tag': {
            select: newTag ? { name: newTag } : null
          }
        };

        if (newPerson) {
          updateProperties['Person'] = {
            select: { name: newPerson }
          };
        } else {
          updateProperties['Person'] = {
            select: null
          };
        }

        await notion.pages.update({
          page_id: existingLecture.id,
          properties: updateProperties
        });

        console.log(`✅ Updated user selection: ${lectureNumber}. ${lectureTitle} - ${selectedByUser} ${action} -> Tag: ${newTag}, Person: ${newPerson || 'none'}`);
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
            'Subject Area': {
              select: {
                name: subjectArea
              }
            },
            'Tag': {
              select: {
                name: 'Bör göra'
              }
            },
            'Person': {
              select: null
            },
            'Date and Time': {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '' // Will be filled in later if needed
                  }
                }
              ]
            },
            'URL': {
              url: `https://ankiologernas-notioneringsledger.netlify.app#lecture-${lectureNumber}`
            }
          }
        });

        console.log(`✅ Created new lecture: ${lectureNumber}. ${lectureTitle} in ${subjectArea}`);
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
    
    console.log(`🎯 Notion database update: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle} (${subjectArea})`);
    console.log(`📊 Processing for all users: ${Object.keys(NOTION_TOKENS).join(', ')}`);

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
    if (userLetter === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `Unknown user: ${selectedByUser}. Expected David, Albin, Mattias, or System` 
        })
      };
    }

    // Process updates for all users (each user has their own database)
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
        
        // Step 2: Find or create the single database on the course page
        const database = await findOrCreateCourseDatabase(notion, coursePage.id, userName);
        
        // Step 3: Ensure database has correct schema
        await ensureDatabaseSchema(notion, database, userName);
        
        // Step 4: Add or update the lecture in the database
        const result = await addLectureToDatabase(notion, database.id, lectureTitle, lectureNumber, subjectArea, selectedByUser, action);
        
        if (result) {
          results.push({
            user: userName,
            success: true,
            pagesUpdated: 1,
            created: action === 'bulk_add' && !result.id.startsWith('existing') ? 1 : 0
          });
        } else {
          // This can happen when user tries to select/unselect a lecture that doesn't exist in the database
          results.push({
            user: userName,
            success: false,
            error: `Cannot ${action} lecture that doesn't exist in database. Bulk sync required first.`
          });
        }

        console.log(`✅ Successfully updated ${userName}'s Notion database`);
        
      } catch (error) {
        console.error(`❌ Failed to update ${userName}'s Notion database:`, error);
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
      message: successfulUpdates === 3 ? 'All Notion databases updated successfully' : 
               successfulUpdates > 0 ? `${successfulUpdates}/3 Notion databases updated` : 
               'No Notion databases could be updated',
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
    console.error('❌ Error in Notion database update function:', error);
    
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