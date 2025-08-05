import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userName, notionToken, databaseId } = req.body;

  console.log('🔍 Debugging Notion setup save process...');
  console.log(`👤 User: ${userName}`);
  console.log(`🔑 Token: ${notionToken ? notionToken.substring(0, 20) + '...' : 'MISSING'}`);
  console.log(`📄 Database ID: ${databaseId || 'MISSING'}`);

  const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;

  console.log(`🔐 API Token exists: ${!!netlifyApiToken} (length: ${netlifyApiToken?.length || 0})`);
  console.log(`🏗️ Site ID: ${netlifySiteId}`);

  // Prepare environment variables to set
  const envVars: { [key: string]: string } = {
    [`NOTION_TOKEN_${userName.toUpperCase()}`]: notionToken
  };

  if (databaseId) {
    envVars[`NOTION_COURSE_PAGE_${userName.toUpperCase()}`] = databaseId;
  }

  console.log(`🌐 Will attempt to set these env vars:`, Object.keys(envVars));

  try {
    // Get current environment variables
    console.log(`📋 Fetching current environment variables...`);
    const getCurrentEnvResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}/env`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${netlifyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`📡 Env vars response status: ${getCurrentEnvResponse.status}`);
    
    if (!getCurrentEnvResponse.ok) {
      const errorText = await getCurrentEnvResponse.text();
      console.error(`❌ Failed to get current env vars: ${getCurrentEnvResponse.status} - ${errorText}`);
      return res.status(500).json({
        success: false,
        message: `Failed to get current env vars: ${getCurrentEnvResponse.status}`,
        details: errorText
      });
    }

    const currentEnvVars = await getCurrentEnvResponse.json();
    console.log(`📋 Current env vars: ${currentEnvVars.length} variables`);
    console.log(`📋 Existing env var keys:`, currentEnvVars.map((env: any) => env.key));

    // Check which variables will be created vs updated
    const results = [];
    
    for (const [key, value] of Object.entries(envVars)) {
      const existingVar = currentEnvVars.find((env: any) => env.key === key);
      
      if (existingVar) {
        console.log(`🔄 Will UPDATE existing variable: ${key}`);
        results.push({ key, action: 'update', exists: true });
      } else {
        console.log(`➕ Will CREATE new variable: ${key}`);
        results.push({ key, action: 'create', exists: false });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Debug analysis complete',
      userName: userName,
      willSetVariables: Object.keys(envVars),
      analysis: results,
      currentEnvVars: currentEnvVars.map((env: any) => env.key),
      netlifyCredentials: {
        hasToken: !!netlifyApiToken,
        hasSiteId: !!netlifySiteId,
        siteId: netlifySiteId
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    
    return res.status(500).json({
      success: false,
      message: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 