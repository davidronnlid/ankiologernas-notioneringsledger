import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔍 Simple Notion save test - Method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userName, notionToken, databaseId } = req.body;
  
  console.log('📋 Received data:', {
    userName: userName,
    hasToken: !!notionToken,
    hasDatabase: !!databaseId
  });

  // Basic validation
  if (!userName || !notionToken) {
    return res.status(400).json({
      success: false,
      message: 'userName and notionToken are required'
    });
  }

  // Check environment
  const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;
  
  console.log('🔧 Environment check:', {
    hasNetlifyToken: !!netlifyApiToken,
    hasSiteId: !!netlifySiteId,
    nodeEnv: process.env.NODE_ENV
  });

  if (!netlifyApiToken || !netlifySiteId) {
    return res.status(500).json({
      success: false,
      message: 'Missing Netlify API credentials',
      hasToken: !!netlifyApiToken,
      hasSiteId: !!netlifySiteId
    });
  }

  try {
    // Just try to create ONE environment variable
    const envKey = `NOTION_TOKEN_${userName.toUpperCase()}`;
    
    console.log(`🚀 Attempting to create: ${envKey}`);
    
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}/env`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${netlifyApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: envKey,
          values: [{ 
            value: notionToken, 
            context: 'production',
            scopes: ['builds', 'functions']
          }]
        })
      }
    );

    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      
      return res.status(500).json({
        success: false,
        message: `Netlify API error: ${response.status}`,
        details: errorText,
        status: response.status
      });
    }

    const result = await response.json();
    console.log(`✅ Success:`, result);

    return res.status(200).json({
      success: true,
      message: 'Environment variable created successfully',
      key: envKey,
      result: result
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Unexpected error occurred',
      error: error instanceof Error ? error.message : String(error),
      type: error instanceof Error ? error.name : 'Unknown'
    });
  }
}