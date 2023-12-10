import React from "react";
import Layout from "@/components/Layout";
import {
  Typography,
  Tooltip,
  Grid,
  Box,
  Button,
  Paper,
} from "@material-ui/core";
import Lecture from "types/lecture";
import VemNotionerar from "@/components/VemNotionerar";
import Link from "next/link";
import ZoomInSharpIcon from "@mui/icons-material/ZoomInSharp";
import { setLectureBgColor } from "utils/setLectureBgColor";
import { RootState } from "store/types";
import { useSelector } from "react-redux";
import TooltipComponent from "@/components/Tooltip";

const courseTitle = "Medicinsk Mikrobiologi";

export default function LectureList() {
  const weeksData = useSelector((state: RootState) => state.lectures.lectures);
  console.log(
    "🚀 ~ file: lecturelist.tsx:73 ~ lecturelist ~ weeksData:",
    weeksData
  );

  let lectureGlobalIndex = 0;

  return (
    <Layout>
      <>
        <Typography variant="h4" gutterBottom style={{ marginBottom: "3rem" }}>
          {courseTitle}{" "}
          <Link href="/" passHref>
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
            {weeksData.map((week) =>
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
                            <Typography variant="body2">
                              <em>Föreläsare:</em> {lecture.lecturer}
                            </Typography>
                          </React.Fragment>
                        }
                      >
                        {lectureGlobalIndex}
                      </TooltipComponent>

                      {/* <Tooltip
                        title={
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
                            <Typography variant="body2">
                              <em>Föreläsare:</em> {lecture.lecturer}
                            </Typography>
                          </React.Fragment>
                        }
                        placement="top"
                        arrow
                      >
                        <Typography
                          variant="body2"
                          style={{ cursor: "pointer", margin: "0 20px 25px 0" }}
                        >
                          {lectureGlobalIndex}
                        </Typography>
                      </Tooltip> */}

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
    </Layout>
  );
}
