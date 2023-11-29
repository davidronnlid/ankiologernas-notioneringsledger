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
