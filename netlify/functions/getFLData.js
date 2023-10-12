const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI; // This will use the connection string you set in Netlify's environment variables
const client = new MongoClient(uri, { useUnifiedTopology: true });

exports.handler = async (event, context) => {
  try {
    await client.connect();
    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("föreläsningsdata");

    const FLData = await collection.findOne({ id: "test-id" });

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
