// Development API route that mirrors the Netlify function
// This allows the triggerNotionSync function to work in development mode

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In development, we'll call the actual Netlify function
    // This is a proxy to the real updateNotionPage function
    const netlifyUrl = process.env.NETLIFY_FUNCTION_URL || 'http://localhost:8888/.netlify/functions/updateNotionPage';
    
    const response = await fetch(netlifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });

    const result = await response.json();
    
    return res.status(response.status).json(result);
    
  } catch (error) {
    console.error('❌ Error in development updateNotionPage proxy:', error);
    
    return res.status(500).json({
      success: false,
      message: `Development proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      results: [],
      summary: {
        successfulUpdates: 0,
        failedUpdates: 3,
        pagesCreated: 0
      }
    });
  }
}