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
async function addLectureToDatabase(notion, databaseId, lectureTitle, lectureNumber, subjectArea, selectedByUser, action, checkboxStates) {
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

      // For bulk_sync_with_checkboxes, update Person tag and other properties based on current app state
      if (action === 'bulk_sync_with_checkboxes') {
        console.log(`🔄 Updating existing lecture based on current app state: ${lectureNumber}. ${lectureTitle}`);
        
        // Get current person selection from checkbox states
        let newPerson = null;
        let newStatus = 'Bör göra';
        
        if (checkboxStates) {
          const selectedUsers = Object.keys(checkboxStates).filter(user => 
            checkboxStates[user]?.confirm === true
          );
          
          if (selectedUsers.length === 1) {
            // Single user selected
            const user = selectedUsers[0];
            if (user === 'David') newPerson = 'D';
            else if (user === 'Albin') newPerson = 'A';
            else if (user === 'Mattias') newPerson = 'M';
            newStatus = 'Bör göra';
          } else if (selectedUsers.length > 1) {
            // Multiple users selected
            newPerson = null;
            newStatus = 'Blå ankiz';
          } else {
            // No users selected
            newPerson = null;
            newStatus = 'Bör göra';
          }
        }

        // Check if we need to update the lecture title or subject area
        const currentTitle = existingLecture.properties['Föreläsning']?.title?.[0]?.plain_text || '';
        const newTitle = `${lectureNumber}. ${lectureTitle}`;
        const currentSubjectArea = existingLecture.properties['Subject area']?.select?.name || '';
        const newSubjectArea = subjectArea || 'Global hälsa';
        
        const needsUpdate = currentTitle !== newTitle || 
                           currentSubjectArea !== newSubjectArea ||
                           existingLecture.properties['Person']?.select?.name !== newPerson ||
                           existingLecture.properties['Status']?.select?.name !== newStatus;

        if (needsUpdate) {
          console.log(`📝 Updating lecture properties:`);
          console.log(`   Title: "${currentTitle}" -> "${newTitle}"`);
          console.log(`   Subject Area: "${currentSubjectArea}" -> "${newSubjectArea}"`);
          console.log(`   Person: "${existingLecture.properties['Person']?.select?.name || 'none'}" -> "${newPerson || 'none'}"`);
          console.log(`   Status: "${existingLecture.properties['Status']?.select?.name || 'none'}" -> "${newStatus}"`);

          const updateProperties = {
            'Föreläsning': {
              title: [
                {
                  type: 'text',
                  text: {
                    content: newTitle
                  }
                }
              ]
            },
            'Subject area': {
              select: { name: newSubjectArea }
            },
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

          console.log(`✅ Updated lecture properties successfully`);
          existingLecture.wasUpdated = true;
        } else {
          console.log(`✅ Lecture is already up to date - no changes needed`);
          existingLecture.wasSkipped = true;
        }
        
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
        // Auto-create lecture if it doesn't exist, then apply the selection
        console.log(`📝 Lecture doesn't exist yet - creating it first before applying ${action}`);
        console.log(`🔧 Auto-creating lecture: ${lectureNumber}. ${lectureTitle}`);
        
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

        console.log(`✅ Auto-created lecture: ${lectureNumber}. ${lectureTitle}`);
        
        // Now set existingLecture to the newly created one so it gets updated below
        existingLecture = newLecture;
        
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
    let { lectureTitle, lectureNumber, subjectArea, selectedByUser, action, checkboxStates } = JSON.parse(event.body);
    
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
    
    // For bulk_sync_with_checkboxes action, update Person tags based on current checkbox states
    if (action === 'bulk_sync_with_checkboxes') {
      console.log(`📦 Bulk sync with checkbox states requested by ${selectedByUser} - updating Person tags based on current selections`);
    }
    
    // For select/unselect actions, we need to update ALL users' databases
    const shouldUpdateAllUsers = (action === 'select' || action === 'unselect');
    if (shouldUpdateAllUsers) {
      console.log(`🔄 Lecture ${action} action - will update ALL users' Notion databases`);
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

    // Determine which users to process based on action type
    const results = [];
    let successfulUpdates = 0;
    
    let usersToProcess = [];
    
    if (shouldUpdateAllUsers) {
      // For select/unselect actions, process ALL users who have tokens and page IDs
      usersToProcess = Object.keys(NOTION_TOKENS).filter(user => 
        NOTION_TOKENS[user] && COURSE_PAGE_IDS[user]
      );
      console.log(`🔄 Processing ALL users' Notion databases: ${usersToProcess.join(', ')}`);
    } else {
      // For bulk_add and other actions, only process the target user
      usersToProcess = [targetUser];
      console.log(`🎯 Processing Notion database for ${targetUser} only`);
      
      if (!NOTION_TOKENS[targetUser]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: `No Notion token configured for ${targetUser}` 
          })
        };
      }

      if (!COURSE_PAGE_IDS[targetUser]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            error: `No course page ID configured for ${targetUser}` 
          })
        };
      }
    }

    // Process each user's Notion database
    for (const userName of usersToProcess) {
      const token = NOTION_TOKENS[userName];
      const pageId = COURSE_PAGE_IDS[userName];
      
      if (!token || !pageId) {
        console.log(`⚠️ Skipping ${userName} - missing token or page ID`);
        results.push({
          user: userName,
          success: false,
          error: 'Missing token or page ID'
        });
        continue;
      }
    
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
        const result = await retryOperation(() => addLectureToDatabase(notion, database.id, lectureTitle, lectureNumber, subjectArea, targetUser, action, checkboxStates), 3);
      
              if (result) {
          // Check if this was a duplicate skip, update, or actual creation
          const wasSkipped = result.wasSkipped || false;
          const wasUpdated = result.wasUpdated || false;
          const wasExisting = result.id && typeof result.id === 'string' && 
                            (result.id.includes('existing') || result.last_edited_time);
          
          let message = 'Success';
          if (wasSkipped) {
            message = `Lecture ${lectureNumber} already up to date - no changes needed`;
          } else if (wasUpdated) {
            message = `Lecture ${lectureNumber} updated with current app state`;
          } else if (action === 'bulk_add') {
            message = `Lecture ${lectureNumber} created successfully`;
          }
          
          results.push({
            user: userName,
            success: true,
            pagesUpdated: wasUpdated ? 1 : 0,
            created: action === 'bulk_add' && !wasExisting ? 1 : 0,
            updated: wasUpdated ? 1 : 0,
            skipped: wasSkipped ? 1 : 0,
            message: message
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
      
      // Provide detailed error analysis
      let detailedError = error.message;
      let errorType = 'Unknown error';
      
      if (error.message.includes('subjectArea is not defined')) {
        detailedError = `Subject area is not defined for lecture "${lectureTitle}". The lecture needs a valid subject area to be synced to Notion.`;
        errorType = 'Configuration error';
      } else if (error.message.includes('No Notion token configured')) {
        detailedError = `No Notion API token is configured for user "${userName}". Please set up the Notion integration in your account settings.`;
        errorType = 'Integration error';
      } else if (error.message.includes('page not found') || error.message.includes('database not found')) {
        detailedError = `The Notion page or database for user "${userName}" could not be found. Please check that the page exists and is shared with the integration.`;
        errorType = 'Resource not found';
      } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        detailedError = `Notion API rate limit exceeded. Too many requests were sent. Please wait a few minutes and try again.`;
        errorType = 'Rate limit exceeded';
      } else if (error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        detailedError = `Access denied to Notion workspace for user "${userName}". Please check that the integration has proper permissions.`;
        errorType = 'Access denied';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        detailedError = `Network connection error while syncing to Notion. This might be a temporary issue.`;
        errorType = 'Network error';
      }
      
      results.push({
        user: userName,
        success: false,
        error: detailedError,
        errorType: errorType,
        originalError: error.message
      });
    }
    } // End of for loop

    // Calculate summary for multiple user processing
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const success = successfulResults.length > 0;
    const pagesCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
    const pagesUpdated = results.reduce((sum, r) => sum + (r.updated || 0), 0);
    const pagesSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
    
    let message;
    if (shouldUpdateAllUsers) {
      // Message for multiple users (select/unselect actions)
      if (successfulResults.length === results.length) {
        message = `Lecture ${action} updated successfully in all ${results.length} users' Notion databases`;
      } else if (successfulResults.length > 0) {
        message = `Lecture ${action} updated in ${successfulResults.length}/${results.length} users' Notion databases`;
      } else {
        message = `Failed to update lecture ${action} in any Notion database`;
      }
    } else {
      // Message for single user (bulk_add and other actions)
      if (success) {
        const result = results[0];
        if (action === 'bulk_sync_with_checkboxes') {
          if (pagesUpdated > 0 && pagesSkipped > 0) {
            message = `${targetUser}'s Notion database synced successfully (${pagesUpdated} updated, ${pagesSkipped} already up to date)`;
          } else if (pagesUpdated > 0) {
            message = `${targetUser}'s Notion database synced successfully (${pagesUpdated} lectures updated)`;
          } else if (pagesSkipped > 0) {
            message = `${targetUser}'s Notion database synced successfully (${pagesSkipped} lectures already up to date)`;
          } else {
            message = `${targetUser}'s Notion database synced successfully`;
          }
        } else if ((result.skipped || 0) > 0) {
          message = `${targetUser}'s Notion database updated successfully (lecture already existed - duplicate prevented)`;
        } else if ((result.created || 0) > 0) {
          message = `${targetUser}'s Notion database updated successfully (lecture added)`;
        } else {
          message = `${targetUser}'s Notion database updated successfully`;
        }
      } else if (results.length > 0) {
        message = `Failed to update ${targetUser}'s Notion database: ${results[0].error}`;
      } else {
        message = `Failed to process ${targetUser}'s Notion database`;
      }
    }

    const response = {
      success,
      message,
      results,
      summary: {
        successfulUpdates: successfulResults.length,
        failedUpdates: failedResults.length,
        pagesCreated,
        pagesUpdated,
        pagesSkipped,
        targetUser: shouldUpdateAllUsers ? 'all' : targetUser,
        usersProcessed: usersToProcess
      }
    };

    console.log(`📊 Update summary:`, response.summary);

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Error in Notion database update function:', error);
    
    // Provide detailed error guidance
    let errorMessage = `Server error: ${error.message}`;
    let guidance = '';
    
    if (error.message.includes('MONGODB_URI') || error.message.includes('database connection')) {
      errorMessage = 'Database connection error';
      guidance = 'The app cannot connect to the database. This is a server configuration issue.';
    } else if (error.message.includes('NOTION_TOKEN') || error.message.includes('environment variable')) {
      errorMessage = 'Notion integration not configured';
      guidance = 'The Notion integration is not properly configured on the server. Contact the administrator.';
    } else if (error.message.includes('JSON') || error.message.includes('parse')) {
      errorMessage = 'Invalid request data';
      guidance = 'The request data is malformed. Please try again or contact support.';
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      errorMessage = 'Network timeout';
      guidance = 'The request timed out. This might be a temporary network issue. Please try again.';
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: errorMessage,
        guidance: guidance,
        results: [],
        summary: {
          successfulUpdates: 0,
          failedUpdates: 1,
          pagesCreated: 0
        }
      })
    };
  }
};