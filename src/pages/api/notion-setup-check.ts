import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, userName } = req.body;

    if (!token || !userName) {
      return res.status(400).json({
        success: false,
        message: 'Token och användarnamn krävs'
      });
    }

    // Validate token format (both old and new formats)
    if (!token.startsWith('secret_') && !token.startsWith('ntn_')) {
      return res.status(400).json({
        success: false,
        message: 'Token ska börja med "secret_" eller "ntn_"'
      });
    }

    // Import Notion client dynamically to avoid SSR issues
    const { Client } = require('@notionhq/client');
    const notion = new Client({ auth: token });

    // Test the token by searching for pages
    console.log(`🔍 Testing Notion token for ${userName}...`);
    
    try {
      // First, just test if the token works by getting user info
      const user = await notion.users.me();
      console.log(`✅ Token valid for user: ${user.name || user.id}`);

      // Search for "Klinisk medicin 4" page
      const searchResults = await notion.search({
        query: 'Klinisk medicin 4',
        filter: {
          property: 'object',
          value: 'page'
        }
      });

      console.log(`📄 Found ${searchResults.results.length} page(s) matching "Klinisk medicin 4"`);

      // Look for the exact page
      const coursePage = searchResults.results.find((page: any) => {
        // Handle different page title structures
        const title = page.properties?.title?.title?.[0]?.text?.content ||
                     page.properties?.Name?.title?.[0]?.text?.content ||
                     page.title?.[0]?.text?.content;
        
        return title === 'Klinisk medicin 4';
      });

      if (coursePage) {
        console.log(`✅ Found "Klinisk medicin 4" page: ${coursePage.id}`);
        
        return res.status(200).json({
          success: true,
          message: 'Token verifierad och kurssida hittad!',
          pageId: coursePage.id,
          hasAccess: true
        });
      } else {
        console.log(`⚠️ "Klinisk medicin 4" page not found`);
        
        return res.status(200).json({
          success: true,
          message: 'Token verifierad! Skapa nu en sida med titeln "Klinisk medicin 4"',
          pageId: null,
          hasAccess: true,
          needsPageCreation: true
        });
      }

    } catch (notionError: any) {
      console.error('❌ Notion API error:', notionError);
      
      // Handle specific Notion errors
      if (notionError.code === 'unauthorized') {
        return res.status(400).json({
          success: false,
          message: 'Token är ogiltigt. Kontrollera att du kopierat rätt token från Notion.'
        });
      }
      
      if (notionError.code === 'forbidden') {
        return res.status(400).json({
          success: false,
          message: 'Token saknar behörighet. Kontrollera integrationens inställningar.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Notion fel: ${notionError.message || 'Okänt fel'}`
      });
    }

  } catch (error) {
    console.error('❌ Error in notion-setup-check:', error);
    
    return res.status(500).json({
      success: false,
      message: `Serverfel: ${error instanceof Error ? error.message : 'Okänt fel'}`
    });
  }
}