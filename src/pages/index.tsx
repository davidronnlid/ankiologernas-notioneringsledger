import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import LectureTitle from "@/components/LectureTitle";
import { WeekData } from "@/types";
import Table from "@/components/Table";
import Lecture from "types/lecture";
import { Typography } from "@material-ui/core";
import React from "react";

const coursePeriods = [
  {
    title: "Medicinsk Mikrobiologi",
    startDate: "2023-11-10",
    endDate: "2024-01-05",
  },
];

export default function Index() {
  const [weeksData, setWeeksData] = useState<WeekData[]>([]);

  useEffect(() => {
    fetch("http://localhost:8888/.netlify/functions/CRUDFLData")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch lecture data");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched data:", data);
        if (data && !data.error && data.events) {
          const sortedLectures = data.events.sort(
            (a: any, b: any) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          // Initialize a map to hold the week number within each course
          const courseWeekNumbers = new Map();

          const groupedByWeek = sortedLectures.reduce(
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

          groupedByWeek.forEach((week: WeekData) => {
            week.totals = { Mattias: 0, Albin: 0, David: 0 };

            week.lectures.forEach((lecture) => {
              // Safely access the checkboxState using optional chaining (?.)
              if (lecture.checkboxState?.Mattias) week.totals.Mattias += 1;
              if (lecture.checkboxState?.Albin) week.totals.Albin += 1;
              if (lecture.checkboxState?.David) week.totals.David += 1;
            });
          });

          setWeeksData(groupedByWeek);
          console.log("Updated weeks data", weeksData);
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
                <Typography variant="h4">{course.title}</Typography>
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
