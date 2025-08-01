import Lecture from "../types/lecture";

/**
 * Utility for managing unique lectures and removing duplicates from the database
 */

export interface DuplicateGroup {
  title: string;
  lectures: Lecture[];
  keepLecture: Lecture; // The lecture to keep (usually the newest or most complete)
  removeLectures: Lecture[]; // Lectures to remove
}

export interface UniquenessScanResult {
  totalLectures: number;
  uniqueLectures: number;
  duplicateGroups: DuplicateGroup[];
  lecturesMarkedForRemoval: Lecture[];
}

/**
 * Analyzes lectures for duplicates based on title
 */
export function analyzeLectureUniqueness(lectures: Lecture[]): UniquenessScanResult {
  console.log('🔍 Starting uniqueness analysis for', lectures.length, 'lectures');
  
  // Group lectures by title (case-insensitive)
  const titleGroups = new Map<string, Lecture[]>();
  
  lectures.forEach(lecture => {
    const normalizedTitle = lecture.title.toLowerCase().trim();
    if (!titleGroups.has(normalizedTitle)) {
      titleGroups.set(normalizedTitle, []);
    }
    titleGroups.get(normalizedTitle)!.push(lecture);
  });

  const duplicateGroups: DuplicateGroup[] = [];
  const lecturesMarkedForRemoval: Lecture[] = [];

  // Process groups with duplicates
  titleGroups.forEach((groupLectures, normalizedTitle) => {
    if (groupLectures.length > 1) {
      console.log(`📋 Found ${groupLectures.length} lectures with title: "${groupLectures[0].title}"`);
      
      // Sort by date (newest first), then by presence of comments/state
      const sortedLectures = [...groupLectures].sort((a, b) => {
        // First priority: date (newer is better)
        const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        // Second priority: has comments (more data is better)
        const aHasComments = (a.comments && a.comments.length > 0) ? 1 : 0;
        const bHasComments = (b.comments && b.comments.length > 0) ? 1 : 0;
        const commentsComparison = bHasComments - aHasComments;
        if (commentsComparison !== 0) return commentsComparison;
        
        // Third priority: has checkbox states (user interactions)
        const aHasStates = Object.values(a.checkboxState || {}).some(
          state => state.confirm || state.unwish
        ) ? 1 : 0;
        const bHasStates = Object.values(b.checkboxState || {}).some(
          state => state.confirm || state.unwish
        ) ? 1 : 0;
        
        return bHasStates - aHasStates;
      });

      const keepLecture = sortedLectures[0]; // Keep the "best" one
      const removeLectures = sortedLectures.slice(1); // Remove the rest

      duplicateGroups.push({
        title: groupLectures[0].title,
        lectures: groupLectures,
        keepLecture,
        removeLectures
      });

      lecturesMarkedForRemoval.push(...removeLectures);

      console.log(`📌 Keeping lecture: ${keepLecture.id} (${keepLecture.date})`);
      console.log(`🗑️ Removing ${removeLectures.length} duplicates:`, 
        removeLectures.map(l => `${l.id} (${l.date})`));
    }
  });

  const result: UniquenessScanResult = {
    totalLectures: lectures.length,
    uniqueLectures: lectures.length - lecturesMarkedForRemoval.length,
    duplicateGroups,
    lecturesMarkedForRemoval
  };

  console.log('📊 Uniqueness Analysis Result:', {
    totalLectures: result.totalLectures,
    uniqueLectures: result.uniqueLectures,
    duplicateGroupsFound: result.duplicateGroups.length,
    lecturesMarkedForRemoval: result.lecturesMarkedForRemoval.length
  });

  return result;
}

/**
 * Removes duplicate lectures from MongoDB
 */
export async function removeDuplicateLecturesFromDatabase(
  lecturesToRemove: Lecture[]
): Promise<boolean> {
  if (lecturesToRemove.length === 0) {
    console.log('✅ No duplicate lectures to remove');
    return true;
  }

  console.log(`🗑️ Removing ${lecturesToRemove.length} duplicate lectures from database...`);

  const apiUrl = process.env.NODE_ENV === "development"
    ? "/api/functions/removeDuplicates"
    : "/.netlify/functions/removeDuplicates";

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lectureIds: lecturesToRemove.map(l => l.id)
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Successfully removed duplicate lectures:', result);
    
    return true;
  } catch (error) {
    console.error('❌ Error removing duplicate lectures:', error);
    return false;
  }
}

/**
 * Main function to ensure lecture uniqueness
 * This should be called whenever lectures are loaded
 */
export async function ensureLectureUniqueness(
  lectures: Lecture[]
): Promise<UniquenessScanResult> {
  console.log('🚀 Starting lecture uniqueness enforcement...');
  
  // Analyze for duplicates
  const scanResult = analyzeLectureUniqueness(lectures);
  
  // If duplicates found, remove them from database
  if (scanResult.lecturesMarkedForRemoval.length > 0) {
    console.log(`🔧 Found ${scanResult.lecturesMarkedForRemoval.length} duplicate lectures, removing from database...`);
    
    const removalSuccess = await removeDuplicateLecturesFromDatabase(
      scanResult.lecturesMarkedForRemoval
    );
    
    if (removalSuccess) {
      console.log('✅ Database cleanup completed successfully');
      
      // Log summary for user visibility
      scanResult.duplicateGroups.forEach(group => {
        console.log(`📋 "${group.title}": Kept 1, removed ${group.removeLectures.length} duplicates`);
      });
    } else {
      console.error('❌ Database cleanup failed');
    }
  } else {
    console.log('✅ All lecture titles are unique - no action needed');
  }
  
  return scanResult;
}

/**
 * Check if a specific lecture title is unique among the provided lectures
 */
export function isLectureTitleUnique(title: string, lectures: Lecture[], excludeId?: string): boolean {
  const normalizedTitle = title.toLowerCase().trim();
  
  const conflictingLectures = lectures.filter(lecture => {
    if (excludeId && lecture.id === excludeId) {
      return false; // Exclude the lecture being edited
    }
    return lecture.title.toLowerCase().trim() === normalizedTitle;
  });
  
  return conflictingLectures.length === 0;
}

/**
 * Get suggestions for making a duplicate title unique
 */
export function generateUniqueTitleSuggestions(
  originalTitle: string, 
  lectures: Lecture[]
): string[] {
  const suggestions: string[] = [];
  const baseTitle = originalTitle.trim();
  
  // Try adding numbers
  for (let i = 2; i <= 5; i++) {
    const suggestion = `${baseTitle} (${i})`;
    if (isLectureTitleUnique(suggestion, lectures)) {
      suggestions.push(suggestion);
    }
  }
  
  // Try adding descriptive suffixes
  const suffixes = ['- Del 1', '- Fortsättning', '- Uppföljning', '- Extra'];
  suffixes.forEach(suffix => {
    const suggestion = `${baseTitle} ${suffix}`;
    if (isLectureTitleUnique(suggestion, lectures)) {
      suggestions.push(suggestion);
    }
  });
  
  return suggestions.slice(0, 3); // Return max 3 suggestions
}