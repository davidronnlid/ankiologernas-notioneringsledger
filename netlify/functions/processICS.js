const { error } = require("console");
const { MongoClient, ObjectId } = require("mongodb");

function parseICS(icsData) {
  console.log("Starting to parse ICS data...");

  const events = [];
  const lines = icsData.split("\r\n");

  let currentEvent = null;
  lines.forEach((line, index) => {
    console.log(`Processing line ${index}: ${line}`);

    if (line[0] === " " || line[0] === "\t") {
      if (currentEvent && currentEvent.lastKey) {
        console.log(
          `Appending to last key '${currentEvent.lastKey}' of the current event`
        );
        currentEvent[currentEvent.lastKey] += line.slice(1).trim();
      }
      return;
    }

    let [key, ...value] = line.split(":");
    value = value.join(":");

    if (key === "BEGIN" && value === "VEVENT") {
      console.log("Starting a new event");
      currentEvent = {};
    } else if (key === "END" && value === "VEVENT") {
      if (currentEvent) {
        console.log("Ending an event, adding to events list");
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      console.log(`Adding property '${key}' to the current event`);
      currentEvent[key] = value;
      currentEvent.lastKey = key;
    }
  });

  console.log("Finished processing lines, now formatting events");

  // Transform date and time to more readable format and extract required fields
  return events
    .map((event, index) => {
      console.log(`Formatting event ${index}`);

      const formattedEvent = {};
      if (event.DTSTART && event.DTEND) {
        formattedEvent.date = `${event.DTSTART.substr(
          0,
          4
        )}-${event.DTSTART.substr(4, 2)}-${event.DTSTART.substr(6, 2)}`;
        formattedEvent.time = `${event.DTSTART.substr(
          9,
          2
        )}:${event.DTSTART.substr(11, 2)}-${event.DTEND.substr(
          9,
          2
        )}:${event.DTEND.substr(11, 2)}`;
      }

      let title = event.DESCRIPTION || event.SUMMARY || "";
      title = title
        .replace(/\s*ID.*$/, "")
        .replace(/\s*Karta:.*$/, "")
        .replace(/\s*Föreläsare:.*$/, "");
      formattedEvent.title = title
        .replace(/\\,/g, ",")
        .replace(/\\;/g, ";")
        .replace(/\\n/g, " ")
        .trim();
      formattedEvent.id = generateUniqueId();
      formattedEvent.checkboxState = {
        Mattias: { confirm: false, unwish: false },
        Albin: { confirm: false, unwish: false },
        David: { confirm: false, unwish: false },
      };

      return formattedEvent;
    })
    .filter((formattedEvent, index) => {
      // Check for the specific condition - presence of "ID" in the title
      if (formattedEvent.title.match(/ID\s+\d+$/)) {
        console.log(
          `Event ${index} ('${formattedEvent.title}') filtered out due to 'ID' in the title.`
        );
        return false;
      }

      // Add other conditions here if necessary, with appropriate log statements

      // If no conditions are met, keep the event
      return true;
    });
}

// async function updateLectureTimes() {
//   console.log("Connecting to MongoDB...");
//   const client = new MongoClient(process.env.MONGODB_URI);

//   try {
//     await client.connect();
//     console.log("Successfully connected to MongoDB.");
//     const database = client.db("ankiologernasnotioneringsledger");
//     const lecturesCollection = database.collection("forelasningsdata");

//     const updateFromDate = new Date("2024-04-01T00:00:00Z");
//     console.log(
//       `Updating lectures scheduled after: ${
//         updateFromDate.toISOString().split("T")[0]
//       }`
//     );

//     const lecturesToUpdate = await lecturesCollection
//       .find({
//         date: { $gt: updateFromDate.toISOString().split("T")[0] },
//       })
//       .toArray();
//     console.log(`Found ${lecturesToUpdate.length} lectures to update.`);

//     let updateCount = 0;
//     for (const lecture of lecturesToUpdate) {
//       const times = lecture.time.split("-");
//       const startTime = times[0].split(":");
//       const endTime = times[1].split(":");

//       const newStartTime = new Date(lecture.date + "T" + times[0] + "Z");
//       newStartTime.setHours(newStartTime.getHours() + 1);
//       const newEndTime = new Date(lecture.date + "T" + times[1] + "Z");
//       newEndTime.setHours(newEndTime.getHours() + 1);

//       console.log(
//         `Updating lecture: ${lecture.title} on ${lecture.date} from ${
//           lecture.time
//         } to ${newStartTime.getUTCHours()}:${newStartTime
//           .getUTCMinutes()
//           .toString()
//           .padStart(2, "0")}-${newEndTime.getUTCHours()}:${newEndTime
//           .getUTCMinutes()
//           .toString()
//           .padStart(2, "0")}`
//       );

//       const updateResult = await lecturesCollection.updateOne(
//         { _id: lecture._id },
//         {
//           $set: {
//             time: `${newStartTime.getUTCHours()}:${newStartTime
//               .getUTCMinutes()
//               .toString()
//               .padStart(2, "0")}-${newEndTime.getUTCHours()}:${newEndTime
//               .getUTCMinutes()
//               .toString()
//               .padStart(2, "0")}`,
//           },
//         }
//       );

//       if (updateResult.modifiedCount > 0) {
//         console.log(`Lecture ${lecture.title} updated successfully.`);
//         updateCount++;
//       } else {
//         console.log(`No changes made to lecture ${lecture.title}.`);
//       }
//     }

//     console.log(`${updateCount} lectures were updated with new times.`);
//     return updateCount;
//   } catch (error) {
//     console.error("Error updating lecture times:", error);
//     throw error;
//   } finally {
//     await client.close();
//     console.log("Database connection closed.");
//   }
// }

async function postEventsToDatabase(events) {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");
    console.log("Database and collection selected.");

    const newEvents = [];

    for (const event of events) {
      console.log(
        `Checking if event with title '${event.title}' and date '${event.date}' exists...`
      );
      // Check if an event with the same title and date already exists
      const existingEvent = await collection.findOne({
        title: event.title,
        date: event.date,
      });

      // If the event does not exist, add it to the newEvents array
      if (!existingEvent) {
        console.log(
          `Event '${event.title}' does not exist. Adding to new events.`
        );
        newEvents.push(event);
      } else {
        console.log(`Event '${event.title}' already exists. Skipping.`);
      }
    }

    // Insert all new events that do not have duplicates in the database
    let insertResult = { insertedCount: 0 };
    if (newEvents.length > 0) {
      console.log(`Inserting ${newEvents.length} new events...`);
      insertResult = await collection.insertMany(newEvents);
      console.log(`${insertResult.insertedCount} documents were inserted`);
    } else {
      console.log("No new events to insert.");
    }

    return insertResult;
  } catch (error) {
    console.error("Error inserting events into database:", error);
    throw error; // Rethrow the error so it can be caught by the caller
  } finally {
    console.log("Closing database connection...");
    await client.close();
  }
}

async function deleteEventsInDateRange() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB.");

    const database = client.db("ankiologernasnotioneringsledger");
    const collection = database.collection("forelasningsdata");
    console.log("Database and collection selected.");

    const deleteResult = await collection.deleteMany({
      date: {
        $gte: "2024-07-01",
        $lte: "2025-07-01",
      },
    });

    console.log(`Deleted ${deleteResult.deletedCount} documents.`);
    return deleteResult;
  } catch (error) {
    console.error("Error deleting events:", error);
    throw error;
  } finally {
    console.log("Closing database connection...");
    await client.close();
  }
}

// NEXT TIME YOU WANT TO FETCH LECTURES FROM TIMEEDIT:
// 1. Filter the exact lectures that should be fetched by using TimeEdits filter function
// 2. Copy the "Subscribe" link
// 3. Paste it in the icsUrl prop below
// 4. Import the FetchICSButton to a clientside component that is rendered in the UI and simply render the component as "<FetchICSButton />"
// 5. Click on the button in the UI in localhost
// 6. Commit changes to production and confirm in prod by UI navigation that the lectures were successfully fetched

exports.handler = async (event, context) => {
  if (event.httpMethod === "GET") {
    const icsUrl = "NEW LINK";

    // "https://cloud.timeedit.net/uu/web/wr_student/ri66YXQ6599Z54Qv5X050766y3Y840465Y55Y5gQ2046X63Z781270AY8Ab2Z86EX9d57t8QD6967teuFZ9ZEQ8Zn2Q09850FQ4D14EFD1547DD1CB957B5C5.ics";

    try {
      // Uncomment if updateLectureTimes is needed
      // await updateLectureTimes();
      await deleteEventsInDateRange();

      const response = await globalThis.fetch(icsUrl);
      const textData = await response.text();

      const parsedTextData = parseICS(textData);
      console.log(
        "🚀 ~ file: processICS.js:139 ~ handler ~ parsedTextData:",
        parsedTextData
      );
      const updatedDB = await postEventsToDatabase(parsedTextData);
      console.log(
        "🚀 ~ file: processICS.js:121 ~ handler ~ updatedDB:",
        updatedDB
      );

      console.log("ICS Data:", parsedTextData);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "ICS data processed successfully" }),
      };
    } catch (error) {
      console.error("Error fetching ICS:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }
  } else {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }
};

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
