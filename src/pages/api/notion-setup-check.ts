import { NextApiRequest, NextApiResponse } from 'next';

interface NotionSetupStatus {
  user: string;
  hasToken: boolean;
  hasDatabase: boolean;
  isSetupComplete: boolean;
  needsSetup: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userName } = req.body;
    
    if (!userName || !['David', 'Albin', 'Mattias'].includes(userName)) {
      return res.status(400).json({ 
        error: 'Invalid user name. Must be David, Albin, or Mattias' 
      });
    }

    console.log(`🔍 Checking Notion setup for ${userName}...`);

    // Check environment variables for this user
    const tokenKey = `NOTION_TOKEN_${userName.toUpperCase()}`;
    const databaseKey = `NOTION_DATABASE_${userName.toUpperCase()}`;
    
    const hasToken = !!process.env[tokenKey];
    const hasDatabase = !!process.env[databaseKey];
    const isSetupComplete = hasToken && hasDatabase;
    const needsSetup = !isSetupComplete;

    const status: NotionSetupStatus = {
      user: userName,
      hasToken,
      hasDatabase,
      isSetupComplete,
      needsSetup
    };

    console.log(`📊 Notion setup status for ${userName}:`, status);

    // If setup is complete, test the connection
    let connectionTest = null;
    if (isSetupComplete) {
      try {
        const { Client } = require('@notionhq/client');
        const notion = new Client({ auth: process.env[tokenKey] });
        
        const database = await notion.databases.retrieve({
          database_id: process.env[databaseKey]
        });
        
        connectionTest = {
          success: true,
          databaseTitle: (database as any).title?.[0]?.plain_text || 'Untitled',
          properties: Object.keys(database.properties)
        };
        
        console.log(`✅ ${userName}'s Notion connection verified`);
      } catch (error) {
        console.error(`❌ ${userName}'s Notion connection failed:`, error);
        connectionTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        };
      }
    }

    return res.status(200).json({
      success: true,
      ...status,
      connectionTest,
      message: needsSetup 
        ? `${userName} needs to set up Notion integration`
        : `${userName}'s Notion integration is configured`,
      setupInstructions: needsSetup ? {
        tokenNeeded: !hasToken,
        databaseNeeded: !hasDatabase,
        steps: [
          "Go to https://www.notion.so/my-integrations",
          "Create a new integration for Ankiologernas Notioneringsledger",
          "Copy the Integration Token (starts with 'secret_')",
          "Create or find your lecture database in Notion",
          "Share the database with your integration",
          "Copy the database ID from the URL"
        ]
      } : null
    });

  } catch (error) {
    console.error('❌ Notion setup check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check Notion setup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}