import { MongoClient } from "mongodb";
const { v4: uuidv4 } = require("uuid");

const uri: string = process.env.MONGODB_URI!;

const lectureDetails = [
  {
    id: uuidv4(),
    title: "Transplantation",
    lecturer: "Olle Korsgren",
    date: "2023-10-16",
    time: "13:15 - 17:00",
  },
  {
    id: uuidv4(),

    title: "Autoimmunitetsdiagnostik",
    lecturer: "Johan Rönnelid",
    date: "2023-10-17",
    time: "13:15 - 17:00",
  },
  {
    id: uuidv4(),

    title: "Morfologi vid njursjukdomar och njurtransplantation",
    lecturer: "Anca Dragomir",
    date: "2023-10-18",
    time: "09:15 - 12:00",
  },
  {
    id: uuidv4(),

    title: "Klinisk handläggning av allergi",
    lecturer: "Christer Janson",
    date: "2023-10-19",
    time: "09:15 - 11:00",
  },
  {
    id: uuidv4(),

    title: "Immunbrist",
    lecturer: "Torsten Eich",
    date: "2023-10-19",
    time: "12:15 - 14:00",
  },
  {
    id: uuidv4(),

    title: "Biomaterial",
    lecturer: "Karin Fromell",
    date: "2023-10-19",
    time: "14:15 - 16:00",
  },
  {
    id: uuidv4(),

    title: "Typ 1 Diabetes",
    lecturer: "Olle Korsgren",
    date: "2023-10-20",
    time: "10:15 - 12:00",
  },
  {
    id: uuidv4(),

    title: "Samspelet mellan medfödd och förvärvad immunitet",
    lecturer: "Peter Seiron",
    date: "2023-10-24",
    time: "13:15 - 15:00",
  },
  {
    id: uuidv4(),

    title: "Frågestund patologi",
    date: "2023-10-24",
    time: "14:15 - 16:00",
  },
];

export const handler = async (event: any, context: any): Promise<any> => {
  const client: MongoClient = new MongoClient(uri);

  try {
    console.log("Attempting to connect to database...");
    await client.connect();
    console.log("Connected to database.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");

    console.log("Attempting to fetch data...");
    const FLData = await collection.insertMany(lectureDetails);

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
