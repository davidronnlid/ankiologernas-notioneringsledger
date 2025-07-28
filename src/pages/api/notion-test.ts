import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

// User name to letter mapping
const USER_LETTERS: { [key: string]: string } = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lectureTitle, lectureNumber, selectedByUser, action } = req.body;
    
    console.log(`🎯 Notion test: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle}`);

    // Validate required fields
    if (!lectureTitle || !lectureNumber || !selectedByUser || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: lectureTitle, lectureNumber, selectedByUser, action' 
      });
    }

    const userLetter = USER_LETTERS[selectedByUser];
    if (!userLetter) {
      return res.status(400).json({ 
        error: `Unknown user: ${selectedByUser}. Expected David, Albin, or Mattias` 
      });
    }

    // Test only David's integration for now
    const userName = 'David';
    const token = NOTION_TOKENS[userName];
    const databaseId = DATABASE_IDS[userName];

    if (!token || !databaseId) {
      return res.status(500).json({
        error: `Missing Notion config for ${userName}`,
        details: {
          hasToken: !!token,
          hasDatabase: !!databaseId
        }
      });
    }

    const notion = new Client({ auth: token });

    // Search for the lecture in David's database
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        or: [
          {
            property: 'Name',
            title: {
              contains: lectureTitle
            }
          },
          {
            property: 'Name', 
            title: {
              contains: `${lectureNumber}.`
            }
          }
        ]
      }
    });

    let pagesToUpdate = response.results;

    // If no matching lecture found, create a new one
    if (pagesToUpdate.length === 0) {
      console.log(`📝 Creating new lecture page: ${lectureNumber}. ${lectureTitle}`);
      
      const initialVems = action === 'select' ? [userLetter] : [];
      
      const newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Name': {
            title: [
              {
                text: {
                  content: `${lectureNumber}. ${lectureTitle}`
                }
              }
            ]
          },
          'Föreläsningsnamn': {
            rich_text: [
              {
                text: {
                  content: lectureTitle
                }
              }
            ]
          },
          'Vems': {
            rich_text: [
              {
                text: {
                  content: initialVems.join(', ')
                }
              }
            ]
          }
        }
      });
      
      console.log(`✅ Created new lecture page: ${lectureTitle}`);
      pagesToUpdate = [newPage];
    } else {
      // Update existing page
      const page = pagesToUpdate[0];
      const pageId = page.id;
      
      // Get current Vems tags
      const pageWithProps = page as any;
      const currentVemsText = pageWithProps.properties?.Vems?.rich_text?.[0]?.plain_text || '';
      const currentVemsNames = currentVemsText ? currentVemsText.split(', ') : [];
      
      let newVems = [...currentVemsNames];
      
      if (action === 'select') {
        // Add user letter if not already present
        if (!currentVemsNames.includes(userLetter)) {
          newVems.push(userLetter);
        }
      } else if (action === 'unselect') {
        // Remove user letter if present
        newVems = newVems.filter(letter => letter !== userLetter);
      }

      // Update the page with new Vems tags
      await notion.pages.update({
        page_id: pageId,
        properties: {
          'Vems': {
            rich_text: [
              {
                text: {
                  content: newVems.join(', ')
                }
              }
            ]
          }
        }
      });

      console.log(`✅ Updated Notion: ${lectureTitle} -> Vems: [${newVems.join(', ')}]`);
    }

    return res.status(200).json({
      success: true,
      message: `Notion test completed for lecture: ${lectureTitle}`,
      result: {
        user: userName,
        success: true,
        pagesUpdated: pagesToUpdate.length,
        created: response.results.length === 0 ? 1 : 0
      }
    });

  } catch (error) {
    console.error('❌ Notion test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 