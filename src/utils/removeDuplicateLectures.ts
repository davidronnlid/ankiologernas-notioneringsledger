import Lecture from "../types/lecture";
import { WeekData } from "../types";

/**
 * Removes duplicate lectures with the same title within the same course
 * Keeps the first occurrence and removes subsequent duplicates
 */
export function removeDuplicateLectures(weeksData: WeekData[]): { cleanedData: WeekData[], removedDuplicates: string[] } {
  const cleanedWeeksData: WeekData[] = [];
  const removedDuplicates: string[] = [];
  
  // Track seen titles per course to avoid duplicates
  const seenTitlesPerCourse: { [course: string]: Set<string> } = {};
  
  for (const week of weeksData) {
    const course = week.course;
    
    // Initialize set for this course if it doesn't exist
    if (!seenTitlesPerCourse[course]) {
      seenTitlesPerCourse[course] = new Set();
    }
    
    // Filter out duplicate lectures in this week
    const uniqueLectures = week.lectures.filter(lecture => {
      const title = lecture.title.trim();
      
      // If we've seen this title before in this course, it's a duplicate
      if (seenTitlesPerCourse[course].has(title)) {
        console.log(`🗑️ Removing duplicate: "${title}" from course "${course}"`);
        removedDuplicates.push(title);
        return false;
      }
      
      // Mark this title as seen
      seenTitlesPerCourse[course].add(title);
      return true;
    });
    
    // Only add the week if it has lectures after deduplication
    if (uniqueLectures.length > 0) {
      cleanedWeeksData.push({
        ...week,
        lectures: uniqueLectures,
        // Recalculate totals after deduplication
        totals: week.totals,
        totalHours: week.totalHours,
        wishedTotal: week.wishedTotal
      });
    }
  }
  
  return { cleanedData: cleanedWeeksData, removedDuplicates };
}

/**
 * Logs statistics about duplicate removal
 */
export function logDuplicateStats(originalData: WeekData[], cleanedData: WeekData[]): void {
  const originalCount = originalData.reduce((sum, week) => sum + week.lectures.length, 0);
  const cleanedCount = cleanedData.reduce((sum, week) => sum + week.lectures.length, 0);
  const removedCount = originalCount - cleanedCount;
  
  console.log(`📊 Duplicate removal stats:`);
  console.log(`   Original lectures: ${originalCount}`);
  console.log(`   After deduplication: ${cleanedCount}`);
  console.log(`   Removed duplicates: ${removedCount}`);
  
  if (removedCount > 0) {
    console.log(`   Reduction: ${((removedCount / originalCount) * 100).toFixed(1)}%`);
  }
} 