const { Client } = require('@notionhq/client');

// Notion API tokens for each user
const NOTION_TOKENS = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Database IDs for each user's lecture database
const DATABASE_IDS = {
  'David': process.env.NOTION_DATABASE_DAVID,
  'Albin': process.env.NOTION_DATABASE_ALBIN,
  'Mattias': process.env.NOTION_DATABASE_MATTIAS
};

// User name to letter mapping
const USER_LETTERS = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

// Helper function to convert app lecture data to Notion properties
function lectureToNotionProperties(lecture, userAction) {
  const properties = {
    'Name': {
      title: [
        {
          text: {
            content: `${lecture.lectureNumber}. ${lecture.title}`
          }
        }
      ]
    },
    'Föreläsningsnamn': {
      rich_text: [
        {
          text: {
            content: lecture.title
          }
        }
      ]
    }
  };

  // Add date if provided
  if (lecture.date) {
    properties['Datum'] = {
      date: {
        start: lecture.date
      }
    };
  }

  // Add time if provided
  if (lecture.time) {
    properties['Tid'] = {
      rich_text: [
        {
          text: {
            content: lecture.time
          }
        }
      ]
    };
  }

  // Add lecturer if provided
  if (lecture.lecturer) {
    properties['Föreläsare'] = {
      rich_text: [
        {
          text: {
            content: lecture.lecturer
          }
        }
      ]
    };
  }

  // Handle Vems tags for user selection
  if (userAction) {
    const userLetter = USER_LETTERS[userAction.user];
    let vems = lecture.vems || [];
    
    if (userAction.action === 'select' && !vems.includes(userLetter)) {
      vems.push(userLetter);
    } else if (userAction.action === 'unselect') {
      vems = vems.filter(letter => letter !== userLetter);
    }
    
    properties['Vems'] = {
      rich_text: [
        {
          text: {
            content: vems.join(', ')
          }
        }
      ]
    };
  }

  return properties;
}

// Helper function to convert Notion page to app lecture data
function notionPageToLecture(page) {
  const props = page.properties;
  
  // Extract title and lecture number
  const fullTitle = props.Name?.title?.[0]?.plain_text || '';
  const titleMatch = fullTitle.match(/^(\d+)\.\s*(.+)$/);
  const lectureNumber = titleMatch ? parseInt(titleMatch[1]) : 0;
  const title = titleMatch ? titleMatch[2] : fullTitle;
  
  // Extract other properties
  const date = props.Datum?.date?.start || '';
  const time = props.Tid?.rich_text?.[0]?.plain_text || '';
  const lecturer = props.Föreläsare?.rich_text?.[0]?.plain_text || '';
  const vemsText = props.Vems?.rich_text?.[0]?.plain_text || '';
  const vems = vemsText ? vemsText.split(', ').filter(Boolean) : [];
  
  // Convert Vems to checkbox state
  const checkboxState = {
    David: { confirm: vems.includes('D'), unwish: false },
    Albin: { confirm: vems.includes('A'), unwish: false },
    Mattias: { confirm: vems.includes('M'), unwish: false }
  };

  return {
    id: page.id,
    title,
    lectureNumber,
    date,
    time,
    lecturer,
    vems,
    checkboxState
  };
}

// Create operation - Add new lecture to all databases
async function createLecture(lectureData, userAction) {
  const results = [];
  
  for (const [userName, token] of Object.entries(NOTION_TOKENS)) {
    if (!token || !DATABASE_IDS[userName]) {
      console.warn(`⚠️ Missing Notion config for ${userName}`);
      results.push({
        user: userName,
        success: false,
        error: 'Missing Notion configuration'
      });
      continue;
    }

    try {
      const notion = new Client({ auth: token });
      const databaseId = DATABASE_IDS[userName];
      
      const properties = lectureToNotionProperties(lectureData, userAction);
      
      const newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties
      });
      
      console.log(`✅ Created lecture in ${userName}'s database: ${lectureData.title}`);
      results.push({
        user: userName,
        success: true,
        pageId: newPage.id,
        operation: 'create'
      });
      
    } catch (error) {
      console.error(`❌ Failed to create lecture in ${userName}'s database:`, error);
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

// Read operation - Get lectures from Notion databases
async function readLectures(users = ['David', 'Albin', 'Mattias']) {
  const results = [];
  
  for (const userName of users) {
    const token = NOTION_TOKENS[userName];
    const databaseId = DATABASE_IDS[userName];
    
    if (!token || !databaseId) {
      console.warn(`⚠️ Missing Notion config for ${userName}`);
      results.push({
        user: userName,
        success: false,
        error: 'Missing Notion configuration',
        lectures: []
      });
      continue;
    }

    try {
      const notion = new Client({ auth: token });
      
      const response = await notion.databases.query({
        database_id: databaseId,
        sorts: [
          {
            property: 'Name',
            direction: 'ascending'
          }
        ]
      });
      
      const lectures = response.results.map(notionPageToLecture);
      
      console.log(`✅ Read ${lectures.length} lectures from ${userName}'s database`);
      results.push({
        user: userName,
        success: true,
        lectures,
        operation: 'read'
      });
      
    } catch (error) {
      console.error(`❌ Failed to read from ${userName}'s database:`, error);
      results.push({
        user: userName,
        success: false,
        error: error.message,
        lectures: [],
        operation: 'read'
      });
    }
  }
  
  return results;
}

// Update operation - Modify existing lecture
async function updateLecture(lectureData, userAction) {
  const results = [];
  
  for (const [userName, token] of Object.entries(NOTION_TOKENS)) {
    if (!token || !DATABASE_IDS[userName]) {
      console.warn(`⚠️ Missing Notion config for ${userName}`);
      results.push({
        user: userName,
        success: false,
        error: 'Missing Notion configuration'
      });
      continue;
    }

    try {
      const notion = new Client({ auth: token });
      const databaseId = DATABASE_IDS[userName];
      
      // Search for existing lecture
      const searchResponse = await notion.databases.query({
        database_id: databaseId,
        filter: {
          or: [
            {
              property: 'Name',
              title: {
                contains: lectureData.title
              }
            },
            {
              property: 'Name',
              title: {
                contains: `${lectureData.lectureNumber}.`
              }
            }
          ]
        }
      });
      
      if (searchResponse.results.length === 0) {
        // Create new page if not found
        console.log(`📝 Lecture not found, creating new: ${lectureData.title}`);
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
        
        console.log(`✅ Updated lecture in ${userName}'s database: ${lectureData.title}`);
      }
      
      results.push({
        user: userName,
        success: true,
        pagesUpdated: searchResponse.results.length,
        operation: 'update'
      });
      
    } catch (error) {
      console.error(`❌ Failed to update lecture in ${userName}'s database:`, error);
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

// Delete operation - Remove lecture from databases
async function deleteLecture(lectureData) {
  const results = [];
  
  for (const [userName, token] of Object.entries(NOTION_TOKENS)) {
    if (!token || !DATABASE_IDS[userName]) {
      console.warn(`⚠️ Missing Notion config for ${userName}`);
      results.push({
        user: userName,
        success: false,
        error: 'Missing Notion configuration'
      });
      continue;
    }

    try {
      const notion = new Client({ auth: token });
      const databaseId = DATABASE_IDS[userName];
      
      // Search for lecture to delete
      const searchResponse = await notion.databases.query({
        database_id: databaseId,
        filter: {
          or: [
            {
              property: 'Name',
              title: {
                contains: lectureData.title
              }
            },
            {
              property: 'Name',
              title: {
                contains: `${lectureData.lectureNumber}.`
              }
            }
          ]
        }
      });
      
      // Delete matching pages
      let deletedCount = 0;
      for (const page of searchResponse.results) {
        await notion.pages.update({
          page_id: page.id,
          archived: true
        });
        deletedCount++;
      }
      
      console.log(`✅ Deleted ${deletedCount} lectures from ${userName}'s database`);
      results.push({
        user: userName,
        success: true,
        pagesDeleted: deletedCount,
        operation: 'delete'
      });
      
    } catch (error) {
      console.error(`❌ Failed to delete lecture from ${userName}'s database:`, error);
      results.push({
        user: userName,
        success: false,
        error: error.message,
        operation: 'delete'
      });
    }
  }
  
  return results;
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
    const { operation, lectureData, userAction, syncOptions } = JSON.parse(event.body);
    
    console.log(`🎯 Notion CRUD operation: ${operation}`, { lectureData, userAction });

    let results = [];
    
    switch (operation) {
      case 'create':
        if (!lectureData) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'lectureData required for create operation' })
          };
        }
        results = await createLecture(lectureData, userAction);
        break;
        
      case 'read':
        const users = syncOptions?.users || ['David', 'Albin', 'Mattias'];
        results = await readLectures(users);
        break;
        
      case 'update':
        if (!lectureData) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'lectureData required for update operation' })
          };
        }
        results = await updateLecture(lectureData, userAction);
        break;
        
      case 'delete':
        if (!lectureData) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'lectureData required for delete operation' })
          };
        }
        results = await deleteLecture(lectureData);
        break;
        
      case 'sync':
        // Bi-directional sync operation
        const readResults = await readLectures(syncOptions?.users);
        results = readResults;
        break;
        
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown operation: ${operation}` })
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
        message: `${operation} operation completed: ${successCount} successful, ${failureCount} failed`,
        results,
        summary: {
          successful: successCount,
          failed: failureCount,
          total: results.length
        }
      })
    };

  } catch (error) {
    console.error('❌ Notion CRUD error:', error);
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