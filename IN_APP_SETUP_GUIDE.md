# In-App Notion Integration Setup

This document explains the complete in-app setup flow that allows users to configure their Notion integration directly within the application.

## 🎯 Overview

Instead of manually setting environment variables, users can now:
1. **Auto-detection**: App detects if their Notion integration is missing
2. **Guided Setup**: Step-by-step wizard walks them through creating integration
3. **Token Input**: Users paste their token directly in the app
4. **Auto-Configuration**: App automatically configures Netlify environment variables
5. **Instant Activation**: Site rebuilds and integration becomes active

## 🔧 How It Works

### Auto-Detection
- When users log in, `useNotionSetup` hook checks if they have integration configured
- If missing, setup dialog appears automatically after 2 seconds
- Setup status indicator shows in UI (✅ configured / ⚙️ needs setup)

### Setup Wizard Steps

#### Step 1: Create Notion Integration
- Links to https://www.notion.so/my-integrations
- Instructions for creating new integration
- Proper naming: "Ankiologernas Notioneringsledger - [UserName]"

#### Step 2: Create Course Page
- Instructions to create "Klinisk medicin 4" page
- Page will be auto-populated by the app

#### Step 3: Share Page with Integration
- Instructions to share page with the integration
- Grant "Edit" permissions

#### Step 4: Configure Token
- Text input for Notion token
- Real-time validation via `/api/notion-setup-check`
- Automatic saving via `/api/notion-setup-save`

### Backend Flow

#### Token Validation (`/api/notion-setup-check`)
```javascript
1. Validates token format (must start with 'secret_')
2. Tests token by calling Notion API
3. Searches for "Klinisk medicin 4" page
4. Returns success + page ID if found
```

#### Configuration Saving (`/api/notion-setup-save`)
```javascript
1. Uses Netlify API to set environment variables:
   - NOTION_TOKEN_[USER]
   - NOTION_COURSE_PAGE_[USER]
2. Triggers automatic site rebuild
3. Integration becomes active immediately
```

## 📱 UI Components

### Setup Status Indicator
Located near the Notion sync button:
- **Green ✅**: "Notion (UserName)" - Integration configured
- **Orange ⚙️**: "Konfigurera Notion" - Setup needed
- Clicking opens setup wizard

### Setup Dialog
- Material-UI Stepper with 4 steps
- Beautiful gradient background
- Real-time validation feedback
- Error handling with helpful messages

## 🔐 Environment Variables Required

For the automated setup to work, these must be configured in Netlify:

```bash
# Netlify API access (required for auto-configuration)
NETLIFY_API_TOKEN=your_netlify_api_token
NETLIFY_SITE_ID=your_site_id

# User tokens (will be set automatically by the app)
NOTION_TOKEN_DAVID=secret_abc123...    # Set by app
NOTION_TOKEN_ALBIN=secret_def456...    # Set by app
NOTION_TOKEN_MATTIAS=secret_ghi789...  # Set by app

# Page IDs (will be set automatically by the app)
NOTION_COURSE_PAGE_DAVID=page_id_123...    # Set by app
NOTION_COURSE_PAGE_ALBIN=page_id_456...    # Set by app
NOTION_COURSE_PAGE_MATTIAS=page_id_789...  # Set by app
```

## 📋 Admin Setup

To enable automated configuration, set these in Netlify:

### 1. Get Netlify API Token
1. Go to Netlify dashboard → User Settings → Applications
2. Create new Personal Access Token
3. Set as `NETLIFY_API_TOKEN`

### 2. Get Site ID
1. Go to your site in Netlify dashboard
2. Site settings → Site details
3. Copy Site ID
4. Set as `NETLIFY_SITE_ID`

## 🚀 User Experience

### First-Time Users
1. Log in to the app
2. Setup dialog appears automatically
3. Follow 4-step wizard
4. Enter Notion token
5. App configures everything automatically
6. Ready to use!

### Existing Users
- See green ✅ "Notion (UserName)" button
- Can click to reconfigure if needed
- Status persists across sessions

### Error Handling
- Clear error messages for common issues
- Validation happens in real-time
- Helpful troubleshooting guidance

## 🔄 Flow Diagram

```
User Login
    ↓
Check Setup Status (useNotionSetup hook)
    ↓
Missing Setup? → Show Setup Dialog
    ↓              ↓
    No           Step 1: Create Integration
    ↓              ↓
Show Status     Step 2: Create Page
Button           ↓
                Step 3: Share Page
                 ↓
                Step 4: Enter Token
                 ↓
                Validate Token (/api/notion-setup-check)
                 ↓
                Save Config (/api/notion-setup-save)
                 ↓
                Update Netlify Env Vars
                 ↓
                Trigger Site Rebuild
                 ↓
                Integration Active!
```

## ✅ Benefits

### For Users
- **No technical setup required**
- **Guided step-by-step process**
- **Immediate feedback and validation**
- **Automatic configuration**
- **Clear status indicators**

### For Admins
- **No manual environment variable management**
- **Automatic user onboarding**
- **Reduced support requests**
- **Centralized configuration**

### For Development
- **Consistent setup process**
- **Error logging and monitoring**
- **Easy troubleshooting**
- **Scalable for new users**

## 🐛 Troubleshooting

### Common Issues

#### "Token är ogiltigt"
- User copied wrong token
- Token doesn't start with 'secret_'
- Integration was deleted/deactivated

#### "Page not found"
- User hasn't created "Klinisk medicin 4" page
- Page exists but integration doesn't have access
- Page was deleted or renamed

#### "Serverfel: Netlify API inte konfigurerad"
- `NETLIFY_API_TOKEN` or `NETLIFY_SITE_ID` missing
- API token has insufficient permissions
- Site ID is incorrect

### Debug Steps
1. Check browser console for error messages
2. Verify Netlify environment variables
3. Test token manually in Notion API
4. Check page sharing permissions
5. Verify Netlify API token permissions

## 📈 Future Enhancements

Potential improvements:
- **Page auto-creation**: Create "Klinisk medicin 4" page automatically
- **Integration auto-creation**: Use Notion OAuth for seamless setup
- **Bulk user management**: Admin panel for managing multiple users
- **Setup analytics**: Track completion rates and common issues
- **Auto-recovery**: Detect and fix configuration issues automatically