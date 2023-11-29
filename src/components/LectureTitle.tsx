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

  const toggleExpandedWeek = () => {
    setIsExpandedWeek((prevState) => !prevState);
  };

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to midnight for correct date comparison

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
      >
        {isExpandedWeek ? "▼ " : "► "} {week} ({weekRange})
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

            // Get Swedish three-letter format for the weekday and capitalize the first letter
            const swedishWeekDay = lectureDate
              .toLocaleDateString("sv-SE", { weekday: "short" })
              .replace(/^\w/, (c) => c.toUpperCase());

            // Function to calculate the duration of the lecture
            const calculateDuration = (time: string) => {
              const [startTime, endTime] = time.split("-").map((t) => t.trim());
              const [startHours, startMinutes] = startTime
                .split(":")
                .map(Number);
              const [endHours, endMinutes] = endTime.split(":").map(Number);

              const startTotalMinutes = startHours * 60 + startMinutes;
              const endTotalMinutes = endHours * 60 + endMinutes;

              // Calculate total duration in minutes
              let durationMinutes = endTotalMinutes - startTotalMinutes;

              // Subtract the 15 minutes breaks from the total duration before calculating blocks
              // Every full hour has a 15-minute break
              const fullHours = Math.floor(durationMinutes / 60);
              durationMinutes -= fullHours * 15;

              // Calculate the number of 45-minute lecture blocks
              // Do not round up, as we've already subtracted the breaks
              const lectureBlocks = Math.floor(durationMinutes / 45);

              return `${lectureBlocks}h`;
            };

            const lectureDuration = calculateDuration(lecture.time);

            // Metadata string that includes the lecturer's name, the weekday, the time, and the duration
            const metadata = `${lecture.lecturer} - ${swedishWeekDay}, ${lecture.time} (${lectureDuration})`;

            return (
              <li
                key={lecture.id}
                className={lectureClass}
                style={{
                  background: "black",
                  color: "white",
                  border: "1px solid gold",
                  borderRadius: "5px", // Slight rounding of corners for the "card" look
                  padding: "10px",
                  margin: "10px 0", // Add some space between cards
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "start",
                  gap: "4px",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ fontWeight: "bold", color: "white" }}
                >
                  {lecture.title}
                </Typography>
                {/* Metadata Typography for lecturer, weekday, time, and duration */}
                <Typography
                  variant="caption"
                  style={{ color: "darkgrey", fontSize: "smaller" }}
                >
                  {metadata}
                </Typography>
                <VemNotionerar
                  lectureID={lecture.id}
                  checkboxState={lecture.checkboxState}
                />
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default LectureTitle;
