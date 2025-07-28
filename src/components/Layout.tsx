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
import { sortLecturesIntoCoursesAndWeeks } from "utils/processLectures";

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
      console.log("🚀 ~ file: Layout.tsx ~ fetchDataAndDispatch ~ data:", data);

      // Handle different data structures for development vs production
      if (data && !data.error) {
        let processedData;

        if (process.env.NODE_ENV === "development" && data.lectures) {
          // Development mode - data comes directly as lectures array
          console.log("📊 Loading development mock data for David Rönnlid");
          processedData = data.lectures;
        } else if (data.events) {
          // Production mode - data comes as events that need processing
          processedData = sortLecturesIntoCoursesAndWeeks(
            data.events,
            currentDate
          );
        }

        if (processedData) {
          console.log(
            "🚀 ~ file: Layout.tsx ~ fetchDataAndDispatch ~ processedData:",
            processedData
          );
          dispatch(setLectures(processedData));
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
