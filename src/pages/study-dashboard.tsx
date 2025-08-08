import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { useSelector } from 'react-redux';
import { RootState } from 'store/types';
import { Box, Chip, IconButton, InputAdornment, MenuItem, Paper, Select, TextField, Typography } from '@material-ui/core';
import { addDays, endOfWeek, format, isAfter, isBefore, isSameWeek, parseISO, startOfWeek } from 'date-fns';
import { sv } from 'date-fns/locale';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';

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

  // Build lecture list for last week and coming weeks where this user selected (confirm=true)
  const [query, setQuery] = useState('');
  const [rangeWeeks, setRangeWeeks] = useState<number>(3); // how many future weeks to show

  const now = new Date();
  const start = startOfWeek(addDays(now, -7), { weekStartsOn: 1 }); // last week Monday
  const end = endOfWeek(addDays(now, rangeWeeks * 7), { weekStartsOn: 1 }); // coming weeks

  const selectedLectures = useMemo(() => {
    const results: { id: string; title: string; date: string; time?: string; weekLabel: string }[] = [];
    weeks.forEach((w) => {
      (w.lectures || []).forEach((lec: any) => {
        const ts = parseISO(lec.date);
        if ((isAfter(ts, start) || isSameWeek(ts, start, { weekStartsOn: 1 })) && (isBefore(ts, end) || isSameWeek(ts, end, { weekStartsOn: 1 }))) {
          const isMine = personName && lec.checkboxState?.[personName]?.confirm;
          if (isMine) {
            const weekLabel = format(startOfWeek(ts, { weekStartsOn: 1 }), 'EEEE d MMMM', { locale: sv });
            results.push({ id: lec.id, title: `${lec.lectureNumber}. ${lec.title}`, date: lec.date, time: lec.time, weekLabel });
          }
        }
      });
    });
    // filter by query
    const q = query.trim().toLowerCase();
    return results
      .filter((r) => !q || r.title.toLowerCase().includes(q))
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [weeks, personName, start, end, query]);

  return (
    <Layout title="Studiepanel" description="Personlig studiepanel" keywords="studie, pomodoro, plan">
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
        </Paper>

        {/* Filters */}
        <Box display="grid" gridTemplateColumns="1fr 160px" gridGap={8} style={{ marginBottom: 12 }}>
          <TextField
            variant="outlined"
            placeholder="Sök föreläsning…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon style={{ color: '#ccc' }}/></InputAdornment>) }}
            style={{ background: '#2c2c2c' }}
          />
          <Select
            value={rangeWeeks}
            onChange={(e) => setRangeWeeks(Number(e.target.value))}
            variant="outlined"
            style={{ color: 'white', background: '#2c2c2c' }}
          >
            {[1,2,3,4,6,8].map((n) => (<MenuItem key={n} value={n} style={{ color: 'white' }}>{n} v framåt</MenuItem>))}
          </Select>
        </Box>

        {/* Selected lectures list */}
        <Paper style={{ background: '#2c2c2c', border: '1px solid #404040', borderRadius: 12 }}>
          {selectedLectures.length === 0 ? (
            <Box p={2}><Typography style={{ color: '#ccc' }}>Inga valda föreläsningar inom intervallet.</Typography></Box>
          ) : (
            selectedLectures.map((lec) => (
              <Box key={lec.id} display="flex" alignItems="center" justifyContent="space-between" p={2} borderBottom="1px solid #333">
                <Box>
                  <Typography style={{ color: 'white' }}>{lec.title}</Typography>
                  <Typography variant="body2" style={{ color: '#aaa' }}>
                    {format(parseISO(lec.date), 'EEE d MMM HH:mm', { locale: sv })} {lec.time ? `• ${lec.time}` : ''}
                  </Typography>
                </Box>
                <Chip label="vald" size="small" style={{ background: '#4caf50', color: 'white' }} />
              </Box>
            ))
          )}
        </Paper>
      </Box>
    </Layout>
  );
}


