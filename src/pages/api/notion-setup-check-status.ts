import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userName } = req.body;

    if (!userName) {
      return res.status(400).json({
        isSetup: false,
        error: 'Användarnamn krävs'
      });
    }

    // Check if user has required environment variables
    const tokenKey = `NOTION_TOKEN_${userName.toUpperCase()}`;
    const pageKey = `NOTION_COURSE_PAGE_${userName.toUpperCase()}`;
    
    const token = process.env[tokenKey];
    const pageId = process.env[pageKey];
    
    const hasToken = !!token;
    const hasPageId = !!pageId;

    console.log(`🔍 Checking Notion setup for ${userName}:`);
    console.log(`   Token (${tokenKey}): ${hasToken ? '✅' : '❌'}`);
    console.log(`   Page ID (${pageKey}): ${hasPageId ? '✅' : '❌'}`);

    // For the new page-based system, we need BOTH token AND page ID
    // If user only has token (old database system), they need to reconfigure
    if (hasToken && !hasPageId) {
      console.log(`⚠️ ${userName} has old token but no page ID - needs reconfiguration`);
      return res.status(200).json({
        isSetup: false,
        hasToken: true,
        hasPageId: false,
        needsReconfiguration: true,
        development: process.env.NODE_ENV === 'development',
        message: 'Notion integration behöver uppdateras till nya systemet'
      });
    }

    // If they have both, let's actually test the configuration
    if (hasToken && hasPageId) {
      try {
        console.log(`🧪 Testing actual Notion configuration for ${userName}...`);
        
        // Import Notion client dynamically
        const { Client } = require('@notionhq/client');
        const notion = new Client({ auth: token });

        // Try to retrieve the specific page to verify it exists and we have access
        await notion.pages.retrieve({ page_id: pageId });
        
        console.log(`✅ ${userName}'s page-based Notion integration is working`);
        
        return res.status(200).json({
          isSetup: true,
          hasToken: true,
          hasPageId: true,
          verified: true,
          development: process.env.NODE_ENV === 'development',
          message: 'Notion integration är konfigurerad och verifierad'
        });
        
      } catch (notionError: any) {
        console.error(`❌ ${userName}'s Notion config failed verification:`, notionError.message);
        
        return res.status(200).json({
          isSetup: false,
          hasToken: true,
          hasPageId: true,
          verified: false,
          error: `Konfigurationen fungerar inte: ${notionError.message}`,
          development: process.env.NODE_ENV === 'development',
          message: 'Notion integration behöver omkonfigureras'
        });
      }
    }

    // Neither token nor page ID - completely new setup needed
    return res.status(200).json({
      isSetup: false,
      hasToken: false,
      hasPageId: false,
      development: process.env.NODE_ENV === 'development',
      message: 'Notion integration behöver konfigureras'
    });

  } catch (error) {
    console.error('❌ Error checking setup status:', error);
    
    return res.status(500).json({
      isSetup: false,
      error: `Serverfel: ${error instanceof Error ? error.message : 'Okänt fel'}`
    });
  }
}