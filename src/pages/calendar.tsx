import React from "react";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";

const CalendarView = dynamic(() => import("@/components/CalendarView"), {
  ssr: false,
});

export default function CalendarPage() {
  return (
    <Layout title="Kalender" description="Agenda med filter" keywords="kalender, agenda, föreläsningar">
      <CalendarView />
    </Layout>
  );
}


