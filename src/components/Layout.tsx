import Head from "next/head";
import React from "react";

import { Box, Container } from "@material-ui/core";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { LayoutProps } from "@/types";

import { setLectures } from "store/slices/lecturesReducer";

import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { RootState } from "store/types";
import { removeDuplicateLectures, logDuplicateStats } from "utils/removeDuplicateLectures";
import { sortLecturesIntoCoursesAndWeeks } from "utils/processLectures";
import { dataSyncManager } from "utils/dataSync";
import { CheckboxState } from "types/lecture";
import { WeekData } from "types";
import { initializeDevelopmentUser } from "../store/slices/authReducer";
import { syncAllLecturesToNotionPages } from "utils/notionCRUD";

export default function Layout({
  title = "Ankiologernas Notioneringsledger",
  description = "Ankiologernas Notioneringsledger",
  keywords = "Ankiologernas Notioneringsledger",
  children,
}: LayoutProps) {
    const dispatch = useDispatch();
  
  // Use consistent date initialization to prevent hydration mismatches
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  
  useEffect(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0); // Set time to midnight for correct date comparison
    setCurrentDate(date);
  }, []);

  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );

  // Initialize default checkbox state for lectures that don't have it
  const initializeCheckboxState = (data: WeekData[]): WeekData[] => {
    const defaultCheckboxState: CheckboxState = {
      Mattias: { confirm: false, unwish: false },
      Albin: { confirm: false, unwish: false },
      David: { confirm: false, unwish: false },
    };

    return data.map((week: WeekData) => ({
      ...week,
      lectures: week.lectures.map((lecture: any) => ({
        ...lecture,
        checkboxState: lecture.checkboxState || defaultCheckboxState
      }))
    }));
  };

  useEffect(() => {
    try {
      // Initialize DataSyncManager with dispatch
      dataSyncManager.init(dispatch);
      
      // Initialize development user safely on client-side
      if (typeof window !== 'undefined' && process.env.NODE_ENV === "development") {
        dispatch(initializeDevelopmentUser());
      }
      
      // Initial data fetch if no data exists
      if (lecturesData.length === 0) {
        fetchDataAndDispatch();
      }
      
      // Start polling for real-time updates (every 30 seconds)
      // Only in production to avoid unnecessary API calls during development
      if (typeof window !== 'undefined' && process.env.NODE_ENV === "production") {
        dataSyncManager.startPolling(30000);
      }
      

      
      // Cleanup on unmount
      return () => {
        if (typeof window !== 'undefined' && process.env.NODE_ENV === "production") {
          dataSyncManager.stopPolling();
        }
      };
    } catch (error) {
      console.error('❌ Layout useEffect error:', error);
    }
  }, [dispatch]);

  // Separate effect for checking if data needs to be loaded
  useEffect(() => {
    try {
      if (lecturesData.length === 0) {
        fetchDataAndDispatch();
      } else {
        // If data already exists, also trigger auto-sync to ensure Notion is up to date
        console.log('📊 Data already exists, triggering auto-sync to ensure Notion is up to date');
        setTimeout(() => {
          triggerAutoNotionSync(lecturesData);
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Layout data loading error:', error);
    }
  }, [lecturesData.length]);

  // Auto-sync function to sync all lectures to Notion databases when app loads
  const triggerAutoNotionSync = async (lectureData: WeekData[]) => {
    try {
      console.log('🚀 Starting auto-sync of lectures to Notion databases...');
      
      // Extract all lectures from the week data
      const allLectures = lectureData.flatMap(week => week.lectures);
      
      if (allLectures.length === 0) {
        console.log('📝 No lectures to sync');
        return;
      }

      console.log(`📊 Found ${allLectures.length} lectures to sync to Notion`);
      console.log('📋 Sample lectures:', allLectures.slice(0, 3).map(l => ({ 
        title: l.title, 
        number: l.lectureNumber,
        date: l.date
      })));

      // Test endpoint availability first
      const endpoint = process.env.NODE_ENV === 'development'
        ? '/api/updateNotionPage'
        : '/.netlify/functions/updateNotionPage';
        
      console.log(`🎯 Using endpoint: ${endpoint}`);

      // Sync all lectures to Notion databases using bulk_add action
      const result = await syncAllLecturesToNotionPages(allLectures);
      
      if (result.success) {
        console.log(`✅ Auto-sync completed successfully: ${result.message}`);
        console.log(`📊 Results summary:`, result.results?.slice(0, 5));
      } else {
        console.log(`⚠️ Auto-sync had issues: ${result.message}`);
        console.log(`📊 Error details:`, result.results?.slice(0, 5));
      }
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
      // Don't throw - we don't want to break the app if Notion sync fails
    }
  };

  const fetchDataAndDispatch = async () => {
    const apiUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL || "/api"
        : "/.netlify";

    try {
      const response = await fetch(`${apiUrl}/functions/CRUDFLData`);
      const data = await response.json();
      
      console.log("🌐 Layout: API response status:", response.status);
      console.log("🌐 Layout: API response data:", data);

      // Handle different data structures for development vs production
      if (data && !data.error) {
        let processedData;

        if (process.env.NODE_ENV === "development" && data.lectures) {
          // Development mode - data comes already grouped as week data
          console.log("Development mode: Using pre-grouped lecture data");
          console.log("🔍 Checking lecture data for checkbox states:", data.lectures);
          processedData = data.lectures; // Already in the correct format
        } else if (data.events) {
          // Production mode - data comes as events that need processing
          console.log("Production mode: Processing events into lectures");
          console.log("🔍 Checking events for checkbox states:", data.events.slice(0, 3));
          
          // Log some sample checkbox states
          const eventsWithCheckbox = data.events.filter((event: any) => event.checkboxState);
          console.log(`📊 Found ${eventsWithCheckbox.length} events with checkbox states out of ${data.events.length} total`);
          if (eventsWithCheckbox.length > 0) {
            console.log("📋 Sample checkbox state:", eventsWithCheckbox[0].checkboxState);
          }
          
          processedData = sortLecturesIntoCoursesAndWeeks(
            data.events,
            currentDate || new Date()
          );
        }

        if (processedData) {
          console.log("📊 Layout: Processed data length:", processedData.length);
          console.log("📊 Layout: Processed data:", processedData);
          
          // Check checkbox states in processed data
          const lecturesWithCheckbox = processedData.flatMap((week: WeekData) => week.lectures).filter((lecture: any) => lecture.checkboxState);
          console.log(`📊 After processing: Found ${lecturesWithCheckbox.length} lectures with checkbox states`);
          if (lecturesWithCheckbox.length > 0) {
            console.log("📋 Sample processed checkbox state:", lecturesWithCheckbox[0].checkboxState);
          }
          
          // Remove duplicate lectures
          const { cleanedData, removedDuplicates } = removeDuplicateLectures(processedData);
          logDuplicateStats(processedData, cleanedData);
          
          console.log("🧹 Layout: Cleaned data length:", cleanedData.length);
          console.log("🧹 Layout: Cleaned data:", cleanedData);
          
          // Initialize checkbox states for all lectures
          const dataWithCheckboxStates = initializeCheckboxState(cleanedData);
          console.log("🔲 Layout: Initialized checkbox states for all lectures");
          
          // Check final checkbox states before Redux dispatch
          const finalLecturesWithCheckbox = dataWithCheckboxStates.flatMap((week: WeekData) => week.lectures).filter((lecture: any) => lecture.checkboxState);
          console.log(`📊 Final data: Found ${finalLecturesWithCheckbox.length} lectures with checkbox states`);
          
          // Store removed duplicates for notification
          if (removedDuplicates.length > 0) {
            if (typeof window !== 'undefined') {
        localStorage.setItem('removedDuplicates', JSON.stringify(removedDuplicates));
      }
          }
          
          dispatch(setLectures(dataWithCheckboxStates));
          console.log("✅ Layout: Data dispatched to Redux!");
          
          // Auto-sync all lectures to Notion databases after a small delay to ensure state is set
          setTimeout(() => {
            console.log("🎯 Triggering auto-sync to Notion databases...");
            triggerAutoNotionSync(dataWithCheckboxStates);
          }, 1000);
        } else {
          console.log("❌ Layout: No processed data to dispatch");
        }
      } else if (data.message) {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Error fetching lecture data:", error);
    }
  };

  return (
    <div style={{ background: "#302e32", color: "white" }}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="icon" href="/images/logo.png" />
      </Head>
      <Header />

      <Box my={5}>
        <Container maxWidth="lg">
          {children ? children : <div />}
        </Container>
      </Box>
      <Footer />
    </div>
  );
}
