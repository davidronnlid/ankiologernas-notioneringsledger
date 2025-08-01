import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { testType } = req.body;
    
    console.log(`🧪 Testing error scenario: ${testType}`);
    
    switch (testType) {
      case 'invalid_token':
        // Simulate invalid token error
        throw new Error('Unauthorized: Invalid token');
        
      case 'invalid_database':
        // Simulate invalid database error  
        throw new Error('Object not found: Database does not exist');
        
      case 'network_error':
        // Simulate network error
        throw new Error('Network error: Unable to connect to Notion API');
        
      case 'rate_limit':
        // Simulate rate limit error
        throw new Error('Rate limited: Too many requests');
        
      default:
        return res.status(400).json({ error: 'Unknown test type' });
    }
    
  } catch (error) {
    console.error('❌ Error test triggered:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Notion error test',
      details: error instanceof Error ? error.message : 'Unknown error',
      testType: req.body.testType,
      timestamp: new Date().toISOString()
    });
  }
}