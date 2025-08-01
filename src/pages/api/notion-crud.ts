import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

// Notion API tokens for each user
const NOTION_TOKENS: { [key: string]: string | undefined } = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Database IDs for each user's lecture database
const DATABASE_IDS: { [key: string]: string | undefined } = {
  'David': process.env.NOTION_DATABASE_DAVID,
  'Albin': process.env.NOTION_DATABASE_ALBIN,
  'Mattias': process.env.NOTION_DATABASE_MATTIAS
};

// User name to letter mapping
const USER_LETTERS: { [key: string]: string } = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

interface NotionLecture {
  id: string;
  title: string;
  lectureNumber: number;
  date: string;
  time: string;
  lecturer?: string;
  vems: string[];
  checkboxState: {
    [key: string]: {
      confirm: boolean;
      unwish: boolean;
    };
  };
}

interface CRUDRequest {
  operation: 'create' | 'read' | 'update' | 'delete' | 'sync';
  lectureData?: {
    id?: string;
    title: string;
    lectureNumber: number;
    date: string;
    time: string;
    lecturer?: string;
  };
  userAction?: {
    user: string;
    action: 'select' | 'unselect' | 'modify';
  };
  syncOptions?: {
    direction: 'to_notion' | 'from_notion' | 'bidirectional';
    users: string[];
  };
}

// Helper function to convert app lecture data to Notion properties
function lectureToNotionProperties(lecture: any, userAction?: any) {
  const properties: any = {
    'Name': {
      title: [
        {
          text: {
            content: `${lecture.lectureNumber}. ${lecture.title}`
          }
        }
      ]
    },
    'Föreläsning': {
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
      vems = vems.filter((letter: string) => letter !== userLetter);
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
function notionPageToLecture(page: any): NotionLecture {
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
  const checkboxState: any = {
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
async function createLecture(lectureData: any, userAction?: any) {
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
      
      if (!databaseId) {
        throw new Error(`No database ID for ${userName}`);
      }
      
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
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'create'
      });
    }
  }
  
  return results;
}

// Read operation - Get lectures from Notion databases
async function readLectures(users: string[] = ['David', 'Albin', 'Mattias']) {
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
      
      if (!databaseId) {
        throw new Error(`No database ID for ${userName}`);
      }
      
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
        error: error instanceof Error ? error.message : 'Unknown error',
        lectures: [],
        operation: 'read'
      });
    }
  }
  
  return results;
}

// Update operation - Modify existing lecture
async function updateLecture(lectureData: any, userAction?: any) {
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
      
      if (!databaseId) {
        throw new Error(`No database ID for ${userName}`);
      }
      
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
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'update'
      });
    }
  }
  
  return results;
}

// Delete operation - Remove lecture from databases
async function deleteLecture(lectureData: any) {
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
      
      if (!databaseId) {
        throw new Error(`No database ID for ${userName}`);
      }
      
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
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'delete'
      });
    }
  }
  
  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestData: CRUDRequest = req.body;
    const { operation, lectureData, userAction, syncOptions } = requestData;
    
    console.log(`🎯 Notion CRUD operation: ${operation}`, { lectureData, userAction });

    let results: any[] = [];
    
    switch (operation) {
      case 'create':
        if (!lectureData) {
          return res.status(400).json({ error: 'lectureData required for create operation' });
        }
        results = await createLecture(lectureData, userAction);
        break;
        
      case 'read':
        const users = syncOptions?.users || ['David', 'Albin', 'Mattias'];
        results = await readLectures(users);
        break;
        
      case 'update':
        if (!lectureData) {
          return res.status(400).json({ error: 'lectureData required for update operation' });
        }
        results = await updateLecture(lectureData, userAction);
        break;
        
      case 'delete':
        if (!lectureData) {
          return res.status(400).json({ error: 'lectureData required for delete operation' });
        }
        results = await deleteLecture(lectureData);
        break;
        
      case 'sync':
        // Bi-directional sync operation
        const readResults = await readLectures(syncOptions?.users);
        results = readResults;
        break;
        
      default:
        return res.status(400).json({ error: `Unknown operation: ${operation}` });
    }
    
    const successCount = results.filter((r: any) => r.success).length;
    const failureCount = results.filter((r: any) => !r.success).length;
    
    return res.status(200).json({
      success: successCount > 0,
      operation,
      message: `${operation} operation completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        successful: successCount,
        failed: failureCount,
        total: results.length
      }
    });

  } catch (error) {
    console.error('❌ Notion CRUD error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}