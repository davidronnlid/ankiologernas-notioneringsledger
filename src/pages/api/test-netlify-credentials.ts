import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;

  console.log(`🔍 Testing Netlify credentials...`);
  console.log(`🔐 API Token exists: ${!!netlifyApiToken}`);
  console.log(`🏗️ Site ID: ${netlifySiteId}`);

  if (!netlifyApiToken || !netlifySiteId) {
    return res.status(500).json({
      success: false,
      message: 'Netlify API credentials saknas',
      hasToken: !!netlifyApiToken,
      hasSiteId: !!netlifySiteId
    });
  }

  try {
    // Test site access
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${netlifyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({
        success: false,
        message: `Netlify API test failed: ${response.status}`,
        error: errorText
      });
    }

    const siteInfo = await response.json();
    
    return res.status(200).json({
      success: true,
      message: 'Netlify API credentials are working',
      site: {
        name: siteInfo.name,
        id: siteInfo.id,
        url: siteInfo.url
      }
    });

  } catch (error) {
    console.error('Netlify API test error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test Netlify API',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 