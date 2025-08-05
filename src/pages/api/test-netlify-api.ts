import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('🧪 Testing Netlify API credentials...');

  const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;

  console.log(`🔍 Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`🔐 API Token exists: ${!!netlifyApiToken} (length: ${netlifyApiToken?.length || 0})`);
  console.log(`🏗️ Site ID: ${netlifySiteId}`);

  if (!netlifyApiToken || !netlifySiteId) {
    return res.status(400).json({
      success: false,
      message: 'Missing Netlify API credentials',
      hasToken: !!netlifyApiToken,
      hasSiteId: !!netlifySiteId
    });
  }

  try {
    // Test site access
    console.log(`🔗 Testing URL: https://api.netlify.com/api/v1/sites/${netlifySiteId}`);
    
    const siteResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${netlifyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`📡 Site response status: ${siteResponse.status}`);

    if (!siteResponse.ok) {
      const errorText = await siteResponse.text();
      console.error(`❌ Site access failed: ${siteResponse.status} - ${errorText}`);
      
      return res.status(500).json({
        success: false,
        message: `Site access failed: ${siteResponse.status}`,
        details: errorText,
        status: siteResponse.status
      });
    }

    const siteInfo = await siteResponse.json();
    console.log(`✅ Site access OK: ${siteInfo.name} (${siteInfo.id})`);

    // Test environment variables access
    console.log(`📋 Testing environment variables access...`);
    
    const envResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}/env`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${netlifyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`📡 Env response status: ${envResponse.status}`);

    if (!envResponse.ok) {
      const errorText = await envResponse.text();
      console.error(`❌ Env access failed: ${envResponse.status} - ${errorText}`);
      
      return res.status(500).json({
        success: false,
        message: `Environment variables access failed: ${envResponse.status}`,
        details: errorText,
        status: envResponse.status
      });
    }

    const envVars = await envResponse.json();
    console.log(`✅ Env access OK: ${envVars.length} variables`);

    return res.status(200).json({
      success: true,
      message: 'Netlify API credentials are working correctly',
      site: {
        name: siteInfo.name,
        id: siteInfo.id,
        url: siteInfo.url
      },
      environment: {
        variableCount: envVars.length,
        variables: envVars.map((env: any) => env.key)
      }
    });

  } catch (error) {
    console.error('❌ Netlify API test error:', error);
    
    return res.status(500).json({
      success: false,
      message: `Netlify API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 