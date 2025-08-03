import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

// Retry function for handling transient failures
async function retryOperation(operation: () => Promise<any>, maxRetries: number = 3, delayMs: number = 1000): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`❌ Attempt ${attempt}/${maxRetries} failed:`, error instanceof Error ? error.message : 'Unknown error');
      
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
const NOTION_TOKENS: { [key: string]: string | undefined } = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Main course page IDs for each user (these will contain the single database)
const COURSE_PAGE_IDS: { [key: string]: string | undefined } = {
  'David': process.env.NOTION_COURSE_PAGE_DAVID,
  'Albin': process.env.NOTION_COURSE_PAGE_ALBIN,
  'Mattias': process.env.NOTION_COURSE_PAGE_MATTIAS
};

// User name to letter mapping for tracking
const USER_LETTERS: { [key: string]: string } = {
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
async function getUserCoursePage(notion: Client, userName: string) {
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
    if ((error as any).code === 'object_not_found') {
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
async function findOrCreateCourseDatabase(notion: Client, coursePageId: string, userName: string) {
  try {
    // Get all blocks from the course page
    const blocks = await notion.blocks.children.list({
      block_id: coursePageId
    });

    // Look for existing database
    const existingDatabase = blocks.results.find(block => 
      (block as any).type === 'child_database'
    );

    if (existingDatabase) {
      console.log(`✅ Found existing database on ${userName}'s course page`);
      // Return the database object with proper structure
      const fullDatabase = await notion.databases.retrieve({ database_id: (existingDatabase as any).id });
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
    if ((database as any).is_inline) {
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
async function ensureDatabaseSchema(notion: Client, database: any, userName: string) {
  try {
    console.log(`📊 Checking database schema for ${userName}: ${database.id}`);
    
    const currentProperties = database.properties;
    const updates: any = {};
    let needsUpdate = false;

    // Required properties for our lecture tracking system
    const requiredProperties: any = {
      'Föreläsning': { title: {} },
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
    };

    // Check if we need to add/update any properties
    for (const [propName, propConfig] of Object.entries(requiredProperties)) {
      if (!currentProperties[propName]) {
        console.log(`➕ Adding missing property: ${propName}`);
        updates[propName] = propConfig;
        needsUpdate = true;
      } else if ((propConfig as any).select && (currentProperties[propName] as any).select) {
        // Update select options if they don't match
        const currentOptions = (currentProperties[propName] as any).select.options || [];
        const currentOptionNames = currentOptions.map((opt: any) => opt.name);
        const requiredOptionNames = (propConfig as any).select.options.map((opt: any) => opt.name);
        
        const missingOptions = requiredOptionNames.filter((name: string) => !currentOptionNames.includes(name));
        if (missingOptions.length > 0) {
          console.log(`🔄 Updating select options for ${propName}: adding ${missingOptions.join(', ')}`);
          // Keep existing options and add new ones
          const allOptions = [...currentOptions, ...missingOptions.map((name: string) => ({ name, color: 'default' }))];
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
async function addLectureToDatabase(notion: Client, databaseId: string, lectureTitle: string, lectureNumber: number, selectedByUser: string, action: string) {
  try {
    const userLetter = USER_LETTERS[selectedByUser];
    
    // STRICT duplicate detection - prevent any lecture with same number from being added twice
    console.log(`🔍 STRICT duplicate check for lecture: ${lectureNumber}. ${lectureTitle}`);
    console.log(`🎯 Action: ${action}`);
    
    // Search for ANY existing lecture with the same number (bulletproof duplicate prevention)
    const existingLectures = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Nummer',
        number: {
          equals: lectureNumber
        }
      }
    });

    console.log(`📊 Found ${existingLectures.results.length} existing lectures with number ${lectureNumber}`);

    // If ANY lecture exists with this number, consider it a duplicate
    let existingLecture = null;
    if (existingLectures.results.length > 0) {
      existingLecture = existingLectures.results[0]; // Take the first one
      const existingTitle = (existingLecture as any).properties?.['Föreläsning']?.title?.[0]?.plain_text || 'Unknown';
      
      console.log(`🚫 DUPLICATE DETECTED! Lecture ${lectureNumber} already exists:`);
      console.log(`   📝 Existing: "${existingTitle}"`);
      console.log(`   📝 Attempted: "${lectureTitle}"`);
      console.log(`   ⚠️ Will NOT create duplicate - using existing lecture`);
      
      // Log all existing lectures with this number for debugging
      existingLectures.results.forEach((lecture: any, index: number) => {
        const title = (lecture as any).properties?.['Föreläsning']?.title?.[0]?.plain_text || 'Unknown';
        console.log(`   ${index + 1}. "${title}" (ID: ${lecture.id})`);
      });
    } else {
      console.log(`✅ No duplicates found - lecture ${lectureNumber} can be created`);
    }

    if (existingLecture) {
      // Lecture already exists in database
      console.log(`📝 Found existing lecture: ${lectureNumber}. ${lectureTitle}`);
      
      if (action === 'bulk_add') {
        // For bulk_add, NEVER create duplicates - always skip if lecture number exists
        console.log(`🚫 STRICT DUPLICATE PREVENTION: Lecture ${lectureNumber} already exists in database`);
        console.log(`✅ Skipping bulk add to prevent duplicate`);
        
        // Mark the lecture as skipped for proper response handling
        (existingLecture as any).wasSkipped = true;
        return existingLecture;
      }

      // For select/unselect actions, update the existing lecture
      if (action === 'select' || action === 'unselect') {
        console.log(`🔄 Updating user selection for existing lecture: ${selectedByUser} ${action}`);
        
        // Get current person selection
        const currentPerson = (existingLecture as any).properties?.['Person']?.select?.name || null;
        
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

        const updateProperties: any = {
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
                name: 'Global hälsa' // Default subject area for simplified database
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { lectureTitle, lectureNumber, selectedByUser, action } = req.body;
    
    // Handle special mapping for dronnlid -> David (consistent with frontend)
    if (selectedByUser && selectedByUser.toLowerCase().includes('dronnlid')) {
      console.log(`🔄 Mapping dronnlid to David for backend processing`);
      selectedByUser = 'David';
    }
    
    console.log(`🎯 Notion database update: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle}`);
    console.log(`📊 Processing for all users: ${Object.keys(NOTION_TOKENS).join(', ')}`);

    // Validate required fields
    if (!lectureTitle || !lectureNumber || !selectedByUser || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: lectureTitle, lectureNumber, selectedByUser, action' 
      });
    }

    // Handle bulk_add action - just add the lecture without user tracking
    if (action === 'bulk_add') {
      selectedByUser = 'System'; // Override for bulk operations
    }

    const userLetter = USER_LETTERS[selectedByUser];
    if (userLetter === undefined) {
      return res.status(400).json({ 
        error: `Unknown user: ${selectedByUser}. Expected David, Albin, Mattias, or System` 
      });
    }

    // Process updates for users with proper Notion setup
    const results = [];
    let successfulUpdates = 0;
    
    for (const [userName, token] of Object.entries(NOTION_TOKENS)) {
      console.log(`🔄 Processing ${userName}...`);
      
      if (!token) {
        console.warn(`⚠️ No Notion token found for ${userName}, skipping...`);
        results.push({
          user: userName,
          success: false,
          error: 'No Notion token configured',
          skipped: true
        });
        continue;
      }

      // Check if user has course page configured
      const pageId = COURSE_PAGE_IDS[userName];
      if (!pageId) {
        console.warn(`⚠️ No course page ID found for ${userName}, skipping...`);
        results.push({
          user: userName,
          success: false,
          error: `No course page ID configured for ${userName}`,
          skipped: true
        });
        continue;
      }

      try {
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
        const result = await retryOperation(() => addLectureToDatabase(notion, database.id, lectureTitle, lectureNumber, selectedByUser, action), 3);
        
        if (result) {
          // Check if this was a duplicate skip or actual creation/update
          const wasSkipped = (result as any).wasSkipped || false;
          const wasExisting = (result as any).id && typeof (result as any).id === 'string' && 
                            ((result as any).id.includes('existing') || (result as any).last_edited_time);
          
          results.push({
            user: userName,
            success: true,
            pagesUpdated: 1,
            created: action === 'bulk_add' && !wasExisting ? 1 : 0,
            skipped: wasSkipped ? 1 : 0,
            message: wasSkipped ? `Lecture ${lectureNumber} already exists - duplicate prevented` : 'Success'
          });
          successfulUpdates++;
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
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate summary - more intelligent reporting
    const actualSuccesses = results.filter(r => r.success).length;
    const actualFailures = results.filter(r => !r.success && !(r as any).skipped).length;
    const skippedUsers = results.filter(r => (r as any).skipped).length;
    const pagesCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
    
    // Count users with proper setup (have both token and page ID)
    const usersWithSetup = Object.keys(NOTION_TOKENS).filter(userName => 
      NOTION_TOKENS[userName] && COURSE_PAGE_IDS[userName]
    ).length;
    
    let message: string;
    if (actualSuccesses === usersWithSetup && usersWithSetup > 0) {
      message = `All ${usersWithSetup} configured Notion databases updated successfully`;
    } else if (actualSuccesses > 0) {
      message = `${actualSuccesses}/${usersWithSetup} configured Notion databases updated successfully`;
    } else if (usersWithSetup === 0) {
      message = 'No Notion databases are properly configured. Please check environment variables.';
    } else {
      message = 'No Notion databases could be updated';
    }
    
    // Include helpful setup information in the message
    if (skippedUsers > 0) {
      message += ` (${skippedUsers} user(s) skipped due to missing configuration)`;
    }

    const response = {
      success: actualSuccesses > 0,
      message,
      results,
      summary: {
        successfulUpdates: actualSuccesses,
        failedUpdates: actualFailures,
        skippedUsers,
        usersWithSetup,
        pagesCreated
      }
    };

    console.log(`📊 Update summary:`, response.summary);

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in Notion database update function:', error);
    
    return res.status(500).json({
      success: false,
      message: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      results: [],
      summary: {
        successfulUpdates: 0,
        failedUpdates: 3,
        pagesCreated: 0
      }
    });
  }
}