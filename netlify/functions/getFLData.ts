import { MongoClient, ObjectId } from "mongodb";

const uri: string = process.env.MONGODB_URI!;
const client: MongoClient = new MongoClient(uri);

export const handler = async (event: any, context: any): Promise<any> => {
  try {
    console.log("Attempting to connect to database...");
    await client.connect();
    console.log("Connected to database.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    console.log("Attempting to fetch data...");
    const FLData = await collection.findOne({
      _id: new ObjectId("6527fb275df508523ec4db74"),
    });

    console.log("Data fetched: ", FLData);

    return {
      statusCode: 200,
      body: JSON.stringify(FLData),
    };
  } catch (error) {
    console.error("Error in function:", error); // This will log the specific error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed fetching user data" }),
    };
  }
};
