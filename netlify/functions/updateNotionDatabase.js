const { Client } = require('@notionhq/client');

// Retry function for handling transient failures
async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`💥 All ${maxRetries} attempts failed for operation`);
        throw error;
      }
      
      // Exponential backoff: wait longer between retries
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.log(`⏱️ Waiting ${waitTime}ms before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

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

// Subject areas removed - no longer needed for simplified 3-column database

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

    // Create new INLINE database on the page (not a separate page database)
    console.log(`📊 Creating new INLINE database on ${userName}'s course page`);
    console.log(`🔧 Database will be embedded directly in page, not as separate page`);
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
      // CRITICAL: This ensures the database is created INLINE within the page, not as a separate page
      is_inline: true
    });

    // Verify the database was created as inline
    if (database.is_inline) {
      console.log(`✅ Database successfully created as INLINE database within the page`);
    } else {
      console.warn(`⚠️ Database was created as page database instead of inline - this may need manual conversion`);
    }

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

    // Required properties for our lecture tracking system - 4 columns including subject area
    const requiredProperties = {
      'Föreläsning': { title: {} },
      'Subject area': {
        select: {
          options: [
            { name: 'Global hälsa', color: 'purple' },
            { name: 'Geriatrik', color: 'blue' },
            { name: 'Pediatrik', color: 'green' },
            { name: 'Öron-Näsa-Hals', color: 'orange' },
            { name: 'Gynekologi & Obstetrik', color: 'pink' },
            { name: 'Oftalmologi', color: 'yellow' }
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
      },
      'Person': {
        select: {
          options: [
            { name: 'D', color: 'red' },
            { name: 'A', color: 'green' },
            { name: 'M', color: 'yellow' }
          ]
        }
      }
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
    
    // STRICT duplicate detection - prevent any lecture with same title from being added twice
    console.log(`🔍 STRICT duplicate check for lecture: ${lectureNumber}. ${lectureTitle}`);
    console.log(`🎯 Action: ${action}`);
    
    // EXACT duplicate detection - prevent any lecture with exact same title from being added twice
    const exactTitle = `${lectureNumber}. ${lectureTitle}`;
    const existingLectures = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Föreläsning',
        title: {
          equals: exactTitle
        }
      }
    });

    console.log(`📊 Found ${existingLectures.results.length} existing lectures with exact title "${exactTitle}"`);

    // If ANY lecture exists with this title, consider it a duplicate
    let existingLecture = null;
    if (existingLectures.results.length > 0) {
      existingLecture = existingLectures.results[0]; // Take the first one
      const existingTitle = existingLecture.properties['Föreläsning']?.title?.[0]?.plain_text || 'Unknown';
      
      console.log(`🚫 DUPLICATE DETECTED! Lecture "${lectureTitle}" already exists:`);
      console.log(`   📝 Existing: "${existingTitle}"`);
      console.log(`   📝 Attempted: "${lectureNumber}. ${lectureTitle}"`);
      console.log(`   ⚠️ Will NOT create duplicate - using existing lecture`);
      
      // Log all existing lectures with this title for debugging
      existingLectures.results.forEach((lecture, index) => {
        const title = lecture.properties['Föreläsning']?.title?.[0]?.plain_text || 'Unknown';
        console.log(`   ${index + 1}. "${title}" (ID: ${lecture.id})`);
      });
    } else {
      console.log(`✅ No duplicates found - lecture "${lectureTitle}" can be created`);
    }

    if (existingLecture) {
      // Lecture already exists in database
      console.log(`📝 Found existing lecture: ${lectureNumber}. ${lectureTitle}`);
      
      if (action === 'bulk_add') {
        // For bulk_add, NEVER create duplicates - always skip if lecture number exists
        console.log(`🚫 STRICT DUPLICATE PREVENTION: Lecture ${lectureNumber} already exists in database`);
        console.log(`✅ Skipping bulk add to prevent duplicate`);
        
        // Mark the lecture as skipped for proper response handling
        existingLecture.wasSkipped = true;
        return existingLecture;
      }

      // For select/unselect actions, update the existing lecture
      if (action === 'select' || action === 'unselect') {
        console.log(`🔄 Updating user selection for existing lecture: ${selectedByUser} ${action}`);
        
        // Get current person selection
        const currentPerson = existingLecture.properties['Person']?.select?.name || null;
        
        let newStatus = 'Bör göra'; // Default status
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
            newStatus = 'Blå ankiz';
            newPerson = null; // Clear person when multiple users
          } else if (newPerson) {
            newStatus = 'Bör göra'; // Keep default status when single person selected
          }
        } else if (action === 'unselect') {
          // Remove selection - back to defaults
          newStatus = 'Bör göra';
          newPerson = null;
        }

        const updateProperties = {
          'Status': {
            select: newStatus ? { name: newStatus } : null
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

        console.log(`✅ Updated user selection: ${lectureNumber}. ${lectureTitle} - ${selectedByUser} ${action} -> Status: ${newStatus}, Person: ${newPerson || 'none'}`);
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
            'Subject area': {
              select: {
                name: subjectArea || 'Global hälsa' // Use provided subject area or default
              }
            },
            'Status': {
              select: {
                name: 'Bör göra'
              }
            },
            'Person': {
              select: null
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
    let { lectureTitle, lectureNumber, subjectArea, selectedByUser, action } = JSON.parse(event.body);
    
    // Handle special mapping for full names to short names
    if (selectedByUser) {
      if (selectedByUser.toLowerCase().includes('dronnlid') || selectedByUser.includes('David Rönnlid')) {
        console.log(`🔄 Mapping ${selectedByUser} to David for backend processing`);
        selectedByUser = 'David';
      } else if (selectedByUser.includes('Albin Lindberg')) {
        console.log(`🔄 Mapping ${selectedByUser} to Albin for backend processing`);
        selectedByUser = 'Albin';
      } else if (selectedByUser.includes('Mattias Österdahl')) {
        console.log(`🔄 Mapping ${selectedByUser} to Mattias for backend processing`);
        selectedByUser = 'Mattias';
      }
    }
    
    console.log(`🎯 Notion database update: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle}`);
    console.log(`📊 Processing for all users: ${Object.keys(NOTION_TOKENS).join(', ')}`);

    // Validate required fields
    if (!lectureTitle || !lectureNumber || !selectedByUser || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: lectureTitle, lectureNumber, selectedByUser, action' 
        })
      };
    }

    // For bulk_add action, keep the actual logged-in user (don't change to 'System')
    // The logged-in user's Notion database should be updated
    let targetUser = selectedByUser;
    if (action === 'bulk_add') {
      console.log(`📦 Bulk sync requested by ${selectedByUser} - updating their Notion database`);
    }

    const userLetter = USER_LETTERS[targetUser];
    if (userLetter === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `Unknown user: ${targetUser}. Expected David, Albin, Mattias` 
        })
      };
    }

    // Process update ONLY for the logged-in user's Notion database
    const results = [];
    let successfulUpdates = 0;
    
    // Only process the target user (logged-in user), not all users
    const targetUserToken = NOTION_TOKENS[targetUser];
    const targetUserPageId = COURSE_PAGE_IDS[targetUser];
    
    console.log(`🎯 Processing Notion database for ${targetUser} only`);
    
    if (!targetUserToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `No Notion token configured for ${targetUser}` 
        })
      };
    }

    if (!targetUserPageId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `No course page ID configured for ${targetUser}` 
        })
      };
    }

    // Process single user's Notion database
    const userName = targetUser;
    const token = targetUserToken;
    const pageId = targetUserPageId;
    
    try {
      console.log(`🔄 Processing ${userName}'s Notion database...`);
      
      const notion = new Client({ auth: token });
      
      // Step 1: Get the user's specific course page with retry logic
      console.log(`📄 Getting course page for ${userName}...`);
      const coursePage = await retryOperation(() => getUserCoursePage(notion, userName), 3);
      
      // Step 2: Find or create the single database on the course page with retry logic
      console.log(`🗄️ Finding/creating database for ${userName}...`);
      const database = await retryOperation(() => findOrCreateCourseDatabase(notion, coursePage.id, userName), 3);
      
      // Step 3: Ensure database has correct schema with retry logic
      console.log(`🔧 Ensuring database schema for ${userName}...`);
      await retryOperation(() => ensureDatabaseSchema(notion, database, userName), 3);
      
              // Step 4: Add or update the lecture in the database with retry logic
        console.log(`📝 Adding/updating lecture for ${userName}...`);
        const result = await retryOperation(() => addLectureToDatabase(notion, database.id, lectureTitle, lectureNumber, subjectArea, targetUser, action), 3);
      
      if (result) {
        // Check if this was a duplicate skip or actual creation/update
        const wasSkipped = result.wasSkipped || false;
        const wasExisting = result.id && typeof result.id === 'string' && 
                          (result.id.includes('existing') || result.last_edited_time);
        
        results.push({
          user: userName,
          success: true,
          pagesUpdated: 1,
          created: action === 'bulk_add' && !wasExisting ? 1 : 0,
          skipped: wasSkipped ? 1 : 0,
          message: wasSkipped ? `Lecture ${lectureNumber} already exists - duplicate prevented` : 'Success'
        });
        successfulUpdates = 1;
      } else {
        // This can happen when user tries to select/unselect a lecture that doesn't exist in the database
        results.push({
          user: userName,
          success: false,
          error: `Cannot ${action} lecture that doesn't exist in database. Bulk sync required first.`
        });
      }

      console.log(`✅ Successfully processed ${userName}'s Notion database`);
      
    } catch (error) {
      console.error(`❌ Failed to update ${userName}'s Notion database:`, error);
      results.push({
        user: userName,
        success: false,
        error: error.message
      });
    }

    // Calculate summary for single user processing
    const success = results.length > 0 && results[0].success;
    const pagesCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
    
    let message;
    if (success) {
      const result = results[0];
      if (result.skipped > 0) {
        message = `${targetUser}'s Notion database updated successfully (lecture already existed - duplicate prevented)`;
      } else if (result.created > 0) {
        message = `${targetUser}'s Notion database updated successfully (lecture added)`;
      } else {
        message = `${targetUser}'s Notion database updated successfully`;
      }
    } else if (results.length > 0) {
      message = `Failed to update ${targetUser}'s Notion database: ${results[0].error}`;
    } else {
      message = `Failed to process ${targetUser}'s Notion database`;
    }

    const response = {
      success,
      message,
      results,
      summary: {
        successfulUpdates: success ? 1 : 0,
        failedUpdates: success ? 0 : 1,
        pagesCreated,
        targetUser
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