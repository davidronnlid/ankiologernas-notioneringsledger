# Notion Page-Based Integration Setup

This guide explains how to connect each app user to their specific Notion page for the new page-based structure.

## 🎯 Overview

Instead of individual databases, each user now has:
- **One "Klinisk medicin 4" page** in their Notion workspace
- **Collapsible sections** for each subject area (Pediatrik, Geriatrik, etc.)
- **Direct page access** using page IDs (no searching required)

## 📋 Setup Steps

### Step 1: Create Notion Pages

Each user needs to create a page titled **"Klinisk medicin 4"** in their Notion workspace.

**For each user (David, Albin, Mattias):**
1. Open Notion in their workspace
2. Create a new page titled: `Klinisk medicin 4`
3. Leave it empty (the app will populate it automatically)

### Step 2: Create Notion Integrations

Each user needs their own Notion integration:

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it: `Ankiologernas Notioneringsledger - [UserName]`
4. Select the workspace containing the "Klinisk medicin 4" page
5. Copy the **Internal Integration Token**

### Step 3: Share Pages with Integrations

For each user:
1. Open their "Klinisk medicin 4" page
2. Click **"Share"** (top right)
3. Click **"Invite"**
4. Search for their integration name
5. Give it **"Edit"** permissions

### Step 4: Get Page IDs

Use the helper script to get page IDs:

```bash
# 1. Install dependencies (if not already done)
npm install @notionhq/client

# 2. Edit scripts/getNotionPageIds.js
# Replace YOUR_[USER]_TOKEN_HERE with actual tokens

# 3. Run the script
node scripts/getNotionPageIds.js
```

This will output something like:
```
📄 David:
   ✅ Found page: 12345678-1234-1234-1234-123456789abc
   📝 Environment variable: NOTION_COURSE_PAGE_DAVID=12345678-1234-1234-1234-123456789abc

📄 Albin:
   ✅ Found page: 87654321-4321-4321-4321-cba987654321
   📝 Environment variable: NOTION_COURSE_PAGE_ALBIN=87654321-4321-4321-4321-cba987654321

📄 Mattias:
   ✅ Found page: abcdef12-3456-7890-abcd-ef1234567890
   📝 Environment variable: NOTION_COURSE_PAGE_MATTIAS=abcdef12-3456-7890-abcd-ef1234567890
```

### Step 5: Configure Environment Variables

Add these environment variables to your deployment (Netlify):

#### Required for Each User:

**Tokens:**
```bash
NOTION_TOKEN_DAVID=secret_abc123...
NOTION_TOKEN_ALBIN=secret_def456...
NOTION_TOKEN_MATTIAS=secret_ghi789...
```

**Page IDs:**
```bash
NOTION_COURSE_PAGE_DAVID=12345678-1234-1234-1234-123456789abc
NOTION_COURSE_PAGE_ALBIN=87654321-4321-4321-4321-cba987654321
NOTION_COURSE_PAGE_MATTIAS=abcdef12-3456-7890-abcd-ef1234567890
```

#### How to Set in Netlify:
1. Go to your Netlify dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add each variable above
4. Redeploy your site

## 🔄 How It Works

### User-to-Page Mapping:
```
App User "David" → NOTION_TOKEN_DAVID → NOTION_COURSE_PAGE_DAVID → David's "Klinisk medicin 4" page
App User "Albin" → NOTION_TOKEN_ALBIN → NOTION_COURSE_PAGE_ALBIN → Albin's "Klinisk medicin 4" page
App User "Mattias" → NOTION_TOKEN_MATTIAS → NOTION_COURSE_PAGE_MATTIAS → Mattias's "Klinisk medicin 4" page
```

### When a Lecture is Selected:
1. **Frontend** sends request with user + lecture + subject area
2. **Backend** looks up user's specific page ID
3. **Updates** that user's page with the lecture organized by subject area
4. **All users** get their own copy updated simultaneously

### Page Structure Created:
```
📚 Klinisk medicin 4
├── • Mattias
├── • Albin  
├── • David
├── 👶 Pediatrik ▼
│   └── • 1. Respiratorisk Fysiologi [D]
├── 👴 Geriatrik ▼
│   └── • 2. Kardiovaskulär Patofysiologi [A][M]
├── 🌍 Global hälsa ▼
├── 👂 Öron-Näsa-Hals ▼
├── 🤱 Gynekologi & Obstetrik ▼
└── 👁️ Oftalmologi ▼
```

## ✅ Testing

After setup:
1. Select a lecture in the app
2. Check each user's Notion page
3. Verify the lecture appears in the correct subject area section
4. Verify user assignment is tracked with [D], [A], [M]

## 🐛 Troubleshooting

### "No course page ID configured"
- Make sure `NOTION_COURSE_PAGE_[USER]` environment variables are set
- Check the page ID is correct (no extra spaces/characters)

### "Course page not found"
- Verify the integration has access to the page
- Check the page exists in the user's workspace
- Ensure the page ID is from the correct workspace

### "Integration not authorized"
- Make sure the page is shared with the integration
- Verify the integration token is correct
- Check the integration has "Edit" permissions

## 📝 Notes

- Each user maintains their own copy of the course structure
- Subject areas are created automatically when first lecture is added
- Collapsible sections keep the interface clean
- Medical specialty emojis help with visual organization