import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userName, notionToken, databaseId, testConnection = true } = req.body;
    
    if (!userName || !['David', 'Albin', 'Mattias'].includes(userName)) {
      return res.status(400).json({ 
        error: 'Invalid user name. Must be David, Albin, or Mattias' 
      });
    }

    if (!notionToken || !notionToken.startsWith('secret_')) {
      return res.status(400).json({ 
        error: 'Invalid Notion token. Must start with "secret_"' 
      });
    }

    if (!databaseId || databaseId.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid database ID. Must be a valid Notion database ID' 
      });
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
        
        const databaseTitle = (database as any).title?.[0]?.plain_text || 'Untitled';
        const properties = Object.keys(database.properties);
        
        console.log(`✅ Connection test successful for ${userName}:`, databaseTitle);
        
        // Check for required properties
        const requiredProperties = ['Name', 'Föreläsning', 'Vems'];
        const missingProperties = requiredProperties.filter(prop => !properties.includes(prop));
        
        if (missingProperties.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Database missing required properties',
            missingProperties,
            currentProperties: properties,
            instructions: `Please add these columns to your Notion database: ${missingProperties.join(', ')}`
          });
        }
        
      } catch (error) {
        console.error(`❌ Connection test failed for ${userName}:`, error);
        return res.status(400).json({
          success: false,
          error: 'Failed to connect to Notion database',
          details: error instanceof Error ? error.message : 'Unknown error',
          possibleCauses: [
            'Invalid token or database ID',
            'Database not shared with integration',
            'Integration permissions insufficient'
          ]
        });
      }
    }

    // In a real implementation, you would save to Netlify environment variables here
    // For now, we'll simulate the save and provide instructions
    
    const envVars = {
      [`NOTION_TOKEN_${userName.toUpperCase()}`]: notionToken,
      [`NOTION_DATABASE_${userName.toUpperCase()}`]: databaseId
    };

    console.log(`💾 Would save environment variables for ${userName}:`, Object.keys(envVars));

    // TODO: Implement actual Netlify API call to save environment variables
    // This would require:
    // 1. Netlify API access token
    // 2. Site ID
    // 3. Call to Netlify API to update environment variables
    // 4. Trigger a new deployment

    return res.status(200).json({
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
        netlifyPath: 'Site settings → Environment variables'
      },
      testConnection: testConnection ? {
        success: true,
        message: 'Connection test passed'
      } : null
    });

  } catch (error) {
    console.error('❌ Notion setup save error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save Notion setup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}