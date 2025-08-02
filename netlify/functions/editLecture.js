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

  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const client = new MongoClient(uri);

  try {
    const { id, title, date, time, subjectArea, duration } = JSON.parse(event.body);

    if (!id || !title || !date || !time || !subjectArea) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    console.log('📝 Editing lecture in MongoDB:', { id, title, date, time, subjectArea, duration });

    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB for lecture edit");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    // Try to update by custom id field first (used in our system)
    let result = await collection.updateOne(
      { id: id },
      { 
        $set: { 
          title: title.trim(),
          date, 
          time,
          subjectArea,
          updatedAt: new Date().toISOString(),
          updatedBy: 'System' // In production, get from authentication
        } 
      }
    );

    // If no match with custom id, try with MongoDB _id
    if (result.matchedCount === 0 && ObjectId.isValid(id)) {
      result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            title: title.trim(),
            date, 
            time,
            subjectArea,
            updatedAt: new Date().toISOString(),
            updatedBy: 'System'
          } 
        }
      );
    }

    if (result.matchedCount === 0) {
      console.log('❌ Lecture not found with id:', id);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Lecture not found',
          details: `No lecture found with id: ${id}`
        })
      };
    }

    console.log('✅ Lecture updated successfully in MongoDB:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Lecture updated successfully',
        lectureId: id,
        modifiedCount: result.modifiedCount
      })
    };

  } catch (error) {
    console.error('❌ Error editing lecture:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'Unknown error'
      })
    };
  } finally {
    await client.close();
    console.log("Database connection closed");
  }
};