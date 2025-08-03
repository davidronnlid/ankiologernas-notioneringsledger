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
  
  const hasPages = !!(
    process.env.NOTION_COURSE_PAGE_DAVID ||
    process.env.NOTION_COURSE_PAGE_ALBIN ||
    process.env.NOTION_COURSE_PAGE_MATTIAS
  );
  
  return hasTokens && hasPages;
};

// Auto-sync triggers based on user actions - now using page-based system
export const triggerNotionSync = async (
  action: 'lecture_created' | 'lecture_updated' | 'lecture_deleted' | 'lecture_selected' | 'lecture_unselected',
  lectureData: any,
  user?: string
) => {
  // Check if we have the necessary environment variables for page-based sync
  const hasPageConfig = !!(
    process.env.NOTION_COURSE_PAGE_DAVID ||
    process.env.NOTION_COURSE_PAGE_ALBIN ||
    process.env.NOTION_COURSE_PAGE_MATTIAS
  );

  if (!hasPageConfig) {
    console.log('🔄 Notion page-based integration not configured, skipping sync');
    return;
  }

  console.log(`🔄 Triggering Notion page sync for action: ${action}`);

  try {
    // For the new page-based system, we only need to handle select/unselect actions
    // All lectures should be automatically added when they don't exist
    if (action === 'lecture_selected' || action === 'lecture_unselected') {
      if (!user) {
        console.warn('❌ User is required for lecture selection sync');
        return;
      }

      // Subject area logic removed - simplified database with only 3 columns

      // Use the database endpoint
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

// Subject area determination function removed - no longer needed for simplified 3-column database

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
    const isActive = currentDate >= startDate && currentDate <= endDate;
    console.log(`📅 Course: ${course.title}, Start: ${course.startDate}, End: ${course.endDate}, Active: ${isActive}`);
    return isActive;
  });

  console.log(`📚 Current date: ${currentDate.toISOString().split('T')[0]}, Active course: ${activeCourse?.title || 'None'}`);
  return activeCourse || null;
};

// Helper function to filter lectures by active course (exported for use in components)
export const filterLecturesByActiveCourse = (lecturesData: any[]) => {
  const targetCourse = {
    title: "Klinisk medicin 4",
    startDate: "2025-08-01",
    endDate: "2026-01-17",
  };
  
  console.log(`🎯 Targeting course: ${targetCourse.title}`);
  console.log(`📊 Total weeks data to filter: ${lecturesData.length}`);

  // Filter weeks that belong to the target course, then flatten to get lectures
  const activeWeeks = lecturesData.filter(week => {
    const isKM4Week = week.course === targetCourse.title;
    if (isKM4Week) {
      console.log(`✅ Including week with course: ${week.course} (${week.lectures.length} lectures)`);
    } else {
      console.log(`❌ Excluding week with course: ${week.course || 'unassigned'} (${week.lectures.length} lectures)`);
    }
    return isKM4Week;
  });

  // Flatten the filtered weeks to get individual lectures
  const activeLectures = activeWeeks.flatMap(week => week.lectures);
  
  console.log(`📊 Filtered to ${activeLectures.length} lectures for ${targetCourse.title} (from ${lecturesData.flatMap(w => w.lectures).length} total)`);
  
  if (activeLectures.length > 0) {
    // Sort by lecture number for consistent reporting
    const sortedLectures = activeLectures.sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0));
    console.log(`📋 Lecture range: ${sortedLectures[0]?.lectureNumber || 'N/A'} to ${sortedLectures[sortedLectures.length - 1]?.lectureNumber || 'N/A'}`);
    console.log(`📝 Sample lectures: ${sortedLectures.slice(0, 3).map(l => `${l.lectureNumber}. ${l.title.substring(0, 30)}...`).join(', ')}`);
  } else {
    console.warn(`⚠️ No lectures found for course: ${targetCourse.title}`);
    console.log(`🔍 Available courses in data: ${[...new Set(lecturesData.map(w => w.course))].join(', ')}`);
  }

  return { 
    activeCourse: targetCourse, 
    activeLectures, 
    filteredCount: activeLectures.length, 
    totalCount: lecturesData.flatMap(w => w.lectures).length 
  };
};

// Bulk sync function to ensure ALL lectures from active course exist in Notion pages
export const syncAllLecturesToNotionPages = async (
  lectures: any[],
  progressCallbacks?: {
    onLectureStart?: (lectureNumber: number, title: string, current: number, total: number) => void;
    onLectureComplete?: (lectureNumber: number, title: string, success: boolean, current: number, total: number) => void;
    onLectureError?: (lectureNumber: number, title: string, error: string, current: number, total: number) => void;
  }
): Promise<{ success: boolean; message: string; results: any[] }> => {
  // NOTE: Lectures are already filtered by Layout.tsx - don't filter again here to avoid progress mismatch
  console.log(`🔄 Starting bulk sync of ${lectures.length} pre-filtered lectures`);
  
  // Log all lecture titles for debugging
  console.log(`📋 All lectures to sync:`, lectures.map(l => `${l.lectureNumber}. ${l.title}`));

  if (lectures.length === 0) {
    return {
      success: true,
      message: `No lectures to sync`,
      results: []
    };
  }

  const results: any[] = [];
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < lectures.length; i++) {
    const lecture = lectures[i];
    const currentProgress = i + 1;
    const totalLectures = lectures.length;
    
    try {
      console.log(`🔄 Processing lecture ${currentProgress}/${totalLectures}: ${lecture.lectureNumber}. ${lecture.title}`);
      console.log(`📊 Lecture details:`, {
        number: lecture.lectureNumber,
        title: lecture.title,
        date: lecture.date,
        hasTitle: !!lecture.title,
        titleLength: lecture.title?.length || 0
      });
      
      // Notify UI that we're starting this lecture
      progressCallbacks?.onLectureStart?.(
        lecture.lectureNumber, 
        lecture.title, 
        currentProgress, 
        totalLectures
      );
      
      // Subject area logic removed - simplified database with only 3 columns
      console.log(`📂 Processing lecture: ${lecture.title}`);

      // Use the database endpoint to add the lecture
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/updateNotionDatabase'
        : '/.netlify/functions/updateNotionDatabase';
      
      console.log(`📡 Calling ${endpoint} for bulk_add action`);
      
      // Get current user from Redux store
      let currentUser = null;
      try {
        // Import store dynamically to avoid SSR issues
        const { store } = await import('../store/store');
        const state = store.getState();
        currentUser = state.auth.user;
      } catch (error) {
        console.warn('Could not get current user from store:', error);
      }
      
      // Use current user's name, fallback to 'David' for development
      const selectedByUser = currentUser?.full_name || 'David Rönnlid';
      
      const requestBody = {
        lectureTitle: lecture.title,
        lectureNumber: lecture.lectureNumber,
        subjectArea: lecture.subjectArea, // Add subject area to the request
        selectedByUser: selectedByUser, // Use actual logged-in user
        action: 'bulk_add' // New action type for bulk adding
      };
      
      console.log(`📤 Request body:`, requestBody);
      
      // Add retry logic for failed requests
      let response: Response | undefined;
      let attempt = 0;
      const maxRetries = 3;
      
      while (attempt < maxRetries) {
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          console.log(`📥 Response status: ${response.status} (attempt ${attempt + 1})`);
          
          if (response.ok) {
            break; // Success, exit retry loop
          } else {
            const errorText = await response.text();
            console.error(`❌ HTTP error ${response.status} (attempt ${attempt + 1}): ${errorText}`);
            
            if (attempt === maxRetries - 1) {
              throw new Error(`HTTP error after ${maxRetries} attempts! status: ${response.status} - ${errorText}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        } catch (fetchError) {
          console.error(`❌ Fetch error (attempt ${attempt + 1}):`, fetchError);
          
          if (attempt === maxRetries - 1) {
            throw fetchError;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
        
        attempt++;
      }

      if (!response) {
        throw new Error('Failed to get response after all retry attempts');
      }

      const result = await response.json();
      console.log(`📊 Response result:`, result);
      
      if (result.success) {
        successCount++;
        console.log(`✅ Successfully synced: ${lecture.title}`);
        results.push({
          lecture: lecture.title,
          status: 'success'
        });
        
        // Notify UI of successful completion
        progressCallbacks?.onLectureComplete?.(
          lecture.lectureNumber, 
          lecture.title, 
          true, 
          currentProgress, 
          totalLectures
        );
      } else if (result.message && (result.message.includes('already exists') || result.message.includes('DUPLICATE'))) {
        skipCount++;
        console.log(`⚠️ Lecture already exists (duplicate prevented): ${lecture.title}`);
        results.push({
          lecture: lecture.title,
          status: 'skipped',
          reason: 'Duplicate prevented'
        });
        
        // Notify UI of successful completion (skipped duplicates = success)
        progressCallbacks?.onLectureComplete?.(
          lecture.lectureNumber, 
          lecture.title, 
          true, 
          currentProgress, 
          totalLectures
        );
      } else {
        errorCount++;
        const errorMessage = result.message || 'Unknown API error';
        console.log(`❌ Failed to sync: ${lecture.title} - ${errorMessage}`);
        results.push({
          lecture: lecture.title,
          status: 'error',
          reason: errorMessage
        });
        
        // Notify UI of error with specific message
        progressCallbacks?.onLectureError?.(
          lecture.lectureNumber, 
          lecture.title, 
          errorMessage, 
          currentProgress, 
          totalLectures
        );
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
      
      // Notify UI of error
      progressCallbacks?.onLectureError?.(
        lecture.lectureNumber, 
        lecture.title, 
        errorMessage, 
        currentProgress, 
        totalLectures
      );
    }

    // Small delay between requests to be gentle on the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const message = `Bulk sync completed: ${successCount} successful, ${skipCount} skipped, ${errorCount} errors (${lectures.length} total lectures processed)`;
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