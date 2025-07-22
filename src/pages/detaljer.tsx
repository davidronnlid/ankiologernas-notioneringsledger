import { useSelector } from "react-redux";
import { RootState } from "../store/types";
import Layout from "@/components/Layout";
import LectureTitle from "@/components/LectureTitle";
import { WeekData } from "@/types";
import Table from "@/components/Table";
import { Button, CircularProgress, Typography } from "@material-ui/core";
import React from "react";
import Link from "next/link";
import FlashOnSharpIcon from "@mui/icons-material/FlashOnSharp";
import { coursePeriods } from "utils/coursePeriods";

const courseTitle = "Klinisk medicin 4";

export default function Detaljer() {
  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );
  const isLoading = !lecturesData || lecturesData.length === 0;

  // Only show weeks for Klinisk medicin 4
  const km4Weeks = lecturesData.filter(
    (weekData: WeekData) => weekData.course === courseTitle
  );

  return (
    <Layout>
      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "start",
            height: "80vh",
          }}
        >
          <CircularProgress />
        </div>
      ) : (
        <>
          <Typography
            variant="h4"
            style={{ marginBottom: "3rem" }}
            gutterBottom
          >
            {courseTitle}
            <Link href="/" passHref>
              <Button
                variant="contained"
                color="primary"
                style={{
                  background: "transparent",
                  boxShadow: "none",
                  color: "white",
                  width: "3rem",
                }}
              >
                <FlashOnSharpIcon />
              </Button>
            </Link>
          </Typography>

          {km4Weeks.map((weekData) => (
            <LectureTitle
              key={weekData.week}
              week={weekData.week}
              lectures={weekData.lectures}
            />
          ))}

          {/* Show the table for Klinisk medicin 4 */}
          <Table course={{ title: courseTitle, startDate: "", endDate: "" }} />
        </>
      )}
    </Layout>
  );
}
