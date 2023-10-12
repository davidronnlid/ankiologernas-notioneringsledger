const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI; // This will use the connection string you set in Netlify's environment variables
const client = new MongoClient(uri);

exports.handler = async (event, context) => {
  try {
    await client.connect();
    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("föreläsningsdata");

    const FLData = await collection.findOne({
      _id: ObjectId("6527fb275df508523ec4db74"), // Use ObjectId function here
    });

    return {
      statusCode: 200,
      body: JSON.stringify(FLData),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed fetching user data" }),
    };
  }
};
