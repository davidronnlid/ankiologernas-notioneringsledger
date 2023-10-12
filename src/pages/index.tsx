import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Typography } from "@material-ui/core";

type Lecture = {
  week: string;
  lectures: string[];
};

type LectureData = Lecture[];

export default function Home() {
  const [lectureData, setLectureData] = useState<LectureData>([]);

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
        if (data && !data.error && !data.message) {
          setLectureData(data);
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
      <Typography>Hi we are on the home page</Typography>
    </Layout>
  );
}
