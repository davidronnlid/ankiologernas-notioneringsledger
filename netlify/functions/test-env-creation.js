exports.handler = async function(event, context) {
  console.log('🧪 Testing environment variable creation...');
  
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
    // Test creating a simple environment variable
    const testKey = 'TEST_ENV_VAR_' + Date.now();
    const testValue = 'test-value-' + Date.now();
    
    console.log(`➕ Testing creation of: ${testKey} = ${testValue}`);
    
    const createResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}/env`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${netlifyApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: testKey,
          value: testValue,
          context: 'production'
        })
      }
    );
    
    console.log(`📡 Create response status: ${createResponse.status}`);
    console.log(`📡 Create response headers:`, Object.fromEntries(createResponse.headers.entries()));
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`❌ Create failed: ${createResponse.status} - ${errorText}`);
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: `Environment variable creation failed: ${createResponse.status}`,
          error: errorText,
          testKey: testKey,
          responseHeaders: Object.fromEntries(createResponse.headers.entries())
        })
      };
    }
    
    const createResult = await createResponse.json();
    console.log(`✅ Create successful:`, createResult);
    
    // Now try to delete the test variable
    console.log(`🗑️ Cleaning up test variable: ${testKey}`);
    
    const deleteResponse = await fetch(
      `https://api.netlify.com/api/v1/sites/${netlifySiteId}/env/${testKey}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${netlifyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`📡 Delete response status: ${deleteResponse.status}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Environment variable creation test successful',
        testKey: testKey,
        createResult: createResult,
        deleteStatus: deleteResponse.status
      })
    };
    
  } catch (error) {
    console.error('Environment variable creation test error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Failed to test environment variable creation',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};