import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Chip,
  Box,
  Tooltip,
} from '@material-ui/core';
import {
  Sync as SyncIcon,
  Cloud as CloudSyncIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import { 
  syncWithNotion, 
  readLecturesFromNotion, 
  isNotionIntegrationAvailable 
} from 'utils/notionCRUD';

const useStyles = makeStyles((theme) => ({
  syncButton: {
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    border: 0,
    borderRadius: 3,
    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
    color: 'white',
    height: 48,
    padding: '0 30px',
    margin: theme.spacing(1),
    '&:hover': {
      background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)',
    },
    '&:disabled': {
      background: '#666',
      color: '#999',
    },
  },
  dialogContent: {
    minWidth: 400,
    backgroundColor: '#1a1a1a',
    color: 'white',
  },
  dialogTitle: {
    backgroundColor: '#1a1a1a',
    color: 'white',
    borderBottom: '1px solid #333',
  },
  dialogActions: {
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
    margin: theme.spacing(0.5, 0),
    backgroundColor: '#2c2c2c',
    borderRadius: 4,
  },
  successChip: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  errorChip: {
    backgroundColor: '#f44336',
    color: 'white',
  },
  summaryBox: {
    padding: theme.spacing(2),
    backgroundColor: '#2c2c2c',
    borderRadius: 4,
    marginTop: theme.spacing(2),
  },
}));

interface NotionSyncButtonProps {
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  onSyncComplete?: (results: any) => void;
}

const NotionSyncButton: React.FC<NotionSyncButtonProps> = ({
  variant = 'button',
  size = 'medium',
  onSyncComplete,
}) => {
  const classes = useStyles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  const isAvailable = isNotionIntegrationAvailable();

  const handleSync = async () => {
    setIsLoading(true);
    setSyncResults(null);
    
    try {
      console.log('🔄 Starting Notion sync...');
      
      // Perform bidirectional sync
      const results = await syncWithNotion('bidirectional');
      
      setSyncResults(results);
      onSyncComplete?.(results);
      
      console.log('✅ Notion sync completed:', results);
      
    } catch (error) {
      console.error('❌ Notion sync failed:', error);
      setSyncResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        results: [],
        summary: { successful: 0, failed: 1, total: 1 }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    if (!isAvailable) {
      console.warn('Notion integration not available');
      return;
    }
    setIsDialogOpen(true);
    setSyncResults(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSyncResults(null);
  };

  if (!isAvailable) {
    return (
      <Tooltip title="Notion integration not configured">
        <span>
          <Button
            disabled
            variant={variant === 'button' ? 'contained' : 'text'}
            size={size}
            startIcon={<CloudSyncIcon />}
          >
            {variant === 'button' ? 'Notion Sync' : ''}
          </Button>
        </span>
      </Tooltip>
    );
  }

  const ButtonComponent = (
    <Button
      className={variant === 'button' ? classes.syncButton : ''}
      variant={variant === 'button' ? 'contained' : 'text'}
      size={size}
      startIcon={<SyncIcon />}
      onClick={handleOpenDialog}
      disabled={isLoading}
    >
      {variant === 'button' ? 'Synka med Notion' : ''}
    </Button>
  );

  return (
    <>
      {ButtonComponent}
      
      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className={classes.dialogTitle}>
          <Box display="flex" alignItems="center">
            <CloudSyncIcon style={{ marginRight: 8 }} />
            Notion Synkronisering
          </Box>
        </DialogTitle>
        
        <DialogContent className={classes.dialogContent}>
          {!syncResults && !isLoading && (
            <Typography>
              Synkronisera föreläsningsdata med alla Notion-databaser. Detta kommer att:
            </Typography>
          )}
          
          {!syncResults && !isLoading && (
            <Box mt={2}>
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                • Läsa data från Notion-databaser
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                • Uppdatera checkboxar och status
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                • Skapa nya föreläsningar om de saknas
              </Typography>
              <Typography variant="body2">
                • Synkronisera för David, Albin och Mattias
              </Typography>
            </Box>
          )}

          {isLoading && (
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress style={{ marginRight: 16 }} />
              <Typography>Synkroniserar med Notion...</Typography>
            </Box>
          )}

          {syncResults && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Synkroniseringsresultat
              </Typography>
              
              {syncResults.results?.map((result: any, index: number) => (
                <div key={index} className={classes.resultItem}>
                  <Typography>
                    {result.user}: {result.operation}
                  </Typography>
                  <Chip
                    icon={result.success ? <CheckIcon /> : <ErrorIcon />}
                    label={result.success ? 'Lyckades' : 'Misslyckades'}
                    className={result.success ? classes.successChip : classes.errorChip}
                    size="small"
                  />
                </div>
              ))}

              {syncResults.summary && (
                <div className={classes.summaryBox}>
                  <Typography variant="subtitle1" gutterBottom>
                    Sammanfattning
                  </Typography>
                  <Typography variant="body2">
                    Lyckades: {syncResults.summary.successful}/{syncResults.summary.total}
                  </Typography>
                  <Typography variant="body2">
                    Misslyckades: {syncResults.summary.failed}/{syncResults.summary.total}
                  </Typography>
                </div>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions className={classes.dialogActions}>
          {!isLoading && !syncResults && (
            <Button onClick={handleSync} color="primary" variant="contained">
              Starta synkronisering
            </Button>
          )}
          <Button onClick={handleCloseDialog} color="secondary">
            {syncResults ? 'Stäng' : 'Avbryt'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotionSyncButton;