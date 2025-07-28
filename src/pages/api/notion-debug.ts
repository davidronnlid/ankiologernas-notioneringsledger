import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check environment variables (without exposing actual values)
  const envCheck = {
    NOTION_TOKEN_DAVID: process.env.NOTION_TOKEN_DAVID ? 
      `${process.env.NOTION_TOKEN_DAVID.substring(0, 10)}...` : 'MISSING',
    NOTION_DATABASE_DAVID: process.env.NOTION_DATABASE_DAVID ? 
      `${process.env.NOTION_DATABASE_DAVID.substring(0, 10)}...` : 'MISSING',
    NOTION_TOKEN_ALBIN: process.env.NOTION_TOKEN_ALBIN ? 
      `${process.env.NOTION_TOKEN_ALBIN.substring(0, 10)}...` : 'MISSING',
    NOTION_DATABASE_ALBIN: process.env.NOTION_DATABASE_ALBIN ? 
      `${process.env.NOTION_DATABASE_ALBIN.substring(0, 10)}...` : 'MISSING',
    NOTION_TOKEN_MATTIAS: process.env.NOTION_TOKEN_MATTIAS ? 
      `${process.env.NOTION_TOKEN_MATTIAS.substring(0, 10)}...` : 'MISSING',
    NOTION_DATABASE_MATTIAS: process.env.NOTION_DATABASE_MATTIAS ? 
      `${process.env.NOTION_DATABASE_MATTIAS.substring(0, 10)}...` : 'MISSING'
  };

  return res.status(200).json({
    message: 'Environment variables check',
    env: envCheck,
    nodeEnv: process.env.NODE_ENV,
    hasEnvLocal: 'Check if .env.local exists in project root'
  });
} 