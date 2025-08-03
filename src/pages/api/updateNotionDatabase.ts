import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

// Notion API tokens for each user (store in environment variables)
const NOTION_TOKENS: { [key: string]: string | undefined } = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Single database ID per user (one database for all subjects)
const NOTION_DATABASES: { [key: string]: string | undefined } = {
  'David': process.env.NOTION_DATABASE_DAVID,
  'Albin': process.env.NOTION_DATABASE_ALBIN,
  'Mattias': process.env.NOTION_DATABASE_MATTIAS
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

// Helper function to get or create database with proper schema
async function ensureDatabaseSchema(notion: Client, databaseId: string, userName: string) {
  try {
    // Get current database properties
    const database = await notion.databases.retrieve({ database_id: databaseId });
    console.log(`📊 Checking database schema for ${userName}: ${databaseId}`);
    
    const currentProperties = database.properties;
    const updates: any = {};
    let needsUpdate = false;

    // Required properties for our lecture tracking system
    const requiredProperties: any = {
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
        database_id: databaseId,
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
async function addLectureToDatabase(notion: Client, databaseId: string, lectureTitle: string, lectureNumber: number, subjectArea: string, selectedByUser: string, action: string) {
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
        const currentPerson = (existingLecture as any).properties?.['Person']?.select?.name || null;
        
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

        const updateProperties: any = {
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
              url: `https://ankiologernas-notioneringsledger.netlify.app`
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { lectureTitle, lectureNumber, selectedByUser, subjectArea, action } = req.body;
    
    // Handle special mapping for dronnlid -> David (consistent with frontend)
    if (selectedByUser && selectedByUser.toLowerCase().includes('dronnlid')) {
      console.log(`🔄 Mapping dronnlid to David for backend processing`);
      selectedByUser = 'David';
    }
    
    console.log(`🎯 Notion database update: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle} (${subjectArea})`);
    console.log(`📊 Processing for all users: ${Object.keys(NOTION_TOKENS).join(', ')}`);

    // Validate required fields
    if (!lectureTitle || !lectureNumber || !selectedByUser || !subjectArea || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: lectureTitle, lectureNumber, selectedByUser, subjectArea, action' 
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

      const databaseId = NOTION_DATABASES[userName];
      if (!databaseId) {
        console.warn(`⚠️ No Notion database ID found for ${userName}, skipping...`);
        results.push({
          user: userName,
          success: false,
          error: 'No Notion database configured'
        });
        continue;
      }

      try {
        const notion = new Client({ auth: token });
        
        // Step 1: Ensure database has correct schema
        await ensureDatabaseSchema(notion, databaseId, userName);
        
        // Step 2: Add or update the lecture in the database
        const result = await addLectureToDatabase(notion, databaseId, lectureTitle, lectureNumber, subjectArea, selectedByUser, action);
        
        if (result) {
          results.push({
            user: userName,
            success: true,
            pagesUpdated: 1,
            created: action === 'bulk_add' && !(result as any).id?.startsWith('existing') ? 1 : 0
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
          error: error instanceof Error ? error.message : 'Unknown error'
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