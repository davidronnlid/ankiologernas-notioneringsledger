import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  Chip,
} from '@material-ui/core';
// Simple Alert component since @material-ui/lab is not available
const Alert: React.FC<{ severity: 'success' | 'error' | 'info' | 'warning'; className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ severity, className, style, children }) => {
  const colors = {
    success: '#388e3c',
    error: '#d32f2f', 
    info: '#1976d2',
    warning: '#f57c00'
  };
  
  return (
    <Box 
      className={className}
      style={{ 
        backgroundColor: colors[severity], 
        color: 'white', 
        padding: '12px 16px', 
        borderRadius: 4, 
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        ...style
      }}
    >
      {children}
    </Box>
  );
};
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  dialog: {
    '& .MuiDialog-paper': {
      backgroundColor: '#1a1a1a',
      color: 'white',
      maxWidth: 700,
      width: '100%',
      maxHeight: '80vh',
    },
  },
  dialogTitle: {
    backgroundColor: '#1a1a1a',
    color: 'white',
    borderBottom: '1px solid #333',
  },
  dialogContent: {
    backgroundColor: '#1a1a1a',
    color: 'white',
    padding: theme.spacing(3),
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  dialogActions: {
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333',
    padding: theme.spacing(2),
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      '& fieldset': {
        borderColor: '#555',
      },
      '&:hover fieldset': {
        borderColor: '#777',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#2196f3',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#bbb',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#2196f3',
    },
  },
  setupButton: {
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    color: 'white',
    fontWeight: 'bold',
    '&:hover': {
      background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)',
    },
  },
  instructionStep: {
    padding: theme.spacing(1, 0),
    borderLeft: '3px solid #2196f3',
    paddingLeft: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  statusChip: {
    margin: theme.spacing(0.5),
  },
  errorAlert: {
    backgroundColor: '#d32f2f',
    color: 'white',
    marginBottom: theme.spacing(2),
  },
  successAlert: {
    backgroundColor: '#388e3c',
    color: 'white',
    marginBottom: theme.spacing(2),
  },
}));

interface NotionSetupDialogProps {
  open: boolean;
  userName: string;
  onClose: () => void;
  onSetupComplete: () => void;
}

const NotionSetupDialog: React.FC<NotionSetupDialogProps> = ({
  open,
  userName,
  onClose,
  onSetupComplete,
}) => {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [notionToken, setNotionToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const steps = [
    'Check Current Setup',
    'Get Notion Credentials', 
    'Test Connection',
    'Save Configuration'
  ];

  // Check setup status when dialog opens
  useEffect(() => {
    if (open && userName) {
      checkSetupStatus();
    }
  }, [open, userName]);

  const checkSetupStatus = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/notion-setup-check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSetupStatus(data);
        if (data.isSetupComplete) {
          setActiveStep(3); // Skip to final step if already configured
        } else {
          setActiveStep(1); // Go to credentials step
        }
      } else {
        setError(data.error || 'Failed to check setup status');
      }
    } catch (err) {
      setError('Failed to check Notion setup status');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!notionToken || !databaseId) {
      setError('Please enter both token and database ID');
      return;
    }

    setIsLoading(true);
    setError('');
    setTestResult(null);

    try {
      const response = await fetch('/api/notion-setup-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userName, 
          notionToken, 
          databaseId, 
          testConnection: true 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestResult(data);
        setActiveStep(3);
      } else {
        setError(data.error || 'Connection test failed');
        setTestResult(data);
      }
    } catch (err) {
      setError('Failed to test connection');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/notion-setup-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userName, 
          notionToken, 
          databaseId,
          testConnection: false 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        onSetupComplete();
        onClose();
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Check Current Setup
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Checking {userName}'s Notion Setup...
            </Typography>
            {isLoading && <CircularProgress />}
            {setupStatus && (
              <Box>
                <Chip 
                  icon={setupStatus.hasToken ? <CheckIcon /> : <ErrorIcon />}
                  label={`Token: ${setupStatus.hasToken ? 'Found' : 'Missing'}`}
                  className={classes.statusChip}
                  color={setupStatus.hasToken ? 'primary' : 'secondary'}
                />
                <Chip 
                  icon={setupStatus.hasDatabase ? <CheckIcon /> : <ErrorIcon />}
                  label={`Database: ${setupStatus.hasDatabase ? 'Found' : 'Missing'}`}
                  className={classes.statusChip}
                  color={setupStatus.hasDatabase ? 'primary' : 'secondary'}
                />
              </Box>
            )}
          </Box>
        );

      case 1: // Get Notion Credentials
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Set Up Notion Integration for {userName}
            </Typography>
            
            <Box style={{ backgroundColor: '#2c2c2c', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Typography variant="h6" style={{ color: 'white', marginBottom: 12 }}>
                📋 Snabb setup-guide:
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 6, color: '#ccc' }}>
                1. Gå till <Link href="https://notion.so/my-integrations" target="_blank" style={{ color: '#2196f3' }}>notion.so/my-integrations</Link> → skapa integration → kopiera token
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 6, color: '#ccc' }}>
                2. Skapa ny sida i Notion → dela med din integration → kopiera sidans ID från URL
              </Typography>
              <Typography variant="body2" style={{ color: '#ccc' }}>
                3. Fyll i fälten nedan och testa anslutningen
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Notion Integration Token"
              value={notionToken}
              onChange={(e) => setNotionToken(e.target.value)}
              placeholder="secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className={classes.textField}
              margin="normal"
              variant="outlined"
              helperText="Kopiera från notion.so/my-integrations (börjar med 'secret_')"
            />

            <TextField
              fullWidth
              label="Notion Page ID"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              placeholder="a1b2c3d4e5f6789..."
              className={classes.textField}
              margin="normal"
              variant="outlined"
              helperText="Hittas i URL:en till din Notion-sida (den långa strängen efter sidans namn)"
            />
          </Box>
        );

      case 2: // Test Connection
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Testing Connection...
            </Typography>
            {isLoading && (
              <Box display="flex" alignItems="center" style={{ gap: 16 }}>
                <CircularProgress size={24} />
                <Typography>Connecting to your Notion database...</Typography>
              </Box>
            )}
            {testResult && (
              <Box>
                {testResult.success ? (
                  <Alert severity="success" className={classes.successAlert}>
                    ✅ Connection successful! Database is ready.
                  </Alert>
                ) : (
                  <Alert severity="error" className={classes.errorAlert}>
                    ❌ Connection failed: {testResult.error}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        );

      case 3: // Save Configuration
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configuration Ready
            </Typography>
            
            {setupStatus?.isSetupComplete ? (
              <Alert severity="success" className={classes.successAlert}>
                ✅ {userName}'s Notion integration is already configured and working!
              </Alert>
            ) : (
              <Box>
                <Alert severity="info" style={{ backgroundColor: '#1976d2', marginBottom: 16 }}>
                  <Typography variant="body2">
                    Ready to save configuration for {userName}.
                    This will enable automatic lecture synchronization.
                  </Typography>
                </Alert>
                
                {testResult?.manualSetup && (
                  <Accordion style={{ backgroundColor: '#2c2c2c' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon style={{ color: 'white' }} />}>
                      <Typography>🔧 Manual Setup Required</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          Add these environment variables to Netlify:
                        </Typography>
                        {Object.entries(testResult.manualSetup.variables).map(([key, value]) => (
                          <Box key={key} style={{ fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: 8 }}>
                            <strong>{key}</strong> = {value}
                          </Box>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className={classes.dialog} maxWidth="md">
      <DialogTitle className={classes.dialogTitle}>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          <InfoIcon />
          Notion Setup - {userName}
        </Box>
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <Stepper activeStep={activeStep} style={{ backgroundColor: 'transparent', marginBottom: 24 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel style={{ color: 'white' }}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" className={classes.errorAlert}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        
        {activeStep === 1 && (
          <Button 
            onClick={testConnection}
            disabled={!notionToken || !databaseId || isLoading}
            className={classes.setupButton}
          >
            Test Connection
          </Button>
        )}
        
        {activeStep === 3 && !setupStatus?.isSetupComplete && (
          <Button 
            onClick={saveConfiguration}
            disabled={isLoading}
            className={classes.setupButton}
          >
            Save Configuration
          </Button>
        )}
        
        {setupStatus?.isSetupComplete && (
          <Button onClick={onClose} className={classes.setupButton}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NotionSetupDialog;