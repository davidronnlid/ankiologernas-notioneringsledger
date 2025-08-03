const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
};

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const client = new MongoClient(uri);

  try {
    const { lectureId, action, userFullName } = JSON.parse(event.body);

    // Authentication check for lecture deletion
    const allowedNames = ["David Rönnlid", "Albin Lindberg", "Mattias Österdahl"];
    if (!userFullName || !allowedNames.includes(userFullName)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: "Unauthorized",
          message: "Only authorized users (David, Albin, or Mattias) can delete lectures"
        })
      };
    }

    if (!lectureId || action !== 'deleteLecture') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          message: 'lectureId and action=deleteLecture are required'
        })
      };
    }

    console.log('🗑️ Deleting lecture from MongoDB:', lectureId);

    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB for lecture deletion");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    // Try to delete the lecture by id
    const deleteResult = await collection.deleteOne({ id: lectureId });

    if (deleteResult.deletedCount === 0) {
      // If no document was deleted, try to find it first to see if it exists
      const existingLecture = await collection.findOne({ id: lectureId });
      
      if (!existingLecture) {
        console.log('⚠️ Lecture not found in MongoDB:', lectureId);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Lecture not found',
            message: `Lecture with id ${lectureId} was not found in the database`
          })
        };
      } else {
        console.log('❌ Failed to delete lecture despite it existing:', lectureId);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Delete operation failed',
            message: 'Lecture exists but could not be deleted'
          })
        };
      }
    }

    console.log('✅ Successfully deleted lecture from MongoDB:', lectureId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Lecture deleted successfully from MongoDB',
        lectureId: lectureId,
        deletedCount: deleteResult.deletedCount
      })
    };

  } catch (error) {
    console.error('❌ Error deleting lecture:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  } finally {
    console.log("Closing MongoDB connection...");
    await client.close();
  }
};