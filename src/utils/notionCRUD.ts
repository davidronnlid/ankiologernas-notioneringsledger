// Enhanced Notion CRUD utility for comprehensive database operations

interface NotionCRUDRequest {
  operation: 'create' | 'read' | 'update' | 'delete' | 'sync';
  lectureData?: {
    id?: string;
    title: string;
    lectureNumber: number;
    date: string;
    time: string;
    lecturer?: string;
  };
  userAction?: {
    user: string;
    action: 'select' | 'unselect' | 'modify';
  };
  syncOptions?: {
    direction: 'to_notion' | 'from_notion' | 'bidirectional';
    users: string[];
  };
}

interface NotionCRUDResponse {
  success: boolean;
  operation: string;
  message: string;
  results: any[];
  summary: {
    successful: number;
    failed: number;
    total: number;
  };
}

// Main CRUD function that handles all Notion operations
export const notionCRUD = async (request: NotionCRUDRequest): Promise<NotionCRUDResponse> => {
  try {
    console.log(`🎯 Notion CRUD: ${request.operation}`, request);

    // Use appropriate endpoint based on environment
    const endpoint = process.env.NODE_ENV === 'development' 
      ? '/api/notion-crud' 
      : '/.netlify/functions/notion-crud';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: NotionCRUDResponse = await response.json();
    
    if (result.success) {
      console.log(`✅ Notion ${request.operation} successful:`, result.summary);
    } else {
      console.error(`❌ Notion ${request.operation} failed:`, result.message);
    }

    return result;

  } catch (error) {
    console.error('❌ Error in Notion CRUD operation:', error);
    
    return {
      success: false,
      operation: request.operation,
      message: `Failed to ${request.operation}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      results: [],
      summary: {
        successful: 0,
        failed: 1,
        total: 1
      }
    };
  }
};

// Convenience functions for specific operations

export const createLectureInNotion = async (
  lectureData: any, 
  userAction?: { user: string; action: 'select' | 'unselect' }
) => {
  return notionCRUD({
    operation: 'create',
    lectureData,
    userAction
  });
};

export const readLecturesFromNotion = async (users: string[] = ['David', 'Albin', 'Mattias']) => {
  return notionCRUD({
    operation: 'read',
    syncOptions: { direction: 'from_notion', users }
  });
};

export const updateLectureInNotion = async (
  lectureData: any, 
  userAction?: { user: string; action: 'select' | 'unselect' | 'modify' }
) => {
  return notionCRUD({
    operation: 'update',
    lectureData,
    userAction
  });
};

export const deleteLectureFromNotion = async (lectureData: any) => {
  return notionCRUD({
    operation: 'delete',
    lectureData
  });
};

export const syncWithNotion = async (
  direction: 'to_notion' | 'from_notion' | 'bidirectional' = 'bidirectional',
  users: string[] = ['David', 'Albin', 'Mattias']
) => {
  return notionCRUD({
    operation: 'sync',
    syncOptions: { direction, users }
  });
};

// Helper function to check if Notion integration is available
export const isNotionIntegrationAvailable = (): boolean => {
  // Check if we have the necessary environment variables
  const hasTokens = !!(
    process.env.NOTION_TOKEN_DAVID ||
    process.env.NOTION_TOKEN_ALBIN ||
    process.env.NOTION_TOKEN_MATTIAS
  );
  
  const hasDatabases = !!(
    process.env.NOTION_DATABASE_DAVID ||
    process.env.NOTION_DATABASE_ALBIN ||
    process.env.NOTION_DATABASE_MATTIAS
  );
  
  return hasTokens && hasDatabases;
};

// Auto-sync triggers based on user actions - now using page-based system
export const triggerNotionSync = async (
  action: 'lecture_created' | 'lecture_updated' | 'lecture_deleted' | 'lecture_selected' | 'lecture_unselected',
  lectureData: any,
  user?: string
) => {
  // Check if we have the necessary environment variables for database-based sync
  const hasDatabaseConfig = !!(
    process.env.NOTION_DATABASE_DAVID ||
    process.env.NOTION_DATABASE_ALBIN ||
    process.env.NOTION_DATABASE_MATTIAS
  );

  if (!hasDatabaseConfig) {
    console.log('🔄 Notion database-based integration not configured, skipping sync');
    return;
  }

  console.log(`🔄 Triggering Notion database sync for action: ${action}`);

  try {
    // For the new page-based system, we only need to handle select/unselect actions
    // All lectures should be automatically added when they don't exist
    if (action === 'lecture_selected' || action === 'lecture_unselected') {
      if (!user) {
        console.warn('❌ User is required for lecture selection sync');
        return;
      }

      // Determine subject area from lecture title or use a default
      const subjectArea = determineSubjectArea(lectureData.title);
      
      if (!subjectArea) {
        console.warn(`❌ Could not determine subject area for lecture: ${lectureData.title}`);
        return;
      }

      // Use the new updateNotionDatabase endpoint
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/updateNotionDatabase'
        : '/.netlify/functions/updateNotionDatabase';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureTitle: lectureData.title,
          lectureNumber: lectureData.lectureNumber,
          selectedByUser: user,
          subjectArea: subjectArea,
          action: action === 'lecture_selected' ? 'select' : 'unselect'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Notion page sync successful for ${action}: ${lectureData.title}`);
      } else {
        console.error(`❌ Notion page sync failed:`, result.message);
      }
    } else {
      console.log(`🔄 Skipping ${action} - page-based system only handles lecture selection`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync ${action} to Notion:`, error);
  }
};

// Helper function to determine subject area from lecture title
const determineSubjectArea = (lectureTitle: string): string | null => {
  const title = lectureTitle.toLowerCase();
  
  // Map keywords to subject areas
  const subjectMappings = {
    'oftalmologi': 'Oftalmologi',
    'öga': 'Oftalmologi',
    'inflammation i oftalmologiskt': 'Oftalmologi',
    'pediatrik': 'Pediatrik',
    'barn': 'Pediatrik',
    'geriatrik': 'Geriatrik',
    'äldre': 'Geriatrik',
    'global hälsa': 'Global hälsa',
    'global': 'Global hälsa',
    'hälsa': 'Global hälsa',
    'equity': 'Global hälsa',
    'health': 'Global hälsa',
    'globala': 'Global hälsa',
    'öron': 'Öron-Näsa-Hals',
    'näsa': 'Öron-Näsa-Hals',
    'hals': 'Öron-Näsa-Hals',
    'ont': 'Öron-Näsa-Hals',
    'gynekologi': 'Gynekologi & Obstetrik',
    'obstetrik': 'Gynekologi & Obstetrik',
    'förlossning': 'Gynekologi & Obstetrik',
    'kvinna': 'Gynekologi & Obstetrik'
  };

  // Check for keyword matches
  for (const [keyword, subjectArea] of Object.entries(subjectMappings)) {
    if (title.includes(keyword)) {
      return subjectArea;
    }
  }

  // Default fallback - try to extract from common patterns
  if (title.includes('inflammation') && title.includes('perspektiv')) {
    return 'Oftalmologi'; // For "Inflammation i oftalmologiskt perspektiv"
  }

  // If no match found, return null and log for manual classification
  console.warn(`⚠️ Could not determine subject area for: "${lectureTitle}"`);
  return null;
};

// Helper function to get the currently active course
const getCurrentActiveCourse = () => {
  const currentDate = new Date();
  const coursePeriods = [
    {
      title: "Medicinsk Mikrobiologi",
      startDate: "2023-11-10",
      endDate: "2024-01-05",
    },
    {
      title: "Klinisk medicin 1",
      startDate: "2024-01-06",
      endDate: "2024-06-15",
    },
    {
      title: "Klinisk medicin 2",
      startDate: "2024-07-01",
      endDate: "2025-01-20",
    },
    {
      title: "Klinisk medicin 3",
      startDate: "2025-01-26",
      endDate: "2025-07-20",
    },
    {
      title: "Klinisk medicin 4",
      startDate: "2025-08-01",
      endDate: "2026-01-17",
    },
  ];

  const activeCourse = coursePeriods.find(course => {
    const startDate = new Date(course.startDate);
    const endDate = new Date(course.endDate);
    return currentDate >= startDate && currentDate <= endDate;
  });

  return activeCourse || null;
};

// Bulk sync function to ensure ALL lectures from active course exist in Notion pages
export const syncAllLecturesToNotionPages = async (
  lectures: any[]
): Promise<{ success: boolean; message: string; results: any[] }> => {
  console.log(`🔄 Starting bulk sync of ${lectures.length} lectures to Notion pages`);

  // Get the currently active course
  const activeCourse = getCurrentActiveCourse();
  console.log(`📚 Active course: ${activeCourse ? activeCourse.title : 'None found'}`);

  if (!activeCourse) {
    console.warn('⚠️ No active course found for current date');
    return {
      success: false,
      message: 'No active course found for current date',
      results: []
    };
  }

  // Filter to only include lectures from the active course
  const activeLectures = lectures.filter(lecture => {
    if (!lecture.date) {
      console.log(`⚠️ Lecture "${lecture.title}" has no date, skipping`);
      return false;
    }

    const lectureDate = new Date(lecture.date);
    const courseStartDate = new Date(activeCourse.startDate);
    const courseEndDate = new Date(activeCourse.endDate);
    
    const isInActiveCourse = lectureDate >= courseStartDate && lectureDate <= courseEndDate;
    
    if (!isInActiveCourse) {
      console.log(`⚠️ Lecture "${lecture.title}" (${lecture.date}) is not in active course ${activeCourse.title}, skipping`);
    }
    
    return isInActiveCourse;
  });

  console.log(`📚 Filtered to ${activeLectures.length} lectures from active course "${activeCourse.title}" (from ${lectures.length} total)`);

  if (activeLectures.length === 0) {
    return {
      success: true,
      message: `No lectures found for active course "${activeCourse.title}"`,
      results: []
    };
  }

  const results: any[] = [];
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const lecture of activeLectures) {
    try {
      console.log(`🔄 Processing lecture: ${lecture.lectureNumber}. ${lecture.title}`);
      
      // Determine subject area for the lecture
      const subjectArea = determineSubjectArea(lecture.title);
      
      if (!subjectArea) {
        console.warn(`⚠️ Skipping lecture without subject area: ${lecture.title}`);
        skipCount++;
        results.push({
          lecture: lecture.title,
          status: 'skipped',
          reason: 'Could not determine subject area'
        });
        continue;
      }

      console.log(`📂 Subject area determined: ${subjectArea} for lecture: ${lecture.title}`);

      // Use the new updateNotionDatabase endpoint to add the lecture
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/updateNotionDatabase'
        : '/.netlify/functions/updateNotionDatabase';
      
      console.log(`📡 Calling ${endpoint} for bulk_add action`);
      
      const requestBody = {
        lectureTitle: lecture.title,
        lectureNumber: lecture.lectureNumber,
        selectedByUser: 'System', // Use 'System' to indicate bulk sync
        subjectArea: subjectArea,
        action: 'bulk_add' // New action type for bulk adding
      };
      
      console.log(`📤 Request body:`, requestBody);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`📥 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error ${response.status}: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`📊 Response result:`, result);
      
      if (result.success) {
        successCount++;
        console.log(`✅ Successfully synced: ${lecture.title}`);
        results.push({
          lecture: lecture.title,
          status: 'success',
          subjectArea: subjectArea
        });
      } else {
        errorCount++;
        console.log(`❌ Failed to sync: ${lecture.title} - ${result.message}`);
        results.push({
          lecture: lecture.title,
          status: 'error',
          reason: result.message
        });
      }

    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Exception while syncing lecture ${lecture.title}:`, errorMessage);
      results.push({
        lecture: lecture.title,
        status: 'error',
        reason: errorMessage
      });
    }

    // Small delay between requests to be gentle on the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const message = `Bulk sync completed for active course "${activeCourse.title}": ${successCount} successful, ${skipCount} skipped, ${errorCount} errors (${activeLectures.length} total lectures processed)`;
  console.log(`📊 ${message}`);

  return {
    success: successCount > 0,
    message,
    results
  };
};

// Function to trigger bulk sync from the UI
export const triggerBulkNotionSync = async (): Promise<void> => {
  try {
    console.log('🚀 Initiating bulk Notion sync...');
    
    // Get all lectures from the Redux store or fetch from API
    // We'll need to access this from the component that calls it
    const response = await fetch('/api/functions/CRUDFLData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation: 'read' })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch lectures: ${response.status}`);
    }

    const lecturesData = await response.json();
    const allLectures = lecturesData.flatMap((week: any) => week.lectures);

    // Sync all lectures to Notion pages
    const result = await syncAllLecturesToNotionPages(allLectures);
    
    if (result.success) {
      console.log(`✅ Bulk sync completed successfully: ${result.message}`);
    } else {
      console.error(`❌ Bulk sync failed: ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Error during bulk Notion sync:', error);
  }
};