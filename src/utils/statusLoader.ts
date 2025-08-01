// Utility for loading and managing Notion status data

import { readLectureStatusesBatch } from './notionSubjectCRUD';
import Lecture from '../types/lecture';

// Load statuses for all lectures for a specific user
export const loadUserStatuses = async (lectures: Lecture[], userName: string): Promise<{ [lectureId: string]: string | null }> => {
  console.log(`🔄 Loading statuses for ${lectures.length} lectures for user: ${userName}`);
  
  try {
    const statusResults = await readLectureStatusesBatch(lectures, userName);
    
    const statusMap: { [lectureId: string]: string | null } = {};
    
    statusResults.forEach(result => {
      statusMap[result.lectureId] = result.status;
    });
    
    console.log(`✅ Loaded ${Object.keys(statusMap).length} statuses for ${userName}`);
    return statusMap;
    
  } catch (error) {
    console.error(`❌ Failed to load statuses for ${userName}:`, error);
    return {};
  }
};

// Update lecture data with status information
export const enrichLecturesWithStatus = (lectures: Lecture[], statusMap: { [lectureId: string]: string | null }, userName: string): Lecture[] => {
  return lectures.map(lecture => ({
    ...lecture,
    status: {
      ...lecture.status,
      [userName]: statusMap[lecture.id] || null
    }
  }));
};

// Get status for a specific lecture and user
export const getLectureStatus = (lecture: Lecture, userName: string): string | null => {
  return lecture.status?.[userName] || null;
};

// Get status color for UI display
export const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'Ej anki':
      return '#ff6b6b'; // Red
    case 'Bör göra':
      return '#ffa726'; // Orange
    case 'Klar':
      return '#4caf50'; // Green
    case 'Pågår':
      return '#2196f3'; // Blue
    default:
      return '#9e9e9e'; // Grey for no status
  }
};

// Get status display text
export const getStatusDisplayText = (status: string | null): string => {
  return status || 'Ingen status';
};