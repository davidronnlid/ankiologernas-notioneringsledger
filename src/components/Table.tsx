import React, { useMemo } from "react";
import { WeekData } from "@/types";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  LinearProgress,
} from "@mui/material";
import { useSelector } from "react-redux";
import { Course } from "types/course";
import {
  calculateTotalCourseHours,
  selectLecturesForCourse,
} from "utils/processLectures";
import { RootState } from "store/types";

interface PersonTotals {
  FL: number;
  hours: number;
  wishedHours: number;
}

interface Totals {
  [person: string]: PersonTotals;
}

interface TableProps {
  course: Course;
}

const Table: React.FC<TableProps> = ({ course }) => {
  const filteredLecturesData = useSelector((state: RootState) =>
    selectLecturesForCourse(state, course)
  );

  const totals = useMemo(() => {
    const initialTotals: Totals = {
      Mattias: { FL: 0, hours: 0, wishedHours: 0 },
      Albin: { FL: 0, hours: 0, wishedHours: 0 },
      David: { FL: 0, hours: 0, wishedHours: 0 },
    };
    return filteredLecturesData.reduce<Totals>(
      (acc, weekData: WeekData) => {
        const newAcc = { ...acc };
        Object.keys(acc).forEach((person) => {
          newAcc[person].FL += weekData.totals[person] ?? 0;
          newAcc[person].hours += weekData.totalHours[person] ?? 0;
          newAcc[person].wishedHours += weekData.wishedTotal[person] ?? 0;
        });
        return newAcc;
      },
      { ...initialTotals }
    );
  }, [filteredLecturesData]);

  const totalCourseHours = calculateTotalCourseHours(filteredLecturesData);

  const formatFLHours = (fl: number): string => {
    return `${fl}`;
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
      {Object.entries(totals).map(([person, personTotals]) => {
        const goal = totalCourseHours / 3;
        const progress = (personTotals.hours / goal) * 100;

        return (
          <Card
            key={person}
            sx={{ backgroundColor: "black", color: "white", padding: "1rem" }}
          >
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontWeight: "bold", textAlign: "center" }}
              >
                {person}
              </Typography>
              <Divider sx={{ my: 1, backgroundColor: "white" }} />

              {/* Display weekly data only for the current person */}
              {filteredLecturesData.map((weekData, index) => (
                <Typography key={`${weekData.week}-${index}`} variant="body2">
                  <b>{weekData.week}</b> - FL:h -{" "}
                  {formatFLHours(weekData.totals[person] ?? 0)}
                </Typography>
              ))}

              <Divider sx={{ my: 1, backgroundColor: "white" }} />
              <Typography variant="body2">
                Föreläsningar: {personTotals.FL}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                Timmar: {personTotals.hours}
              </Typography>
              <Typography variant="body2" sx={{ marginBottom: "1rem" }}>
                Mål för terminen: {goal} timmar
              </Typography>

              <LinearProgress
                variant="determinate"
                value={Math.min(progress, 100)}
                sx={{
                  height: "10px",
                  borderRadius: "5px",
                  backgroundColor: "#333",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor:
                      progress >= 100
                        ? "lightgreen"
                        : progress > 50
                        ? "gold"
                        : "red",
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: "center",
                  marginTop: "0.5rem",
                }}
              >
                Progress: {Math.round(progress)}%
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default Table;
