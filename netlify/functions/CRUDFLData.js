const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");

const uri = process.env.MONGODB_URI;

const headers = {
  "Access-Control-Allow-Origin": "*", // Adjust this to restrict to specific domains if needed
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
};

exports.handler = async (event, context) => {
  // Immediately respond to preflight requests (CORS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  const client = new MongoClient(uri);

  try {
    console.log("Attempting to connect to database...");
    await client.connect();
    console.log("Connected to database.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    let response;
    if (event.httpMethod === "GET") {
      console.log("Attempting to fetch data...");

      const FLData = await collection
        .find({ date: { $regex: /2023/ } })
        .toArray();
      console.log("Data fetched: ", FLData);

      response = {
        statusCode: 200,
        headers,
        body: JSON.stringify({ events: FLData }), // Wrap data in an object
      };
    } else if (event.httpMethod === "PUT") {
      const { lectureID, newCheckboxState, newUnwishState } = JSON.parse(
        event.body
      );
      console.log(lectureID, newCheckboxState, newUnwishState);

      const updateResult = await collection.updateOne(
        { id: lectureID },
        {
          $set: {
            checkboxState: newCheckboxState,
          },
        },
        { upsert: true }
      );

      response = {
        statusCode: updateResult.modifiedCount === 1 ? 200 : 400,
        headers,
        body: JSON.stringify({ modifiedCount: updateResult.modifiedCount }),
      };
    } else if (event.httpMethod === "POST") {
      const { lectureId, comment, fullName } = JSON.parse(event.body);
      console.log("Attempting to add a comment... to lecture: ", lectureId);

      const commentId = uuidv4();
      const dateAdded = new Date();

      const insertResult = await collection.updateOne(
        { id: lectureId },
        {
          $push: {
            comments: { commentId, comment, fullName, dateAdded, lectureId },
          },
        },
        { upsert: true }
      );
      const responseComment =
        insertResult.modifiedCount === 1
          ? { commentId, comment, fullName, dateAdded, lectureId }
          : {};

      response = {
        statusCode: insertResult.modifiedCount === 1 ? 200 : 400,
        headers,
        body: JSON.stringify(responseComment),
      };
      console.log("Added comment: ", response);
    } else if (event.httpMethod === "DELETE") {
      console.log(
        "Attempting to delete a comment from lecture: ",
        event.queryStringParameters
      );
      const { lectureId, commentId } = event.queryStringParameters;

      const deleteResult = await collection.updateOne(
        { id: lectureId },
        { $pull: { comments: { commentId } } } // Use $pull to remove the comment with the matching commentId
      );

      if (deleteResult.modifiedCount === 0) {
        // If no document was modified, it means the commentId was not found
        response = {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            message: "Comment not found or already deleted",
          }),
        };
      } else {
        response = {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: "Comment deleted successfully",
            modifiedCount: deleteResult.modifiedCount,
          }),
        };
      }
    }

    return response;
  } catch (error) {
    console.error("Error in function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    console.log("Closing database connection...");
    await client.close();
  }
};
