import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userName, notionToken, testTokenOnly } = req.body;

  console.log(`🧪 Simple test for ${userName}`);
  console.log(`🔑 Token provided: ${!!notionToken}`);
  console.log(`📋 Test token only: ${testTokenOnly}`);

  if (!userName || !notionToken) {
    return res.status(400).json({
      success: false,
      error: 'Användarnamn och notion token krävs'
    });
  }

  // Basic token validation
  if (!notionToken.startsWith('secret_') && !notionToken.startsWith('ntn_')) {
    return res.status(400).json({
      success: false,
      error: 'Token måste börja med "secret_" eller "ntn_"'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Token format validerat',
    tokenValid: true,
    userName: userName,
    tokenPrefix: notionToken.substring(0, 10) + '...'
  });
} 