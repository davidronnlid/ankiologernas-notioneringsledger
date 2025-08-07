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
): "confirmed" | "unwish" | "unassigned" {
  if (!person) return "unassigned";
  const state = lecture.checkboxState?.[person];
  if (state?.confirm) return "confirmed";
  if (state?.unwish) return "unwish";
  return "unassigned";
}

const PERSONS = ["Mattias", "Albin", "David"] as const;

export default function CalendarView() {
  const classes = useStyles();
  const router = useRouter();

  const { lectures: weekData } = useSelector((s: RootState) => s.lectures);
  const currentUser = useSelector((s: RootState) => s.auth.user);

  const me = mapUserNameToPerson(currentUser?.full_name);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(me);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<SubjectArea>>(new Set());
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const hasAutoScrolledRef = useRef<boolean>(false);

  const flatLectures: FlatLecture[] = useMemo(() => {
    return (weekData || []).flatMap((w) => (w.lectures || []).map((lec) => ({ ...lec, course: w.course })));
  }, [weekData]);

  // Unique values available for filters
  const availableSubjects = useMemo(() => {
    const present = new Set<SubjectArea>();
    flatLectures.forEach((l) => {
      if (l.subjectArea) present.add(l.subjectArea);
    });
    return SUBJECT_AREAS.filter((s) => present.has(s));
  }, [flatLectures]);

  const availableCourses = useMemo(() => {
    const s = new Set<string>();
    flatLectures.forEach((l) => {
      if (l.course) s.add(l.course);
    });
    return Array.from(s);
  }, [flatLectures]);

  // Only show lectures within the active week (Mon–Sun containing 'nowTs')
  const upcoming = useMemo(() => {
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
    });
  }, [flatLectures, nowTs]);

  const filtered = useMemo(() => {
    return upcoming.filter((l) => {
      const subjectOk = selectedSubjects.size === 0 || (l.subjectArea && selectedSubjects.has(l.subjectArea));
      const courseOk = selectedCourses.size === 0 || (l.course && selectedCourses.has(l.course));
      return subjectOk && courseOk;
    });
  }, [upcoming, selectedSubjects, selectedCourses]);

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

  const nextUpcomingLectureId = useMemo(() => {
    // Find the lecture with the earliest start time among filtered that is >= now
    let best: { id: string; ts: number } | null = null;
    const now = new Date(nowTs).getTime();
    (filtered as FlatLecture[]).forEach((l) => {
      const [startStr] = (l.time || "").split("-");
      const [h, m] = (startStr || "").split(":").map((n: string) => parseInt(n, 10));
      const d = new Date(l.date);
      d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
      const ts = d.getTime();
      if (ts >= now) {
        if (!best || ts < best.ts) best = { id: l.id, ts };
      }
    });
    return best?.id || null;
  }, [filtered, nowTs]);

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

  const statusColor = (status: "confirmed" | "unwish" | "unassigned") => {
    switch (status) {
      case "confirmed":
        return "#2e7d32"; // green
      case "unwish":
        return "#c62828"; // red
      default:
        return "#757575"; // grey
    }
  };

  const toggleSubject = (s: SubjectArea) => {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleCourse = (c: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

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
          <Typography variant="body2" style={{ color: "#ccc" }}>Vald person: Bekräftad</Typography>
          <span className={classes.statusDot} style={{ background: statusColor("unwish") }} />
          <Typography variant="body2" style={{ color: "#ccc" }}>Vald person: Unwish</Typography>
          <span className={classes.statusDot} style={{ background: statusColor("unassigned") }} />
          <Typography variant="body2" style={{ color: "#ccc" }}>Vald person: Oassignerad</Typography>
        </Box>
      </Box>

      {/* Person filter */}
      <Box className={classes.filtersRow}>
        {PERSONS.map((p) => (
          <Chip
            key={p}
            label={p === me ? `${p} (Jag)` : p}
            color={selectedPerson === p ? "primary" : undefined}
            onClick={() => setSelectedPerson(p)}
            style={{ color: "white" }}
          />
        ))}
        <Chip
          label="Visa utan person"
          onClick={() => setSelectedPerson(null)}
          variant={selectedPerson === null ? "default" : "outlined"}
          style={{ color: "#ccc" }}
        />
      </Box>

      {/* Subject filters */}
      {availableSubjects.length > 0 && (
        <Box className={classes.filtersRow}>
          <MuiTooltip title="Filtrera ämnen">
            <Typography variant="subtitle2" style={{ color: "#ccc" }}>
              Ämnen:
            </Typography>
          </MuiTooltip>
          {availableSubjects.map((s) => (
            <Chip
              key={s}
              label={s}
              onClick={() => toggleSubject(s)}
              color={selectedSubjects.has(s) ? "primary" : undefined}
              style={{ color: "white" }}
            />
          ))}
          {selectedSubjects.size > 0 && (
            <Button onClick={() => setSelectedSubjects(new Set())} size="small" style={{ color: "#ccc" }}>
              Rensa ämnen
            </Button>
          )}
        </Box>
      )}

      {/* Course filters */}
      {availableCourses.length > 0 && (
        <Box className={classes.filtersRow}>
          <MuiTooltip title="Filtrera kurs">
            <Typography variant="subtitle2" style={{ color: "#ccc" }}>
              Kurs:
            </Typography>
          </MuiTooltip>
          {availableCourses.map((c) => (
            <Chip
              key={c}
              label={c}
              onClick={() => toggleCourse(c)}
              color={selectedCourses.has(c) ? "primary" : undefined}
              style={{ color: "white" }}
            />
          ))}
          {selectedCourses.size > 0 && (
            <Button onClick={() => setSelectedCourses(new Set())} size="small" style={{ color: "#ccc" }}>
              Rensa kurser
            </Button>
          )}
        </Box>
      )}

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
              const status = getLectureStatusForPerson(lec, selectedPerson);
              const dotColor = statusColor(status);
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


