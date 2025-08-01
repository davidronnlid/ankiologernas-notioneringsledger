import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, databaseId, filter } = req.body;
    
    if (!token || !databaseId) {
      return res.status(400).json({ error: 'Token and databaseId are required' });
    }

    const notion = new Client({ auth: token });
    
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: filter || undefined
    });
    
    return res.status(200).json({
      success: true,
      results: response.results
    });

  } catch (error) {
    console.error('❌ Notion database query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to query Notion database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}