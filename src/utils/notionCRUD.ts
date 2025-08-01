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

// Auto-sync triggers based on user actions
export const triggerNotionSync = async (
  action: 'lecture_created' | 'lecture_updated' | 'lecture_deleted' | 'lecture_selected' | 'lecture_unselected',
  lectureData: any,
  user?: string
) => {
  if (!isNotionIntegrationAvailable()) {
    console.log('🔄 Notion integration not available, skipping sync');
    return;
  }

  console.log(`🔄 Triggering Notion sync for action: ${action}`);

  try {
    switch (action) {
      case 'lecture_created':
        await createLectureInNotion(lectureData);
        break;
        
      case 'lecture_updated':
        await updateLectureInNotion(lectureData, user ? { user, action: 'modify' } : undefined);
        break;
        
      case 'lecture_deleted':
        await deleteLectureFromNotion(lectureData);
        break;
        
      case 'lecture_selected':
        if (user) {
          await updateLectureInNotion(lectureData, { user, action: 'select' });
        }
        break;
        
      case 'lecture_unselected':
        if (user) {
          await updateLectureInNotion(lectureData, { user, action: 'unselect' });
        }
        break;
        
      default:
        console.warn(`Unknown action for Notion sync: ${action}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync ${action} to Notion:`, error);
  }
};