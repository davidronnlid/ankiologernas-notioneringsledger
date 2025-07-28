# 🧪 Testing Notion Integration

Once you've completed the setup in `NOTION_ENV_TEMPLATE.md`, use this guide to test the integration:

## 1. Quick Function Test

Test the Netlify function directly:

```bash
curl -X POST http://localhost:8888/.netlify/functions/updateNotionTags \
  -H "Content-Type: application/json" \
  -d '{
    "lectureTitle": "Test Lecture",
    "lectureNumber": "1", 
    "selectedByUser": "David",
    "action": "select"
  }'
```

## 2. Expected Response (Success)

```json
{
  "success": true,
  "message": "Notion update completed for lecture: Test Lecture",
  "results": [
    {
      "user": "David",
      "success": true,
      "pagesUpdated": 1,
      "created": 1
    },
    {
      "user": "Albin", 
      "success": true,
      "pagesUpdated": 1,
      "created": 1
    },
    {
      "user": "Mattias",
      "success": true, 
      "pagesUpdated": 1,
      "created": 1
    }
  ],
  "summary": {
    "successfulUpdates": 3,
    "failedUpdates": 0,
    "pagesCreated": 3
  }
}
```

## 3. Test in App

1. Start the app: `netlify dev`
2. Open `http://localhost:8888`
3. Login as David
4. Select a lecture from "Klinisk medicin 4"
5. Check browser console for logs
6. Verify in Notion databases that "D" appears in Vems column

## 4. What to Check in Notion

After selecting a lecture, each user's database should have:
- **New page created** (if lecture didn't exist)
- **Name**: "1. Lecture Title"
- **Föreläsningsnamn**: "Lecture Title"
- **Vems**: ["D"] (or existing tags + "D")
- **Last Updated**: Current timestamp

## 5. Troubleshooting

### Common Issues:

1. **"Missing Notion config" error**:
   - Check `.env.local` file exists and has correct format
   - Verify tokens start with `secret_`
   - Restart `netlify dev` after adding env vars

2. **"Permission denied" errors**:
   - Ensure integrations have "Insert content" and "Update content" capabilities
   - Verify integrations are connected to each database

3. **"Lecture not found" but no creation**:
   - Check database column names: "Name", "Föreläsningsnamn", "Vems"
   - Ensure "Vems" is a Multi-select property

4. **Function timeout**:
   - Check Notion API rate limits
   - Verify network connectivity to Notion API

## 6. Debug Logs

Check these logs for detailed information:
- **Browser Console**: Client-side logs
- **Netlify Dev Terminal**: Function execution logs
- **Network Tab**: API request/response details 