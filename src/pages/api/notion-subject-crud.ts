import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';
import { SubjectArea } from '../../types/lecture';
import { getNotionEnvVars } from '../../utils/subjectAreas';

// User name to letter mapping
const USER_LETTERS: { [key: string]: string } = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

interface NotionSubjectCRUDRequest {
  operation: 'create' | 'update' | 'read_status';
  lectureData: {
    id?: string;
    title: string;
    lectureNumber: number;
    date: string;
    time: string;
    lecturer?: string;
    subjectArea: SubjectArea;
  };
  userAction?: {
    user: string;
    action: 'select' | 'unselect' | 'modify';
  };
}

// Helper function to convert app lecture data to Notion properties
function lectureToNotionProperties(lecture: any, userAction?: any) {
  const properties: any = {
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
async function createLecture(lectureData: any, userAction?: any) {
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
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'create'
      });
    }
  }
  
  return results;
}

// Update operation - Modify existing lecture in subject-specific database
async function updateLecture(lectureData: any, userAction?: any) {
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
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'update'
      });
    }
  }
  
  return results;
}

// Read status from Notion for a specific user and lecture
async function readLectureStatus(lectureData: any, userName: string) {
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
      const page = searchResponse.results[0] as any;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestData: NotionSubjectCRUDRequest = req.body;
    const { operation, lectureData, userAction } = requestData;
    
    console.log(`🎯 Notion Subject CRUD operation: ${operation} for ${lectureData.subjectArea}`, { lectureData, userAction });

    if (!lectureData.subjectArea) {
      return res.status(400).json({ error: 'subjectArea is required for all operations' });
    }

    let results: any[] = [];
    
    switch (operation) {
      case 'create':
        results = await createLecture(lectureData, userAction);
        break;
        
      case 'update':
        results = await updateLecture(lectureData, userAction);
        break;
        
      case 'read_status':
        if (!userAction?.user) {
          return res.status(400).json({ error: 'User is required for read_status operation' });
        }
        const status = await readLectureStatus(lectureData, userAction.user);
        return res.status(200).json({
          success: true,
          operation: 'read_status',
          subjectArea: lectureData.subjectArea,
          status,
          user: userAction.user
        });
        
      default:
        return res.status(400).json({ error: `Unknown operation: ${operation}. DELETE operations are strictly prohibited.` });
    }
    
    const successCount = results.filter((r: any) => r.success).length;
    const failureCount = results.filter((r: any) => !r.success).length;
    
    return res.status(200).json({
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
    });

  } catch (error) {
    console.error('❌ Notion Subject CRUD error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}