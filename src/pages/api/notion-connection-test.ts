import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Testing Notion connection for David...');
    
    const token = process.env.NOTION_TOKEN_DAVID;
    const databaseId = process.env.NOTION_DATABASE_DAVID;
    
    if (!token) {
      return res.status(500).json({
        success: false,
        error: 'NOTION_TOKEN_DAVID not found in environment variables',
        hasToken: false,
        hasDatabase: !!databaseId
      });
    }
    
    if (!databaseId) {
      return res.status(500).json({
        success: false,
        error: 'NOTION_DATABASE_DAVID not found in environment variables',
        hasToken: true,
        hasDatabase: false
      });
    }

    const notion = new Client({ auth: token });
    
    // Test 1: Get database info
    console.log('📊 Testing database access...');
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });
    
    // Test 2: Query existing pages (limit to 3 for testing)
    console.log('📑 Testing database query...');
    const pages = await notion.databases.query({
      database_id: databaseId,
      page_size: 3
    });
    
    console.log('✅ Notion connection test successful!');
    
    return res.status(200).json({
      success: true,
      message: 'Notion connection successful for David',
      database: {
        title: (database as any).title?.[0]?.plain_text || 'Untitled',
        id: database.id,
        properties: Object.keys(database.properties)
      },
      existingPages: {
        count: pages.results.length,
        totalInDatabase: pages.has_more ? 'More than 3' : pages.results.length.toString(),
        sampleTitles: pages.results.slice(0, 3).map((page: any) => 
          page.properties.Name?.title?.[0]?.plain_text || 'Untitled'
        )
      },
      environment: {
        hasToken: true,
        hasDatabase: true,
        tokenLength: token.length,
        databaseIdLength: databaseId.length
      }
    });

  } catch (error) {
    console.error('❌ Notion connection test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Notion connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      possibleCauses: [
        'Invalid NOTION_TOKEN_DAVID',
        'Invalid NOTION_DATABASE_DAVID',
        'Database not shared with integration',
        'Token expired or revoked'
      ]
    });
  }
}