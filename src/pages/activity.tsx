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
import { format, parseISO, formatDistanceToNow } from 'date-fns';
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


