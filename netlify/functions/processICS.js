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
        const newStartDate = new Date(
          event.DTSTART.substr(0, 4),
          event.DTSTART.substr(4, 2) - 1,
          event.DTSTART.substr(6, 2),
          event.DTSTART.substr(9, 2),
          event.DTSTART.substr(11, 2)
        );
        newStartDate.setHours(newStartDate.getHours() + 2);
        formattedEvent.date = `${newStartDate.getFullYear()}-${String(
          newStartDate.getMonth() + 1
        ).padStart(2, "0")}-${String(newStartDate.getDate()).padStart(2, "0")}`;
        const newEndDate = new Date(
          event.DTEND.substr(0, 4),
          event.DTEND.substr(4, 2) - 1,
          event.DTEND.substr(6, 2),
          event.DTEND.substr(9, 2),
          event.DTEND.substr(11, 2)
        );
        newEndDate.setHours(newEndDate.getHours() + 2);
        formattedEvent.time = `${String(newStartDate.getHours()).padStart(
          2,
          "0"
        )}:${String(newStartDate.getMinutes()).padStart(2, "0")}-${String(
          newEndDate.getHours()
        ).padStart(2, "0")}:${String(newEndDate.getMinutes()).padStart(
          2,
          "0"
        )}`;
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

    const existingEvents = await collection
      .find({ date: { $in: events.map((e) => e.date) } })
      .toArray();
    const existingEventsMap = new Map(
      existingEvents.map((e) => [`${e.title}-${e.date}`, e])
    );

    const newEvents = events.filter(
      (event) => !existingEventsMap.has(`${event.title}-${event.date}`)
    );

    if (newEvents.length > 0) {
      console.log(`Inserting ${newEvents.length} new events...`);
      const insertResult = await collection.insertMany(newEvents);
      console.log(`${insertResult.insertedCount} documents were inserted`);
      return insertResult;
    } else {
      console.log("No new events to insert.");
      return { insertedCount: 0 };
    }
  } catch (error) {
    console.error("Error inserting events into database:", error);
    throw error;
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
// 5. Commit changes to production
// 6. Click on the button in the UI in production and confirm in prod by UI navigation that the lectures were successfully fetched. See Netlify function logs for processICS if error. Adjust time or delete lectures as necessary.

exports.handler = async (event, context) => {
  if (event.httpMethod === "GET") {
    const icsUrl =
      "https://cloud.timeedit.net/uu/web/wr_student/ri60X916X37Z02Q6Z56g9Y40y7036Y05603gQY6Q56466089Y4355359Q8Ye58u4XXQt5n58187Q1Q658dZ0E59Z0761602btZ422Z1421B2CC99FFF87CE849EF3499.ics";

    try {
      // Uncomment if updateLectureTimes is needed
      // await updateLectureTimes();
      // await deleteEventsInDateRange();

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
