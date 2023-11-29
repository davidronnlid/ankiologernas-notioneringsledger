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
