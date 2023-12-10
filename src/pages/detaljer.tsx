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

export default function Detaljer() {
  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );

  const isLoading = !lecturesData || lecturesData.length === 0;

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
          {coursePeriods.map((course) => {
            // Find all weeks that belong to this course
            const courseWeeks = lecturesData.filter(
              (weekData: WeekData) => weekData.course === course.title
            );

            return (
              <>
                {/* Render the course title once */}
                {courseWeeks.length > 0 && (
                  <>
                    <Typography
                      variant="h4"
                      style={{ marginBottom: "3rem" }}
                      gutterBottom
                    >
                      {course.title}{" "}
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
                    </Typography>{" "}
                  </>
                )}

                {/* Then render all weeks that belong to this course */}
                {courseWeeks.map((weekData: WeekData) => (
                  <LectureTitle
                    key={weekData.week}
                    week={weekData.week}
                    lectures={weekData.lectures}
                  />
                ))}
              </>
            );
          })}
          <Table />
        </>
      )}
    </Layout>
  );
}
