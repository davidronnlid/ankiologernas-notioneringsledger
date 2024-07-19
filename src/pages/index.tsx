import React from "react";
import Layout from "@/components/Layout";
import {
  Typography,
  Grid,
  Box,
  Button,
  Paper,
  CircularProgress,
} from "@material-ui/core";
import Lecture from "types/lecture";
import VemNotionerar from "@/components/VemNotionerar";
import Link from "next/link";
import ZoomInSharpIcon from "@mui/icons-material/ZoomInSharp";
import { setLectureBgColor } from "utils/setLectureBgColor";
import { RootState } from "store/types";
import { useSelector } from "react-redux";
import TooltipComponent from "@/components/Tooltip";
import { isCourseActive } from "utils/processLectures";
import FetchICSButton from "@/components/FetchICSButton";

const courseTitle = "Klinisk medicin 1";

export default function Index() {
  const weeksData = useSelector((state: RootState) => state.lectures.lectures);

  let lectureGlobalIndex = 0;
  const isLoading = !weeksData || weeksData.length === 0;

  const currentDate = new Date(); // Current date for comparison

  // Filter the weeks data to only include lectures from active courses
  const activeWeeksData = weeksData.filter(
    (week) => isCourseActive(week.course, currentDate) && week.course
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
          <Typography
            variant="h4"
            gutterBottom
            style={{ marginBottom: "3rem" }}
          >
            {courseTitle}{" "}
            <Link href="/detaljer" passHref>
              <Button
                style={{
                  background: "transparent",
                  boxShadow: "none",
                  color: "white",
                  width: "3rem",
                }}
                variant="contained"
                color="primary"
                size="large"
              >
                <ZoomInSharpIcon />
              </Button>
            </Link>
          </Typography>

          <Box
            width="100%"
            display="flex"
            flexDirection="column"
            alignItems="center"
            style={{ marginTop: "3rem" }}
          >
            <Grid container spacing={1} style={{ maxWidth: "100%" }}>
              {activeWeeksData.map((week) =>
                week.lectures.map((lecture: Lecture) => {
                  // Increment the global index for each lecture
                  lectureGlobalIndex += 1;
                  const bgColor = setLectureBgColor(lecture.date);

                  return (
                    <Grid
                      key={lectureGlobalIndex}
                      item
                      xs={12}
                      sm={4}
                      md={3}
                      lg={2}
                    >
                      <Paper
                        style={{
                          padding: "10px",
                          paddingTop: "30px",
                          backgroundColor: bgColor,
                          color: "white",
                        }}
                      >
                        <TooltipComponent
                          text={
                            <React.Fragment>
                              <Typography color="inherit">
                                {lecture.title}
                              </Typography>

                              <Typography variant="body2">
                                <em>Datum:</em> {lecture.date}
                              </Typography>
                              <Typography variant="body2">
                                <em>Tid:</em> {lecture.time}
                              </Typography>
                            </React.Fragment>
                          }
                        >
                          {lectureGlobalIndex}
                        </TooltipComponent>

                        <VemNotionerar
                          lectureID={lecture.id}
                          checkboxState={lecture.checkboxState}
                        />
                      </Paper>
                    </Grid>
                  );
                })
              )}
            </Grid>
          </Box>
        </>
      )}
    </Layout>
  );
}
