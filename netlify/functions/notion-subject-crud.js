const { Client } = require('@notionhq/client');

// Subject areas for Klinisk medicin 4
const SUBJECT_AREAS = [
  'Global hälsa',
  'Geriatrik', 
  'Pediatrik',
  'Öron-Näsa-Hals',
  'Gynekologi & Obstetrik',
  'Oftalmologi'
];

// Mapping from subject area to database environment variable suffix
const SUBJECT_TO_DB_SUFFIX = {
  'Global hälsa': 'GLOBAL_HALSA',
  'Geriatrik': 'GERIATRIK',
  'Pediatrik': 'PEDIATRIK',
  'Öron-Näsa-Hals': 'ORON_NASA_HALS',
  'Gynekologi & Obstetrik': 'GYNEKOLOGI_OBSTETRIK',
  'Oftalmologi': 'OFTALMOLOGI'
};

// User name to letter mapping
const USER_LETTERS = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

// Get database environment variable names for a user and subject
function getNotionEnvVars(userName, subjectArea) {
  const dbSuffix = SUBJECT_TO_DB_SUFFIX[subjectArea];
  return {
    tokenKey: `NOTION_TOKEN_${userName.toUpperCase()}`,
    databaseKey: `NOTION_DATABASE_${userName.toUpperCase()}_${dbSuffix}`
  };
}

// Helper function to convert app lecture data to Notion properties
function lectureToNotionProperties(lecture, userAction) {
  const properties = {
    'Föreläsning': {
      title: [
        {
          text: {
            content: lecture.title
          }
        }
      ]
    }
  };

  // Add date and time combined if provided
  if (lecture.date && lecture.time) {
    const [startTime, endTime] = lecture.time.split('-');
    const dateTimeString = `${lecture.date} ${startTime}${endTime ? ` - ${endTime}` : ''}`;
    properties['Date and Time'] = {
      rich_text: [
        {
          text: {
            content: dateTimeString
          }
        }
      ]
    };
  } else if (lecture.date) {
    properties['Date and Time'] = {
      rich_text: [
        {
          text: {
            content: lecture.date
          }
        }
      ]
    };
  }

  // Handle Person field (what used to be Vems) - user-specific
  if (userAction) {
    const userLetter = USER_LETTERS[userAction.user];
    
    if (userAction.action === 'select') {
      properties['Person'] = {
        rich_text: [
          {
            text: {
              content: userLetter
            }
          }
        ]
      };
    } else if (userAction.action === 'unselect') {
      properties['Person'] = {
        rich_text: [
          {
            text: {
              content: ''
            }
          }
        ]
      };
    }
  }

  // Add URL if provided
  if (lecture.url) {
    properties['URL'] = {
      url: lecture.url
    };
  }

  return properties;
}

// Create operation - Add new lecture to subject-specific databases
async function createLecture(lectureData, userAction) {
  const results = [];
  const { subjectArea } = lectureData;
  
  // Update all users' databases for this subject
  for (const userName of ['David', 'Albin', 'Mattias']) {
    const { tokenKey, databaseKey } = getNotionEnvVars(userName, subjectArea);
    const token = process.env[tokenKey];
    const databaseId = process.env[databaseKey];
    
    if (!token || !databaseId) {
      console.warn(`⚠️ Missing Notion config for ${userName} - ${subjectArea}`);
      results.push({
        user: userName,
        success: false,
        error: `Missing Notion configuration for ${subjectArea}`
      });
      continue;
    }

    try {
      const notion = new Client({ auth: token });
      
      const properties = lectureToNotionProperties(lectureData, userAction);
      
      const newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties
      });
      
      console.log(`✅ Created lecture in ${userName}'s ${subjectArea} database: ${lectureData.title}`);
      results.push({
        user: userName,
        success: true,
        pageId: newPage.id,
        operation: 'create'
      });
      
    } catch (error) {
      console.error(`❌ Failed to create lecture in ${userName}'s ${subjectArea} database:`, error);
      results.push({
        user: userName,
        success: false,
        error: error.message,
        operation: 'create'
      });
    }
  }
  
  return results;
}

// Update operation - Modify existing lecture in subject-specific database
async function updateLecture(lectureData, userAction) {
  const results = [];
  const { subjectArea } = lectureData;
  
  for (const userName of ['David', 'Albin', 'Mattias']) {
    const { tokenKey, databaseKey } = getNotionEnvVars(userName, subjectArea);
    const token = process.env[tokenKey];
    const databaseId = process.env[databaseKey];
    
    if (!token || !databaseId) {
      console.warn(`⚠️ Missing Notion config for ${userName} - ${subjectArea}`);
      results.push({
        user: userName,
        success: false,
        error: `Missing Notion configuration for ${subjectArea}`
      });
      continue;
    }

    try {
      const notion = new Client({ auth: token });
      
      // Search for existing lecture
      const searchResponse = await notion.databases.query({
        database_id: databaseId,
        filter: {
          property: 'Föreläsning',
          title: {
            contains: lectureData.title
          }
        }
      });
      
      if (searchResponse.results.length === 0) {
        // Create new page if not found
        console.log(`📝 Lecture not found, creating new in ${userName}'s ${subjectArea} database: ${lectureData.title}`);
        const createResult = await createLecture(lectureData, userAction);
        results.push(...createResult.filter(r => r.user === userName));
        continue;
      }
      
      // Update existing page(s)
      for (const page of searchResponse.results) {
        const properties = lectureToNotionProperties(lectureData, userAction);
        
        await notion.pages.update({
          page_id: page.id,
          properties
        });
        
        console.log(`✅ Updated lecture in ${userName}'s ${subjectArea} database: ${lectureData.title}`);
      }
      
      results.push({
        user: userName,
        success: true,
        pagesUpdated: searchResponse.results.length,
        operation: 'update'
      });
      
    } catch (error) {
      console.error(`❌ Failed to update lecture in ${userName}'s ${subjectArea} database:`, error);
      results.push({
        user: userName,
        success: false,
        error: error.message,
        operation: 'update'
      });
    }
  }
  
  return results;
}

// Read status from Notion for a specific user and lecture
async function readLectureStatus(lectureData, userName) {
  const { subjectArea } = lectureData;
  const { tokenKey, databaseKey } = getNotionEnvVars(userName, subjectArea);
  const token = process.env[tokenKey];
  const databaseId = process.env[databaseKey];
  
  if (!token || !databaseId) {
    console.warn(`⚠️ Missing Notion config for ${userName} - ${subjectArea}`);
    return null;
  }

  try {
    const notion = new Client({ auth: token });
    
    // Search for existing lecture
    const searchResponse = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Föreläsning',
        title: {
          contains: lectureData.title
        }
      }
    });
    
    if (searchResponse.results.length > 0) {
      const page = searchResponse.results[0];
      const statusProperty = page.properties?.Status;
      
      if (statusProperty?.select?.name) {
        return statusProperty.select.name;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ Failed to read status from ${userName}'s ${subjectArea} database:`, error);
    return null;
  }
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { operation, lectureData, userAction } = JSON.parse(event.body);
    
    console.log(`🎯 Notion Subject CRUD operation: ${operation} for ${lectureData.subjectArea}`, { lectureData, userAction });

    if (!lectureData.subjectArea) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'subjectArea is required for all operations' })
      };
    }

    let results = [];
    
    switch (operation) {
      case 'create':
        results = await createLecture(lectureData, userAction);
        break;
        
      case 'update':
        results = await updateLecture(lectureData, userAction);
        break;
        
      case 'read_status':
        if (!userAction?.user) {
          return {
            statusCode: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ error: 'User is required for read_status operation' })
          };
        }
        const status = await readLectureStatus(lectureData, userAction.user);
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({
            success: true,
            operation: 'read_status',
            subjectArea: lectureData.subjectArea,
            status,
            user: userAction.user
          })
        };
        
      default:
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({ error: `Unknown operation: ${operation}. DELETE operations are strictly prohibited.` })
        };
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: successCount > 0,
        operation,
        subjectArea: lectureData.subjectArea,
        databaseUsed: `${lectureData.subjectArea} databases`,
        message: `${operation} operation completed for ${lectureData.subjectArea}: ${successCount} successful, ${failureCount} failed`,
        results,
        summary: {
          successful: successCount,
          failed: failureCount,
          total: results.length
        }
      })
    };

  } catch (error) {
    console.error('❌ Notion Subject CRUD error:', error);
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