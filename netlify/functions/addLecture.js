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

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const client = new MongoClient(uri);

  try {
    console.log("Attempting to connect to database...");
    await client.connect();
    console.log("Connected to database.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    const { title, date, time, duration, course, userFullName } = JSON.parse(event.body);

    // Authentication check for lecture creation
    const allowedNames = ["David Rönnlid", "Albin Lindberg", "Mattias Österdahl"];
    if (!userFullName || !allowedNames.includes(userFullName)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: "Unauthorized",
          message: "Only authorized users (David, Albin, or Mattias) can create lectures"
        }),
      };
    }

    // Validate required fields
    if (!title || !date || !time || !course) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Missing required fields",
          details: "title, date, time, and course are required"
        }),
      };
    }

    // Create new lecture object
    const newLecture = {
      id: `lecture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lectureNumber: 0, // Will be calculated by the frontend
      title: title.trim(),
      date: date,
      time: time,
      course: course,
      checkboxState: {
        Mattias: { confirm: false, unwish: false },
        Albin: { confirm: false, unwish: false },
        David: { confirm: false, unwish: false },
      },
      comments: [],
      createdAt: new Date().toISOString(),
      createdBy: "System", // In production, get from auth
    };

    console.log("📝 Adding new lecture to database:", newLecture);

    // Insert the new lecture
    const result = await collection.insertOne(newLecture);

    if (result.insertedId) {
      console.log("✅ Lecture added successfully with ID:", result.insertedId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Lecture added successfully",
          lecture: newLecture,
          insertedId: result.insertedId
        }),
      };
    } else {
      throw new Error("Failed to insert lecture");
    }

  } catch (error) {
    console.error("❌ Error adding lecture:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message
      }),
    };
  } finally {
    await client.close();
  }
}; 