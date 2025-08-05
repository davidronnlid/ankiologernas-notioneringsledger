exports.handler = async function(event, context) {
  console.log('🧪 Testing Netlify API...');
  
  const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;
  
  console.log(`🔐 API Token exists: ${!!netlifyApiToken}`);
  console.log(`🏗️ Site ID: ${netlifySiteId}`);
  
  if (!netlifyApiToken || !netlifySiteId) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Missing Netlify API credentials',
        hasToken: !!netlifyApiToken,
        hasSiteId: !!netlifySiteId
      })
    };
  }
  
  try {
    // Test site access
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
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: `Site access failed: ${siteResponse.status}`,
          error: errorText
        })
      };
    }
    
    const siteInfo = await siteResponse.json();
    
    // Test environment variables access
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
    
    let envVars = [];
    if (envResponse.ok) {
      envVars = await envResponse.json();
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Netlify API test successful',
        site: {
          name: siteInfo.name,
          id: siteInfo.id,
          url: siteInfo.url
        },
        envVars: {
          count: envVars.length,
          keys: envVars.map(env => env.key)
        }
      })
    };
    
  } catch (error) {
    console.error('Netlify API test error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Failed to test Netlify API',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 