import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables
  const config = {
    NODE_ENV: process.env.NODE_ENV,
    hasTokens: {
      DAVID: !!(process.env.NOTION_TOKEN_DAVID || process.env.NEXT_PUBLIC_NOTION_TOKEN_DAVID),
      ALBIN: !!(process.env.NOTION_TOKEN_ALBIN || process.env.NEXT_PUBLIC_NOTION_TOKEN_ALBIN),
      MATTIAS: !!(process.env.NOTION_TOKEN_MATTIAS || process.env.NEXT_PUBLIC_NOTION_TOKEN_MATTIAS)
    },
    hasPages: {
      DAVID: !!(process.env.NOTION_COURSE_PAGE_DAVID || process.env.NEXT_PUBLIC_NOTION_COURSE_PAGE_DAVID),
      ALBIN: !!(process.env.NOTION_COURSE_PAGE_ALBIN || process.env.NEXT_PUBLIC_NOTION_COURSE_PAGE_ALBIN),
      MATTIAS: !!(process.env.NOTION_COURSE_PAGE_MATTIAS || process.env.NEXT_PUBLIC_NOTION_COURSE_PAGE_MATTIAS)
    },
    availableEnvVars: Object.keys(process.env)
      .filter(key => key.includes('NOTION'))
      .map(key => ({
        key,
        hasValue: !!process.env[key],
        length: process.env[key]?.length || 0
      })),
    timestamp: new Date().toISOString()
  };

  console.log('🔍 Notion Config Debug:', config);
  
  return res.status(200).json({
    success: true,
    config,
    message: 'Notion configuration debug completed'
  });
}