const { Client } = require('@notionhq/client');

// Notion API tokens for each user (store in environment variables)
const NOTION_TOKENS = {
  'David': process.env.NOTION_TOKEN_DAVID,
  'Albin': process.env.NOTION_TOKEN_ALBIN, 
  'Mattias': process.env.NOTION_TOKEN_MATTIAS
};

// Main course page IDs for each user (these will be the "Klinisk medicin 4" pages)
const COURSE_PAGE_IDS = {
  'David': process.env.NOTION_COURSE_PAGE_DAVID,
  'Albin': process.env.NOTION_COURSE_PAGE_ALBIN,
  'Mattias': process.env.NOTION_COURSE_PAGE_MATTIAS
};

// User name to letter mapping for tracking
const USER_LETTERS = {
  'David': 'D',
  'Albin': 'A', 
  'Mattias': 'M'
};

// Subject area emojis for better visual organization
const SUBJECT_AREA_EMOJIS = {
  'Pediatrik': '👶',
  'Geriatrik': '👴',
  'Global hälsa': '🌍',
  'Öron-Näsa-Hals': '👂',
  'Gynekologi & Obstetrik': '🤱',
  'Oftalmologi': '👁️'
};

// Helper function to find or create a course page
async function findOrCreateCoursePage(notion, courseTitle = "Klinisk medicin 4") {
  try {
    // Search for existing course page
    const searchResults = await notion.search({
      query: courseTitle,
      filter: {
        property: 'object',
        value: 'page'
      }
    });

    // Check if we found an existing page
    const existingPage = searchResults.results.find(page => 
      page.properties?.title?.title?.[0]?.text?.content === courseTitle
    );

    if (existingPage) {
      console.log(`✅ Found existing course page: ${courseTitle}`);
      return existingPage;
    }

    // Create new course page if not found
    console.log(`📝 Creating new course page: ${courseTitle}`);
    const newPage = await notion.pages.create({
      parent: { type: 'page_id', page_id: 'YOUR_PARENT_PAGE_ID' }, // Replace with actual parent
      properties: {
        title: {
          title: [
            {
              text: {
                content: courseTitle
              }
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: courseTitle
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Mattias'
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Albin'
                }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'David'
                }
              }
            ]
          }
        }
      ]
    });

    console.log(`✅ Created new course page: ${courseTitle}`);
    return newPage;
  } catch (error) {
    console.error(`❌ Failed to find/create course page: ${courseTitle}`, error);
    throw error;
  }
}

// Helper function to find or create a subject area section
async function findOrCreateSubjectSection(notion, coursePageId, subjectArea) {
  try {
    // Get all blocks from the course page
    const blocks = await notion.blocks.children.list({
      block_id: coursePageId
    });

    const emoji = SUBJECT_AREA_EMOJIS[subjectArea] || '📚';
    const sectionTitle = `${emoji} ${subjectArea}`;

    // Look for existing subject area section
    const existingSection = blocks.results.find(block => 
      block.type === 'toggle' && 
      block.toggle?.rich_text?.[0]?.text?.content?.includes(subjectArea)
    );

    if (existingSection) {
      console.log(`✅ Found existing section: ${sectionTitle}`);
      return existingSection;
    }

    // Create new collapsible section for subject area
    console.log(`📝 Creating new section: ${sectionTitle}`);
    const newSection = await notion.blocks.children.append({
      block_id: coursePageId,
      children: [
        {
          object: 'block',
          type: 'toggle',
          toggle: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: sectionTitle
                }
              }
            ],
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      type: 'text',
                      text: {
                        content: `Föreläsningar inom ${subjectArea}`
                      }
                    }
                  ]
                }
              }
            ]
          }
        }
      ]
    });

    console.log(`✅ Created new section: ${sectionTitle}`);
    return newSection.results[0];
  } catch (error) {
    console.error(`❌ Failed to find/create subject section: ${subjectArea}`, error);
    throw error;
  }
}

// Helper function to add or update lecture in subject section
async function addLectureToSection(notion, sectionId, lectureTitle, lectureNumber, selectedByUser, action) {
  try {
    const userLetter = USER_LETTERS[selectedByUser];
    
    // Get current children of the section
    const sectionChildren = await notion.blocks.children.list({
      block_id: sectionId
    });

    // Look for existing lecture
    const lectureText = `${lectureNumber}. ${lectureTitle}`;
    const existingLecture = sectionChildren.results.find(block => 
      block.type === 'bulleted_list_item' && 
      block.bulleted_list_item?.rich_text?.[0]?.text?.content?.includes(lectureTitle)
    );

    if (existingLecture) {
      // Update existing lecture
      console.log(`🔄 Updating existing lecture: ${lectureText}`);
      
      // Get current content to preserve user assignments
      const currentContent = existingLecture.bulleted_list_item.rich_text[0].text.content;
      let updatedContent = currentContent;
      
      if (action === 'select') {
        // Add user letter if not already present
        if (!currentContent.includes(`[${userLetter}]`)) {
          updatedContent = `${currentContent} [${userLetter}]`;
        }
      } else {
        // Remove user letter
        updatedContent = currentContent.replace(new RegExp(`\\s*\\[${userLetter}\\]`, 'g'), '');
      }

      await notion.blocks.update({
        block_id: existingLecture.id,
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: updatedContent
              }
            }
          ]
        }
      });

      console.log(`✅ Updated lecture: ${lectureText}`);
      return existingLecture;
    } else {
      // Create new lecture item
      console.log(`📝 Creating new lecture: ${lectureText}`);
      const initialContent = action === 'select' ? `${lectureText} [${userLetter}]` : lectureText;
      
      const newLecture = await notion.blocks.children.append({
        block_id: sectionId,
        children: [
          {
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: initialContent
                  }
                }
              ]
            }
          }
        ]
      });

      console.log(`✅ Created new lecture: ${lectureText}`);
      return newLecture.results[0];
    }
  } catch (error) {
    console.error(`❌ Failed to add/update lecture: ${lectureTitle}`, error);
    throw error;
  }
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { lectureTitle, lectureNumber, selectedByUser, subjectArea, action } = JSON.parse(event.body);
    
    console.log(`🎯 Notion page update: ${selectedByUser} ${action} lecture ${lectureNumber}: ${lectureTitle} (${subjectArea})`);

    // Validate required fields
    if (!lectureTitle || !lectureNumber || !selectedByUser || !subjectArea || !action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Missing required fields: lectureTitle, lectureNumber, selectedByUser, subjectArea, action' 
        })
      };
    }

    const userLetter = USER_LETTERS[selectedByUser];
    if (!userLetter) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `Unknown user: ${selectedByUser}. Expected David, Albin, or Mattias` 
        })
      };
    }

    // Process updates for all users (each user has their own copy of the course page)
    const results = [];
    
    for (const [userName, token] of Object.entries(NOTION_TOKENS)) {
      if (!token) {
        console.warn(`⚠️ No Notion token found for ${userName}, skipping...`);
        results.push({
          user: userName,
          success: false,
          error: 'No Notion token configured'
        });
        continue;
      }

      try {
        const notion = new Client({ auth: token });
        
        // Step 1: Find or create the main course page
        const coursePage = await findOrCreateCoursePage(notion, "Klinisk medicin 4");
        
        // Step 2: Find or create the subject area section
        const subjectSection = await findOrCreateSubjectSection(notion, coursePage.id, subjectArea);
        
        // Step 3: Add or update the lecture in the section
        await addLectureToSection(notion, subjectSection.id, lectureTitle, lectureNumber, selectedByUser, action);
        
        results.push({
          user: userName,
          success: true,
          pagesUpdated: 1,
          created: 0 // We'll track this properly later
        });

        console.log(`✅ Successfully updated ${userName}'s Notion page`);
        
      } catch (error) {
        console.error(`❌ Failed to update ${userName}'s Notion page:`, error);
        results.push({
          user: userName,
          success: false,
          error: error.message
        });
      }
    }

    // Calculate summary
    const successfulUpdates = results.filter(r => r.success).length;
    const failedUpdates = results.filter(r => !r.success).length;
    const pagesCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);

    const response = {
      success: successfulUpdates > 0,
      message: successfulUpdates === 3 ? 'All Notion pages updated successfully' : 
               successfulUpdates > 0 ? `${successfulUpdates}/3 Notion pages updated` : 
               'No Notion pages could be updated',
      results,
      summary: {
        successfulUpdates,
        failedUpdates,
        pagesCreated
      }
    };

    console.log(`📊 Update summary:`, response.summary);

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Error in Notion page update function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: `Server error: ${error.message}`,
        results: [],
        summary: {
          successfulUpdates: 0,
          failedUpdates: 3,
          pagesCreated: 0
        }
      })
    };
  }
};