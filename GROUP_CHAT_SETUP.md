# Group Chat Notifications Setup

The application now sends notifications to group chats instead of Mac notifications. You can choose from Discord, Facebook Messenger, or Slack.

## Option 1: Discord Webhook (Recommended - Easiest)

### Setup Steps:
1. Go to your Discord server
2. Right-click on the channel where you want notifications
3. Go to **Settings** → **Integrations** → **Webhooks**
4. Click **Create Webhook**
5. Give it a name like "Ankiologernas Bot"
6. Copy the **Webhook URL**
7. Add to your `.env` file:
   ```
   NEXT_PUBLIC_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
   ```

### Benefits:
- ✅ Very easy setup (5 minutes)
- ✅ Rich formatting with embeds
- ✅ Reliable delivery
- ✅ No rate limiting for basic use

## Option 2: Facebook Messenger Direct Group Link

### Quick Setup (Recommended for your use case):
1. Go to your "Ankiologerna" group chat in Messenger web
2. Look at the URL - it should be like: `https://www.messenger.com/t/1234567890`
3. Copy the number after `/t/` (that's your group thread ID)
4. Add to your `.env` file:
   ```
   NEXT_PUBLIC_MESSENGER_GROUP_ID=1234567890
   ```

### How to find your group thread ID:
1. Open https://www.messenger.com in your browser
2. Click on your "Ankiologerna" group chat
3. Look at the URL bar - copy the numbers after `/t/`
4. Example: If URL is `https://www.messenger.com/t/987654321`, your ID is `987654321`

### Full Bot API Setup (Advanced):
1. Create a Facebook App at [developers.facebook.com](https://developers.facebook.com)
2. Add Messenger Platform to your app
3. Create a Facebook Page (if you don't have one)
4. Generate a Page Access Token
5. Get your group chat thread ID
6. Add to your `.env` file:
   ```
   NEXT_PUBLIC_FB_PAGE_ACCESS_TOKEN=your_page_access_token
   NEXT_PUBLIC_FB_GROUP_CHAT_ID=your_group_thread_id
   ```

### Benefits:
- ✅ Direct Facebook Messenger integration
- ✅ Native mobile notifications

### Challenges:
- ⚠️ More complex setup
- ⚠️ Requires Facebook App approval for production
- ⚠️ Rate limiting

## Option 3: Slack Webhook

### Setup Steps:
1. Go to [api.slack.com](https://api.slack.com)
2. Create a new app for your workspace
3. Enable **Incoming Webhooks**
4. Create a webhook for your desired channel
5. Copy the webhook URL
6. Add to your `.env` file:
   ```
   NEXT_PUBLIC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
   ```

### Benefits:
- ✅ Easy setup
- ✅ Professional formatting
- ✅ Good for work environments

## Environment Configuration

Create a `.env` file in your project root with your chosen platform:

```bash
# For Discord (recommended):
NEXT_PUBLIC_DISCORD_WEBHOOK_URL=your_discord_webhook_url

# For Facebook Messenger Direct Link (recommended for your case):
NEXT_PUBLIC_MESSENGER_GROUP_ID=your_group_thread_id

# For Facebook Messenger Bot API (advanced):
NEXT_PUBLIC_FB_PAGE_ACCESS_TOKEN=your_fb_token
NEXT_PUBLIC_FB_GROUP_CHAT_ID=your_group_id

# For Slack:
NEXT_PUBLIC_SLACK_WEBHOOK_URL=your_slack_webhook_url

# API URL (required):
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Testing

After setup, notifications will be sent when:
1. Someone completes a lecture (automatic)
2. Someone sends a manual notification via the Notify button

## Fallback Behavior

If webhooks fail, the app will:
1. Try to open the Messenger app with pre-filled text
2. Copy the message to clipboard with instructions to paste manually

## Message Format

**Discord/Slack**: Rich formatted messages with embeds
**Facebook Messenger**: Simple text messages

Example message:
```
📚 David har notifierat dig!

Föreläsning: Kardiovaskulär Patofysiologi
Meddelande: Hej grabbar, just klar med denna!

— David
``` 