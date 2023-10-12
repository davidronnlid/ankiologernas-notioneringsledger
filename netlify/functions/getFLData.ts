import { MongoClient } from "mongodb";

const uri: string = process.env.MONGODB_URI!;

export const handler = async (event: any, context: any): Promise<any> => {
  const client: MongoClient = new MongoClient(uri);

  try {
    console.log("Attempting to connect to database...");
    await client.connect();
    console.log("Connected to database.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    console.log("Attempting to fetch data...");

    const FLData = await collection.find({
      date: { $regex: /2023/ },
    });

    console.log("Data fetched: ", FLData);

    return {
      statusCode: 200,
      body: JSON.stringify(FLData),
    };
  } catch (error: any) {
    console.error("Error in function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    console.log("Closing database connection...");
    await client.close();
  }
};
