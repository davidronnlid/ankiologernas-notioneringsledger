import React from 'react';
import Layout from '@/components/Layout';
import { useSelector } from 'react-redux';
import { RootState } from 'store/types';
import { Box, Typography, Paper, Chip } from '@material-ui/core';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

type ActivityItem = {
  id: string;
  type: 'selected' | 'unselected' | 'created' | 'edited' | 'completed';
  lectureId?: string;
  lectureTitle?: string;
  person?: string;
  timestamp: string; // ISO string
  meta?: Record<string, any>;
};

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
  const activity = useSelector((s: RootState) => deriveActivityFromState(s));

  return (
    <Layout title="Aktivitetsflöde" description="Senaste händelser" keywords="activity, feed">
      <Box style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
        <Typography variant="h4" style={{ color: 'white', marginBottom: 16 }}>
          Aktivitetsflöde
        </Typography>
        <Paper style={{ background: 'rgba(44,44,44,0.9)', border: '1px solid #404040', borderRadius: 12 }}>
          {activity.length === 0 && (
            <Box style={{ padding: 24 }}>
              <Typography variant="body1" style={{ color: '#ccc' }}>
                Inga händelser ännu.
              </Typography>
            </Box>
          )}
          {activity.map((item) => (
            <Box
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #333',
              }}
            >
              <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Chip
                  size="small"
                  label={item.type}
                  style={{ background: chipColor(item.type), color: 'white' }}
                />
                <Typography variant="body1" style={{ color: 'white' }}>
                  {item.person ? `${item.person} ` : ''}
                  {item.type === 'selected' ? 'valde' : item.type}
                  {item.lectureTitle ? ` – ${item.lectureTitle}` : ''}
                </Typography>
              </Box>
              <Typography variant="body2" style={{ color: '#bbb' }}>
                {format(parseISO(item.timestamp), 'EEE d MMM HH:mm', { locale: sv })}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Box>
    </Layout>
  );
}


