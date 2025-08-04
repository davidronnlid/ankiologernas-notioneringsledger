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
  isNotionIntegrationAvailable,
  syncAllLecturesToNotionPages,
  filterLecturesByActiveCourse
} from 'utils/notionCRUD';
import { syncLectureNumbersWithNotion } from 'utils/lectureNumberSync';
import { useSelector } from 'react-redux';
import { RootState } from 'store/types';

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
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  
  // Get lectures from Redux store
  const lecturesData = useSelector((state: RootState) => state.lectures.lectures);
  const currentUser = useSelector((state: RootState) => state.auth.user);

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

  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    setSyncResults(null);
    
    try {
      console.log('🔄 Starting bulk sync to Notion pages...');
      
      // Filter to active course lectures only (pass WeekData array)
      const { activeCourse, activeLectures, filteredCount, totalCount } = filterLecturesByActiveCourse(lecturesData);
      
      if (!activeCourse || filteredCount === 0) {
        throw new Error('No active course lectures found to sync');
      }
      
      console.log(`📚 Syncing ${filteredCount} lectures from active course: ${activeCourse.title} (filtered from ${totalCount} total)`);
      
      // Sort lectures by number for consistent processing
      const sortedLectures = activeLectures.sort((a, b) => (a.lectureNumber || 0) - (b.lectureNumber || 0));
      
      // Perform bulk sync to add ONLY active course lectures to Notion pages
      const results = await syncAllLecturesToNotionPages(sortedLectures, undefined, () => false);
      
      // After bulk sync, also sync lecture numbers
      console.log('🔢 Starting lecture number sync...');
      const lectureNumberResults = await syncLectureNumbersWithNotion(lecturesData, currentUser);
      
      if (lectureNumberResults.success && lectureNumberResults.updatedCount && lectureNumberResults.updatedCount > 0) {
        console.log(`📊 Updated ${lectureNumberResults.updatedCount} lecture numbers in Notion`);
      }
      
      setSyncResults({
        success: results.success,
        message: results.message,
        results: results.results,
        summary: {
          successful: results.results.filter(r => r.status === 'success').length,
          failed: results.results.filter(r => r.status === 'error').length,
          total: results.results.length
        },
        lectureNumberSync: lectureNumberResults
      });
      
      onSyncComplete?.(results);
      
      console.log('✅ Bulk sync to Notion pages completed:', results);
      
    } catch (error) {
      console.error('❌ Bulk sync failed:', error);
      setSyncResults({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        results: [],
        summary: { successful: 0, failed: 1, total: 1 }
      });
    } finally {
      setIsBulkSyncing(false);
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
          {!syncResults && !isLoading && !isBulkSyncing && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Välj synkroniseringstyp:
              </Typography>
              
              <Box mt={2} mb={3}>
                <Typography variant="subtitle1" gutterBottom>
                  📄 Synka till Notion-sidor (Rekommenderas)
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  • Lägger till ALLA föreläsningar i Notion-databaser
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  • Organiserar per ämnesområde (Global hälsa, Oftalmologi, etc.)
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  • Skapar databaser med listvy och kolumner: Föreläsning, Tag, Person
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  • Default tag: "Bör göra", Person: D/A/M när vald
                </Typography>
                <Typography variant="body2">
                  • Fungerar för alla användare: David, Albin och Mattias
                </Typography>
              </Box>

              <Box mt={2}>
                <Typography variant="subtitle1" gutterBottom>
                  🗄️ Gammal databas-synk (Legacy)
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  • Läsa data från Notion-databaser
                </Typography>
                <Typography variant="body2" style={{ marginBottom: 8 }}>
                  • Uppdatera checkboxar och status
                </Typography>
                <Typography variant="body2">
                  • Fungerar bara om databaser är konfigurerade
                </Typography>
              </Box>
            </Box>
          )}

          {(isLoading || isBulkSyncing) && (
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress style={{ marginRight: 16 }} />
              <Typography>
                {isBulkSyncing ? 'Synkar alla föreläsningar till Notion-sidor...' : 'Synkroniserar med Notion...'}
              </Typography>
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
                    {result.lecture || `${result.user}: ${result.operation}`}
                    {result.subjectArea && ` (${result.subjectArea})`}
                  </Typography>
                  <Chip
                    icon={(result.success || result.status === 'success') ? <CheckIcon /> : <ErrorIcon />}
                    label={
                      result.status === 'success' ? 'Tillagd' :
                      result.status === 'skipped' ? 'Hoppades över' :
                      result.success ? 'Lyckades' : 'Misslyckades'
                    }
                    className={(result.success || result.status === 'success') ? classes.successChip : classes.errorChip}
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
                  
                  {syncResults.lectureNumberSync && (
                    <>
                      <Typography variant="subtitle1" gutterBottom style={{ marginTop: 16 }}>
                        🔢 Föreläsningsnummer-synk
                      </Typography>
                      <Typography variant="body2">
                        {syncResults.lectureNumberSync.success ? '✅ Lyckades' : '❌ Misslyckades'}: {syncResults.lectureNumberSync.message}
                      </Typography>
                      {syncResults.lectureNumberSync.updatedCount && syncResults.lectureNumberSync.updatedCount > 0 && (
                        <Typography variant="body2">
                          📊 Uppdaterade {syncResults.lectureNumberSync.updatedCount} föreläsningsnummer i Notion
                        </Typography>
                      )}
                    </>
                  )}
                </div>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions className={classes.dialogActions}>
          {!isLoading && !isBulkSyncing && !syncResults && (
            <>
              <Button 
                onClick={handleBulkSync} 
                color="primary" 
                variant="contained"
                style={{ marginRight: 8 }}
              >
                📄 Synka till sidor
              </Button>
              <Button 
                onClick={handleSync} 
                color="default" 
                variant="outlined"
                style={{ marginRight: 8 }}
              >
                🗄️ Gammal synk
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    console.log('🔍 Testing Notion configuration...');
                    const configResponse = await fetch('/api/debug-notion-config');
                    const configResult = await configResponse.json();
                    console.log('📊 Notion Config Debug:', configResult);
                    
                    // Test a simple API call
                    console.log('🧪 Testing updateNotionDatabase endpoint...');
                    const testResponse = await fetch('/api/updateNotionDatabase', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        lectureTitle: 'Test Lecture',
                        lectureNumber: 99,
                        selectedByUser: 'System',
                        subjectArea: 'Global hälsa',
                        action: 'bulk_add'
                      })
                    });
                    
                    const testResult = await testResponse.text();
                    console.log('🧪 Test response:', testResult);
                    
                    alert(`Config: ${JSON.stringify(configResult.config.hasTokens, null, 2)}\n\nTest Response: ${testResult.substring(0, 200)}...`);
                  } catch (error) {
                    console.error('❌ Debug failed:', error);
                    alert(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                color="default" 
                variant="text"
                size="small"
                style={{ fontSize: '0.8rem' }}
              >
                🔍 Debug
              </Button>
            </>
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