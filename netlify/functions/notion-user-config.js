const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  const client = new MongoClient(uri);

  try {
    console.log('🔍 Notion user config function called');
    console.log(`📡 Method: ${event.httpMethod}`);
    
    await client.connect();
    console.log("Connected to database.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("notion_user_configs");

    if (event.httpMethod === "GET") {
      // Get user's Notion configuration
      const { userEmail } = event.queryStringParameters || {};
      
      if (!userEmail) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'userEmail parameter required'
          })
        };
      }

      console.log(`📋 Getting config for user: ${userEmail}`);
      
      const userConfig = await collection.findOne({ userEmail });
      
      if (userConfig) {
        console.log(`✅ Found config for ${userEmail}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            config: {
              userEmail: userConfig.userEmail,
              notionToken: userConfig.notionToken ? 'SET' : null, // Don't expose the actual token
              databaseId: userConfig.databaseId,
              isSetup: !!(userConfig.notionToken && userConfig.databaseId),
              updatedAt: userConfig.updatedAt
            }
          })
        };
      } else {
        console.log(`❌ No config found for ${userEmail}`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            config: {
              userEmail,
              notionToken: null,
              databaseId: null,
              isSetup: false
            }
          })
        };
      }

    } else if (event.httpMethod === "POST") {
      // Save user's Notion configuration
      const { userEmail, notionToken, databaseId } = JSON.parse(event.body);
      
      if (!userEmail || !notionToken || !databaseId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'userEmail, notionToken, and databaseId are required'
          })
        };
      }

      // Basic token validation
      if (!notionToken.startsWith('secret_') && !notionToken.startsWith('ntn_')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'Token måste börja med "secret_" eller "ntn_"'
          })
        };
      }

      console.log(`💾 Saving config for user: ${userEmail}`);
      
      const configDoc = {
        userEmail,
        notionToken,
        databaseId,
        updatedAt: new Date(),
        createdAt: new Date()
      };

      // Upsert (update if exists, insert if not)
      const result = await collection.replaceOne(
        { userEmail },
        configDoc,
        { upsert: true }
      );

      console.log(`✅ Config saved for ${userEmail}:`, result);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Notion configuration saved successfully',
          config: {
            userEmail,
            notionToken: 'SET',
            databaseId,
            isSetup: true,
            updatedAt: configDoc.updatedAt
          }
        })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Method not allowed'
        })
      };
    }

  } catch (error) {
    console.error('❌ Error in notion-user-config:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: `Serverfel: ${error instanceof Error ? error.message : 'Okänt fel'}`
      })
    };
  } finally {
    await client.close();
  }
};