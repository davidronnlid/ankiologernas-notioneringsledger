# Notion Page + Database Integration Setup

## 🏗️ **Architecture Overview**

The Notion integration uses a **page-based approach with a single embedded database** per user - giving you the best of both worlds: simplicity and customizability.

### **Structure**:
- **One "Klinisk medicin 4" page per user** (customizable with other content)
- **One database embedded in that page** for all lectures
- **Subject Area column** to categorize lectures by medical specialty  
- **Users can add other content** around the database on their page
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

# Course Page IDs (one per user - will contain the database)
NOTION_COURSE_PAGE_DAVID=page_id_xyz...
NOTION_COURSE_PAGE_ALBIN=page_id_abc...
NOTION_COURSE_PAGE_MATTIAS=page_id_def...
```

### **How to Set Up**:

1. **Create Page**: Create a new page in Notion titled "Klinisk medicin 4" (or any name you prefer)
2. **Get Page ID**: From the page URL: `notion.so/workspace/PAGE_ID`
3. **Share with Integration**: Make sure your Notion integration has access to the page
4. **Database Auto-Creation**: The system will automatically create the database on the page when first accessed

## 🚀 **System Benefits**

### **Perfect Balance**:
✅ **Customizable Pages**: Users can add notes, links, and other content around the database  
✅ **Simple Database**: One unified view of all lectures with subject area filtering  
✅ **Auto-Management**: System automatically creates and maintains the database schema  
✅ **Fast Operations**: Direct database operations for lecture tracking  
✅ **Clean Interface**: Single view of all lectures with easy subject filtering  
✅ **Flexible Views**: Users can create custom Notion views (by subject, completion status, etc.)

### **Best of Both Worlds**:
- **Page Flexibility**: Like having a customizable workspace
- **Database Simplicity**: Like having a clean spreadsheet view
- **Auto-Setup**: No manual database creation needed  

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