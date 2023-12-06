import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  Typography,
  Tooltip,
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

const courseTitle = "Medicinsk Mikrobiologi";

export default function LectureList() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    const apiUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL
        : "/.netlify";
    fetch(`${apiUrl}/functions/CRUDFLData`)
      .then((response) => response.json())
      .then((data) => {
        if (data && !data.error && data.events) {
          // Filter lectures by the specific course and sort them by date and time
          const courseLectures = data.events
            .filter((lecture: Lecture) => {
              const lectureDate = new Date(lecture.date);
              const courseStartDate = new Date("2023-11-10");
              const courseEndDate = new Date("2024-01-05");
              return (
                lectureDate >= courseStartDate && lectureDate <= courseEndDate
              );
            })
            .sort((a: Lecture, b: Lecture) => {
              // Compare dates first
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              if (dateA < dateB) return -1;
              if (dateA > dateB) return 1;

              // If dates are equal, compare times
              const timeA = a.time.split(" - ")[0];
              const timeB = b.time.split(" - ")[0];
              return timeA.localeCompare(timeB);
            });
          setLectures(courseLectures);
        } else if (data && data.message) {
          console.error(data.message);
        }
      })
      .catch((error) => {
        console.error("Error fetching lecture data:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Function to split lectures into chunks of 10
  const chunkLectures = (lectures: Lecture[], size: number) => {
    const chunked = [];
    for (let i = 0; i < lectures.length; i += size) {
      chunked.push(lectures.slice(i, i + size));
    }
    return chunked;
  };

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
          {isLoading ? (
            <div style={{ minHeight: "60vh" }}>
              <CircularProgress style={{ marginTop: "1rem" }} />
            </div>
          ) : (
            <Grid container spacing={1} style={{ maxWidth: "100%" }}>
              {lectures.map((lecture, index) => (
                <Grid item xs={12} sm={4} md={3} lg={2} key={lecture.id}>
                  <Paper
                    style={{
                      padding: "10px",
                      backgroundColor: "black",
                      color: "white",
                    }}
                  >
                    <Tooltip
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
                        {index + 1}
                      </Typography>
                    </Tooltip>
                    <VemNotionerar
                      lectureID={lecture.id}
                      checkboxState={lecture.checkboxState}
                    />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </>
    </Layout>
  );
}
