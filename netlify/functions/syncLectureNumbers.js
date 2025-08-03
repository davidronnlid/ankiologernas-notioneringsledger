const { Client } = require('@notionhq/client');

// Retry function for handling transient failures
async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message || 'Unknown error');
      
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

// Helper function to find the database on the course page
async function findCourseDatabase(notion, coursePageId, userName) {
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

    throw new Error(`No database found on ${userName}'s course page`);
    
  } catch (error) {
    console.error(`❌ Failed to find database on ${userName}'s course page:`, error);
    throw error;
  }
}

// Extract clean title without lecture number
const extractCleanTitle = (fullTitle) => {
  // Remove lecture number pattern like "1. ", "23. ", etc.
  return fullTitle.replace(/^\d+\.\s*/, '').trim();
};

// Extract lecture number from title
const extractLectureNumber = (fullTitle) => {
  const match = fullTitle.match(/^(\d+)\.\s*/);
  return match ? parseInt(match[1], 10) : null;
};

// Format lecture title with number
const formatLectureTitle = (lectureNumber, cleanTitle) => {
  return `${lectureNumber}. ${cleanTitle}`;
};

// Check and update lecture numbers in Notion database
async function syncLectureNumbers(notion, databaseId, appLectures, userName) {
  try {
    console.log(`🔍 Syncing lecture numbers for ${userName}...`);
    
    // Get all lectures from Notion database
    const notionLectures = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Föreläsning',
          direction: 'ascending'
        }
      ]
    });

    console.log(`📊 Found ${notionLectures.results.length} lectures in Notion database`);
    console.log(`📊 App has ${appLectures.length} lectures`);

    let updatedCount = 0;

    // Process each Notion lecture
    for (const notionPage of notionLectures.results) {
      const notionTitle = notionPage.properties?.Föreläsning?.title?.[0]?.text?.content || '';
      const cleanTitle = extractCleanTitle(notionTitle);
      const notionNumber = extractLectureNumber(notionTitle);

      if (!cleanTitle || !notionNumber) {
        console.log(`⚠️ Skipping lecture with invalid title format: "${notionTitle}"`);
        continue;
      }

      // Find matching lecture in app data
      const matchingAppLecture = appLectures.find(appLecture => {
        const appCleanTitle = extractCleanTitle(appLecture.title);
        return appCleanTitle.toLowerCase() === cleanTitle.toLowerCase();
      });

      if (matchingAppLecture) {
        const appNumber = matchingAppLecture.lectureNumber;
        
        // Check if numbers match
        if (notionNumber !== appNumber) {
          console.log(`🔄 Number mismatch found: "${notionTitle}" (Notion: ${notionNumber}, App: ${appNumber})`);
          
          const correctTitle = formatLectureTitle(appNumber, cleanTitle);
          
          // Update the Notion page with correct title
          await notion.pages.update({
            page_id: notionPage.id,
            properties: {
              'Föreläsning': {
                title: [
                  {
                    type: 'text',
                    text: {
                      content: correctTitle
                    }
                  }
                ]
              }
            }
          });

          console.log(`✅ Updated: "${notionTitle}" → "${correctTitle}"`);
          updatedCount++;
        } else {
          console.log(`✅ Numbers match: "${notionTitle}" (${notionNumber})`);
        }
      } else {
        console.log(`⚠️ No matching app lecture found for: "${notionTitle}"`);
      }
    }

    console.log(`🎉 Lecture number sync completed for ${userName}: ${updatedCount} lectures updated`);
    return {
      totalLectures: notionLectures.results.length,
      updatedCount,
      userName
    };

  } catch (error) {
    console.error(`❌ Error syncing lecture numbers for ${userName}:`, error);
    throw error;
  }
}

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { lectures, userName } = JSON.parse(event.body);
    
    console.log(`🎯 Lecture number sync requested for ${userName}`);
    console.log(`📊 Processing ${lectures?.length || 0} lectures`);

    // Validate required fields
    if (!lectures || !Array.isArray(lectures) || !userName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: lectures (array), userName' 
        })
      };
    }

    // Validate user
    if (!NOTION_TOKENS[userName]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `Unknown user: ${userName}. Expected David, Albin, Mattias` 
        })
      };
    }

    const token = NOTION_TOKENS[userName];
    const pageId = COURSE_PAGE_IDS[userName];
    
    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `No Notion token configured for ${userName}` 
        })
      };
    }

    if (!pageId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `No course page ID configured for ${userName}` 
        })
      };
    }

    try {
      console.log(`🔄 Processing ${userName}'s Notion database...`);
      
      const notion = new Client({ auth: token });
      
      // Step 1: Get the user's specific course page with retry logic
      console.log(`📄 Getting course page for ${userName}...`);
      const coursePage = await retryOperation(() => getUserCoursePage(notion, userName), 3);
      
      // Step 2: Find the database on the course page with retry logic
      console.log(`🗄️ Finding database for ${userName}...`);
      const database = await retryOperation(() => findCourseDatabase(notion, coursePage.id, userName), 3);
      
      // Step 3: Sync lecture numbers with retry logic
      console.log(`🔄 Syncing lecture numbers for ${userName}...`);
      const result = await retryOperation(() => syncLectureNumbers(notion, database.id, lectures, userName), 3);
      
      console.log(`✅ Successfully synced lecture numbers for ${userName}`);
      
      const response = {
        success: true,
        message: `Lecture numbers synced successfully for ${userName}`,
        result,
        summary: {
          totalLectures: result.totalLectures,
          updatedCount: result.updatedCount,
          userName: result.userName
        }
      };

      console.log(`📊 Sync summary:`, response.summary);

      return {
        statusCode: 200,
        body: JSON.stringify(response)
      };

    } catch (error) {
      console.error(`❌ Failed to sync lecture numbers for ${userName}:`, error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: `Failed to sync lecture numbers for ${userName}: ${error.message || 'Unknown error'}`,
          error: error.message || 'Unknown error'
        })
      };
    }

  } catch (error) {
    console.error('❌ Error in lecture number sync function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Server error: ${error.message || 'Unknown error'}`,
        error: error.message || 'Unknown error'
      })
    };
  }
}; 