// URL generation utilities for Notion integration

// Get the production URL for the app
export const getProductionUrl = (): string => {
  // Always use the production URL for Notion links
  return 'https://ankiologernas-notioneringsledger.netlify.app';
};

// Generate a direct link to a specific lecture in the app
export const generateLectureUrl = (lectureId: string): string => {
  const baseUrl = getProductionUrl();
  return `${baseUrl}/#lecture-${lectureId}`;
};

// Generate lecture URLs for all lectures in a dataset
export const generateLectureUrls = (lectures: any[]): { [lectureId: string]: string } => {
  const urlMap: { [lectureId: string]: string } = {};
  
  lectures.forEach(lecture => {
    if (lecture.id) {
      urlMap[lecture.id] = generateLectureUrl(lecture.id);
    }
  });
  
  return urlMap;
};

// Extract lecture ID from URL hash
export const extractLectureIdFromHash = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const hash = window.location.hash;
  const match = hash.match(/^#lecture-(.+)$/);
  return match ? match[1] : null;
};

// Scroll to a specific lecture element
export const scrollToLecture = (lectureId: string): void => {
  if (typeof window === 'undefined') return;
  
  const element = document.getElementById(`lecture-${lectureId}`);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    
    // Add a highlight effect
    element.style.transition = 'background-color 0.5s ease';
    element.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
    
    setTimeout(() => {
      element.style.backgroundColor = '';
    }, 2000);
  }
};

// Handle URL hash on page load
export const handleLectureUrlHash = (): void => {
  if (typeof window === 'undefined') return;
  
  const lectureId = extractLectureIdFromHash();
  if (lectureId) {
    // Wait a bit for the page to fully load
    setTimeout(() => {
      scrollToLecture(lectureId);
    }, 1000);
  }
};