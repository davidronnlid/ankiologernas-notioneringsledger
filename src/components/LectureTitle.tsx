import React, { useState } from "react";
import styles from "../styles/LectureTitle.module.css";
import { Typography } from "@mui/material";
import VemNotionerar from "./VemNotionerar";
import Lecture from "types/lecture";

interface Props {
  week: string;
  lectures: Lecture[];
}

const LectureTitle: React.FC<Props> = ({ week, lectures }) => {
  const [isExpandedWeek, setIsExpandedWeek] = useState(true);
  const [expandedLectures, setExpandedLectures] = useState<string[]>([]);

  const toggleLecture = (title: string) => {
    setExpandedLectures((prev) => {
      if (prev.includes(title)) {
        return prev.filter((t) => t !== title);
      } else {
        return [...prev, title];
      }
    });
  };

  const toggleExpandedWeek = () => {
    setIsExpandedWeek((prevState) => !prevState);
  };

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to midnight for correct date comparison

  return (
    <div>
      <Typography
        variant="h3"
        className={styles.header}
        onClick={toggleExpandedWeek}
      >
        {isExpandedWeek ? "▼ " : "► "} {week}
      </Typography>
      {isExpandedWeek && (
        <ol>
          {lectures.map((lecture) => {
            const lectureDate = new Date(lecture.date);
            lectureDate.setHours(0, 0, 0, 0);

            let lectureClass = styles.future;
            if (lectureDate.getTime() === currentDate.getTime()) {
              lectureClass = styles.today;
            } else if (lectureDate < currentDate) {
              lectureClass = styles.past;
            }

            return (
              <li key={lecture.title} className={lectureClass}>
                <span
                  onClick={() => toggleLecture(lecture.title)}
                  style={{ cursor: "pointer" }}
                >
                  {expandedLectures.includes(lecture.title) ? " ▼ " : " ► "}
                </span>
                {lecture.title}{" "}
                {expandedLectures.includes(lecture.title) && (
                  <VemNotionerar lectureID={lecture.id} />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default LectureTitle;
