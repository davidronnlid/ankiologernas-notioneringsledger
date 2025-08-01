import { Dispatch } from '@reduxjs/toolkit';
import { setLectures } from '../store/slices/lecturesReducer';
import { refreshLectures } from './lectureAPI';
import { sortLecturesIntoCoursesAndWeeks } from './processLectures';
import { removeDuplicateLectures } from './removeDuplicateLectures';
import { ensureLectureUniqueness, UniquenessScanResult } from './uniqueLectureManager';
import Lecture from '../types/lecture';

/**
 * Centralized data refresh utility for keeping UI in sync with database
 */
export class DataSyncManager {
  private static instance: DataSyncManager;
  private dispatch: Dispatch | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private refreshCallbacks: (() => void)[] = [];

  static getInstance(): DataSyncManager {
    if (!DataSyncManager.instance) {
      DataSyncManager.instance = new DataSyncManager();
    }
    return DataSyncManager.instance;
  }

  /**
   * Initialize the data sync manager with Redux dispatch
   */
  init(dispatch: Dispatch) {
    this.dispatch = dispatch;
  }

  /**
   * Refresh lecture data from the API and update Redux store
   */
  async refreshLectureData(): Promise<boolean> {
    if (!this.dispatch) {
      console.error('DataSyncManager not initialized with dispatch');
      return false;
    }

    try {
      console.log('🔄 DataSync: Refreshing lecture data...');
      
      // Fetch latest data from API
      const updatedLectures = await refreshLectures();
      
      // ✨ NEW: Ensure lecture uniqueness before processing
      console.log('🔍 DataSync: Checking lecture uniqueness...');
      const uniquenessResult = await this.ensureUniqueLectures(updatedLectures);
      
      // If duplicates were removed, fetch fresh data
      let finalLectures = updatedLectures;
      if (uniquenessResult.lecturesMarkedForRemoval.length > 0) {
        console.log('🔄 DataSync: Fetching updated data after duplicate removal...');
        finalLectures = await refreshLectures();
      }
      
      // Process the data (same logic as in Layout.tsx)
      const processedData = sortLecturesIntoCoursesAndWeeks(
        finalLectures,
        new Date()
      );
      
      // Remove duplicates (additional safety check)
      const { cleanedData, removedDuplicates } = removeDuplicateLectures(processedData);
      
      // Update Redux store
      this.dispatch(setLectures(cleanedData));
      
      // Store removed duplicates for notification
      if (removedDuplicates.length > 0) {
        localStorage.setItem('removedDuplicates', JSON.stringify(removedDuplicates));
      }
      
      console.log('✅ DataSync: Lecture data refreshed successfully');
      
      // Notify callbacks
      this.refreshCallbacks.forEach(callback => callback());
      
      return true;
    } catch (error) {
      console.error('❌ DataSync: Error refreshing lecture data:', error);
      return false;
    }
  }

  /**
   * Ensure lecture uniqueness by analyzing and removing duplicates
   */
  private async ensureUniqueLectures(lectures: Lecture[]): Promise<UniquenessScanResult> {
    console.log('🔍 DataSync: Starting lecture uniqueness check...');
    
    try {
      const uniquenessResult = await ensureLectureUniqueness(lectures);
      
      if (uniquenessResult.lecturesMarkedForRemoval.length > 0) {
        console.log(`🧹 DataSync: Found and removed ${uniquenessResult.lecturesMarkedForRemoval.length} duplicate lectures`);
        
        // Store uniqueness info for notifications
        localStorage.setItem('lectureUniquenessResult', JSON.stringify({
          duplicateGroupsCount: uniquenessResult.duplicateGroups.length,
          removedLecturesCount: uniquenessResult.lecturesMarkedForRemoval.length,
          timestamp: Date.now()
        }));
      } else {
        console.log('✅ DataSync: All lectures have unique titles');
      }
      
      return uniquenessResult;
    } catch (error) {
      console.error('❌ DataSync: Error ensuring lecture uniqueness:', error);
      return {
        totalLectures: lectures.length,
        uniqueLectures: lectures.length,
        duplicateGroups: [],
        lecturesMarkedForRemoval: []
      };
    }
  }

  /**
   * Start polling for changes at specified interval
   */
  startPolling(intervalMs: number = 30000): void {
    if (this.isPolling) {
      console.log('🔄 DataSync: Polling already active');
      return;
    }

    console.log(`🔄 DataSync: Starting polling every ${intervalMs}ms`);
    
    this.isPolling = true;
    this.pollInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        // Only poll when tab is visible to save resources
        await this.refreshLectureData();
      }
    }, intervalMs);

    // Also refresh when tab becomes visible
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Stop polling for changes
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.isPolling = false;
    console.log('⏹️ DataSync: Polling stopped');
  }

  /**
   * Handle visibility change events
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.isPolling) {
      console.log('👁️ DataSync: Tab became visible, refreshing data...');
      this.refreshLectureData();
    }
  };

  /**
   * Add a callback to be called when data is refreshed
   */
  onRefresh(callback: () => void): void {
    this.refreshCallbacks.push(callback);
  }

  /**
   * Remove a refresh callback
   */
  offRefresh(callback: () => void): void {
    const index = this.refreshCallbacks.indexOf(callback);
    if (index > -1) {
      this.refreshCallbacks.splice(index, 1);
    }
  }

  /**
   * Force an immediate refresh (useful after database operations)
   */
  async forceRefresh(): Promise<boolean> {
    console.log('🔄 DataSync: Force refresh requested');
    return await this.refreshLectureData();
  }

  /**
   * Get current polling status
   */
  isPollingActive(): boolean {
    return this.isPolling;
  }
}

// Export singleton instance
export const dataSyncManager = DataSyncManager.getInstance();

/**
 * Hook for components to easily trigger refresh after operations
 */
export const useDataSync = () => {
  return {
    forceRefresh: () => dataSyncManager.forceRefresh(),
    isPolling: () => dataSyncManager.isPollingActive(),
    startPolling: (interval?: number) => dataSyncManager.startPolling(interval),
    stopPolling: () => dataSyncManager.stopPolling(),
    onRefresh: (callback: () => void) => dataSyncManager.onRefresh(callback),
    offRefresh: (callback: () => void) => dataSyncManager.offRefresh(callback),
  };
};