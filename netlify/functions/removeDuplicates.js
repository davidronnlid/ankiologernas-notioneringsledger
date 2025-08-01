const { MongoClient } = require("mongodb");

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

  if (event.httpMethod !== "DELETE") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const client = new MongoClient(uri);

  try {
    const { lectureIds } = JSON.parse(event.body);

    if (!lectureIds || !Array.isArray(lectureIds) || lectureIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing or invalid lectureIds array",
        }),
      };
    }

    console.log(`🗑️ Attempting to remove ${lectureIds.length} duplicate lectures:`, lectureIds);

    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB for duplicate removal");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    // Remove lectures by their custom id field
    const result = await collection.deleteMany({
      id: { $in: lectureIds }
    });

    console.log(`✅ Successfully removed ${result.deletedCount} duplicate lectures from MongoDB`);

    if (result.deletedCount === 0) {
      console.log("⚠️ No lectures were found with the provided IDs");
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: "No lectures found with the provided IDs",
          details: `Searched for IDs: ${lectureIds.join(", ")}`,
          deletedCount: 0
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully removed ${result.deletedCount} duplicate lectures`,
        deletedCount: result.deletedCount,
        requestedIds: lectureIds,
        deletedIds: lectureIds.slice(0, result.deletedCount) // Assume all were deleted if counts match
      }),
    };

  } catch (error) {
    console.error("❌ Error removing duplicate lectures:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message || "Unknown error occurred",
      }),
    };
  } finally {
    await client.close();
    console.log("Database connection closed");
  }
};