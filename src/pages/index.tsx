import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import LectureTitle from "@/components/LectureTitle";
import { WeekData } from "@/types";
import Table from "@/components/Table";
import Lecture from "types/lecture";
import { Button, Typography } from "@material-ui/core";
import React from "react";
import {
  calculateTotals,
  calculateTotalHoursPerPerson,
  calculateDuration,
} from "../functions/calculateDuration";
import Link from "next/link";

const coursePeriods = [
  {
    title: "Medicinsk Mikrobiologi",
    startDate: "2023-11-10",
    endDate: "2024-01-05",
  },
];

export default function Index() {
  const [weeksData, setWeeksData] = useState<WeekData[]>([]);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to midnight for correct date comparison

  useEffect(() => {
    const apiUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL
        : "/.netlify";
    fetch(`${apiUrl}/functions/CRUDFLData`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch lecture data");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched data:", data);
        if (data && !data.error && data.events) {
          const lectureNumberCounters = new Map(
            coursePeriods.map((course) => [course.title, 0])
          );

          const sortedLectures = data.events.sort(
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

          setWeeksData(finalWeeksData);
          console.log("final weeks data", weeksData);
        } else if (data.message) {
          console.error(data.message);
        }
      })
      .catch((error) => {
        console.error("Error fetching lecture data:", error);
      });
  }, []);

  return (
    <Layout>
      <>
        {coursePeriods.map((course) => {
          // Find all weeks that belong to this course
          const courseWeeks = weeksData.filter(
            (weekData) => weekData.course === course.title
          );

          return (
            <>
              {/* Render the course title once */}
              {courseWeeks.length > 0 && (
                <>
                  <Typography variant="h4">{course.title}</Typography>{" "}
                  <Link href="/lecture-list" passHref>
                    <Button
                      variant="contained"
                      color="primary"
                      style={{ marginBottom: "3rem" }}
                    >
                      Fyll i snabbt
                    </Button>
                  </Link>
                </>
              )}

              {/* Then render all weeks that belong to this course */}
              {courseWeeks.map((weekData) => (
                <LectureTitle
                  key={weekData.week}
                  week={weekData.week}
                  lectures={weekData.lectures}
                />
              ))}
            </>
          );
        })}
        <Table weeksData={weeksData} />
      </>
    </Layout>
  );
}
