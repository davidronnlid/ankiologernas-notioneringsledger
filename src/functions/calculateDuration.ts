import Lecture from "types/lecture";
import { WeekData } from "@/types";

// Function to calculate the duration of a lecture
export const calculateDuration = (time: string) => {
  const [startTime, endTime] = time.split("-").map((t) => t.trim());
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // Calculate total duration in minutes
  let durationMinutes = endTotalMinutes - startTotalMinutes;

  // Subtract the 15 minutes breaks from the total duration before calculating blocks
  // Every full hour has a 15-minute break
  const fullHours = Math.floor(durationMinutes / 60);
  durationMinutes -= fullHours * 15;

  // Calculate the number of 45-minute lecture blocks
  // Do not round up, as we've already subtracted the breaks
  const lectureBlocks = Math.floor(durationMinutes / 45);

  return lectureBlocks;
};

// Function to calculate total number of lectures that a person has notionerat
export const calculateTotals = (groupedByWeek: WeekData[]) => {
  groupedByWeek.forEach((week: WeekData) => {
    week.totals = { Mattias: 0, Albin: 0, David: 0 };

    week.lectures.forEach((lecture: Lecture) => {
      if (lecture.checkboxState?.Mattias) week.totals.Mattias += 1;
      if (lecture.checkboxState?.Albin) week.totals.Albin += 1;
      if (lecture.checkboxState?.David) week.totals.David += 1;
    });
  });

  return groupedByWeek;
};
export const calculateTotalHoursPerPerson = (
  groupedByWeek: WeekData[]
): WeekData[] => {
  groupedByWeek.forEach((week: WeekData) => {
    // Initialize totalHours for each person
    week.totalHours = { Mattias: 0, Albin: 0, David: 0 };

    week.lectures.forEach((lecture: Lecture) => {
      const duration = calculateDuration(lecture.time);

      // Add duration to each person's total if they have notionerat (checkboxState is true)
      if (lecture.checkboxState?.Mattias) week.totalHours.Mattias += duration;
      if (lecture.checkboxState?.Albin) week.totalHours.Albin += duration;
      if (lecture.checkboxState?.David) week.totalHours.David += duration;
    });
  });

  return groupedByWeek;
};
