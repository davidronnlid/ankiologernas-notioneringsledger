import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('🧪 Testing actual environment variable creation...');

  const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
  const netlifySiteId = process.env.NETLIFY_SITE_ID;

  if (!netlifyApiToken || !netlifySiteId) {
    return res.status(400).json({
      success: false,
      message: 'Missing Netlify API credentials'
    });
  }

  // Test creating a simple environment variable
  const testKey = 'TEST_VAR_' + Date.now();
  const testValue = 'test-value-' + Date.now();

  console.log(`🔧 Testing creation of: ${testKey} = ${testValue}`);

  try {
    // Try to create a test environment variable
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
          values: [{ 
            value: testValue, 
            context: 'production',
            scopes: ['builds', 'functions', 'runtime', 'post-processing']
          }]
        })
      }
    );

    console.log(`📡 Create response status: ${createResponse.status}`);
    console.log(`📡 Create response headers:`, Object.fromEntries(createResponse.headers.entries()));
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(`❌ Failed to create test env var: ${createResponse.status} - ${errorText}`);
      
      return res.status(500).json({
        success: false,
        message: `Failed to create test env var: ${createResponse.status}`,
        details: errorText,
        status: createResponse.status,
        headers: Object.fromEntries(createResponse.headers.entries())
      });
    }

    const createResult = await createResponse.json();
    console.log(`✅ Created test env var:`, createResult);

    // Now try to delete it to clean up
    try {
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

      console.log(`🗑️ Delete response status: ${deleteResponse.status}`);
      
      if (deleteResponse.ok) {
        console.log(`✅ Cleaned up test env var`);
      } else {
        console.warn(`⚠️ Failed to clean up test env var: ${deleteResponse.status}`);
      }
    } catch (deleteError) {
      console.warn(`⚠️ Error cleaning up test env var:`, deleteError);
    }

    return res.status(200).json({
      success: true,
      message: 'Environment variable creation test successful',
      testKey: testKey,
      createResult: createResult,
      testFormat: {
        key: testKey,
        values: [{ 
          value: testValue, 
          context: 'production',
          scopes: ['builds', 'functions', 'runtime', 'post-processing']
        }]
      }
    });

  } catch (error) {
    console.error('❌ Test env var creation error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return res.status(500).json({
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.name : 'Unknown',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}