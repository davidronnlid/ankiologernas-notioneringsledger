import React, { useState } from "react";
import styles from "../styles/LectureTitle.module.css";
import { Typography } from "@mui/material";
import VemNotionerar from "./VemNotionerar";
import Lecture from "types/lecture";
import { any } from "prop-types";

interface Props {
  week: string;
  lectures: Lecture[];
}

const coursePeriods = [
  {
    name: "Medicinsk Mikrobiologi",
    startDate: new Date(2023, 10, 10), // 10th November 2023
    endDate: new Date(2024, 0, 5), // 5th January 2024
  },
];

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

  const getCourseInfo = (lectureDate: any) => {
    for (const period of coursePeriods) {
      if (lectureDate >= period.startDate && lectureDate <= period.endDate) {
        const start: any = new Date(
          period.startDate.getFullYear(),
          period.startDate.getMonth(),
          period.startDate.getDate()
        );
        const diffTime = Math.abs(lectureDate - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor(diffDays / 7) + 1;
        return { courseName: period.name, weekNumber: `Vecka ${weekNumber}` };
      }
    }
    // Return null if the lecture does not belong to any course period
    return null;
  };
  // Check the first lecture date to determine the course and week number
  const firstLectureDate = new Date(lectures[0].date);
  const courseInfo = getCourseInfo(firstLectureDate);

  return (
    <div>
      {courseInfo && (
        <Typography variant="h5" className={styles.courseHeader}>
          {courseInfo.courseName}
        </Typography>
      )}
      <Typography
        variant="h6"
        className={styles.header}
        onClick={toggleExpandedWeek}
      >
        {isExpandedWeek ? "▼ " : "► "}{" "}
        {courseInfo ? courseInfo.weekNumber : week} ({weekRange})
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
              <>
                {" "}
                <li
                  key={lecture.title}
                  className={lectureClass}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {lecture.title}
                  </Typography>
                  <div style={{ display: "flex" }}>
                    <VemNotionerar
                      lectureID={lecture.id}
                      checkboxState={lecture.checkboxState}
                    />
                  </div>
                </li>
                <hr></hr>
              </>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default LectureTitle;
