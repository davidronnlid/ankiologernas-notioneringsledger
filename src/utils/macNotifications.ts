// Mac-specific notification utilities
export interface MacNotificationOptions {
  title: string;
  message: string;
  fromUser: string;
  lectureTitle: string;
  sound?: string;
  badge?: number;
}

// Detect if user is on Mac
export const isMac = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

// Native Mac notifications with enhanced features
export const sendMacNotification = async (
  options: MacNotificationOptions
): Promise<boolean> => {
  if (!isMac()) return false;

  try {
    // Request permission for notifications
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    }

    if (Notification.permission === "granted") {
      const notification = new Notification(options.title, {
        body: options.message,
        icon: "/images/logo.png",
        tag: "lecture-notification", // Prevents duplicate notifications
        requireInteraction: true, // Keeps notification visible until user interacts
        data: {
          lectureTitle: options.lectureTitle,
          fromUser: options.fromUser,
          timestamp: Date.now(),
        },
      });

      // Handle notification clicks
      notification.onclick = () => {
        window.focus();
        notification.close();
        // Could potentially scroll to the specific lecture
      };

      // Auto-close after 10 seconds if not interacted with
      setTimeout(() => {
        notification.close();
      }, 10000);

      return true;
    }
  } catch (error) {
    console.error("Mac notification error:", error);
  }

  return false;
};

// iMessage integration for Mac users
export const sendToiMessage = (phoneNumber: string, message: string): void => {
  if (!isMac()) return;

  // Create iMessage URL scheme
  const iMessageUrl = `sms:${phoneNumber}&body=${encodeURIComponent(message)}`;

  // Try to open Messages app
  try {
    window.open(iMessageUrl, "_blank");
  } catch (error) {
    console.error("Could not open Messages app:", error);
  }
};

// Apple Mail integration
export const sendToAppleMail = (
  email: string,
  subject: string,
  body: string
): void => {
  if (!isMac()) return;

  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  try {
    window.open(mailtoUrl, "_blank");
  } catch (error) {
    console.error("Could not open Mail app:", error);
  }
};

// Enhanced notification with system integration
export const sendEnhancedMacNotification = async (
  options: MacNotificationOptions
): Promise<void> => {
  if (!isMac()) return;

  // Send native notification
  const notificationSent = await sendMacNotification(options);

  if (notificationSent) {
    // Add to Mac's Notification Center
    console.log("📱 Mac notification sent to Notification Center");



    // Optional: Update dock badge
    if (options.badge) {
      updateDockBadge(options.badge);
    }
  }
};



// Update dock badge (if supported)
export const updateDockBadge = (count: number): void => {
  if (!isMac()) return;

  try {
    // Use Notification API to update badge
    if ("setAppBadge" in navigator) {
      (navigator as any).setAppBadge(count);
    }
  } catch (error) {
    console.error("Could not update dock badge:", error);
  }
};

// Share via AirDrop (Mac only)
export const shareViaAirDrop = async (data: any): Promise<void> => {
  if (!isMac()) return;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Notioneringsledger Update",
        text: data.message,
        url: window.location.href,
      });
    }
  } catch (error) {
    console.error("AirDrop sharing not available:", error);
  }
};

// Send message to Messenger group chat
export const sendToMessengerGroupChat = (message: string): void => {
  try {
    // Messenger URL scheme for sending to a specific group chat
    // You'll need to replace GROUP_CHAT_ID with your actual group chat ID
    const messengerUrl = `fb-messenger://share/?text=${encodeURIComponent(message)}`;
    
    // Alternative: Direct link to specific group (if you have the group thread ID)
    // const groupThreadId = "YOUR_GROUP_THREAD_ID"; 
    // const messengerGroupUrl = `fb-messenger://group-thread/${groupThreadId}?text=${encodeURIComponent(message)}`;
    
    // Try to open Messenger app
    window.open(messengerUrl, "_blank");
    
    console.log("📱 Opened Messenger with message:", message);
  } catch (error) {
    console.error("Could not open Messenger:", error);
    
    // Fallback: Copy message to clipboard and show instructions
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
      alert(`Kunde inte öppna Messenger automatiskt.\n\nMeddelandet har kopierats till urklipp:\n"${message}"\n\nKlistra in det i Messenger-gruppchaten manuellt.`);
    }
  }
};

// Mac-specific user contact information
export const getMacUserContacts = () => {
  // This would typically come from a user profile or settings
  return {
    Mattias: {
      phone: "+46123456789",
      email: "mattias@example.com",
      imessage: "mattias@icloud.com",
    },
    Albin: {
      phone: "+46987654321",
      email: "albin@example.com",
      imessage: "albin@icloud.com",
    },
    David: {
      phone: "+46555666777",
      email: "david@example.com",
      imessage: "david@icloud.com",
    },
  };
};

// Send notification with multiple Mac channels
export const sendMultiChannelMacNotification = async (
  toUser: string,
  options: MacNotificationOptions
): Promise<void> => {
  if (!isMac()) return;

  const contacts = getMacUserContacts();
  const userContact = contacts[toUser as keyof typeof contacts];

  if (!userContact) return;

  // 1. Native notification
  await sendEnhancedMacNotification(options);

  // 2. Optional iMessage (if user prefers)
  const iMessageText = `📚 ${options.fromUser} har notionerat färdigt "${options.lectureTitle}"! Kolla Notioneringsledger för detaljer.`;

  // 3. Optional email notification
  const emailSubject = `Notioneringsledger: ${options.fromUser} har slutfört en föreläsning`;
  const emailBody = `Hej ${toUser}!\n\n${options.fromUser} har just notionerat färdigt föreläsningen "${options.lectureTitle}".\n\nLogga in på Notioneringsledger för att se dina notifieringar.\n\nMed vänliga hälsningar,\nAnkiologernas Notioneringsledger`;

  // Store options for user to choose from
  console.log("📱 Mac notification channels available:", {
    native: true,
    imessage: userContact.imessage,
    email: userContact.email,
  });
};
