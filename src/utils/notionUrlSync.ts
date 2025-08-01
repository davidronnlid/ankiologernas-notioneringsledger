// Utility for syncing URLs to Notion when app loads

import { triggerNotionSubjectSync } from './notionSubjectCRUD';
import { generateLectureUrl } from './urlGenerator';
import Lecture from '../types/lecture';

// Sync URLs for all lectures to Notion (called when app loads)
export const syncLectureUrls = async (lectures: Lecture[], currentUser: any): Promise<void> => {
  if (!currentUser || process.env.NODE_ENV !== 'production') {
    console.log('📝 Skipping URL sync - not in production or no user');
    return;
  }

  console.log(`🔗 Starting URL sync for ${lectures.length} lectures`);
  
  const userName = currentUser.user_metadata?.full_name || currentUser.email || 'Unknown';
  const batchSize = 5; // Process in batches to avoid overwhelming Notion API
  
  for (let i = 0; i < lectures.length; i += batchSize) {
    const batch = lectures.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (lecture) => {
      try {
        // Generate the URL for this lecture
        const lectureUrl = generateLectureUrl(lecture.id);
        
        // Create updated lecture data with URL
        const lectureData = {
          id: lecture.id,
          title: lecture.title,
          lectureNumber: lecture.lectureNumber,
          date: lecture.date,
          time: lecture.time,
          lecturer: lecture.lecturer || '',
          subjectArea: lecture.subjectArea,
          url: lectureUrl
        };
        
        // Update in Notion (this will upsert the URL)
        await triggerNotionSubjectSync('lecture_updated', lectureData, userName);
        
        console.log(`✅ URL synced for lecture: ${lecture.title}`);
      } catch (error) {
        console.error(`❌ Failed to sync URL for lecture ${lecture.title}:`, error);
      }
    });
    
    await Promise.all(batchPromises);
    
    // Small delay between batches to be nice to Notion API
    if (i + batchSize < lectures.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ URL sync completed for ${lectures.length} lectures`);
};

// Update URL for a single lecture (called when lecture is modified)
export const updateLectureUrl = async (lecture: Partial<Lecture> & { id: string; title: string; subjectArea?: any }, action: string, currentUser: any): Promise<void> => {
  if (!currentUser || process.env.NODE_ENV !== 'production') {
    return;
  }

  try {
    const lectureUrl = generateLectureUrl(lecture.id);
    const userName = currentUser.user_metadata?.full_name || currentUser.email || 'Unknown';
    
    const lectureData = {
      id: lecture.id,
      title: lecture.title,
      lectureNumber: lecture.lectureNumber,
      date: lecture.date,
      time: lecture.time,
      lecturer: lecture.lecturer || '',
      subjectArea: lecture.subjectArea,
      url: lectureUrl
    };
    
    await triggerNotionSubjectSync(action as any, lectureData, userName);
    console.log(`🔗 URL updated for lecture: ${lecture.title}`);
  } catch (error) {
    console.error(`❌ Failed to update URL for lecture ${lecture.title}:`, error);
  }
};