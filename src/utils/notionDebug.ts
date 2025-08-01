// Debug utilities for Notion integration

export const logNotionEnvironmentVariables = (userName: string): void => {
  console.log(`🔍 Debugging Notion environment variables for ${userName}:`);
  
  const tokenKey = `NOTION_TOKEN_${userName.toUpperCase()}`;
  const token = process.env[tokenKey];
  
  console.log(`- ${tokenKey}: ${token ? '✅ Set' : '❌ Missing'}`);
  
  const subjectAreas = ['GLOBAL_HALSA', 'GERIATRIK', 'PEDIATRIK', 'ORON_NASA_HALS', 'GYNEKOLOGI_OBSTETRIK', 'OFTALMOLOGI'];
  
  subjectAreas.forEach(area => {
    const dbKey = `NOTION_DATABASE_${userName.toUpperCase()}_${area}`;
    const dbId = process.env[dbKey];
    console.log(`- ${dbKey}: ${dbId ? '✅ Set' : '❌ Missing'}`);
  });
};

export const testNotionConnection = async (userName: string, subjectArea: string): Promise<boolean> => {
  try {
    console.log(`🧪 Testing Notion connection for ${userName} - ${subjectArea}`);
    
    // Use appropriate endpoint based on environment
    const endpoint = process.env.NODE_ENV === 'development' 
      ? '/api/notion-subject-crud' 
      : '/.netlify/functions/notion-subject-crud';
    
    const testLecture = {
      id: 'test-connection',
      title: 'Test Connection',
      lectureNumber: 0,
      date: new Date().toISOString().split('T')[0],
      time: '09:00-10:00',
      lecturer: 'Test',
      subjectArea
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'read_status',
        lectureData: testLecture,
        userAction: { user: userName, action: 'modify' }
      })
    });

    if (!response.ok) {
      console.error(`❌ Notion connection failed: ${response.status} ${response.statusText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Notion connection test result:`, result);
    return result.success;

  } catch (error) {
    console.error(`❌ Notion connection test failed:`, error);
    return false;
  }
};