// Comprehensive lecture synchronization with Notion databases

import { SubjectArea } from '../types/lecture';
import { getNotionEnvVars } from './subjectAreas';

interface LectureSyncResult {
  lecture: any;
  action: 'created' | 'updated' | 'skipped' | 'error';
  reason: string;
  success: boolean;
}

interface SyncSummary {
  totalLectures: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: LectureSyncResult[];
}

// Extract clean title without lecture number
const extractCleanTitle = (fullTitle: string): string => {
  // Remove lecture number pattern like "1. ", "23. ", etc.
  return fullTitle.replace(/^\d+\.\s*/, '').trim();
};

// Format lecture title with number
const formatLectureTitle = (lectureNumber: number, cleanTitle: string): string => {
  return `${lectureNumber}. ${cleanTitle}`;
};

// Search for lecture in Notion database by clean title
const findLectureInNotion = async (
  cleanTitle: string, 
  userName: string, 
  subjectArea: SubjectArea
): Promise<any> => {
  // Skip in development mode to avoid errors
  if (process.env.NODE_ENV === 'development') {
    console.log(`📝 Skipping Notion search in development mode`);
    return null;
  }

  const { tokenKey, databaseKey } = getNotionEnvVars(userName, subjectArea);
  const token = process.env[tokenKey];
  const databaseId = process.env[databaseKey];
  
  if (!token || !databaseId) {
    console.warn(`⚠️ Missing Notion config for ${userName} - ${subjectArea}`);
    return null;
  }

  try {
    // Use production endpoint only
    const endpoint = '/.netlify/functions/notion-database-query';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        databaseId,
        filter: {
          property: 'Föreläsning',
          title: {
            contains: cleanTitle
          }
        }
      })
    });

    if (!response.ok) {
      console.error(`❌ Failed to query Notion database: ${response.status}`);
      return null;
    }

    const result = await response.json();
    
    // Find exact match by clean title
    const exactMatch = result.results?.find((page: any) => {
      const pageTitle = page.properties?.Föreläsning?.title?.[0]?.text?.content || '';
      const pageCleanTitle = extractCleanTitle(pageTitle);
      return pageCleanTitle.toLowerCase() === cleanTitle.toLowerCase();
    });

    return exactMatch || null;

  } catch (error) {
    console.error(`❌ Error searching for lecture in Notion:`, error);
    return null;
  }
};

// Sync a single lecture to Notion
const syncSingleLecture = async (
  lecture: any,
  userName: string
): Promise<LectureSyncResult> => {
  try {
    if (!lecture.subjectArea) {
      return {
        lecture,
        action: 'error',
        reason: 'Missing subject area',
        success: false
      };
    }

    const cleanTitle = extractCleanTitle(lecture.title);
    const correctFormattedTitle = formatLectureTitle(lecture.lectureNumber, cleanTitle);
    
    console.log(`🔍 Syncing lecture: "${lecture.title}" → "${correctFormattedTitle}" (${lecture.subjectArea})`);

    // Check if lecture exists in Notion
    const existingPage = await findLectureInNotion(cleanTitle, userName, lecture.subjectArea);
    
    // Prepare lecture data for Notion
    const lectureDataForNotion = {
      id: lecture.id,
      title: correctFormattedTitle, // Use correctly formatted title
      lectureNumber: lecture.lectureNumber,
      date: lecture.date,
      time: lecture.time,
      lecturer: lecture.lecturer || '',
      subjectArea: lecture.subjectArea,
    };

    if (!existingPage) {
      // Create new lecture in Notion
      console.log(`📝 Creating new lecture in Notion: ${correctFormattedTitle}`);
      
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/notion-subject-crud' 
        : '/.netlify/functions/notion-subject-crud';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'create',
          lectureData: lectureDataForNotion,
          userAction: { user: userName, action: 'modify' }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return {
            lecture,
            action: 'created',
            reason: `Created new lecture: ${correctFormattedTitle}`,
            success: true
          };
        }
      }
      
      return {
        lecture,
        action: 'error',
        reason: 'Failed to create in Notion',
        success: false
      };

    } else {
      // Check if existing page needs update
      const existingTitle = existingPage.properties?.Föreläsning?.title?.[0]?.text?.content || '';
      
      if (existingTitle !== correctFormattedTitle) {
        // Update existing lecture with correct title
        console.log(`🔄 Updating lecture title: "${existingTitle}" → "${correctFormattedTitle}"`);
        
        const endpoint = process.env.NODE_ENV === 'development' 
          ? '/api/notion-subject-crud' 
          : '/.netlify/functions/notion-subject-crud';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            operation: 'update',
            lectureData: lectureDataForNotion,
            userAction: { user: userName, action: 'modify' }
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return {
              lecture,
              action: 'updated',
              reason: `Updated title: "${existingTitle}" → "${correctFormattedTitle}"`,
              success: true
            };
          }
        }
        
        return {
          lecture,
          action: 'error',
          reason: 'Failed to update in Notion',
          success: false
        };
      } else {
        // No update needed
        return {
          lecture,
          action: 'skipped',
          reason: 'Title already correct',
          success: true
        };
      }
    }

  } catch (error) {
    console.error(`❌ Error syncing lecture ${lecture.title}:`, error);
    return {
      lecture,
      action: 'error',
      reason: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      success: false
    };
  }
};

// Main function to sync all lectures for a user
export const syncAllLecturesToNotion = async (
  lectures: any[],
  currentUser: any
): Promise<SyncSummary> => {
  if (!currentUser || process.env.NODE_ENV !== 'production') {
    console.log('📝 Skipping lecture sync - not in production or no user');
    return {
      totalLectures: lectures.length,
      created: 0,
      updated: 0,
      skipped: lectures.length,
      errors: 0,
      results: []
    };
  }

  // Add safety check for empty lectures array
  if (!lectures || lectures.length === 0) {
    console.log('📝 No lectures to sync');
    return {
      totalLectures: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      results: []
    };
  }

  const userName = currentUser.user_metadata?.full_name || currentUser.email || 'Unknown';
  console.log(`🔄 Starting comprehensive lecture sync for ${userName}`);
  console.log(`📚 Total lectures to sync: ${lectures.length}`);

  const results: LectureSyncResult[] = [];
  const batchSize = 3; // Smaller batches to be gentle on Notion API
  
  // Process lectures in batches
  for (let i = 0; i < lectures.length; i += batchSize) {
    const batch = lectures.slice(i, i + batchSize);
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(lectures.length / batchSize)}`);
    
    const batchPromises = batch.map(lecture => syncSingleLecture(lecture, userName));
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    // Log batch progress
    const batchSuccess = batchResults.filter(r => r.success).length;
    console.log(`✅ Batch completed: ${batchSuccess}/${batch.length} successful`);
    
    // Small delay between batches
    if (i + batchSize < lectures.length) {
      console.log('⏳ Waiting before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Calculate summary
  const summary: SyncSummary = {
    totalLectures: lectures.length,
    created: results.filter(r => r.action === 'created').length,
    updated: results.filter(r => r.action === 'updated').length,
    skipped: results.filter(r => r.action === 'skipped').length,
    errors: results.filter(r => r.action === 'error').length,
    results
  };

  // Log final summary
  console.log(`🎉 Lecture sync completed for ${userName}:`);
  console.log(`📊 Summary: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped, ${summary.errors} errors`);
  
  if (summary.errors > 0) {
    console.log('❌ Errors encountered:');
    results.filter(r => r.action === 'error').forEach(r => {
      console.log(`  - ${r.lecture.title}: ${r.reason}`);
    });
  }

  return summary;
};

// Quick function to sync just updated lectures (for efficiency)
export const syncUpdatedLectures = async (
  lecturesNeedingSync: any[],
  currentUser: any
): Promise<void> => {
  if (lecturesNeedingSync.length === 0) return;
  
  console.log(`🔄 Syncing ${lecturesNeedingSync.length} updated lectures`);
  await syncAllLecturesToNotion(lecturesNeedingSync, currentUser);
};