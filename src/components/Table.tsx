import React from "react";
import { WeekData } from "@/types";
import { Card, CardContent, Typography, Box, Divider } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "store/types";

interface TableProps {
  weeksData: WeekData[];
}

interface PersonTotals {
  FL: number;
  hours: number;
  wishedHours: number;
}

interface Totals {
  [person: string]: PersonTotals;
}

// Initialize a totals object with the proper structure
const initialTotals: Totals = {
  Mattias: { FL: 0, hours: 0, wishedHours: 0 },
  Albin: { FL: 0, hours: 0, wishedHours: 0 },
  David: { FL: 0, hours: 0, wishedHours: 0 },
};

const Table: React.FC<TableProps> = ({ weeksData }) => {
  // Calculate totals for FL, hours, and wishedHours using the correct typing

  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );

  const totals = lecturesData.reduce<Totals>(
    (acc, weekData: WeekData) => {
      Object.keys(acc).forEach((person) => {
        acc[person].FL += weekData.totals[person] ?? 0;
        acc[person].hours += weekData.totalHours[person] ?? 0;
        acc[person].wishedHours += weekData.wishedTotal[person] ?? 0;
      });
      return acc;
    },
    { ...initialTotals }
  );

  // Create a function to format the FL:h values
  const formatFLHours = (fl: number, hours: number, wished: number): string => {
    return `${fl}:${hours}:${wished}`;
  };

  return (
    <Box
      sx={{
        margin: "3rem 0",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "1rem",
      }}
    >
      {Object.entries(totals).map(([person, personTotals]) => (
        <Card key={person} sx={{ backgroundColor: "black", color: "white" }}>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ fontWeight: "bold", textAlign: "center" }}
            >
              {person}
            </Typography>
            <Divider sx={{ my: 1, backgroundColor: "white" }} />
            {lecturesData.map((weekData, index) => (
              <Typography key={`${weekData.week}-${index}`} variant="body2">
                <b>{weekData.week}</b> - FL:h:w -{" "}
                {formatFLHours(
                  weekData.totals[person] ?? 0,
                  weekData.totalHours[person] ?? 0,
                  weekData.wishedTotal[person] ?? 0
                )}
              </Typography>
            ))}
            <Divider sx={{ my: 1, backgroundColor: "white" }} />
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              Kursens total - FL:h:w -{" "}
              {formatFLHours(
                personTotals.FL,
                personTotals.hours,
                personTotals.wishedHours
              )}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default Table;
