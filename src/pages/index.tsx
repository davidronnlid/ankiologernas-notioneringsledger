// Home Component
import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Typography } from "@material-ui/core";
import LectureTitle from "../components/LectureTitle";

type WeekData = {
  week: string;
  lectures: Lecture[];
};

export default function Home() {
  const [weeksData, setWeeksData] = useState<WeekData[]>([]);

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
          const transformedData = [
            {
              week: "Week 1",
              lectures: data.events,
            },
          ];
          setWeeksData(transformedData);
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
        {weeksData.map((weekData) => (
          <LectureTitle
            key={weekData.week}
            week={weekData.week}
            lectures={weekData.lectures}
          />
        ))}
      </>
    </Layout>
  );
}
