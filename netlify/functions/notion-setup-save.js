exports.handler = async function(event, context) {
  console.log('🔍 Notion setup save function called');
  
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { userName, notionToken, databaseId, testTokenOnly, saveToNetlify, testConnection } = JSON.parse(event.body);

    console.log(`👤 Processing setup for: ${userName}`);
    console.log(`🔑 Has token: ${!!notionToken}`);
    console.log(`📄 Has database ID: ${!!databaseId}`);

    if (!userName || !notionToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Användarnamn och notion token krävs'
        })
      };
    }

    // If only testing token, do a basic validation and return
    if (testTokenOnly) {
      console.log(`🧪 Testing token only for ${userName}...`);
      
      // Basic token validation (check format)
      if (!notionToken.startsWith('secret_') && !notionToken.startsWith('ntn_')) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Token måste börja med "secret_" eller "ntn_"'
          })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Token format validerat',
          tokenValid: true
        })
      };
    }

    console.log(`💾 Saving Notion configuration for ${userName}...`);

    // Check if we have Netlify API credentials
    const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
    const netlifySiteId = process.env.NETLIFY_SITE_ID;
    const isProduction = process.env.NODE_ENV === 'production';
    const hasNetlifyCredentials = netlifyApiToken && netlifySiteId;

    console.log(`🔍 Environment: ${process.env.NODE_ENV || 'unknown'}`);
    console.log(`🔐 API Token exists: ${!!netlifyApiToken} (length: ${netlifyApiToken?.length || 0})`);
    console.log(`🏗️ Site ID: ${netlifySiteId}`);
    console.log(`📦 Is Production: ${isProduction}`);
    console.log(`🔑 Has Netlify Credentials: ${hasNetlifyCredentials}`);

    // In development or when missing credentials, simulate the save
    if (!isProduction || !hasNetlifyCredentials) {
      console.log(`📝 ${!isProduction ? 'Development mode' : 'Missing Netlify credentials'} - simulating save:`);
      console.log(`   NOTION_TOKEN_${userName.toUpperCase()}=${notionToken.substring(0, 20)}...`);
      if (databaseId) {
        console.log(`   NOTION_COURSE_PAGE_${userName.toUpperCase()}=${databaseId}`);
      }
      
      // For development/missing credentials, simulate success
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: !isProduction 
            ? 'Konfiguration sparad till Netlify (simulerat i development mode)'
            : 'Konfiguration validerad (Netlify API ej konfigurerad)',
          development: !isProduction,
          simulated: true
        })
      };
    }

    // Test basic site access first
    console.log(`🧪 Testing basic site access...`);
    console.log(`🔗 Testing URL: https://api.netlify.com/api/v1/sites/${netlifySiteId}`);
    console.log(`🔑 Using token: ${netlifyApiToken ? netlifyApiToken.substring(0, 10) + '...' : 'MISSING'}`);
    
    try {
      const siteTestResponse = await fetch(
        `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${netlifyApiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`📡 Site test response status: ${siteTestResponse.status}`);
      
      if (!siteTestResponse.ok) {
        const errorText = await siteTestResponse.text();
        console.error(`❌ Site access test failed: ${siteTestResponse.status} - ${errorText}`);
        
        // More specific error messages based on status code
        let errorMessage = `Site access misslyckades: ${siteTestResponse.status}`;
        if (siteTestResponse.status === 401) {
          errorMessage = 'Netlify API token är ogiltig eller saknar behörighet';
        } else if (siteTestResponse.status === 404) {
          errorMessage = `Site ID "${netlifySiteId}" hittades inte - kontrollera NETLIFY_SITE_ID`;
        } else if (siteTestResponse.status === 403) {
          errorMessage = 'Netlify API token saknar behörighet för denna site';
        }
        
        return {
          statusCode: 500,
          body: JSON.stringify({
            success: false,
            message: errorMessage,
            details: errorText
          })
        };
      }

      const siteInfo = await siteTestResponse.json();
      console.log(`✅ Site access OK: ${siteInfo.name} (${siteInfo.id})`);
    } catch (siteError) {
      console.error(`❌ Site access error:`, siteError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: `Kunde inte kontakta Netlify API: ${siteError instanceof Error ? siteError.message : 'Okänt fel'}`,
          error: siteError instanceof Error ? siteError.message : 'Unknown error'
        })
      };
    }

    // Prepare environment variables to set
    const envVars = {
      [`NOTION_TOKEN_${userName.toUpperCase()}`]: notionToken
    };

    if (databaseId) {
      envVars[`NOTION_COURSE_PAGE_${userName.toUpperCase()}`] = databaseId;
    }

    console.log(`🌐 Setting ${Object.keys(envVars).length} environment variables via Netlify API...`);

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
      throw new Error(`Failed to get current env vars: ${getCurrentEnvResponse.status} - ${errorText}`);
    }

    const currentEnvVars = await getCurrentEnvResponse.json();
    console.log(`📋 Current env vars: ${currentEnvVars.length} variables`);
    console.log(`📋 Existing env var keys:`, currentEnvVars.map((env) => env.key));

    // Update/add each environment variable
    const results = [];
    
    for (const [key, value] of Object.entries(envVars)) {
      try {
        console.log(`🔧 Processing env var: ${key} = ${value.substring(0, 10)}...`);
        
        // Check if variable already exists
        const existingVar = currentEnvVars.find((env) => env.key === key);
        
        if (existingVar) {
          // Update existing variable
          console.log(`🔄 Updating existing variable: ${key}`);
          
          const updateResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${netlifySiteId}/env/${key}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${netlifyApiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                values: [{ 
                  value: value, 
                  context: 'production',
                  scopes: ['builds', 'functions', 'runtime', 'post-processing']
                }]
              })
            }
          );

          console.log(`📡 Update response status: ${updateResponse.status}`);
          
          if (updateResponse.ok) {
            console.log(`✅ Updated ${key}`);
            results.push({ key, status: 'updated' });
          } else {
            const errorText = await updateResponse.text();
            console.error(`❌ Failed to update ${key}: ${updateResponse.status} - ${errorText}`);
            results.push({ key, status: 'error', error: updateResponse.status, details: errorText });
          }
          
        } else {
          // Create new variable
          console.log(`➕ Creating new variable: ${key}`);
          
          const createResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${netlifySiteId}/env`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${netlifyApiToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                key: key,
                values: [{ 
                  value: value, 
                  context: 'production',
                  scopes: ['builds', 'functions', 'runtime', 'post-processing']
                }]
              })
            }
          );

          console.log(`📡 Create response status: ${createResponse.status}`);
          
          if (createResponse.ok) {
            console.log(`✅ Created ${key}`);
            results.push({ key, status: 'created' });
          } else {
            const errorText = await createResponse.text();
            console.error(`❌ Failed to create ${key}: ${createResponse.status} - ${errorText}`);
            results.push({ key, status: 'error', error: createResponse.status, details: errorText });
          }
        }
      } catch (varError) {
        console.error(`❌ Error processing ${key}:`, varError);
        results.push({ key, status: 'error', error: 'exception', details: varError instanceof Error ? varError.message : 'Unknown error' });
      }
    }

    // Check if all operations succeeded
    const successful = results.filter(r => r.status === 'created' || r.status === 'updated');
    const failed = results.filter(r => r.status === 'error');

    console.log(`📊 Results summary:`);
    console.log(`   ✅ Successful: ${successful.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(`   📋 All results:`, results);

    if (failed.length === 0) {
      console.log(`🎉 Successfully configured ${successful.length} environment variables`);
      
      // Trigger a rebuild to apply the new environment variables
      console.log(`🔄 Triggering site rebuild...`);
      
      try {
        const rebuildResponse = await fetch(
          `https://api.netlify.com/api/v1/sites/${netlifySiteId}/builds`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${netlifyApiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`📡 Rebuild response status: ${rebuildResponse.status}`);
        
        if (rebuildResponse.ok) {
          console.log(`✅ Rebuild triggered successfully`);
        } else {
          const rebuildErrorText = await rebuildResponse.text();
          console.warn(`⚠️ Failed to trigger rebuild: ${rebuildResponse.status} - ${rebuildErrorText}`);
        }
      } catch (rebuildError) {
        console.warn(`⚠️ Error triggering rebuild:`, rebuildError);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Notion integration konfigurerad! Sidan bygger om för att aktivera integrationen.`,
          results: successful,
          rebuild: true,
          userName: userName
        })
      };
      
    } else {
      console.error(`❌ ${failed.length} operations failed:`, failed);
      
      // Create detailed error message
      const errorDetails = failed.map(f => `${f.key}: ${f.error}${f.details ? ` (${f.details})` : ''}`).join(', ');
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: `Kunde inte spara environment variables: ${errorDetails}`,
          results: results,
          failed: failed,
          userName: userName,
          attemptedVars: Object.keys(envVars)
        })
      };
    }

  } catch (error) {
    console.error('❌ Error in notion-setup-save:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined
    });
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Serverfel: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        errorType: error instanceof Error ? error.name : 'Unknown',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      })
    };
  }
};