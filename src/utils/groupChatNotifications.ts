// Group chat notification utilities

interface GroupChatMessage {
  title: string;
  message: string;
  fromUser: string;
  lectureTitle?: string;
  type: 'lecture_completed' | 'lecture_notified' | 'general';
}

// Discord webhook integration
export const sendToDiscordWebhook = async (messageData: GroupChatMessage): Promise<boolean> => {
  const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
    return false;
  }

  try {
    const embed = {
      title: `📚 ${messageData.title}`,
      description: messageData.message,
      color: messageData.type === 'lecture_completed' ? 0x4CAF50 : 0x2196F3, // Green for completed, blue for notifications
      fields: [
        {
          name: "Från",
          value: messageData.fromUser,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Ankiologernas Notioneringsledger",
        icon_url: "https://your-domain.com/images/logo.png" // Update with your actual domain
      }
    };

    if (messageData.lectureTitle) {
      embed.fields.push({
        name: "Föreläsning",
        value: messageData.lectureTitle,
        inline: true
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (response.ok) {
      console.log('✅ Discord notification sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send Discord notification:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Discord webhook error:', error);
    return false;
  }
};

// Facebook Messenger Bot API (requires setup)
export const sendToFacebookMessenger = async (messageData: GroupChatMessage): Promise<boolean> => {
  const pageAccessToken = process.env.NEXT_PUBLIC_FB_PAGE_ACCESS_TOKEN;
  const groupChatId = process.env.NEXT_PUBLIC_FB_GROUP_CHAT_ID;
  
  if (!pageAccessToken || !groupChatId) {
    console.warn('Facebook Messenger not configured');
    return false;
  }

  try {
    const messageText = `📚 ${messageData.title}\n\n${messageData.message}\n\n— ${messageData.fromUser}`;
    
    const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: {
          thread_key: groupChatId
        },
        message: {
          text: messageText
        }
      })
    });

    if (response.ok) {
      console.log('✅ Facebook Messenger notification sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send Facebook Messenger notification:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Facebook Messenger error:', error);
    return false;
  }
};

// Slack webhook (alternative option)
export const sendToSlackWebhook = async (messageData: GroupChatMessage): Promise<boolean> => {
  const webhookUrl = process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured');
    return false;
  }

  try {
    const slackMessage = {
      text: `📚 ${messageData.title}`,
      attachments: [
        {
          color: messageData.type === 'lecture_completed' ? '#4CAF50' : '#2196F3',
          fields: [
            {
              title: 'Meddelande',
              value: messageData.message,
              short: false
            },
            {
              title: 'Från',
              value: messageData.fromUser,
              short: true
            }
          ],
          footer: 'Ankiologernas Notioneringsledger',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    if (messageData.lectureTitle) {
      slackMessage.attachments[0].fields.push({
        title: 'Föreläsning',
        value: messageData.lectureTitle,
        short: true
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage)
    });

    if (response.ok) {
      console.log('✅ Slack notification sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send Slack notification:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Slack webhook error:', error);
    return false;
  }
};

// Main function to send to your preferred group chat platform
export const sendToGroupChat = async (messageData: GroupChatMessage): Promise<boolean> => {
  // Since you want to use URL scheme primarily, we'll skip webhooks for now
  // and go straight to opening Messenger
  
  // Enhance the message with team-building emojis if none exist
  const enhancedMessage = addTeamEmojisIfNeeded(messageData.message);
  openMessengerWithMessage(enhancedMessage);
  
  // Return false so the calling code handles the fallback messaging
  return false;
};

// Add team-building emojis if the message doesn't already have emojis
const addTeamEmojisIfNeeded = (message: string): string => {
  // Check if message already contains Unicode emojis (but replace <3 with proper emojis)
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|❤️|💪|🔥|💯|🎯|🚀|⭐|✨|👊|🙌|💙|💚|❤|♥/gu;
  
  // Replace <3 with proper emoji and remove from message
  let cleanedMessage = message.replace(/<3/g, '').trim();
  
  if (emojiRegex.test(cleanedMessage)) {
    // Message already has proper emojis, return as is
    return message;
  }
  
  // Array of team-building and strength emojis
  const teamEmojis = [
    '💪✨',     // Strength + sparkle
    '🔥💯',     // Fire + 100
    '🚀⭐',     // Rocket + star  
    '💪🎯',     // Strength + target
    '🙌💙',     // Praise + blue heart
    '💪🔥',     // Strength + fire
    '⭐💪',     // Star + strength
    '🎯🔥',     // Target + fire
    '💯⭐',     // 100 + star
    '🚀💪'      // Rocket + strength
  ];
  
  // Pick a random emoji combination
  const randomEmojis = teamEmojis[Math.floor(Math.random() * teamEmojis.length)];
  
  // Add emojis to the end of the message (replace <3 if it exists)
  const finalMessage = message.includes('<3') 
    ? `${cleanedMessage} ${randomEmojis}`
    : `${message.trim()} ${randomEmojis}`;
  
  console.log(`🎯 Emoji enhancement: "${message}" → "${finalMessage}"`);
  return finalMessage;
};

// Enhanced Messenger integration with better fallback
export const openMessengerWithMessage = (message: string): void => {
  // Check if we're on mobile or desktop
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  try {
    if (isMobile) {
      // On mobile, try to open Messenger app with pre-filled message
      const messengerUrl = `fb-messenger://share/?text=${encodeURIComponent(message)}`;
      window.location.href = messengerUrl;
      console.log("📱 Opening Messenger app on mobile");
      
      // Fallback: copy to clipboard
      setTimeout(() => {
        copyToClipboard(message);
      }, 1000);
    } else {
      // On desktop, try different approaches
      
      // Option 1: Try to open specific group chat (you can add your group thread ID here)
      const groupThreadId = process.env.NEXT_PUBLIC_MESSENGER_GROUP_ID;
      
      let messengerUrl;
      if (groupThreadId) {
        // Open specific group chat
        messengerUrl = `https://www.messenger.com/t/${groupThreadId}`;
        console.log("💻 Opening specific Messenger group chat");
      } else {
        // Fallback to general Messenger
        messengerUrl = `https://www.messenger.com/`;
        console.log("💻 Opening Messenger web (general)");
      }
      
      // Copy to clipboard first with enhanced detection
      copyToClipboardEnhanced(message);
      
      // Open Messenger
      window.open(messengerUrl, '_blank');
      
      // Show enhanced instructions
      setTimeout(() => {
        showEnhancedDesktopInstructions(message, !!groupThreadId);
      }, 1500);
    }
  } catch (error) {
    console.error("Could not open Messenger:", error);
    copyToClipboardEnhanced(message);
    showEnhancedDesktopInstructions(message, false);
  }
};

// Simple copy to clipboard function
const copyToClipboard = (message: string): void => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(message).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }
};

// Enhanced clipboard with success feedback
const copyToClipboardEnhanced = (message: string): void => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(message).then(() => {
      console.log("✅ Message copied to clipboard successfully");
    }).catch(() => {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      console.log("✅ Message copied to clipboard (fallback method)");
    });
  } else {
    // Very old browser fallback
    const textarea = document.createElement('textarea');
    textarea.value = message;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

// Enhanced instructions for desktop users
const showEnhancedDesktopInstructions = (message: string, hasDirectLink: boolean): void => {
  let instructions;
  
  if (hasDirectLink) {
    instructions = `🎯 Perfekt! Ankiologerna-chatten öppnades!\n\n` +
      `✅ Ditt meddelande är kopierat till urklipp\n\n` +
      `Nästa steg:\n` +
      `1. Klicka i meddelandefältet\n` +
      `2. Klistra in (Cmd+V / Ctrl+V)\n` +
      `3. Tryck Enter för att skicka\n\n` +
      `Ditt meddelande:\n"${message}"`;
  } else {
    instructions = `💬 Messenger öppnades!\n\n` +
      `✅ Ditt meddelande är kopierat till urklipp\n\n` +
      `Nästa steg:\n` +
      `1. Sök efter "Ankiologerna" gruppchatt\n` +
      `2. Öppna chatten\n` +
      `3. Klistra in meddelandet (Cmd+V / Ctrl+V)\n` +
      `4. Tryck Enter för att skicka\n\n` +
      `Ditt meddelande:\n"${message}"`;
  }
  
  alert(instructions);
};

// Show instructions for desktop users (keep for backward compatibility)
const showDesktopInstructions = (message: string): void => {
  showEnhancedDesktopInstructions(message, false);
};

// Helper function to copy to clipboard with user-friendly instructions
const copyToClipboardWithInstructions = (message: string): void => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(message).then(() => {
      // Create a more user-friendly notification
      const instructions = `✅ Meddelandet har kopierats till urklipp!\n\n` +
        `Nästa steg:\n` +
        `1. Öppna Facebook Messenger\n` +
        `2. Gå till er gruppchatt\n` +
        `3. Klistra in meddelandet (Cmd+V / Ctrl+V)\n\n` +
        `Meddelandet:\n"${message}"`;
      
      alert(instructions);
    }).catch(() => {
      // Fallback if clipboard API fails
      const instructions = `Kopiera detta meddelande och klistra in det i er Messenger-gruppchatt:\n\n"${message}"`;
      
      // Try to select text in a temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        alert(`✅ Meddelandet har kopierats till urklipp!\n\nGå till er Messenger-gruppchatt och klistra in (Cmd+V / Ctrl+V).`);
      } catch (err) {
        alert(instructions);
      }
      
      document.body.removeChild(textarea);
    });
  } else {
    // Very old browsers without clipboard API
    const instructions = `Kopiera detta meddelande och klistra in det i er Messenger-gruppchatt:\n\n"${message}"`;
    alert(instructions);
  }
}; 