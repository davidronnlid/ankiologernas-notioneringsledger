// Notion integration utility for updating all users' databases

interface NotionUpdateRequest {
  lectureTitle: string;
  lectureNumber: string | number;
  selectedByUser: string;
  action: 'select' | 'unselect';
}

interface NotionUpdateResult {
  user: string;
  success: boolean;
  pagesUpdated?: number;
  created?: number;
  error?: string;
}

interface NotionUpdateResponse {
  success: boolean;
  message: string;
  results: NotionUpdateResult[];
  summary: {
    successfulUpdates: number;
    failedUpdates: number;
    pagesCreated: number;
  };
}

// User name to letter mapping for Vems column
const USER_LETTERS: { [key: string]: string } = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

export const updateNotionLectureTags = async (
  lectureTitle: string,
  lectureNumber: string | number,
  selectedByUser: string,
  action: 'select' | 'unselect'
): Promise<NotionUpdateResponse> => {
  try {
    const requestData: NotionUpdateRequest = {
      lectureTitle,
      lectureNumber: lectureNumber.toString(),
      selectedByUser,
      action
    };

    const userLetter = USER_LETTERS[selectedByUser];
    console.log(`🎯 Sending Notion update request: ${selectedByUser} (${userLetter}) ${action} lecture ${lectureNumber}: ${lectureTitle}`);

    // Use local API during development, Netlify function in production
    const endpoint = process.env.NODE_ENV === 'development' 
      ? '/api/notion-test' 
      : '/.netlify/functions/updateNotionTags';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: NotionUpdateResponse = await response.json();
    
    if (result.success) {
      console.log(`✅ Notion update successful:`, result.summary);
      console.log(`📊 Results:`, result.results);
      
      // Log individual results
      result.results.forEach(userResult => {
        if (userResult.success) {
          const createdText = userResult.created ? ` (${userResult.created} created)` : '';
          console.log(`✅ ${userResult.user}: Updated ${userResult.pagesUpdated} pages${createdText}`);
        } else {
          console.warn(`⚠️ ${userResult.user}: ${userResult.error}`);
        }
      });

      // Log page creation summary
      if (result.summary.pagesCreated > 0) {
        console.log(`📝 Created ${result.summary.pagesCreated} new lecture pages across all databases`);
      }
    } else {
      console.error(`❌ Notion update failed:`, result);
    }

    return result;

  } catch (error) {
    console.error('❌ Error calling Notion update function:', error);
    
    // Return error response in expected format
    return {
      success: false,
      message: `Failed to update Notion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      results: [],
      summary: {
        successfulUpdates: 0,
        failedUpdates: 3, // Assume all three users failed
        pagesCreated: 0
      }
    };
  }
};

// Helper function to determine if Notion integration is enabled
export const isNotionIntegrationEnabled = (): boolean => {
  // Check if we're in production/staging where environment variables would be set
  // For development, you can temporarily return true to test
  return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development';
};

// Helper function to show user-friendly notifications
export const getNotionUpdateNotification = (response: NotionUpdateResponse): string => {
  if (!response.success) {
    return `❌ Notion-uppdatering misslyckades: ${response.message}`;
  }

  const { successfulUpdates, failedUpdates, pagesCreated } = response.summary;
  
  if (successfulUpdates === 3 && failedUpdates === 0) {
    const createdText = pagesCreated > 0 ? ` (${pagesCreated} nya sidor skapade)` : '';
    return `✅ Alla Notion-databaser uppdaterade framgångsrikt!${createdText} 🎉`;
  } else if (successfulUpdates > 0) {
    const createdText = pagesCreated > 0 ? ` (${pagesCreated} skapade)` : '';
    return `⚠️ ${successfulUpdates}/3 Notion-databaser uppdaterade (${failedUpdates} misslyckades)${createdText}`;
  } else {
    return `❌ Inga Notion-databaser kunde uppdateras`;
  }
}; 