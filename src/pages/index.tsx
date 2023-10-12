import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Typography } from "@material-ui/core";

type Event = {
  date: string;
  title: string;
  //... other properties of the event
};

type EventData = Event[];

export default function Home() {
  const [eventsData, setEventsData] = useState<EventData>([]);

  useEffect(() => {
    fetch("/.netlify/functions/getFLData")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch lecture data");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched data:", data);
        if (data && !data.error && data.events) {
          setEventsData(data.events);
          console.log("setEventsData", data.events);
        } else if (data.message) {
          console.error(data.message);
        }
      })
      .catch((error) => {
        console.error("Error fetching lecture data:", error);
      });
  }, []);

  return (
    <Layout>
      <>
        <Typography>Hi we are on the home page</Typography>
        <ul>
          {eventsData.map((event, id) => (
            <li key={id}>
              {event.date} - {event.title}
            </li>
          ))}
        </ul>
      </>
    </Layout>
  );
}
