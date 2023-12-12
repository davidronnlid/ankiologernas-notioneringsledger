import Head from "next/head";

import { Box, Container } from "@material-ui/core";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { LayoutProps } from "@/types";

import { setLectures } from "store/slices/lecturesReducer";
import {
  calculateTotals,
  calculateTotalHoursPerPerson,
  calculateDuration,
} from "../utils/calculateDuration";
import Lecture from "types/lecture";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { WeekData } from "@/types";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { coursePeriods } from "utils/coursePeriods";
import { RootState } from "store/types";

export default function Layout({
  title = "Ankiologernas Notioneringsledger",
  description = "Ankiologernas Notioneringsledger",
  keywords = "Ankiologernas Notioneringsledger",
  children,
}: LayoutProps) {
  const dispatch = useDispatch();

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to midnight for correct date comparison

  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );

  useEffect(() => {
    if (lecturesData.length === 0) {
      fetchDataAndDispatch();
    }
  }, [lecturesData.length]);

  const fetchDataAndDispatch = async () => {
    const apiUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL
        : "/.netlify";

    try {
      const response = await fetch(`${apiUrl}/functions/CRUDFLData`);
      const data = await response.json();
      console.log(
        "🚀 ~ file: _app.tsx:60 ~ fetchDataAndDispatch ~ data:",
        data
      );
      if (data && !data.error && data.events) {
        const processedData = processData(data.events, currentDate);
        console.log(
          "🚀 ~ file: _app.tsx:61 ~ fetchDataAndDispatch ~ processedData:",
          processedData
        );
        dispatch(setLectures(processedData));
      } else if (data.message) {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Error fetching lecture data:", error);
    }
  };

  const processData = (lectures: Lecture[], currentDate: Date): WeekData[] => {
    const lectureNumberCounters = new Map(
      coursePeriods.map((course) => [course.title, 0])
    );

    const sortedLectures = lectures.sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    console.log("sortedLectures is: ", sortedLectures);
    const lecturesWithNumbers = sortedLectures.map((lecture: Lecture) => {
      // Determine the course of the lecture, if any
      const course = coursePeriods.find((period) =>
        isWithinInterval(parseISO(lecture.date), {
          start: parseISO(period.startDate),
          end: parseISO(period.endDate),
        })
      );

      if (course) {
        // Increment the counter for the specific course
        const currentCount = lectureNumberCounters.get(course.title) || 0;
        lectureNumberCounters.set(course.title, currentCount + 1);
        // Assign the incremented number to the lecture
        return { ...lecture, lectureNumber: currentCount + 1 };
      } else {
        return lecture; // If lecture does not belong to a course, do not assign a number
      }
    });
    // Initialize a map to hold the week number within each course
    const courseWeekNumbers = new Map();

    const groupedByWeek = lecturesWithNumbers.reduce(
      (acc: any, lecture: Lecture) => {
        const date = parseISO(lecture.date);
        let weekFound = false;

        // Determine which course the lecture belongs to, if any
        const course = coursePeriods.find((period) =>
          isWithinInterval(date, {
            start: parseISO(period.startDate),
            end: parseISO(period.endDate),
          })
        );

        // If the lecture is within a course period
        if (course) {
          if (!courseWeekNumbers.has(course.title)) {
            courseWeekNumbers.set(course.title, 1);
          }

          for (let week of acc) {
            // Check if the week belongs to the same course and is within the same week interval
            if (
              week.course === course.title &&
              isWithinInterval(date, {
                start: startOfWeek(parseISO(week.lectures[0].date), {
                  weekStartsOn: 1,
                }),
                end: endOfWeek(parseISO(week.lectures[0].date), {
                  weekStartsOn: 1,
                }),
              })
            ) {
              week.lectures.push(lecture);
              weekFound = true;
              break;
            }
          }

          // If this lecture didn't fit into an existing week, start a new week
          if (!weekFound) {
            acc.push({
              week: `Vecka ${courseWeekNumbers.get(course.title)}`,
              course: course.title,
              lectures: [lecture],
            });
            courseWeekNumbers.set(
              course.title,
              courseWeekNumbers.get(course.title) + 1
            );
          }
        } else {
          // If the lecture is not within any course period, proceed as before
          // ...
        }

        return acc;
      },
      []
    );

    const updatedWeeksData = calculateTotals(groupedByWeek);
    console.log(
      "🚀 ~ file: index.tsx:136 ~ .then ~ updatedWeeksData:",
      updatedWeeksData
    );
    const finalWeeksData = calculateTotalHoursPerPerson(updatedWeeksData);
    console.log(
      "🚀 ~ file: index.tsx:138 ~ .then ~ finalWeeksData:",
      finalWeeksData
    );

    finalWeeksData.forEach((weekData) => {
      weekData.wishedTotal = { Mattias: 0, Albin: 0, David: 0 }; // Initialize wishedTotal

      weekData.lectures.forEach((lecture) => {
        const lectureDate = new Date(
          lecture.date + "T" + lecture.time.split(" - ")[0]
        );
        if (lectureDate > currentDate) {
          Object.keys(weekData.wishedTotal).forEach((person) => {
            weekData.wishedTotal[person] += lecture.checkboxState[person]
              .confirm
              ? calculateDuration(lecture.time)
              : 0;
          });
        }
      });
    });

    return finalWeeksData;
  };

  return (
    <div style={{ background: "#302e32", color: "white" }}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="icon" href="/images/logo.png" />
      </Head>
      <Header />
      <Box my={5}>
        <Container maxWidth="lg">{children}</Container>
      </Box>
      <Footer />
    </div>
  );
}
