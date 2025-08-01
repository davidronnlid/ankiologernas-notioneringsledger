import Head from "next/head";
import React from "react";

import { Box, Container } from "@material-ui/core";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { LayoutProps } from "@/types";

import { setLectures } from "store/slices/lecturesReducer";

import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { RootState } from "store/types";
import { removeDuplicateLectures, logDuplicateStats } from "utils/removeDuplicateLectures";
import { sortLecturesIntoCoursesAndWeeks } from "utils/processLectures";
import { dataSyncManager } from "utils/dataSync";
import { DatabaseNotifications } from "utils/notificationSystem";

export default function Layout({
  title = "Ankiologernas Notioneringsledger",
  description = "Ankiologernas Notioneringsledger",
  keywords = "Ankiologernas Notioneringsledger",
  children,
}: LayoutProps) {
    const dispatch = useDispatch();
  
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set time to midnight for correct date comparison

  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );

  useEffect(() => {
    // Initialize DataSyncManager with dispatch
    dataSyncManager.init(dispatch);
    
    // Initial data fetch if no data exists
    if (lecturesData.length === 0) {
      fetchDataAndDispatch();
    }
    
    // Start polling for real-time updates (every 30 seconds)
    // Only in production to avoid unnecessary API calls during development
    if (process.env.NODE_ENV === "production") {
      dataSyncManager.startPolling(30000);
    }
    
    // Check for uniqueness results and show notifications
    const checkUniquenessResults = () => {
      const uniquenessResult = localStorage.getItem('lectureUniquenessResult');
      if (uniquenessResult) {
        try {
          const result = JSON.parse(uniquenessResult);
          const timeSinceCheck = Date.now() - result.timestamp;
          
          // Only show notification if the check was recent (within last 10 seconds)
          if (timeSinceCheck < 10000) {
            if (result.removedLecturesCount > 0) {
              DatabaseNotifications.duplicatesRemoved(
                result.removedLecturesCount,
                result.duplicateGroupsCount
              );
            } else {
              DatabaseNotifications.uniquenessCheckComplete();
            }
            
            // Clear the result so we don't show it again
            localStorage.removeItem('lectureUniquenessResult');
          }
        } catch (error) {
          console.error('Error parsing uniqueness result:', error);
        }
      }
    };

    // Check for uniqueness results after a brief delay to allow data loading
    const checkTimer = setTimeout(checkUniquenessResults, 2000);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(checkTimer);
      if (process.env.NODE_ENV === "production") {
        dataSyncManager.stopPolling();
      }
    };
  }, [dispatch]);

  // Separate effect for checking if data needs to be loaded
  useEffect(() => {
    if (lecturesData.length === 0) {
      fetchDataAndDispatch();
    }
  }, [lecturesData.length]);

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
          processedData = data.lectures; // Already in the correct format
        } else if (data.events) {
          // Production mode - data comes as events that need processing
          processedData = sortLecturesIntoCoursesAndWeeks(
            data.events,
            currentDate
          );
        }

        if (processedData) {
          console.log("📊 Layout: Processed data length:", processedData.length);
          console.log("📊 Layout: Processed data:", processedData);
          
          // Remove duplicate lectures
          const { cleanedData, removedDuplicates } = removeDuplicateLectures(processedData);
          logDuplicateStats(processedData, cleanedData);
          
          console.log("🧹 Layout: Cleaned data length:", cleanedData.length);
          console.log("🧹 Layout: Cleaned data:", cleanedData);
          
          // Store removed duplicates for notification
          if (removedDuplicates.length > 0) {
            localStorage.setItem('removedDuplicates', JSON.stringify(removedDuplicates));
          }
          
          dispatch(setLectures(cleanedData));
          console.log("✅ Layout: Data dispatched to Redux!");
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
