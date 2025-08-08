import React, { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useSelector } from 'react-redux';
import { RootState } from 'store/types';
import {
  Box,
  Typography,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Avatar,
  Tooltip,
  IconButton,
} from '@material-ui/core';
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@material-ui/icons/Refresh';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import DoneAllIcon from '@material-ui/icons/DoneAll';
import EditIcon from '@material-ui/icons/Edit';
import NoteAddIcon from '@material-ui/icons/NoteAdd';
import { format, parseISO, formatDistanceToNow, addDays, subDays, startOfDay, getDay, isAfter, isBefore } from 'date-fns';
import { coursePeriods } from 'utils/coursePeriods';
import { isCourseActive } from 'utils/processLectures';
import { sv } from 'date-fns/locale';
import { getProfilePicUrl } from 'utils/profilePicMapper';

type ActivityItem = {
  id: string;
  type: 'selected' | 'unselected' | 'created' | 'edited' | 'completed';
  lectureId?: string;
  lectureTitle?: string;
  person?: string;
  timestamp: string; // ISO string
  meta?: Record<string, any>;
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      maxWidth: 1000,
      margin: '24px auto',
      padding: '0 16px',
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing(2),
    },
    headerTitle: {
      color: 'white',
      marginBottom: 0,
    },
    controlsBar: {
      display: 'grid',
      gridTemplateColumns: '1fr 220px 220px 120px',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
    },
    heatmapWrap: {
      background: 'rgba(44,44,44,0.9)',
      border: '1px solid #404040',
      borderRadius: 12,
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },
    heatmapHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing(1.5),
      color: '#ddd',
      fontWeight: 600,
    },
    heatmapLegend: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
      color: '#aaa',
    },
    heatmapGrid: {
      display: 'grid',
      gridAutoFlow: 'column',
      gridAutoColumns: 'min-content',
      gap: 2,
      maxWidth: '100%',
      overflowX: 'auto' as const,
      paddingBottom: 4,
    },
    heatmapCol: {
      display: 'grid',
      gridTemplateRows: 'repeat(7, 12px)',
      gap: 2,
    },
    heatmapCell: {
      width: 12,
      height: 12,
      borderRadius: 2,
      border: '1px solid #2b2b2b',
      position: 'relative' as const,
    },
    userDot: {
      position: 'absolute' as const,
      left: 2,
      width: 8,
      height: 2,
      borderRadius: 1,
    },
    surface: {
      background: 'rgba(44,44,44,0.9)',
      border: '1px solid #404040',
      borderRadius: 12,
      overflow: 'hidden',
    },
    timelineRow: {
      display: 'grid',
      gridTemplateColumns: '16px 1fr',
    },
    rail: {
      background: 'linear-gradient(180deg, rgba(64,64,64,.8), rgba(64,64,64,0))',
      width: 2,
      margin: '0 auto',
    },
    dayHeader: {
      padding: theme.spacing(1.5, 2),
      borderBottom: '1px solid #333',
      position: 'sticky',
      top: 0,
      background: 'rgba(32,32,32,0.9)',
      backdropFilter: 'blur(6px)',
      zIndex: 1,
      color: '#ddd',
      fontWeight: 600,
    },
    item: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(1.25, 2),
      borderBottom: '1px solid #333',
    },
    left: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1.25),
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 8,
      display: 'grid',
      placeItems: 'center',
    },
    title: { color: 'white' },
    subtitle: { color: '#aaa', fontSize: '0.85rem' },
    right: { color: '#bbb', fontSize: '0.85rem' },
    typeChip: { color: 'white' },
    avatar: { width: 28, height: 28, fontSize: 14 },
    // Small-multiples distribution chart
    threeDWrap: {
      background: 'rgba(44,44,44,0.9)',
      border: '1px solid #404040',
      borderRadius: 12,
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },
    threeDHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing(1.5),
      color: '#ddd',
      fontWeight: 600,
    },
    smScene: { overflowX: 'auto' as const, paddingBottom: 6 },
    smRow: {
      display: 'grid',
      gridTemplateColumns: '100px 1fr',
      alignItems: 'center',
      gap: 12,
      margin: '8px 0',
    },
    smRowLabel: { color: '#ccc' },
    smBars: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 4,
      position: 'relative' as const,
      minHeight: 60,
    },
    smCol: { display: 'flex', alignItems: 'flex-end', width: 10 },
    smBar: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column-reverse' as const,
      border: '1px solid #1f1f1f',
      background: '#2a2a2a',
    },
    smSeg: { width: '100%' },
    smWeekTick: {
      position: 'absolute' as const,
      bottom: 0,
      top: 0,
      width: 1,
      background: 'rgba(255,255,255,0.06)',
    },
    legendRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: '#aaa',
    },
  })
);

// Simple derived feed from current lectures – in real usage, back this with a server log.
const deriveActivityFromState = (state: RootState): ActivityItem[] => {
  const items: ActivityItem[] = [];
  const weeks = state.lectures.lectures || [];
  weeks.forEach((w) => {
    (w.lectures || []).forEach((lec) => {
      const cs = lec.checkboxState || {};
      Object.entries(cs).forEach(([person, s]) => {
        if (s?.confirm) {
          items.push({
            id: `${lec.id}-${person}-selected`,
            type: 'selected',
            lectureId: lec.id,
            lectureTitle: lec.title,
            person,
            timestamp: lec.date, // best-effort – replace with real event time if available
          });
        } else {
          items.push({
            id: `${lec.id}-${person}-unselected`,
            type: 'unselected',
            lectureId: lec.id,
            lectureTitle: lec.title,
            person,
            timestamp: lec.date,
          });
        }
      });
    });
  });
  // Add completion events derived from notifications of type 'lecture_notified'
  const notifications = (state.notifications && state.notifications.notifications) || [];
  const seen = new Set<string>();
  notifications.forEach((n) => {
    if (n.type !== 'lecture_notified') return;
    const key = `completed-${n.lectureId}-${n.fromUser}-${n.timestamp}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      id: key,
      type: 'completed',
      lectureId: n.lectureId,
      lectureTitle: n.lectureTitle,
      person: n.fromUser,
      timestamp: new Date(n.timestamp).toISOString(),
    });
  });
  // Sort newest first
  return items
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const chipColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'selected':
      return '#4caf50';
    case 'completed':
      return '#64b5f6';
    case 'unselected':
      return '#9e9e9e';
    case 'created':
      return '#64b5f6';
    case 'edited':
      return '#ffb74d';
    default:
      return '#9e9e9e';
  }
};

export default function ActivityPage() {
  const classes = useStyles();
  const activity = useSelector((s: RootState) => deriveActivityFromState(s));

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityItem['type']>('all');
  const [personFilter, setPersonFilter] = useState<'Alla' | 'Mattias' | 'Albin' | 'David'>('Alla');

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: activity.length };
    activity.forEach((a) => {
      c[a.type] = (c[a.type] || 0) + 1;
    });
    return c;
  }, [activity]);

  const filtered = useMemo(() => {
    return activity.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (personFilter !== 'Alla' && a.person !== personFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          (a.lectureTitle || '').toLowerCase().includes(q) ||
          (a.person || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activity, typeFilter, personFilter, query]);

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityItem[]>();
    filtered.forEach((a) => {
      const d = format(parseISO(a.timestamp), 'EEEE d MMMM', { locale: sv });
      const key = d.charAt(0).toUpperCase() + d.slice(1);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // Heatmap preparation (last 26 weeks, Mon–Sun)
  const heatmap = useMemo(() => {
    const WEEKS = 26;
    const today = new Date();
    const weekday = getDay(today); // 0 Sun .. 6 Sat
    const diffToMonday = (weekday + 6) % 7; // days since Monday
    const end = startOfDay(today);
    const start = subDays(end, WEEKS * 7 + diffToMonday - 1);

    const days: Date[] = [];
    let cur = start;
    while (cur <= end) {
      days.push(cur);
      cur = addDays(cur, 1);
    }

    // Aggregate by person and count per day
    const persons = ['Mattias', 'Albin', 'David'];
    const counts = new Map<string, number>();
    const byPerson: Record<string, Map<string, number>> = {
      Mattias: new Map(),
      Albin: new Map(),
      David: new Map(),
    };
    filtered.forEach((a) => {
      const dayKey = startOfDay(parseISO(a.timestamp)).toISOString();
      counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
      const p = a.person && persons.includes(a.person) ? a.person : undefined;
      if (p) {
        const map = byPerson[p];
        map.set(dayKey, (map.get(dayKey) || 0) + 1);
      }
    });

    const colorFor = (n: number): string => {
      if (!n) return '#2a2a2a';
      if (n === 1) return '#1b5e20';
      if (n === 2) return '#2e7d32';
      if (n === 3) return '#43a047';
      return '#66bb6a';
    };

    // Build columns of 7 days
    const columns: { date: Date; count: number; color: string; per: Record<string, number> }[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      const col: { date: Date; count: number; color: string; per: Record<string, number> }[] = [];
      for (let r = 0; r < 7 && i + r < days.length; r++) {
        const d = days[i + r];
        const key = startOfDay(d).toISOString();
        const c = counts.get(key) || 0;
        col.push({
          date: d,
          count: c,
          color: colorFor(c),
          per: {
            Mattias: byPerson.Mattias.get(key) || 0,
            Albin: byPerson.Albin.get(key) || 0,
            David: byPerson.David.get(key) || 0,
          },
        });
      }
      columns.push(col);
    }

    return { columns, total: filtered.length };
  }, [filtered]);

  // Distribution chart data (per action/person per day) – span limited to active course window
  const threeDData = useMemo(() => {
    const persons = ['Mattias', 'Albin', 'David'] as const;
    const actions = ['selected', 'unselected', 'completed'] as const;
    // Determine active course period
    const now = new Date();
    const active = coursePeriods.find((c) => isCourseActive(c.title, now));
    let start = startOfDay(now);
    let end = startOfDay(now);
    if (active) {
      start = startOfDay(parseISO(active.startDate));
      end = startOfDay(parseISO(active.endDate));
    } else {
      // fallback to min/max of current filtered data
      const times = filtered.map((a) => startOfDay(parseISO(a.timestamp)).getTime());
      if (times.length > 0) {
        start = new Date(Math.min(...times));
        end = new Date(Math.max(...times));
      }
    }
    // Build day list from start to end inclusive
    const days: Date[] = [];
    let cursor = start;
    while (!isAfter(cursor, end)) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    const key = (d: Date) => startOfDay(d).toISOString();
    const byDate: Record<string, any> = {};
    days.forEach((d) => {
      byDate[key(d)] = {
        date: d,
        selected: { Mattias: 0, Albin: 0, David: 0 },
        unselected: { Mattias: 0, Albin: 0, David: 0 },
        completed: { Mattias: 0, Albin: 0, David: 0 },
      };
    });
    filtered.forEach((a) => {
      const k = key(parseISO(a.timestamp));
      if (!byDate[k]) return; // outside of active window
      if ((['selected', 'unselected', 'completed'] as string[]).includes(a.type) && a.person) {
        const p = (['Mattias', 'Albin', 'David'] as string[]).includes(a.person) ? a.person : null;
        if (p) {
          byDate[k][a.type][p] += 1;
        }
      }
    });
    const columns = days.map((d) => byDate[key(d)]);
    let maxTotal = 1;
    columns.forEach((col) => {
      (['selected','unselected','completed'] as const).forEach((act) => {
        const total = col[act].Mattias + col[act].Albin + col[act].David;
        if (total > maxTotal) maxTotal = total;
      });
    });
    return { days, columns, persons, actions, maxTotal };
  }, [filtered]);

  return (
    <Layout title="Aktivitetsflöde" description="Senaste händelser" keywords="activity, feed">
      <Box className={classes.container}>
        <Box className={classes.headerRow}>
          <Typography variant="h4" className={classes.headerTitle}>
            Aktivitetsflöde
          </Typography>
          <Tooltip title="Uppdatera">
            <IconButton size="small" style={{ color: '#ccc' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Heatmap overview */}
        <Box className={classes.heatmapWrap}>
          <Box className={classes.heatmapHeader}>
            <span>Aktivitet senaste 26 veckorna</span>
            <Box className={classes.heatmapLegend}>
              <span style={{ marginRight: 6 }}>Färre</span>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <span key={lvl} className={classes.heatmapCell as any} style={{ background: ['#2a2a2a','#1b5e20','#2e7d32','#43a047','#66bb6a'][lvl] }} />
              ))}
              <span style={{ marginLeft: 6 }}>Fler</span>
            </Box>
          </Box>
          <Box className={classes.heatmapGrid}>
            {heatmap.columns.map((col, ci) => (
              <Box key={ci} className={classes.heatmapCol}>
                {col.map((cell, ri) => {
                  const tip = `${format(cell.date, 'EEE d MMM', { locale: sv })}: ${cell.count} händelse(r)\nMattias: ${cell.per.Mattias || 0}\nAlbin: ${cell.per.Albin || 0}\nDavid: ${cell.per.David || 0}`;
                  return (
                    <Tooltip key={`${ci}-${ri}`} title={<span style={{ whiteSpace: 'pre-line' }}>{tip}</span>}>
                      <span className={classes.heatmapCell} style={{ background: cell.color }}>
                        {/* micro-bands to indicate per-user presence */}
                        {cell.per.Mattias ? (
                          <span className={classes.userDot} style={{ top: 2, background: '#42a5f5' }} />
                        ) : null}
                        {cell.per.Albin ? (
                          <span className={classes.userDot} style={{ top: 5, background: '#ab47bc' }} />
                        ) : null}
                        {cell.per.David ? (
                          <span className={classes.userDot} style={{ top: 8, background: '#ff7043' }} />
                        ) : null}
                      </span>
                    </Tooltip>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Distribution chart: clearer small multiples */}
        <Box className={classes.threeDWrap}>
          <Box className={classes.threeDHeader}>
            <span>Aktivitetsfördelning (handling × person × tid)</span>
            <Box className={classes.legendRow}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#42a5f5', display: 'inline-block' }} /> Mattias</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#ab47bc', display: 'inline-block' }} /> Albin</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#ff7043', display: 'inline-block' }} /> David</span>
              <Divider orientation="vertical" flexItem style={{ borderColor: '#3a3a3a' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#4caf50', display: 'inline-block' }} /> selected</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#9e9e9e', display: 'inline-block' }} /> unselected</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, background: '#64b5f6', display: 'inline-block' }} /> completed</span>
            </Box>
          </Box>
          <div className={classes.smScene}>
            {(['selected','unselected','completed'] as const).map((act) => (
              <div key={act} className={classes.smRow}>
                <div className={classes.smRowLabel}>{act}</div>
                <div className={classes.smBars}>
                  {threeDData.columns.map((col, idx) => {
                    const total = col[act].Mattias + col[act].Albin + col[act].David;
                    const height = total === 0 ? 0 : Math.max(4, Math.round((total / threeDData.maxTotal) * 60));
                    const tip = `${format(col.date, 'EEE d MMM', { locale: sv })} • ${act}\nMattias: ${col[act].Mattias}  Albin: ${col[act].Albin}  David: ${col[act].David}`;
                    return (
                      <Tooltip key={idx} title={<span style={{ whiteSpace: 'pre-line' }}>{tip}</span>}>
                        <div className={classes.smCol}>
                          <div className={classes.smBar} style={{ height }}>
                            {/* stacked segments per person */}
                            {col[act].Mattias > 0 && (
                              <div className={classes.smSeg} style={{ height: `${(col[act].Mattias / total) * 100}%`, background: '#42a5f5' }} />
                            )}
                            {col[act].Albin > 0 && (
                              <div className={classes.smSeg} style={{ height: `${(col[act].Albin / total) * 100}%`, background: '#ab47bc' }} />
                            )}
                            {col[act].David > 0 && (
                              <div className={classes.smSeg} style={{ height: `${(col[act].David / total) * 100}%`, background: '#ff7043' }} />
                            )}
                          </div>
                          {/* weekly ticks */}
                          {idx % 7 === 6 && <span className={classes.smWeekTick} />}
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Box>

        <Box className={classes.controlsBar}>
          <TextField
            variant="outlined"
            placeholder="Sök efter föreläsning eller person..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon style={{ color: '#ccc' }} />
                </InputAdornment>
              ),
            }}
            style={{ background: '#2c2c2c' }}
          />
          <FormControl variant="outlined">
            <InputLabel style={{ color: '#ccc' }}>Typ</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              label="Typ"
              style={{ color: 'white', background: '#2c2c2c' }}
              MenuProps={{ PaperProps: { style: { background: '#2c2c2c', color: 'white' } } }}
            >
              <MenuItem value="all" style={{ color: 'white' }}>Alla ({counts.total || 0})</MenuItem>
              <MenuItem value="selected" style={{ color: 'white' }}>Vald ({counts.selected || 0})</MenuItem>
              <MenuItem value="unselected" style={{ color: 'white' }}>Avvald ({counts.unselected || 0})</MenuItem>
              <MenuItem value="completed" style={{ color: 'white' }}>Färdig-notifierad ({counts.completed || 0})</MenuItem>
              <MenuItem value="created" style={{ color: 'white' }}>Skapad ({counts.created || 0})</MenuItem>
              <MenuItem value="edited" style={{ color: 'white' }}>Redigerad ({counts.edited || 0})</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant="outlined">
            <InputLabel style={{ color: '#ccc' }}>Person</InputLabel>
            <Select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value as any)}
              label="Person"
              style={{ color: 'white', background: '#2c2c2c' }}
              MenuProps={{ PaperProps: { style: { background: '#2c2c2c', color: 'white' } } }}
            >
              {['Alla', 'Mattias', 'Albin', 'David'].map((p) => (
                <MenuItem key={p} value={p} style={{ color: 'white' }}>{p}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Chip
            label={`Totalt ${filtered.length}`}
            size="small"
            style={{ alignSelf: 'center', background: '#404040', color: 'white' }}
          />
        </Box>

        <Paper className={classes.surface}>
          {byDay.length === 0 && (
            <Box style={{ padding: 24 }}>
              <Typography variant="body1" style={{ color: '#ccc' }}>
                Inga händelser matchar dina filter.
              </Typography>
            </Box>
          )}

          {byDay.map(([dayLabel, entries]) => (
            <Box key={dayLabel}>
              <Box className={classes.dayHeader}>{dayLabel}</Box>
              {entries.map((item, idx) => {
                const color = chipColor(item.type);
                const Icon =
                  item.type === 'selected' ? CheckCircleOutlineIcon :
                  item.type === 'unselected' ? RemoveCircleOutlineIcon :
                  item.type === 'completed' ? DoneAllIcon :
                  item.type === 'edited' ? EditIcon : NoteAddIcon;
                return (
                  <Box key={item.id} className={classes.item}>
                    <Box className={classes.left}>
                      <div className={classes.iconWrap} style={{ background: color + '33', border: `1px solid ${color}` }}>
                        <Icon style={{ color }} />
                      </div>
                      <Avatar
                        className={classes.avatar}
                        src={item.person ? getProfilePicUrl(item.person) : undefined}
                        style={{ background: '#2c2c2c', border: '1px solid #444' }}
                      >
                        {(item.person || '?').charAt(0)}
                      </Avatar>
                      <div>
                        <Typography variant="body1" className={classes.title}>
                          {item.person ? `${item.person} ` : ''}
                          {item.type === 'selected' ? 'valde' : item.type === 'unselected' ? 'avvalde' : item.type === 'completed' ? 'blev färdig med' : item.type}
                          {item.lectureTitle ? ` – ${item.lectureTitle}` : ''}
                        </Typography>
                        <Typography variant="body2" className={classes.subtitle}>
                          {format(parseISO(item.timestamp), 'EEE d MMM HH:mm', { locale: sv })}
                          {' • '}för {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true, locale: sv })}
                        </Typography>
                      </div>
                    </Box>
                    <Chip size="small" label={item.type} className={classes.typeChip} style={{ background: color }} />
                  </Box>
                );
              })}
            </Box>
          ))}
        </Paper>
      </Box>
    </Layout>
  );
}


