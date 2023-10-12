import React, { useState } from "react";
import styles from "../styles/LectureTitle.module.css";
import { Typography } from "@mui/material";

interface Lecture {
  title: string;
  lecturer?: string;
  date: string;
  time: string;
}

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
              <li
                key={lecture.title}
                className={lectureClass}
                onClick={() => toggleLecture(lecture.title)}
              >
                {expandedLectures.includes(lecture.title) ? " ▼ " : " ► "}
                {lecture.title}{" "}
                {expandedLectures.includes(lecture.title) && (
                  <div>Lecture Details Here</div>
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
