import { useSelector } from "react-redux";
import { RootState } from "../store/types";
import Layout from "@/components/Layout";
import LectureTitle from "@/components/LectureTitle";
import { WeekData } from "@/types";
import Table from "@/components/Table";
import { Button, CircularProgress, Typography } from "@material-ui/core";
import React from "react";
import Link from "next/link";
import FlashOnSharpIcon from "@mui/icons-material/FlashOnSharp";
import { coursePeriods } from "utils/coursePeriods";
import { isCourseActive } from "utils/processLectures";

export default function Detaljer() {
  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );
  const isLoading = !lecturesData || lecturesData.length === 0;

  const currentDate = new Date(); // Get the current date

  // Filter course periods to get only the currently active course(s)
  const activeCourses = coursePeriods.filter((course) =>
    isCourseActive(course.title, currentDate)
  );

  return (
    <Layout>
      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "start",
            height: "80vh",
          }}
        >
          <CircularProgress />
        </div>
      ) : (
        <>
          {activeCourses.map((course) => {
            const courseWeeks = lecturesData.filter(
              (weekData: WeekData) => weekData.course === course.title
            );

            return (
              <React.Fragment key={course.title}>
                {courseWeeks.length > 0 && (
                  <Typography
                    variant="h4"
                    style={{ marginBottom: "3rem" }}
                    gutterBottom
                  >
                    {course.title}
                    <Link href="/" passHref>
                      <Button
                        variant="contained"
                        color="primary"
                        style={{
                          background: "transparent",
                          boxShadow: "none",
                          color: "white",
                          width: "3rem",
                        }}
                      >
                        <FlashOnSharpIcon />
                      </Button>
                    </Link>
                  </Typography>
                )}

                {courseWeeks.map((weekData) => (
                  <LectureTitle
                    key={weekData.week}
                    week={weekData.week}
                    lectures={weekData.lectures}
                  />
                ))}

                <Table course={course} />
              </React.Fragment>
            );
          })}
        </>
      )}
    </Layout>
  );
}
