import React, { useState } from "react";
import styles from "../styles/Comment.module.css";
import { Typography } from "@mui/material";
import VemNotionerar from "./VemNotionerar";
import Lecture from "types/lecture";
import { calculateDuration } from "../functions/calculateDuration";
import PostComment from "./PostComment";
import DisplayComments from "./DisplayComment";
import { setLectureBgColor } from "functions/setLectureBgColor";

interface Props {
  week: string;
  lectures: Lecture[];
}

const LectureTitle: React.FC<Props> = ({ week, lectures }) => {
  const [isExpandedWeek, setIsExpandedWeek] = useState(false);

  const toggleExpandedWeek = () => {
    setIsExpandedWeek((prevState) => !prevState);
  };

  // Calculate the earliest and latest dates in the lectures array
  const dateRange = lectures.reduce(
    (range, lecture) => {
      const date = new Date(lecture.date).setHours(0, 0, 0, 0);
      range.start =
        range.start === null || date < range.start ? date : range.start;
      range.end = range.end === null || date > range.end ? date : range.end;
      return range;
    },
    { start: null as number | null, end: null as number | null }
  );

  // Format these dates in a readable format
  const formatDate = (date: number | null) => {
    return date
      ? new Intl.DateTimeFormat("sv-SE", {
          day: "numeric",
          month: "long",
        }).format(new Date(date))
      : "";
  };

  const weekRange =
    dateRange.start && dateRange.end
      ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
      : "";

  return (
    <div>
      <Typography
        variant="h6"
        className={styles.header}
        onClick={toggleExpandedWeek}
        style={{ cursor: "pointer" }}
      >
        {isExpandedWeek ? "▼ " : "► "} {week} ({weekRange})
      </Typography>

      {isExpandedWeek && (
        <ol>
          {lectures.map((lecture) => {
            const bgColor = setLectureBgColor(lecture.date);

            const lectureDate = new Date(lecture.date);
            lectureDate.setHours(0, 0, 0, 0);
            // Get Swedish three-letter format for the weekday and capitalize the first letter
            const swedishWeekDay = lectureDate
              .toLocaleDateString("sv-SE", { weekday: "short" })
              .replace(/^\w/, (c) => c.toUpperCase());

            const lectureDuration = calculateDuration(lecture.time);

            // Metadata string that includes the lecturer's name, the weekday, the time, and the duration
            const metadata = `${lecture.lecturer} - ${swedishWeekDay}, ${lecture.time} (${lectureDuration}h)`;

            return (
              <li
                key={lecture.id}
                style={{
                  background: bgColor,
                  color: bgColor === "black" ? "white" : "black",
                  border: "1px solid black",
                  borderRadius: "5px",
                  padding: "10px",
                  margin: "10px 0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "start",
                  gap: "4px",
                }}
                className={styles.defaultBoxShadow}
              >
                <Typography
                  variant="body1"
                  sx={{ fontWeight: "bold", color: "white" }}
                >
                  {`${lecture.lectureNumber}: ${lecture.title}`}
                </Typography>
                {/* Metadata Typography for lecturer, weekday, time, and duration */}
                <Typography
                  variant="caption"
                  style={{
                    color: "darkgrey",
                    fontSize: "smaller",
                    display: "block",
                    marginBottom: "50px",
                  }}
                >
                  {metadata}
                </Typography>
                <VemNotionerar
                  lectureID={lecture.id}
                  checkboxState={lecture.checkboxState}
                />

                <div className={styles.commentsContainer}>
                  <DisplayComments
                    lectureId={lecture.id}
                    comments={lecture.comments || []}
                  />
                  <PostComment lectureId={lecture.id} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default LectureTitle;
