#!/usr/bin/env node

/**
 * Helper script to get Notion page IDs for each user
 * Run this once to get the page IDs you need for environment variables
 */

const { Client } = require('@notionhq/client');

// Add your user tokens here temporarily to get page IDs
const TEMP_TOKENS = {
  'David': 'YOUR_DAVID_TOKEN_HERE',
  'Albin': 'YOUR_ALBIN_TOKEN_HERE', 
  'Mattias': 'YOUR_MATTIAS_TOKEN_HERE'
};

async function getPageIds() {
  console.log('🔍 Searching for "Klinisk medicin 4" pages for each user...\n');
  
  for (const [user, token] of Object.entries(TEMP_TOKENS)) {
    if (!token || token === `YOUR_${user.toUpperCase()}_TOKEN_HERE`) {
      console.log(`❌ ${user}: No token provided, skipping...`);
      continue;
    }

    try {
      const notion = new Client({ auth: token });
      
      // Search for the course page
      const searchResults = await notion.search({
        query: 'Klinisk medicin 4',
        filter: {
          property: 'object',
          value: 'page'
        }
      });
      
      console.log(`📄 ${user}:`);
      
      if (searchResults.results.length === 0) {
        console.log(`   ❌ No "Klinisk medicin 4" page found`);
        console.log(`   💡 Create a page titled "Klinisk medicin 4" in ${user}'s Notion workspace`);
      } else {
        const page = searchResults.results[0];
        console.log(`   ✅ Found page: ${page.id}`);
        console.log(`   📝 Environment variable: NOTION_COURSE_PAGE_${user.toUpperCase()}=${page.id}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${user}: Error - ${error.message}`);
      console.log('');
    }
  }
  
  console.log('📋 Summary:');
  console.log('1. Create a page titled "Klinisk medicin 4" in each user\'s Notion workspace');
  console.log('2. Add the page IDs as environment variables in your deployment settings');
  console.log('3. Make sure each user\'s integration has access to their page');
}

getPageIds().catch(console.error);