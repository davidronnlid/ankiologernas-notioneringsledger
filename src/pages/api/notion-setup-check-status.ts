import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userName } = req.body;

    if (!userName) {
      return res.status(400).json({
        isSetup: false,
        error: 'Användarnamn krävs'
      });
    }

    // Check if user has required environment variables
    const tokenKey = `NOTION_TOKEN_${userName.toUpperCase()}`;
    const pageKey = `NOTION_COURSE_PAGE_${userName.toUpperCase()}`;
    
    const hasToken = !!process.env[tokenKey];
    const hasPageId = !!process.env[pageKey];

    console.log(`🔍 Checking Notion setup for ${userName}:`);
    console.log(`   Token (${tokenKey}): ${hasToken ? '✅' : '❌'}`);
    console.log(`   Page ID (${pageKey}): ${hasPageId ? '✅' : '❌'}`);

    // In development, we can be more lenient (only require token)
    const isSetup = process.env.NODE_ENV === 'development' 
      ? hasToken 
      : hasToken && hasPageId;

    return res.status(200).json({
      isSetup: isSetup,
      hasToken: hasToken,
      hasPageId: hasPageId,
      development: process.env.NODE_ENV === 'development',
      message: isSetup 
        ? 'Notion integration är konfigurerad' 
        : 'Notion integration behöver konfigureras'
    });

  } catch (error) {
    console.error('❌ Error checking setup status:', error);
    
    return res.status(500).json({
      isSetup: false,
      error: `Serverfel: ${error instanceof Error ? error.message : 'Okänt fel'}`
    });
  }
}