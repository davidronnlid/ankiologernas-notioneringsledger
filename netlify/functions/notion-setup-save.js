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
    const { userName, notionToken, databaseId, testConnection = true } = JSON.parse(event.body);
    
    if (!userName || !['David', 'Albin', 'Mattias'].includes(userName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid user name. Must be David, Albin, or Mattias' 
        })
      };
    }

    if (!notionToken || !notionToken.startsWith('secret_')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid Notion token. Must start with "secret_"' 
        })
      };
    }

    if (!databaseId || databaseId.length < 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid database ID. Must be a valid Notion database ID' 
        })
      };
    }

    console.log(`🔧 Setting up Notion integration for ${userName}...`);

    // Test the connection before saving
    if (testConnection) {
      try {
        const { Client } = require('@notionhq/client');
        const notion = new Client({ auth: notionToken });
        
        const database = await notion.databases.retrieve({
          database_id: databaseId
        });
        
        const databaseTitle = database.title?.[0]?.plain_text || 'Untitled';
        const properties = Object.keys(database.properties);
        
        console.log(`✅ Connection test successful for ${userName}:`, databaseTitle);
        
        // Check for required properties
        const requiredProperties = ['Name', 'Föreläsningsnamn', 'Vems'];
        const missingProperties = requiredProperties.filter(prop => !properties.includes(prop));
        
        if (missingProperties.length > 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              success: false,
              error: 'Database missing required properties',
              missingProperties,
              currentProperties: properties,
              instructions: `Please add these columns to your Notion database: ${missingProperties.join(', ')}`
            })
          };
        }
        
      } catch (error) {
        console.error(`❌ Connection test failed for ${userName}:`, error);
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Failed to connect to Notion database',
            details: error.message,
            possibleCauses: [
              'Invalid token or database ID',
              'Database not shared with integration',
              'Integration permissions insufficient'
            ]
          })
        };
      }
    }

    // In production, this would save to Netlify environment variables
    // For now, we'll provide manual setup instructions
    
    const envVars = {
      [`NOTION_TOKEN_${userName.toUpperCase()}`]: notionToken,
      [`NOTION_DATABASE_${userName.toUpperCase()}`]: databaseId
    };

    console.log(`💾 Would save environment variables for ${userName}:`, Object.keys(envVars));

    // TODO: Implement actual Netlify API call to save environment variables
    // This would require:
    // 1. Netlify API access token in environment
    // 2. Site ID
    // 3. Call to Netlify API to update environment variables
    // 4. Trigger a new deployment

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        message: `Notion integration configured for ${userName}`,
        user: userName,
        savedVariables: Object.keys(envVars),
        nextSteps: [
          'Environment variables would be saved to Netlify',
          'A new deployment would be triggered',
          'The integration would be active after deployment'
        ],
        manualSetup: {
          instructions: 'For now, please manually add these environment variables to Netlify:',
          variables: envVars,
          netlifyPath: 'Site settings → Environment variables → Add variable'
        },
        testConnection: testConnection ? {
          success: true,
          message: 'Connection test passed'
        } : null
      })
    };

  } catch (error) {
    console.error('❌ Notion setup save error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to save Notion setup',
        details: error.message
      })
    };
  }
};