import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import LectureTitle from "@/components/LectureTitle";
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
        console.log("in fetch(/.netlify/functions/getFLData)", response.json());
        return response.json();
      })
      .then((data) => {
        setLectureData(data);
      })
      .catch((error) => {
        console.error("Error fetching lecture data:", error);
      });
  }, []);

  return (
    <Layout>
      <Typography>Hi we are on the home page</Typography>
      {/* {lectureData.map((item, index) => (
        <LectureTitle key={index} week={item.week} lectures={item.lectures} />
      ))} */}
    </Layout>
  );
}
