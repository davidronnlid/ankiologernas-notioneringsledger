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

      // Determine subject area from lecture title or use a default
      const subjectArea = determineSubjectArea(lectureData.title);
      
      if (!subjectArea) {
        console.warn(`❌ Could not determine subject area for lecture: ${lectureData.title}`);
        return;
      }

      // Use the new updateNotionPage endpoint
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/updateNotionPage' // We'll need to create this API route
        : '/.netlify/functions/updateNotionPage';
      
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

// Bulk sync function to ensure ALL lectures exist in Notion pages
export const syncAllLecturesToNotionPages = async (
  lectures: any[]
): Promise<{ success: boolean; message: string; results: any[] }> => {
  console.log(`🔄 Starting bulk sync of ${lectures.length} lectures to Notion pages`);

  const results: any[] = [];
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // Check if we have the necessary environment variables for page-based sync
  const hasPageConfig = !!(
    process.env.NOTION_COURSE_PAGE_DAVID ||
    process.env.NOTION_COURSE_PAGE_ALBIN ||
    process.env.NOTION_COURSE_PAGE_MATTIAS
  );

  if (!hasPageConfig) {
    return {
      success: false,
      message: 'Notion page-based integration not configured',
      results: []
    };
  }

  for (const lecture of lectures) {
    try {
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

      // Use the new updateNotionPage endpoint to add the lecture
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/updateNotionPage'
        : '/.netlify/functions/updateNotionPage';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureTitle: lecture.title,
          lectureNumber: lecture.lectureNumber,
          selectedByUser: 'System', // Use 'System' to indicate bulk sync
          subjectArea: subjectArea,
          action: 'bulk_add' // New action type for bulk adding
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        successCount++;
        results.push({
          lecture: lecture.title,
          status: 'success',
          subjectArea: subjectArea
        });
      } else {
        errorCount++;
        results.push({
          lecture: lecture.title,
          status: 'error',
          reason: result.message
        });
      }

    } catch (error) {
      errorCount++;
      results.push({
        lecture: lecture.title,
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`❌ Failed to sync lecture ${lecture.title}:`, error);
    }

    // Small delay between requests to be gentle on the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const message = `Bulk sync completed: ${successCount} successful, ${skipCount} skipped, ${errorCount} errors`;
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