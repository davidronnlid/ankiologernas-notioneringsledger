/**
 * Enhanced notification system for database operations and user feedback
 */

export interface NotificationOptions {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number; // in milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastNotification extends NotificationOptions {
  id: string;
  timestamp: number;
}

class NotificationManager {
  private static instance: NotificationManager;
  private notifications: ToastNotification[] = [];
  private listeners: ((notifications: ToastNotification[]) => void)[] = [];

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Show a notification
   */
  show(options: NotificationOptions): string {
    const notification: ToastNotification = {
      ...options,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.notifications.push(notification);
    this.notifyListeners();

    // Auto-remove after duration (default 5 seconds)
    if (options.duration !== 0) {
      const duration = options.duration || 5000;
      setTimeout(() => {
        this.remove(notification.id);
      }, duration);
    }

    return notification.id;
  }

  /**
   * Remove a notification by ID
   */
  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Get all current notifications
   */
  getNotifications(): ToastNotification[] {
    return [...this.notifications];
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: ToastNotification[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.notifications]);
    });
  }

  /**
   * Convenience methods for common notification types
   */
  success(title: string, message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'success',
      title,
      message,
      ...options,
    });
  }

  error(title: string, message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: 0, // Errors are persistent by default
      ...options,
    });
  }

  info(title: string, message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'info',
      title,
      message,
      ...options,
    });
  }

  warning(title: string, message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'warning',
      title,
      message,
      ...options,
    });
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();

/**
 * Database operation specific notifications
 */
export const DatabaseNotifications = {
  lectureAdded: (title: string) => 
    notificationManager.success(
      'Föreläsning tillagd',
      `"${title}" har lagts till framgångsrikt!`,
      { duration: 4000 }
    ),

  lectureUpdated: (title: string) =>
    notificationManager.success(
      'Föreläsning uppdaterad',
      `"${title}" har uppdaterats framgångsrikt!`,
      { duration: 4000 }
    ),

  lectureAddError: (error: string) =>
    notificationManager.error(
      'Fel vid tillägg av föreläsning',
      `Ett fel uppstod: ${error}`,
      {
        action: {
          label: 'Försök igen',
          onClick: () => {
            // This could trigger a retry mechanism
            console.log('Retry add lecture requested');
          }
        }
      }
    ),

  lectureUpdateError: (error: string) =>
    notificationManager.error(
      'Fel vid uppdatering av föreläsning',
      `Ett fel uppstod: ${error}`,
      {
        action: {
          label: 'Försök igen',
          onClick: () => {
            // This could trigger a retry mechanism
            console.log('Retry update lecture requested');
          }
        }
      }
    ),

  dataRefreshed: () =>
    notificationManager.info(
      'Data uppdaterad',
      'Föreläsningsdata har synkroniserats med databasen',
      { duration: 3000 }
    ),

  syncError: (error: string) =>
    notificationManager.warning(
      'Synkroniseringsfel',
      `Data kunde inte synkroniseras: ${error}`,
      { duration: 8000 }
    ),

  networkError: () =>
    notificationManager.error(
      'Nätverksfel',
      'Kunde inte ansluta till servern. Kontrollera din internetanslutning.',
      {
        action: {
          label: 'Försök igen',
          onClick: () => {
            window.location.reload();
          }
        }
      }
    ),


};

/**
 * React hook for using notifications in components
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<ToastNotification[]>([]);

  React.useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    setNotifications(notificationManager.getNotifications());
    
    return unsubscribe;
  }, []);

  return {
    notifications,
    show: notificationManager.show.bind(notificationManager),
    remove: notificationManager.remove.bind(notificationManager),
    clear: notificationManager.clear.bind(notificationManager),
    success: notificationManager.success.bind(notificationManager),
    error: notificationManager.error.bind(notificationManager),
    info: notificationManager.info.bind(notificationManager),
    warning: notificationManager.warning.bind(notificationManager),
  };
};

// Import React for the hook
import React from 'react';