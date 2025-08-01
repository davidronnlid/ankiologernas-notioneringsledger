# Notion Subject-Based Integration Setup

## Overview
The new Notion integration is designed for **one-way synchronization** (app → Notion) with **multiple subject-specific databases** for each user.

## Subject Areas for Klinisk medicin 4
- **Global hälsa**
- **Geriatrik**
- **Pediatrik**
- **Öron-Näsa-Hals**
- **Gynekologi & Obstetrik**
- **Oftalmologi**

## Environment Variables Structure

Each user needs **6 databases** (one per subject area) + **1 shared token**.

### For David:
```bash
# Single token for all databases
NOTION_TOKEN_DAVID=secret_your_token_here

# One database per subject area
NOTION_DATABASE_DAVID_GLOBAL_HALSA=database_id_here
NOTION_DATABASE_DAVID_GERIATRIK=database_id_here
NOTION_DATABASE_DAVID_PEDIATRIK=database_id_here
NOTION_DATABASE_DAVID_ORON_NASA_HALS=database_id_here
NOTION_DATABASE_DAVID_GYNEKOLOGI_OBSTETRIK=database_id_here
NOTION_DATABASE_DAVID_OFTALMOLOGI=database_id_here
```

### For Albin:
```bash
NOTION_TOKEN_ALBIN=secret_your_token_here
NOTION_DATABASE_ALBIN_GLOBAL_HALSA=database_id_here
NOTION_DATABASE_ALBIN_GERIATRIK=database_id_here
NOTION_DATABASE_ALBIN_PEDIATRIK=database_id_here
NOTION_DATABASE_ALBIN_ORON_NASA_HALS=database_id_here
NOTION_DATABASE_ALBIN_GYNEKOLOGI_OBSTETRIK=database_id_here
NOTION_DATABASE_ALBIN_OFTALMOLOGI=database_id_here
```

### For Mattias:
```bash
NOTION_TOKEN_MATTIAS=secret_your_token_here
NOTION_DATABASE_MATTIAS_GLOBAL_HALSA=database_id_here
NOTION_DATABASE_MATTIAS_GERIATRIK=database_id_here
NOTION_DATABASE_MATTIAS_PEDIATRIK=database_id_here
NOTION_DATABASE_MATTIAS_ORON_NASA_HALS=database_id_here
NOTION_DATABASE_MATTIAS_GYNEKOLOGI_OBSTETRIK=database_id_here
NOTION_DATABASE_MATTIAS_OFTALMOLOGI=database_id_here
```

## Database Schema
Each subject-specific database should have these columns:

| Column | Type | Description |
|--------|------|-------------|
| **Name** | Title | Primary key - "81. Obstetrik - Förlossning" |
| **Föreläsning** | Text | Clean title - "Obstetrik - Förlossning" |
| **Ämnesområde** | Text | Subject area - "Gynekologi & Obstetrik" |
| **Datum** | Date | Lecture date |
| **Tid** | Text | Time range - "09:30-10:15" |
| **Föreläsare** | Text | Lecturer name (optional) |
| **Vems** | Text | User selections - "D, A, M" |

## How It Works

### 1. **One-Way Sync Only**
- ✅ App changes → Notion databases
- ❌ Notion changes → App (not synced back)
- Prevents conflicts and data corruption

### 2. **Subject-Based Routing**
- Each lecture is assigned a subject area
- System automatically routes to correct database
- Example: "Pediatrik" lecture → `NOTION_DATABASE_DAVID_PEDIATRIK`

### 3. **Auto-Detection**
Lectures are automatically categorized based on title keywords:
- "gynekologi" → Gynekologi & Obstetrik
- "barn", "pediatrik" → Pediatrik
- "geriatrik", "äldre" → Geriatrik
- "öron", "näsa", "hals" → Öron-Näsa-Hals
- "ögon", "oftalmologi" → Oftalmologi
- "global", "världshälsa" → Global hälsa

### 4. **Manual Override**
Users can manually select subject area when creating/editing lectures.

## Setup Steps

### 1. Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Create new integration: "Ankiologernas Notioneringsledger"
3. Copy integration token (starts with `secret_`)

### 2. Create Subject Databases
For each user, create 6 databases with the schema above:
- Global hälsa database
- Geriatrik database  
- Pediatrik database
- Öron-Näsa-Hals database
- Gynekologi & Obstetrik database
- Oftalmologi database

### 3. Share Databases
Share each database with your Notion integration.

### 4. Get Database IDs
Copy database ID from each database URL.

### 5. Set Environment Variables
Add all variables to Netlify environment settings.

## Benefits

### ✅ **Organized**
- Separate databases per subject area
- Clean separation of content
- Easy to find specific lectures

### ✅ **Scalable**
- Add new subject areas easily
- Independent database management
- No data mixing between subjects

### ✅ **Reliable**
- One-way sync prevents conflicts
- Auto-detection reduces manual work
- Graceful failure handling

### ✅ **Flexible**
- Manual subject area override
- Subject-specific Notion views
- Custom database schemas per subject

## Migration from Old System

The old single-database system is still functional but deprecated. New features use the subject-based system.

To migrate:
1. Set up new environment variables
2. Create subject-specific databases
3. Existing data continues working
4. New lectures use subject routing

## Testing

Test the integration by:
1. Creating a lecture with title "Pediatrik - Test"
2. Verify it appears in Pediatrik databases for all users
3. Check that subject area is auto-detected
4. Test manual subject area selection