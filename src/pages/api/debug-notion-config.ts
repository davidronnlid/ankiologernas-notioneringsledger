import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables (server-side only)
  const config = {
    NODE_ENV: process.env.NODE_ENV,
    serverSideTokens: {
      DAVID: !!(process.env.NOTION_TOKEN_DAVID),
      ALBIN: !!(process.env.NOTION_TOKEN_ALBIN),
      MATTIAS: !!(process.env.NOTION_TOKEN_MATTIAS)
    },
    serverSidePages: {
      DAVID: !!(process.env.NOTION_COURSE_PAGE_DAVID),
      ALBIN: !!(process.env.NOTION_COURSE_PAGE_ALBIN),
      MATTIAS: !!(process.env.NOTION_COURSE_PAGE_MATTIAS)
    },
    tokenLengths: {
      DAVID: process.env.NOTION_TOKEN_DAVID?.length || 0,
      ALBIN: process.env.NOTION_TOKEN_ALBIN?.length || 0,
      MATTIAS: process.env.NOTION_TOKEN_MATTIAS?.length || 0
    },
    pageIdLengths: {
      DAVID: process.env.NOTION_COURSE_PAGE_DAVID?.length || 0,
      ALBIN: process.env.NOTION_COURSE_PAGE_ALBIN?.length || 0,
      MATTIAS: process.env.NOTION_COURSE_PAGE_MATTIAS?.length || 0
    },
    availableNotionVars: Object.keys(process.env)
      .filter(key => key.includes('NOTION'))
      .map(key => ({
        key,
        hasValue: !!process.env[key],
        length: process.env[key]?.length || 0
      })),
    totalEnvVars: Object.keys(process.env).length,
    timestamp: new Date().toISOString()
  };

  console.log('🔍 Server-side Notion Config Debug:', config);
  
  return res.status(200).json({
    success: true,
    config,
    message: 'Server-side Notion configuration debug completed'
  });
}