# 🔑 Notion Environment Variables Setup

## Step 1: Create .env.local file

Create a file called `.env.local` in the project root with these variables:

```bash
# Notion Integration Environment Variables
# Replace the placeholder values with your actual tokens and database IDs

# David's Notion Integration
NOTION_TOKEN_DAVID=secret_REPLACE_WITH_DAVIDS_TOKEN
NOTION_DATABASE_DAVID=REPLACE_WITH_DAVIDS_DATABASE_ID

# Albin's Notion Integration  
NOTION_TOKEN_ALBIN=secret_REPLACE_WITH_ALBINS_TOKEN
NOTION_DATABASE_ALBIN=REPLACE_WITH_ALBINS_DATABASE_ID

# Mattias's Notion Integration
NOTION_TOKEN_MATTIAS=secret_REPLACE_WITH_MATTIAS_TOKEN
NOTION_DATABASE_MATTIAS=REPLACE_WITH_MATTIAS_DATABASE_ID
```

## Step 2: Get Integration Tokens

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Create 3 integrations (one for each user)
3. Enable capabilities: "Read content", "Update content", "Insert content"
4. Copy each integration token (starts with `secret_`)

## Step 3: Get Database IDs

1. Open each user's "Klinisk medicin 4" database in Notion
2. Copy the database URL
3. Extract the database ID from the URL:
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=VIEW_ID
   ```
   The DATABASE_ID is the long string between the last `/` and `?v=`

## Step 4: Connect Integrations

For each user's database:
1. Open the database in Notion
2. Click "..." → "Connect to" → Select the integration
3. Grant access

## Step 5: Test

After setting up, restart the development server and test by selecting a lecture in the app. 