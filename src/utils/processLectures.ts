import Lecture from "types/lecture";
import { WeekData } from "@/types";
import { coursePeriods } from "./coursePeriods";

import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

export const calculateDuration = (time: string) => {
  const [startTime, endTime] = time.split("-").map((t) => t.trim());
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // Calculate total duration in minutes
  let durationMinutes = endTotalMinutes - startTotalMinutes;

  // Subtract 15 minutes per full hour only if the lecture is at least one hour long
  const fullHours = Math.floor(durationMinutes / 60);
  if (fullHours >= 1) {
    durationMinutes -= fullHours * 15;
  }

  // Convert the total duration in minutes to hours, rounding to two decimals
  const durationHours = parseFloat((durationMinutes / 60).toFixed(2));

  return durationHours;
};

export const calculateTotalCourseHours = (
  groupedByWeek: WeekData[]
): number => {
  // Flatten WeekData[] into a single array of lectures
  console.log("groupedByWeek in calculateTotalCourseHours", groupedByWeek);
  const allLectures: Lecture[] = groupedByWeek.flatMap((week) => week.lectures);

  // Calculate the total duration for all lectures
  const totalCourseHours = allLectures.reduce((total, lecture) => {
    const lectureDuration = calculateDuration(lecture.time);
    return total + lectureDuration;
  }, 0);

  console.log("totalCourseHours in calculateTotalCourseHours", groupedByWeek);

  return totalCourseHours;
};

// Function to calculate total number of lectures that a person has notionerat
export const calculateTotals = (groupedByWeek: WeekData[]) => {
  groupedByWeek.forEach((week: WeekData) => {
    week.totals = { Mattias: 0, Albin: 0, David: 0 };

    week.lectures.forEach((lecture: Lecture) => {
      if (lecture.checkboxState?.Mattias.confirm) week.totals.Mattias += 1;
      if (lecture.checkboxState?.Albin.confirm) week.totals.Albin += 1;
      if (lecture.checkboxState?.David.confirm) week.totals.David += 1;
    });
  });

  return groupedByWeek;
};

// Function to calculate total number of hours that a person has notionerat for all weeks of a course
export const calculateTotalHoursPerPerson = (
  groupedByWeek: WeekData[]
): WeekData[] => {
  groupedByWeek.forEach((week: WeekData) => {
    // Initialize totalHours for each person
    week.totalHours = { Mattias: 0, Albin: 0, David: 0 };

    week.lectures.forEach((lecture: Lecture) => {
      const duration = calculateDuration(lecture.time);

      // Add duration to each person's total if they have notionerat (checkboxState is true)
      if (lecture.checkboxState?.Mattias.confirm)
        week.totalHours.Mattias += duration;
      if (lecture.checkboxState?.Albin.confirm)
        week.totalHours.Albin += duration;
      if (lecture.checkboxState?.David.confirm)
        week.totalHours.David += duration;
    });
  });

  return groupedByWeek;
};

export const sortLecturesIntoCoursesAndWeeks = (
  lectures: Lecture[],
  currentDate: Date
): WeekData[] => {
  console.log("Processing lectures for date: ", currentDate);

  const lectureNumberCounters = new Map(
    coursePeriods.map((course) => [course.title, 0])
  );
  console.log(
    "Lecture number counters initialized for courses: ",
    Array.from(lectureNumberCounters.keys())
  );

  const sortedLectures = lectures.sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  console.log("Lectures sorted by date: ", sortedLectures);
  let globalLectureCounter = 0; // Counter for lectures that don't belong to any course
  
  const lecturesWithNumbers = sortedLectures.map((lecture: Lecture, index: number) => {
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
      // For lectures that don't belong to any course, assign a sequential number
      globalLectureCounter++;
      console.log(`Lecture "${lecture.title}" does not belong to any course period, assigning fallback number: ${globalLectureCounter}`);
      return { ...lecture, lectureNumber: globalLectureCounter };
    }
  });
  console.log("Lectures with assigned numbers: ", lecturesWithNumbers);

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
        console.log(`Processing lecture for course: ${course.title}`);

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
          console.log(
            `Starting new week for course: ${
              course.title
            }, week number: ${courseWeekNumbers.get(course.title)}`
          );

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
        console.log(
          "Processing lecture not associated with a course period",
          lecture
        );
      }

      return acc;
    },
    []
  );
  console.log("Grouped by week before calculating totals: ", groupedByWeek);

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
          weekData.wishedTotal[person] += lecture.checkboxState[person].confirm
            ? calculateDuration(lecture.time)
            : 0;
        });
      }
    });
  });

  return finalWeeksData;
};

import { RootState } from "store/types";
import { Course } from "types/course";

export const selectLecturesForCourse = (state: RootState, course: Course) => {
  const startDate = new Date(course.startDate);
  const endDate = new Date(course.endDate);

  return state.lectures.lectures.filter((weekData: WeekData) =>
    weekData.lectures.some((lecture) => {
      const lectureDate = new Date(lecture.date);
      return lectureDate >= startDate && lectureDate <= endDate;
    })
  );
};

export const isCourseActive = (courseTitle: string, currentDate: Date) => {
  console.log(
    `Checking if course "${courseTitle}" is active on date: ${currentDate}`
  );

  // In development mode, always show courses as active for testing
  if (process.env.NODE_ENV === "development") {
    console.log(
      `🔧 Development mode: Course "${courseTitle}" forced to be active for testing`
    );
    return true;
  }

  // Find the course by title
  const course = coursePeriods.find((c) => c.title === courseTitle);
  console.log(
    course
      ? `Course "${courseTitle}" found.`
      : `Course "${courseTitle}" not found.`
  );

  // If the course isn't found, it's not active by default
  if (!course) {
    console.log(
      `Course "${courseTitle}" is not active because it does not exist.`
    );
    return false;
  }

  // Parse the start and end dates from the course
  const courseStartDate = new Date(course.startDate);
  const courseEndDate = new Date(course.endDate);
  console.log(
    `Course "${courseTitle}" starts on ${courseStartDate} and ends on ${courseEndDate}.`
  );

  // Check if the current date is within the course start and end dates
  const isActive =
    currentDate >= courseStartDate && currentDate <= courseEndDate;
  console.log(
    isActive
      ? `Course "${courseTitle}" is currently active.`
      : `Course "${courseTitle}" is not active at the current date.`
  );

  return isActive;
};

export const getDisplayCourseTitle = (courseTitle: string): string => {
  const currentDate = new Date();
  const isActive = isCourseActive(courseTitle, currentDate);
  
  // Only abbreviate active courses
  if (!isActive) {
    return courseTitle;
  }
  
  // Add "-föreläsningar" suffix for active courses
  const courseTitlesWithSuffix: { [key: string]: string } = {
    "Klinisk medicin 1": "Klinisk medicin 1-föreläsningar",
    "Klinisk medicin 2": "Klinisk medicin 2-föreläsningar", 
    "Klinisk medicin 3": "Klinisk medicin 3-föreläsningar",
    "Klinisk medicin 4": "Klinisk medicin 4-föreläsningar",
    "Medicinsk Mikrobiologi": "Medicinsk Mikrobiologi-föreläsningar",
  };
  
  return courseTitlesWithSuffix[courseTitle] || courseTitle;
};
