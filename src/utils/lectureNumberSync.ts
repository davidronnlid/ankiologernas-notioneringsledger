import Lecture from '../types/lecture';

// Extract clean title without lecture number
const extractCleanTitle = (fullTitle: string): string => {
  // Remove lecture number pattern like "1. ", "23. ", etc.
  return fullTitle.replace(/^\d+\.\s*/, '').trim();
};

// Flatten lectures from WeekData structure to simple array
const flattenLectures = (weekData: any[]): Lecture[] => {
  return weekData.flatMap(week => week.lectures || []);
};

// Sync lecture numbers with Notion database
export const syncLectureNumbersWithNotion = async (
  lectures: any[],
  currentUser: any
): Promise<{ success: boolean; message: string; updatedCount?: number }> => {
  try {
    // Skip in development mode to avoid errors
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 Skipping lecture number sync in development mode`);
      return {
        success: true,
        message: 'Lecture number sync skipped in development mode'
      };
    }

    if (!currentUser || !currentUser.full_name) {
      console.log(`⚠️ No current user found, skipping lecture number sync`);
      return {
        success: false,
        message: 'No current user found'
      };
    }

    // Map full names to short names for backend processing
    let userName = currentUser.full_name;
    if (userName.toLowerCase().includes('dronnlid') || userName.includes('David Rönnlid')) {
      userName = 'David';
    } else if (userName.includes('Albin Lindberg')) {
      userName = 'Albin';
    } else if (userName.includes('Mattias Österdahl')) {
      userName = 'Mattias';
    } else {
      console.log(`⚠️ Unknown user: ${currentUser.full_name}, skipping lecture number sync`);
      return {
        success: false,
        message: `Unknown user: ${currentUser.full_name}`
      };
    }

    console.log(`🔄 Starting lecture number sync for ${userName}`);
    console.log(`📊 Processing ${lectures.length} lectures`);

    // Flatten lectures if they're in WeekData format
    const flatLectures = Array.isArray(lectures[0]?.lectures) 
      ? flattenLectures(lectures)
      : lectures;

    console.log(`📊 Flattened to ${flatLectures.length} lectures`);

    // Call the sync API
    const endpoint = process.env.NODE_ENV === 'development' 
      ? '/api/syncLectureNumbers' 
      : '/.netlify/functions/syncLectureNumbers';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lectures: flatLectures,
        userName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lecture number sync failed: ${response.status} - ${errorText}`);
      return {
        success: false,
        message: `Sync failed: ${response.status} - ${errorText}`
      };
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Lecture number sync completed: ${result.summary.updatedCount} lectures updated`);
      return {
        success: true,
        message: `Lecture numbers synced successfully: ${result.summary.updatedCount} lectures updated`,
        updatedCount: result.summary.updatedCount
      };
    } else {
      console.error(`❌ Lecture number sync failed: ${result.message}`);
      return {
        success: false,
        message: result.message
      };
    }

  } catch (error) {
    console.error(`❌ Error during lecture number sync:`, error);
    return {
      success: false,
      message: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Check if lecture numbers need syncing (for optimization)
export const shouldSyncLectureNumbers = (lastSyncTime: number | null): boolean => {
  // Sync if never synced before
  if (!lastSyncTime) {
    return true;
  }

  // Sync if last sync was more than 1 hour ago
  const oneHour = 60 * 60 * 1000;
  return Date.now() - lastSyncTime > oneHour;
}; 