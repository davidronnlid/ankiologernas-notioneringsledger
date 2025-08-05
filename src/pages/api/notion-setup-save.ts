import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userName, notionToken, databaseId, testTokenOnly, saveToNetlify, testConnection } = req.body;

    if (!userName || !notionToken) {
      return res.status(400).json({
        success: false,
        message: 'Användarnamn och notion token krävs'
      });
    }

    // If only testing token, do a basic validation and return
    if (testTokenOnly) {
      console.log(`🧪 Testing token only for ${userName}...`);
      
      // Basic token validation (check format)
      if (!notionToken.startsWith('secret_')) {
        return res.status(400).json({
          success: false,
          error: 'Token måste börja med "secret_"'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Token format validerat',
        tokenValid: true
      });
    }

    console.log(`💾 Saving Notion configuration for ${userName}...`);

    // Check if we should save to Netlify or just validate
    if (!saveToNetlify && !testConnection) {
      return res.status(400).json({
        success: false,
        message: 'Antingen saveToNetlify eller testConnection måste vara true'
      });
    }

    // In development, just log the configuration but don't actually save to Netlify
    if (process.env.NODE_ENV === 'development' && saveToNetlify) {
      console.log(`📝 Development mode - would save:`);
      console.log(`   NOTION_TOKEN_${userName.toUpperCase()}=${notionToken.substring(0, 20)}...`);
      if (databaseId) {
        console.log(`   NOTION_COURSE_PAGE_${userName.toUpperCase()}=${databaseId}`);
      }
      
      // For development, let's simulate success but note it's not actually saved
      return res.status(200).json({
        success: true,
        message: 'Konfiguration sparad till Netlify (simulerat i development mode)',
        development: true
      });
    }

    // In production, use Netlify API to set environment variables
    const netlifyApiToken = process.env.NETLIFY_API_TOKEN;
    const netlifySiteId = process.env.NETLIFY_SITE_ID;

    console.log(`🔐 API Token exists: ${!!netlifyApiToken} (length: ${netlifyApiToken?.length || 0})`);
    console.log(`🏗️ Site ID: ${netlifySiteId}`);

    if (!netlifyApiToken || !netlifySiteId) {
      console.error('❌ Missing Netlify API credentials');
      return res.status(500).json({
        success: false,
        message: 'Serverfel: Netlify API inte konfigurerad'
      });
    }

    // Test basic site access first
    console.log(`🧪 Testing basic site access...`);
    try {
      const siteTestResponse = await fetch(
        `https://api.netlify.com/api/v1/sites/${netlifySiteId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${netlifyApiToken}`,
          }
        }
      );

      if (!siteTestResponse.ok) {
        const errorText = await siteTestResponse.text();
        console.error(`❌ Site access test failed: ${siteTestResponse.status} - ${errorText}`);
        return res.status(500).json({
          success: false,
          message: `Site access misslyckades: ${siteTestResponse.status} - Token kan inte komma åt site ${netlifySiteId}`
        });
      }

      const siteInfo = await siteTestResponse.json();
      console.log(`✅ Site access OK: ${siteInfo.name}`);
    } catch (siteError) {
      console.error(`❌ Site access error:`, siteError);
      return res.status(500).json({
        success: false,
        message: `Kunde inte kontakta Netlify API: ${siteError instanceof Error ? siteError.message : 'Okänt fel'}`
      });
    }

    // Prepare environment variables to set
    const envVars: { [key: string]: string } = {
      [`NOTION_TOKEN_${userName.toUpperCase()}`]: notionToken
    };

    if (databaseId) {
      envVars[`NOTION_COURSE_PAGE_${userName.toUpperCase()}`] = databaseId;
    }

    console.log(`🌐 Setting ${Object.keys(envVars).length} environment variables via Netlify API...`);

    // Get current environment variables
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

    if (!getCurrentEnvResponse.ok) {
      throw new Error(`Failed to get current env vars: ${getCurrentEnvResponse.status}`);
    }

    const currentEnvVars = await getCurrentEnvResponse.json();
    console.log(`📋 Current env vars: ${currentEnvVars.length} variables`);

    // Update/add each environment variable
    const results = [];
    
    for (const [key, value] of Object.entries(envVars)) {
      try {
        // Check if variable already exists
        const existingVar = currentEnvVars.find((env: any) => env.key === key);
        
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
                values: [{ value: value, context: 'all' }]
              })
            }
          );

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
                values: [{ value: value, context: 'all' }]
              })
            }
          );

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
        results.push({ key, status: 'error', error: 'exception' });
      }
    }

    // Check if all operations succeeded
    const successful = results.filter(r => r.status === 'created' || r.status === 'updated');
    const failed = results.filter(r => r.status === 'error');

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
        
        if (rebuildResponse.ok) {
          console.log(`✅ Rebuild triggered successfully`);
        } else {
          console.warn(`⚠️ Failed to trigger rebuild: ${rebuildResponse.status}`);
        }
      } catch (rebuildError) {
        console.warn(`⚠️ Error triggering rebuild:`, rebuildError);
      }

      return res.status(200).json({
        success: true,
        message: `Notion integration konfigurerad! Sidan bygger om för att aktivera integrationen.`,
        results: successful,
        rebuild: true
      });
      
    } else {
      console.error(`❌ ${failed.length} operations failed:`, failed);
      
      // Create detailed error message
      const errorDetails = failed.map(f => `${f.key}: ${f.error}${f.details ? ` (${f.details})` : ''}`).join(', ');
      
      return res.status(500).json({
        success: false,
        message: `Kunde inte spara environment variables: ${errorDetails}`,
        results: results,
        failed: failed
      });
    }

  } catch (error) {
    console.error('❌ Error in notion-setup-save:', error);
    
    return res.status(500).json({
      success: false,
      message: `Serverfel: ${error instanceof Error ? error.message : 'Okänt fel'}`
    });
  }
}