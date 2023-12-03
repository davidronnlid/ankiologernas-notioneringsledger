import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  Typography,
  Tooltip,
  Grid,
  Box,
  Table,
  Button,
  TableContainer,
  TableBody,
  Paper,
  TableRow,
  TableCell,
} from "@material-ui/core";
import Lecture from "types/lecture";
import { RootState } from "store/types";
import { useSelector } from "react-redux";
import VemNotionerar from "@/components/VemNotionerar";
import Link from "next/link";

const courseTitle = "Medicinsk Mikrobiologi";

export default function LectureList() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );
  useEffect(() => {
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

  const lectureChunks = chunkLectures(lectures, 10);

  return (
    <Layout>
      <Box
        width="100%"
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        <Typography variant="h4" align="center" gutterBottom>
          {courseTitle}
        </Typography>

        <Link href="/" passHref>
          <Button variant="contained" color="primary" size="large">
            Detaljer
          </Button>
        </Link>

        <TableContainer
          component={Paper}
          style={{
            maxWidth: "80%",
            marginTop: "20px",
            backgroundColor: "black",
          }}
        >
          <Table size="small">
            <TableBody>
              {lectureChunks.map((chunk, chunkIndex) => (
                <TableRow key={chunkIndex}>
                  {chunk.map((lecture, index) => (
                    <TableCell align="center" key={lecture.id}>
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
                        <Typography variant="body2" style={{ color: "white" }}>
                          {chunkIndex * 10 + index + 1}
                        </Typography>
                      </Tooltip>
                      <VemNotionerar
                        lectureID={lecture.id}
                        checkboxState={lecture.checkboxState}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Layout>
  );
}
