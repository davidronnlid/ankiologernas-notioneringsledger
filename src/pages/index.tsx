import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import LectureTitle from "@/components/LectureTitle";
import Lecture from "types/lecture";

type WeekData = {
  week: string;
  lectures: Lecture[];
};

export default function Index() {
  const [weeksData, setWeeksData] = useState<WeekData[]>([]);

  useEffect(() => {
    fetch("/netlify/functions/CRUDFLData")
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
          const groupedByWeek = sortedLectures.reduce(
            (acc: any, lecture: any) => {
              const date = parseISO(lecture.date);
              let weekFound = false;

              for (let week of acc) {
                const start = startOfWeek(parseISO(week.lectures[0].date), {
                  weekStartsOn: 1,
                });
                const end = endOfWeek(parseISO(week.lectures[0].date), {
                  weekStartsOn: 1,
                });
                if (isWithinInterval(date, { start, end })) {
                  week.lectures.push(lecture);
                  week.lectures.sort(
                    (a: any, b: any) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  weekFound = true;
                  break;
                }
              }

              if (!weekFound) {
                acc.push({
                  week: `Vecka ${acc.length + 1}`,
                  lectures: [lecture],
                });
              }

              return acc;
            },
            []
          );

          setWeeksData(groupedByWeek);
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
        {weeksData.map((weekData) => (
          <LectureTitle
            key={weekData.week}
            week={weekData.week}
            lectures={weekData.lectures}
          />
        ))}
      </>
    </Layout>
  );
}
