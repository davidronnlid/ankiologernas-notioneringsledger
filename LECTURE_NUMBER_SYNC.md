# Lecture Number Synchronization

## Overview

The Ankiologerna app now automatically synchronizes lecture numbers between the app and Notion database to ensure consistency when lecture numbers change due to new lectures being added with earlier dates.

## How It Works

### Automatic Sync on App Load

When the app loads and lecture data is fetched, the system automatically:

1. **Checks for mismatches**: Compares lecture numbers in the app with those in the user's Notion database
2. **Identifies mismatches**: Finds lectures where the number in Notion doesn't match the app
3. **Updates Notion**: Automatically updates lecture titles in Notion to have the correct numbers
4. **Logs activity**: Provides detailed console logs of what was updated

### Sync Frequency

- **Automatic**: Runs when the app loads (after data is fetched)
- **Optimized**: Only runs if the last sync was more than 1 hour ago
- **Development**: Skipped in development mode to avoid unnecessary API calls

### User-Specific Processing

The sync only processes the logged-in user's Notion database:
- **David**: Uses `NOTION_TOKEN_DAVID` and `NOTION_COURSE_PAGE_DAVID`
- **Albin**: Uses `NOTION_TOKEN_ALBIN` and `NOTION_COURSE_PAGE_ALBIN`  
- **Mattias**: Uses `NOTION_TOKEN_MATTIAS` and `NOTION_COURSE_PAGE_MATTIAS`

## Technical Implementation

### API Endpoints

- **Development**: `/api/syncLectureNumbers`
- **Production**: `/.netlify/functions/syncLectureNumbers`

### Key Functions

#### `syncLectureNumbersWithNotion(lectures, currentUser)`
- Main utility function that handles the sync process
- Flattens lecture data from WeekData structure
- Calls the appropriate API endpoint
- Returns sync results with update counts

#### `shouldSyncLectureNumbers(lastSyncTime)`
- Optimization function to prevent excessive API calls
- Returns true if sync is needed (never synced or >1 hour ago)

### Lecture Number Extraction

The system uses regex patterns to:
- **Extract clean titles**: Removes lecture numbers (e.g., "1. " from "1. Introduction")
- **Extract numbers**: Gets the lecture number from titles
- **Match lectures**: Compares clean titles to find matching lectures

### Error Handling

- **Retry logic**: 3 attempts with exponential backoff
- **Graceful failures**: Continues processing even if some lectures fail
- **Detailed logging**: Comprehensive console output for debugging

## Example Scenarios

### Scenario 1: New Lecture Added Earlier
```
App: Lecture 5. "Cardiology Basics" (date: 2024-01-15)
App: Lecture 6. "New Early Lecture" (date: 2024-01-10) ← New lecture added

Notion: Lecture 5. "Cardiology Basics"
Notion: Lecture 6. "Cardiology Basics" ← Wrong number!

Result: Notion updated to "Lecture 6. Cardiology Basics"
```

### Scenario 2: No Changes Needed
```
App: Lecture 5. "Cardiology Basics"
Notion: Lecture 5. "Cardiology Basics"

Result: No updates needed
```

## Console Output Example

```
🔢 Starting lecture number sync...
👤 Current user for lecture number sync: { full_name: "David Rönnlid" }
🔄 Starting lecture number sync for David
📊 Processing 15 lectures
📊 Flattened to 15 lectures
🔍 Syncing lecture numbers for David...
📊 Found 12 lectures in Notion database
📊 App has 15 lectures
🔄 Number mismatch found: "5. Cardiology Basics" (Notion: 5, App: 6)
✅ Updated: "5. Cardiology Basics" → "6. Cardiology Basics"
✅ Numbers match: "7. Neurology" (7)
🎉 Lecture number sync completed for David: 1 lectures updated
✅ Lecture number sync completed successfully
📊 Updated 1 lecture numbers in Notion
```

## Configuration

### Environment Variables Required

```bash
# Notion API Tokens
NOTION_TOKEN_DAVID=your_david_token
NOTION_TOKEN_ALBIN=your_albin_token  
NOTION_TOKEN_MATTIAS=your_mattias_token

# Notion Course Page IDs
NOTION_COURSE_PAGE_DAVID=your_david_page_id
NOTION_COURSE_PAGE_ALBIN=your_albin_page_id
NOTION_COURSE_PAGE_MATTIAS=your_mattias_page_id
```

## Files Modified

### New Files Created
- `src/pages/api/syncLectureNumbers.ts` - Next.js API endpoint
- `src/utils/lectureNumberSync.ts` - Utility functions
- `netlify/functions/syncLectureNumbers.js` - Netlify function
- `LECTURE_NUMBER_SYNC.md` - This documentation

### Files Modified
- `src/components/Layout.tsx` - Added lecture number sync integration

## Testing

To test the functionality:

1. **Development mode**: Check console logs for sync activity
2. **Production mode**: Verify Notion database updates
3. **Manual trigger**: Can be triggered by refreshing the app

## Troubleshooting

### Common Issues

1. **"No current user found"**: User not logged in
2. **"Unknown user"**: User name not recognized
3. **"No Notion token configured"**: Missing environment variables
4. **"Course page not found"**: Incorrect page ID or permissions

### Debug Steps

1. Check browser console for detailed logs
2. Verify environment variables are set
3. Confirm user is logged in
4. Check Notion integration permissions 