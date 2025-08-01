// Enhanced Notion CRUD utility for subject-specific databases with one-way sync

import { SubjectArea } from '../types/lecture';
import { getNotionEnvVars, detectSubjectArea } from './subjectAreas';

interface NotionSubjectCRUDRequest {
  operation: 'create' | 'update' | 'read_status'; // Removed 'delete', added 'read_status'
  lectureData: {
    id?: string;
    title: string;
    lectureNumber: number;
    date: string;
    time: string;
    lecturer?: string;
    subjectArea?: SubjectArea;
  };
  userAction?: {
    user: string;
    action: 'select' | 'unselect' | 'modify';
  };
}

interface NotionSubjectCRUDResponse {
  success: boolean;
  operation: string;
  message: string;
  subjectArea: SubjectArea | null;
  databaseUsed: string;
  results: any[];
  status?: string | null; // For read_status operations
  user?: string; // For read_status operations
}

// Main subject-aware CRUD function - only pushes data TO Notion
export const notionSubjectCRUD = async (request: NotionSubjectCRUDRequest): Promise<NotionSubjectCRUDResponse> => {
  try {
    console.log(`🎯 Notion Subject CRUD: ${request.operation}`, request);

    // Determine subject area
    let subjectArea = request.lectureData.subjectArea;
    if (!subjectArea) {
      subjectArea = detectSubjectArea(request.lectureData.title) || undefined;
    }

    if (!subjectArea) {
      throw new Error(`Could not determine subject area for lecture: ${request.lectureData.title}`);
    }

    console.log(`📚 Subject area determined: ${subjectArea}`);

    // Use appropriate endpoint based on environment
    const endpoint = process.env.NODE_ENV === 'development' 
      ? '/api/notion-subject-crud' 
      : '/.netlify/functions/notion-subject-crud';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        lectureData: {
          ...request.lectureData,
          subjectArea
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: NotionSubjectCRUDResponse = await response.json();
    
    if (result.success) {
      console.log(`✅ Notion ${request.operation} successful for ${subjectArea}:`, result);
    } else {
      console.error(`❌ Notion ${request.operation} failed for ${subjectArea}:`, result.message);
    }

    return result;

  } catch (error) {
    console.error('❌ Error in Notion Subject CRUD operation:', error);
    
    return {
      success: false,
      operation: request.operation,
      message: `Failed to ${request.operation}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      subjectArea: request.lectureData.subjectArea || null,
      databaseUsed: 'unknown',
      results: []
    };
  }
};

// Convenience functions for specific operations (one-way to Notion only)

export const createLectureInNotionSubject = async (
  lectureData: any, 
  userAction?: { user: string; action: 'select' | 'unselect' }
) => {
  return notionSubjectCRUD({
    operation: 'create',
    lectureData,
    userAction
  });
};

export const updateLectureInNotionSubject = async (
  lectureData: any, 
  userAction?: { user: string; action: 'select' | 'unselect' | 'modify' }
) => {
  return notionSubjectCRUD({
    operation: 'update',
    lectureData,
    userAction
  });
};

export const readLectureStatusFromNotionSubject = async (lectureData: any, user: string) => {
  return notionSubjectCRUD({
    operation: 'read_status',
    lectureData,
    userAction: { user, action: 'modify' }
  });
};

// Auto-sync triggers based on user actions (one-way to Notion)
export const triggerNotionSubjectSync = async (
  action: 'lecture_created' | 'lecture_updated' | 'lecture_selected' | 'lecture_unselected',
  lectureData: any,
  user?: string
) => {
  console.log(`🔄 Triggering Notion subject sync for action: ${action}`);

  try {
    switch (action) {
      case 'lecture_created':
        await createLectureInNotionSubject(lectureData);
        break;
        
      case 'lecture_updated':
        await updateLectureInNotionSubject(lectureData, user ? { user, action: 'modify' } : undefined);
        break;
        
      case 'lecture_selected':
        if (user) {
          await updateLectureInNotionSubject(lectureData, { user, action: 'select' });
        }
        break;
        
      case 'lecture_unselected':
        if (user) {
          await updateLectureInNotionSubject(lectureData, { user, action: 'unselect' });
        }
        break;
        
      default:
        console.warn(`Unknown action for Notion sync: ${action}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync ${action} to Notion:`, error);
  }
};

// Batch read statuses for multiple lectures for a specific user
export const readLectureStatusesBatch = async (lectures: any[], user: string) => {
  console.log(`📖 Reading statuses for ${lectures.length} lectures for user: ${user}`);
  
  const statusPromises = lectures.map(async (lecture) => {
    try {
      const result = await readLectureStatusFromNotionSubject(lecture, user);
      return {
        lectureId: lecture.id,
        title: lecture.title,
        status: result?.status || null,
        success: result?.success || false
      };
    } catch (error) {
      console.error(`❌ Failed to read status for lecture ${lecture.title}:`, error);
      return {
        lectureId: lecture.id,
        title: lecture.title,
        status: null,
        success: false
      };
    }
  });

  return Promise.all(statusPromises);
};