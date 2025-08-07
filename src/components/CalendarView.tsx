import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "store/types";
import Lecture, { SubjectArea } from "types/lecture";
import { SUBJECT_AREAS } from "utils/subjectAreas";
import {
  Box,
  Chip,
  Divider,
  Paper,
  Typography,
  Tooltip as MuiTooltip,
  Button,
} from "@material-ui/core";
import { makeStyles, createStyles, Theme } from "@material-ui/core/styles";
import { useRouter } from "next/router";

type FlatLecture = Lecture & { course?: string };

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: theme.spacing(3),
    },
    header: {
      marginBottom: theme.spacing(2),
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing(2),
      flexWrap: "wrap" as const,
    },
    filtersRow: {
      display: "flex",
      gap: theme.spacing(1),
      flexWrap: "wrap" as const,
      marginBottom: theme.spacing(2),
    },
    daySection: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(3),
    },
    dayHeader: {
      margin: theme.spacing(1, 0),
      color: "white",
    },
    lectureItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      border: "1px solid #404040",
      borderRadius: 10,
      padding: theme.spacing(1.5),
      marginBottom: theme.spacing(1),
      background: "linear-gradient(135deg, rgba(44,44,44,0.9), rgba(26,26,26,0.9))",
      cursor: "pointer",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
      },
    },
    nextHighlight: {
      border: "2px solid #90caf9",
      boxShadow: "0 0 0 3px rgba(144,202,249,0.2)",
    },
    leftMeta: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.5),
    },
    time: {
      color: "#ccc",
      fontWeight: 600,
      minWidth: 80,
    },
    title: {
      color: "white",
      fontWeight: 500,
    },
    tags: {
      display: "flex",
      gap: theme.spacing(1),
      flexWrap: "wrap" as const,
    },
    legend: {
      display: "flex",
      gap: theme.spacing(2),
      alignItems: "center",
      flexWrap: "wrap" as const,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      display: "inline-block",
      marginRight: theme.spacing(1),
    },
  })
);

function mapUserNameToPerson(fullName: string | undefined): string | null {
  if (!fullName) return null;
  const nameLower = fullName.toLowerCase();
  if (nameLower.includes("dronnlid")) return "David";
  const first = fullName.split(" ")[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function formatSvDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekday = d
    .toLocaleDateString("sv-SE", { weekday: "long" })
    .replace(/^(\w)/, (c) => c.toUpperCase());
  const date = d.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
  return `${weekday} ${date}`;
}

function getLectureStatusForPerson(
  lecture: Lecture,
  person: string | null
): "confirmed" | "unassigned" {
  if (!person) return "unassigned";
  const state = lecture.checkboxState?.[person];
  if (state?.confirm) return "confirmed";
  return "unassigned";
}

const PERSONS = ["Mattias", "Albin", "David"] as const;

export default function CalendarView() {
  const classes = useStyles();
  const router = useRouter();

  const { lectures: weekData } = useSelector((s: RootState) => s.lectures);
  const currentUser = useSelector((s: RootState) => s.auth.user);

  const me = mapUserNameToPerson(currentUser?.full_name);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const hasAutoScrolledRef = useRef<boolean>(false);

  const flatLectures: FlatLecture[] = useMemo(() => {
    return (weekData || []).flatMap((w) => (w.lectures || []).map((lec) => ({ ...lec, course: w.course })));
  }, [weekData]);

  // (Filters removed) – show only the active week

  // Only show lectures within the active week (Mon–Sun containing 'nowTs')
  const upcoming: FlatLecture[] = useMemo<FlatLecture[]>(() => {
    const now = new Date(nowTs);
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const diffToMonday = (day + 6) % 7; // days since Monday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    weekEnd.setMilliseconds(-1);

    return flatLectures.filter((l) => {
      const lectureDate = new Date(l.date);
      return lectureDate >= weekStart && lectureDate <= weekEnd;
    }) as FlatLecture[];
  }, [flatLectures, nowTs]);

  // No extra filtering – use week data directly
  const filtered: FlatLecture[] = useMemo<FlatLecture[]>(() => {
    return upcoming as FlatLecture[];
  }, [upcoming]);

  const byDay = useMemo(() => {
    const map = new Map<string, FlatLecture[]>();
    filtered
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((lec) => {
        const key = lec.date;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(lec);
      });
    return Array.from(map.entries());
  }, [filtered]);

  const nextUpcoming: { id: string; ts: number } | null = useMemo<{ id: string; ts: number } | null>(() => {
    let best: { id: string; ts: number } | null = null;
    const now = new Date(nowTs).getTime();
    (filtered as FlatLecture[]).forEach((l: FlatLecture) => {
      const [startStr] = (l.time || "").split("-");
      const [h, m] = (startStr || "").split(":").map((n: string) => parseInt(n, 10));
      const d = new Date(l.date);
      d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
      const ts = d.getTime();
      if (ts >= now) {
        if (!best || ts < best.ts) best = { id: l.id, ts };
      }
    });
    return best as { id: string; ts: number } | null;
  }, [filtered, nowTs]);

  const nextUpcomingLectureId: string | null = nextUpcoming ? nextUpcoming.id : null;

  // Real-time clock tick (every minute)
  useEffect(() => {
    const i = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  // Auto-scroll to next upcoming once on mount
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    if (!nextUpcomingLectureId) return;
    const el = document.getElementById(`calendar-lecture-${nextUpcomingLectureId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      hasAutoScrolledRef.current = true;
    }
  }, [nextUpcomingLectureId]);

  const statusColor = (status: "confirmed" | "unassigned") => {
    switch (status) {
      case "confirmed":
        return "#2e7d32"; // green
      default:
        return "#757575"; // grey
    }
  };

  // Overall status: if anyone confirmed -> green; else grey
  const getOverallStatus = (lecture: Lecture): "confirmed" | "unassigned" => {
    for (const p of PERSONS) {
      const st = getLectureStatusForPerson(lecture, p);
      if (st === "confirmed") return "confirmed";
    }
    return "unassigned";
  };

  // (Filter handlers removed)

  const navigateToLecture = (lectureId: string) => {
    router.push(`/#lecture-${lectureId}`);
  };

  return (
    <Box className={classes.container}>
      <Box className={classes.header}>
        <Typography variant="h5" style={{ color: "white", fontWeight: 700 }}>
          Kalender
        </Typography>
        <Box className={classes.legend}>
          <span className={classes.statusDot} style={{ background: statusColor("confirmed") }} />
          <Typography variant="body2" style={{ color: "#ccc" }}>Bekräftad</Typography>
          <span className={classes.statusDot} style={{ background: statusColor("unassigned") }} />
          <Typography variant="body2" style={{ color: "#ccc" }}>Oassignerad</Typography>
        </Box>
      </Box>

      {/* Filters removed */}

      <Divider style={{ borderColor: "#404040", margin: "8px 0 16px" }} />

      {/* Agenda list grouped by day */}
      {byDay.map(([date, lectures]) => (
        <Box key={date} className={classes.daySection}>
          <Typography variant="h6" className={classes.dayHeader}>
            {formatSvDate(date)}
          </Typography>
          {lectures
            .slice()
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((lec) => {
              const dotColor = statusColor(getOverallStatus(lec));
              const [start] = lec.time.split("-");
              return (
                <Paper
                  key={lec.id}
                  id={`calendar-lecture-${lec.id}`}
                  className={`${classes.lectureItem} ${nextUpcomingLectureId === lec.id ? classes.nextHighlight : ""}`}
                  onClick={() => navigateToLecture(lec.id)}
                >
                  <Box className={classes.leftMeta}>
                    <span className={classes.statusDot} style={{ background: dotColor }} />
                    <Typography variant="body2" className={classes.time}>
                      {start}
                    </Typography>
                    <Typography variant="body1" className={classes.title}>
                      {lec.lectureNumber}. {lec.title}
                    </Typography>
                  </Box>
                  <Box className={classes.tags}>
                    {/* Who selected so far (per person) */}
                    {PERSONS.map((p) => {
                      const st = getLectureStatusForPerson(lec, p);
                      const bg = statusColor(st);
                      const textColor = st === "unassigned" ? "#eee" : "#fff";
                      return (
                        <Chip
                          key={`${lec.id}-${p}`}
                          size="small"
                          label={p.charAt(0)}
                          style={{ backgroundColor: bg, color: textColor }}
                        />
                      );
                    })}
                    {lec.subjectArea && (
                      <Chip size="small" label={lec.subjectArea} style={{ color: "white" }} />
                    )}
                    {lec.course && (
                      <Chip size="small" label={lec.course} style={{ color: "white" }} />
                    )}
                  </Box>
                </Paper>
              );
            })}
        </Box>
      ))}
      {byDay.length === 0 && (
        <Typography variant="body2" style={{ color: "#aaa" }}>
          Inga föreläsningar matchar dina filter.
        </Typography>
      )}
    </Box>
  );
}


