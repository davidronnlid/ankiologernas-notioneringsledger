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
    const { userName } = JSON.parse(event.body);
    
    if (!userName || !['David', 'Albin', 'Mattias'].includes(userName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid user name. Must be David, Albin, or Mattias' 
        })
      };
    }

    console.log(`🔍 Checking Notion setup for ${userName}...`);

    // Check environment variables for this user
    const tokenKey = `NOTION_TOKEN_${userName.toUpperCase()}`;
    const databaseKey = `NOTION_DATABASE_${userName.toUpperCase()}`;
    
    const hasToken = !!process.env[tokenKey];
    const hasDatabase = !!process.env[databaseKey];
    const isSetupComplete = hasToken && hasDatabase;
    const needsSetup = !isSetupComplete;

    const status = {
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
          databaseTitle: database.title?.[0]?.plain_text || 'Untitled',
          properties: Object.keys(database.properties)
        };
        
        console.log(`✅ ${userName}'s Notion connection verified`);
      } catch (error) {
        console.error(`❌ ${userName}'s Notion connection failed:`, error);
        connectionTest = {
          success: false,
          error: error.message
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
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
      })
    };

  } catch (error) {
    console.error('❌ Notion setup check error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to check Notion setup',
        details: error.message
      })
    };
  }
};