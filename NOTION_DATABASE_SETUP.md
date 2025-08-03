# Notion Database Integration Setup

## 🏗️ **Architecture Overview**

The Notion integration now uses a **simplified single-database approach** per user instead of separate databases for each subject area or complex page hierarchies.

### **Structure**:
- **One database per user** for all "Klinisk medicin 4" lectures
- **Subject Area column** to categorize lectures by medical specialty  
- **Automatic schema management** ensures databases have correct properties

## 📊 **Database Schema**

Each user's database contains these properties:

| Property | Type | Options | Description |
|----------|------|---------|-------------|
| **Föreläsning** | Title | - | Lecture title (e.g., "47. Global hälsa och hållbar utveckling") |
| **Nummer** | Number | - | Lecture number (47) |
| **Subject Area** | Select | Global hälsa, Geriatrik, Pediatrik, Öron-Näsa-Hals, Gynekologi & Obstetrik, Oftalmologi | Medical specialty |
| **Tag** | Select | Bör göra, Ej ankiz, Blå ankiz | Priority/status tag |
| **Person** | Select | D, A, M | User who selected the lecture (David, Albin, Mattias) |
| **Date and Time** | Rich Text | - | When the lecture occurs |
| **URL** | URL | - | Link back to the app |

## 🔧 **Environment Variables**

### **Required Environment Variables**:

```bash
# Notion API Tokens (one per user)
NOTION_TOKEN_DAVID=secret_xyz...
NOTION_TOKEN_ALBIN=secret_abc...
NOTION_TOKEN_MATTIAS=secret_def...

# Database IDs (one per user - single database for all subjects)
NOTION_DATABASE_DAVID=database_id_xyz...
NOTION_DATABASE_ALBIN=database_id_abc...
NOTION_DATABASE_MATTIAS=database_id_def...
```

### **How to Get Database IDs**:

1. **Create Database**: Create a new database in Notion (can be empty initially)
2. **Get Database ID**: From the database URL: `notion.so/workspace/DATABASE_ID?v=view_id`
3. **Share with Integration**: Make sure your Notion integration has access to the database

## 🚀 **Migration Benefits**

### **From Page-Based System**:
✅ **Simpler**: One database instead of multiple toggle sections  
✅ **Faster**: Direct database operations instead of page navigation  
✅ **Cleaner**: Single view of all lectures with filtering by subject  
✅ **Maintainable**: Automatic schema updates  

### **From Subject-Specific Databases**:
✅ **Unified**: All lectures in one place per user  
✅ **Flexible**: Easy filtering and views by subject area  
✅ **Consistent**: Same structure across all users  

## 🔄 **How It Works**

### **1. Auto-Sync (Bulk Add)**
When the app loads, it automatically:
```javascript
// Syncs all lectures to databases
const result = await syncAllLecturesToNotionPages(allLectures);
```

For each lecture:
- **Subject Detection**: Determines medical specialty from title
- **Database Update**: Adds lecture to all users' databases if not exists
- **Schema Check**: Ensures database has correct properties

### **2. User Selections (Select/Unselect)**
When users click lecture cards:
```javascript
// Updates user selection in database
const result = await triggerNotionSync('lecture_selected', lectureData, userName);
```

**Selection Logic**:
- **Single User**: Shows their letter (D/A/M) in Person column
- **Multiple Users**: Clears Person, sets Tag to "Blå ankiz" (conflict)
- **Unselect**: Clears Person, resets Tag to "Bör göra"

### **3. Automatic Schema Management**
The system automatically:
- **Adds Missing Properties**: If database lacks required columns
- **Updates Select Options**: Adds new subject areas or tag options
- **Preserves Data**: Never deletes existing data or options

## 📁 **File Structure**

```
src/
├── pages/api/
│   └── updateNotionDatabase.ts      # Development API
├── utils/
│   └── notionCRUD.ts               # Frontend utilities
└── components/
    └── Layout.tsx                  # Auto-sync trigger

netlify/functions/
└── updateNotionDatabase.js         # Production API
```

## 🎯 **API Endpoints**

### **Development**: `/api/updateNotionDatabase`
### **Production**: `/.netlify/functions/updateNotionDatabase`

**Request**:
```json
{
  "lectureTitle": "Global hälsa och hållbar utveckling",
  "lectureNumber": 47,
  "selectedByUser": "David",
  "subjectArea": "Global hälsa", 
  "action": "bulk_add" | "select" | "unselect"
}
```

**Response**:
```json
{
  "success": true,
  "message": "All Notion databases updated successfully",
  "results": [
    {"user": "David", "success": true, "pagesUpdated": 1},
    {"user": "Albin", "success": true, "pagesUpdated": 1},
    {"user": "Mattias", "success": true, "pagesUpdated": 1}
  ],
  "summary": {
    "successfulUpdates": 3,
    "failedUpdates": 0,
    "pagesCreated": 1
  }
}
```

## 🔍 **Subject Area Detection**

Lectures are automatically categorized using keyword matching:

```javascript
const subjectMappings = {
  'oftalmologi': 'Oftalmologi',
  'öga': 'Oftalmologi',
  'pediatrik': 'Pediatrik', 
  'barn': 'Pediatrik',
  'geriatrik': 'Geriatrik',
  'global hälsa': 'Global hälsa',
  'öron': 'Öron-Näsa-Hals',
  'gynekologi': 'Gynekologi & Obstetrik'
};
```

## 🛠️ **Troubleshooting**

### **Common Issues**:

1. **"No Notion token configured"**
   - Check `NOTION_TOKEN_*` environment variables
   - Verify integration has correct permissions

2. **"No Notion database configured"** 
   - Check `NOTION_DATABASE_*` environment variables
   - Verify database IDs are correct

3. **"Cannot select lecture that doesn't exist"**
   - Run bulk sync first to populate databases
   - Check if lecture was filtered out due to missing subject area

### **Debug Tools**:
- **Notion Sync Button**: Test endpoint connectivity
- **Browser Console**: Shows detailed sync progress
- **Environment Debug**: Check configuration status

## 🎉 **Success Indicators**

✅ **Build Passes**: `npm run build` succeeds  
✅ **Auto-Sync Works**: Lectures appear in databases on app load  
✅ **User Selections Work**: Clicking lectures updates databases  
✅ **Conflict Handling**: Multiple selections show "Blå ankiz"  
✅ **Schema Updates**: Missing properties automatically added  

This simplified database approach provides a clean, maintainable solution for tracking lecture selections across all three users! 🚀