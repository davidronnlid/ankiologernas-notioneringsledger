import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { useSelector } from 'react-redux';
import { RootState } from 'store/types';
import { Box, Chip, IconButton, InputAdornment, MenuItem, Paper, Select, TextField, Typography, Button } from '@material-ui/core';
import NotifyButton from '@/components/NotifyButton';
import Lecture from 'types/lecture';
import { addDays, endOfWeek, format, isAfter, isBefore, isSameWeek, parseISO, startOfWeek } from 'date-fns';
import { sv } from 'date-fns/locale';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import { coursePeriods } from 'utils/coursePeriods';

// A simple Pomodoro timer with adjustable study/rest durations
function usePomodoro(defaultStudyMin: number = 25, defaultRestMin: number = 5) {
  const [studyMinutes, setStudyMinutes] = useState(defaultStudyMin);
  const [restMinutes, setRestMinutes] = useState(defaultRestMin);
  const [isStudy, setIsStudy] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(studyMinutes * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset seconds when lengths change if currently at the beginning of a phase
  useEffect(() => {
    if (!running) {
      setSecondsLeft((isStudy ? studyMinutes : restMinutes) * 60);
    }
  }, [studyMinutes, restMinutes]);

  useEffect(() => {
    if (!running) return; 
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // switch phase
          const nextIsStudy = !isStudy;
          setIsStudy(nextIsStudy);
          return (nextIsStudy ? studyMinutes : restMinutes) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, isStudy, studyMinutes, restMinutes]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setIsStudy(true);
    setSecondsLeft(studyMinutes * 60);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return {
    studyMinutes, setStudyMinutes,
    restMinutes, setRestMinutes,
    isStudy, secondsLeft, mm, ss,
    running, toggle, reset,
  };
}

export default function StudyDashboardPage() {
  const { studyMinutes, setStudyMinutes, restMinutes, setRestMinutes, isStudy, mm, ss, running, toggle, reset } = usePomodoro(25, 5);
  const weeks = useSelector((s: RootState) => s.lectures.lectures);
  const currentUser = useSelector((s: RootState) => s.auth.user);

  // Map full name to first name used in checkboxState
  const personName = useMemo(() => {
    const full = currentUser?.full_name || '';
    if (!full) return '';
    const first = full.split(' ')[0];
    const low = first.toLowerCase();
    if (low.includes('dronnlid')) return 'David';
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }, [currentUser]);

  // Build lecture list for last/coming weeks or whole course where this user selected (confirm=true)
  const [query, setQuery] = useState('');
  const [weeksBack, setWeeksBack] = useState<number>(1);
  const [weeksForward, setWeeksForward] = useState<number>(3);
  const [scope, setScope] = useState<'custom' | 'course'>('custom');

  const now = new Date();
  const activeCourse = useMemo(() => {
    return coursePeriods.find((c) => {
      const s = parseISO(c.startDate);
      const e = parseISO(c.endDate);
      return (isAfter(now, s) || isSameWeek(now, s, { weekStartsOn: 1 })) && (isBefore(now, e) || isSameWeek(now, e, { weekStartsOn: 1 }));
    });
  }, [now]);

  const { start, end } = useMemo(() => {
    if (scope === 'course' && activeCourse) {
      return {
        start: startOfWeek(parseISO(activeCourse.startDate), { weekStartsOn: 1 }),
        end: endOfWeek(parseISO(activeCourse.endDate), { weekStartsOn: 1 })
      };
    }
    return {
      start: startOfWeek(addDays(now, -weeksBack * 7), { weekStartsOn: 1 }),
      end: endOfWeek(addDays(now, weeksForward * 7), { weekStartsOn: 1 })
    };
  }, [scope, activeCourse, weeksBack, weeksForward, now]);

  const selectedLectures = useMemo(() => {
    const results: { id: string; title: string; date: string; time?: string; weekLabel: string }[] = [];
    weeks.forEach((w) => {
      (w.lectures || []).forEach((lec: any) => {
        const ts = parseISO(lec.date);
        if ((isAfter(ts, start) || isSameWeek(ts, start, { weekStartsOn: 1 })) && (isBefore(ts, end) || isSameWeek(ts, end, { weekStartsOn: 1 }))) {
          // Include ALL lectures within the interval so prod users can always filter & select
          const weekLabel = format(startOfWeek(ts, { weekStartsOn: 1 }), 'EEEE d MMMM', { locale: sv });
          results.push({ id: lec.id, title: `${lec.lectureNumber}. ${lec.title}`, date: lec.date, time: lec.time, weekLabel });
        }
      });
    });
    // filter by query
    const q = query.trim().toLowerCase();
    return results
      .filter((r) => !q || r.title.toLowerCase().includes(q))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [weeks, personName, start, end, query]);

  // Temporary selection: choose one lecture to attribute study time to
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null);

  // Time tracking per lecture (localStorage persistence)
  const [tracked, setTracked] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('studyTimeByLecture');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try { localStorage.setItem('studyTimeByLecture', JSON.stringify(tracked)); } catch {}
  }, [tracked]);

  // Accumulate time while timer is running in study mode for the selected lecture
  useEffect(() => {
    if (!running || !isStudy || !selectedLectureId) return;
    const iv = setInterval(() => {
      setTracked((prev) => ({ ...prev, [selectedLectureId]: (prev[selectedLectureId] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(iv);
  }, [running, isStudy, selectedLectureId]);

  // Manual tracking additions
  const [manualMinutes, setManualMinutes] = useState<number>(5);
  const addManualTime = () => {
    if (!selectedLectureId) return;
    const addSec = Math.max(0, Math.round((Number(manualMinutes) || 0) * 60));
    if (addSec === 0) return;
    setTracked((prev) => ({ ...prev, [selectedLectureId]: (prev[selectedLectureId] || 0) + addSec }));
  };

  // Summary across visible lectures
  const summary = useMemo(() => {
    const ids = selectedLectures.map((l) => l.id);
    let totalSec = 0;
    let nonZero = 0;
    ids.forEach((id) => {
      const sec = tracked[id] || 0;
      totalSec += sec;
      if (sec > 0) nonZero += 1;
    });
    const totalMin = Math.round(totalSec / 60);
    const totalHours = Math.round((totalSec / 3600) * 10) / 10;
    const avgMin = ids.length > 0 ? Math.round(totalMin / ids.length) : 0;
    return { totalMin, totalHours, avgMin, totalLectures: ids.length, nonZero };
  }, [tracked, selectedLectures]);

  return (
    <Layout title="Pomodoro" description="Pomodoro med Notion-spårning" keywords="pomodoro, notion, plan">
      <Box style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        {/* Pomodoro */}
        <Paper style={{ padding: 16, marginBottom: 16, background: '#2c2c2c', border: '1px solid #404040', borderRadius: 12 }}>
          <Typography variant="h5" style={{ color: 'white', marginBottom: 8 }}>Pomodoro</Typography>
          <Typography variant="body2" style={{ color: '#aaa', marginBottom: 12 }}>
            {isStudy ? 'Studera' : 'Vila'} — {mm}:{ss}
          </Typography>
          <Box display="flex" alignItems="center" gridGap={12 as any}>
            <IconButton onClick={toggle} style={{ color: 'white' }}>{running ? <PauseIcon/> : <PlayArrowIcon/>}</IconButton>
            <IconButton onClick={reset} style={{ color: 'white' }}><ReplayIcon/></IconButton>
            <TextField
              label="Studietid (min)"
              type="number"
              variant="outlined"
              value={studyMinutes}
              onChange={(e) => setStudyMinutes(Math.max(1, Number(e.target.value || 25)))}
              inputProps={{ min: 1 }}
              style={{ width: 160, marginLeft: 8, background: '#1f1f1f' }}
            />
            <TextField
              label="Vilotid (min)"
              type="number"
              variant="outlined"
              value={restMinutes}
              onChange={(e) => setRestMinutes(Math.max(1, Number(e.target.value || 5)))}
              inputProps={{ min: 1 }}
              style={{ width: 160, marginLeft: 8, background: '#1f1f1f' }}
            />
          </Box>

          {/* Manual addition */}
          <Box display="flex" alignItems="center" gridGap={12 as any} mt={2 as any}>
            <TextField
              label="Lägg till minuter manuellt"
              type="number"
              variant="outlined"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(Math.max(0, Number(e.target.value || 0)))}
              inputProps={{ min: 0 }}
              style={{ width: 220, background: '#1f1f1f' }}
            />
            <Button variant="contained" color="primary" onClick={addManualTime} disabled={!selectedLectureId}>
              Lägg till på vald föreläsning
            </Button>
          </Box>
        </Paper>

        {/* Filters */}
        <Box display="grid" gridTemplateColumns="1fr 160px 160px 180px" gridGap={8} style={{ marginBottom: 12 }}>
          <TextField
            variant="outlined"
            placeholder="Sök föreläsning…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon style={{ color: '#ccc' }}/></InputAdornment>) }}
            style={{ background: '#2c2c2c' }}
          />
          <Select value={scope} onChange={(e) => setScope(e.target.value as any)} variant="outlined" style={{ color: 'white', background: '#2c2c2c' }}>
            <MenuItem value="custom" style={{ color: 'white' }}>Anpassat intervall</MenuItem>
            <MenuItem value="course" style={{ color: 'white' }}>Hela kursen</MenuItem>
          </Select>
          <Select
            value={weeksBack}
            onChange={(e) => setWeeksBack(Number(e.target.value))}
            variant="outlined"
            disabled={scope === 'course'}
            style={{ color: 'white', background: '#2c2c2c' }}
          >
            {[0,1,2,3,4,6,8,12].map((n) => (<MenuItem key={n} value={n} style={{ color: 'white' }}>{n} v bakåt</MenuItem>))}
          </Select>
          <Select
            value={weeksForward}
            onChange={(e) => setWeeksForward(Number(e.target.value))}
            variant="outlined"
            disabled={scope === 'course'}
            style={{ color: 'white', background: '#2c2c2c' }}
          >
            {[0,1,2,3,4,6,8,12].map((n) => (<MenuItem key={n} value={n} style={{ color: 'white' }}>{n} v framåt</MenuItem>))}
          </Select>
        </Box>

        {/* Selected lectures list */}
        <Paper style={{ background: '#2c2c2c', border: '1px solid #404040', borderRadius: 12 }}>
          {selectedLectures.length === 0 ? (
            <Box p={2}><Typography style={{ color: '#ccc' }}>Inga valda föreläsningar inom intervallet.</Typography></Box>
          ) : (
            selectedLectures.map((lec) => (
              <Box key={lec.id} display="flex" alignItems="center" justifyContent="space-between" p={2} borderBottom="1px solid #333" onClick={() => setSelectedLectureId(lec.id)} style={{ cursor: 'pointer', background: selectedLectureId === lec.id ? '#313131' : undefined }}>
                <Box>
                  <Typography style={{ color: 'white' }}>{lec.title}</Typography>
                  <Typography variant="body2" style={{ color: '#aaa' }}>
                    {(() => {
                      const base = format(parseISO(lec.date), 'EEE d MMM', { locale: sv });
                      if (!lec.time) return base;
                      const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(lec.time.trim());
                      if (!m) return `${base} • ${lec.time}`;
                      const startH = Number(m[1]);
                      const startM = Number(m[2]);
                      const endH = Number(m[3]);
                      const endM = Number(m[4]);
                      const durationMin = (endH * 60 + endM) - (startH * 60 + startM);
                      const durationHours = Math.max(0, durationMin) / 60;
                      const durationText = `${Math.round(durationHours * 10) / 10} h`;
                      const spentSeconds = tracked[lec.id] || 0;
                      const spentHours = Math.round((spentSeconds / 3600) * 10) / 10;
                      return `${base} • ${durationText} • Notionerat ${spentHours}/${Math.round(durationHours * 10) / 10} h`;
                    })()}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gridGap={8 as any}>
                  {selectedLectureId === lec.id && (
                    <Chip label="spårar" size="small" style={{ background: '#64b5f6', color: 'white' }} />
                  )}
                  <Chip label={`Notionerat ${Math.floor((tracked[lec.id] || 0) / 60)} min`} size="small" style={{ background: '#424242', color: 'white' }} />
                  <Chip label="vald" size="small" style={{ background: '#4caf50', color: 'white' }} />
                  {/* Notify button matching the homepage feature */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <NotifyButton
                      lecture={{ ...(lec as any as Lecture) }}
                      allLectures={selectedLectures as any as Lecture[]}
                      onNotificationSent={() => { /* no-op */ }}
                    />
                  </div>
                </Box>
              </Box>
            ))
          )}
        </Paper>

        {/* Current selection summary under timer */}
        <Box mt={1}>
          {selectedLectureId && (
            <Typography variant="body2" style={{ color: '#9aa' }}>
              Spårar tid för föreläsning: {selectedLectures.find((l) => l.id === selectedLectureId)?.title || selectedLectureId} — totalt Notionerat {Math.floor((tracked[selectedLectureId] || 0) / 60)} min
            </Typography>
          )}
        </Box>

        {/* Overall Notionerat summary for visible lectures */}
        <Box mt={3}>
          <Paper style={{ padding: 16, background: '#2c2c2c', border: '1px solid #404040', borderRadius: 12 }}>
            <Typography variant="h6" style={{ color: 'white', marginBottom: 8 }}>Sammanfattning</Typography>
            <Typography variant="body2" style={{ color: '#ccc' }}>
              Totalt Notionerat: <strong>{summary.totalMin} min</strong> ({summary.totalHours} h)
            </Typography>
            <Typography variant="body2" style={{ color: '#ccc' }}>
              Genomsnitt per föreläsning: <strong>{summary.avgMin} min</strong> över {summary.totalLectures} föreläsningar ({summary.nonZero} med &gt; 0 min)
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Layout>
  );
}


