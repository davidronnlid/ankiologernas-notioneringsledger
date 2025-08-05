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

  // Helper function to generate course-specific page ID name
  const generateCourseSpecificPageId = (userName: string): string => {
    const activeCourse = "Klinisk medicin 4";
    const courseCode = "km4"; // Simplify course name for ID
    return `notion_course_page_${userName.toLowerCase()}_${courseCode}`;
  };

  // Function to delete Notion configuration
  const deleteNotionConfiguration = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const userEmail = `${userName.toLowerCase()}@psychedevs.gmail.com`;
      
      const response = await fetch('/.netlify/functions/notion-user-config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setNotionToken('');
        setDatabaseId('');
        setSetupStatus(null);
        setActiveStep(0);
        setError('');
        console.log('✅ Notion configuration deleted successfully');
        // Close dialog after successful deletion
        onClose();
      } else {
        setError(result.message || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('❌ Error deleting Notion configuration:', error);
      setError('Failed to delete configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    'Check Current Setup',
    'Enter Notion Token', 
    'Test Connection',
    'Enter Course Page ID',
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
      // Get user's email for database lookup
      const userEmail = `${userName.toLowerCase()}@psychedevs.gmail.com`; // Use pattern from auth
      
      const response = await fetch(`/.netlify/functions/notion-user-config?userEmail=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (data.success) {
        const config = data.config;
        setSetupStatus({
          hasToken: !!config.notionToken,
          hasDatabase: !!config.databaseId,
          isSetupComplete: config.isSetup,
          userName: userName
        });
        
        if (config.isSetup) {
          console.log(`✅ User ${userName} has complete Notion setup`);
          setActiveStep(4); // Go to final step - already configured
          setDatabaseId(config.databaseId); // Pre-fill the database ID
        } else {
          console.log(`⚠️ User ${userName} needs Notion setup`);
          setActiveStep(1); // Go to token entry step
        }
      } else {
        console.log('Setup check failed:', data.message);
        setError(''); // Clear any error since this is expected for new users
        setActiveStep(1); // Go directly to token entry step
      }
    } catch (err) {
      console.log('Setup check failed (expected for new users):', err);
      setError(''); // Clear any error since this is expected for new users
      setActiveStep(1); // Go directly to token entry step
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!notionToken) {
      setError('Please enter notion token');
      return;
    }

    setIsLoading(true);
    setError('');
    setTestResult(null);

    console.log(`🧪 Testing Notion token for ${userName}...`);
    console.log(`🔑 Token starts with: ${notionToken.substring(0, 10)}...`);

    try {
      // First try the Netlify Function
      const response = await fetch('/.netlify/functions/notion-setup-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userName, 
          notionToken, 
          testConnection: true,
          testTokenOnly: true  // New flag to only test token
        })
      });
      
      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response ok: ${response.ok}`);
      
      const data = await response.json();
      console.log(`📄 Response data:`, data);
      
      if (data.success) {
        console.log(`✅ Token test successful`);
        setTestResult(data);
        setActiveStep(3); // Go to Course Page ID step
      } else {
        console.error(`❌ Token test failed:`, data);
        const errorMessage = data.error || data.message || 'Token test failed';
        setError(errorMessage);
        setTestResult(data);
      }
    } catch (err) {
      console.error(`💥 Netlify Function failed, trying simple endpoint:`, err);
      
      // Fallback to simple test endpoint
      try {
        const fallbackResponse = await fetch('/api/test-notion-setup-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userName, 
            notionToken, 
            testTokenOnly: true
          })
        });
        
        console.log(`📡 Fallback response status: ${fallbackResponse.status}`);
        
        const fallbackData = await fallbackResponse.json();
        console.log(`📄 Fallback response data:`, fallbackData);
        
        if (fallbackData.success) {
          console.log(`✅ Fallback token test successful`);
          setTestResult(fallbackData);
          setActiveStep(3); // Go to Course Page ID step
        } else {
          console.error(`❌ Fallback token test failed:`, fallbackData);
          const errorMessage = fallbackData.error || fallbackData.message || 'Token test failed';
          setError(errorMessage);
          setTestResult(fallbackData);
        }
      } catch (fallbackErr) {
        console.error(`💥 Both endpoints failed:`, fallbackErr);
        setError(`Failed to test token: ${err instanceof Error ? err.message : 'Network error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!notionToken || !databaseId) {
      setError('Please enter both token and page ID');
      return;
    }

    setIsLoading(true);
    setError('');

    console.log(`💾 Saving Notion configuration for ${userName}...`);
    console.log(`🔑 Token: ${notionToken.substring(0, 10)}...`);
    console.log(`📄 Database ID: ${databaseId}`);

    try {
      // Get user's email for database storage
      const userEmail = `${userName.toLowerCase()}@psychedevs.gmail.com`;
      
      const response = await fetch('/.netlify/functions/notion-user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail,
          notionToken, 
          databaseId
        })
      });
      
      console.log(`📡 Save response status: ${response.status}`);
      console.log(`📡 Save response ok: ${response.ok}`);
      
      const data = await response.json();
      console.log(`📄 Save response data:`, data);
      
      if (data.success) {
        console.log(`✅ Configuration saved successfully to database`);
        onSetupComplete();
        onClose();
      } else {
        console.error(`❌ Failed to save configuration:`, data);
        const errorMessage = data.message || 'Failed to save configuration to database';
        setError(errorMessage);
      }
    } catch (err) {
      console.error(`💥 Network error during save:`, err);
      setError(`Failed to save configuration: ${err instanceof Error ? err.message : 'Network error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testNetlifyCredentials = async () => {
    console.log(`🔍 Testing Netlify credentials...`);
    
    try {
      const response = await fetch('/api/test-netlify-credentials');
      const data = await response.json();
      
      console.log(`📡 Netlify credentials test:`, data);
      
      if (data.success) {
        console.log(`✅ Netlify credentials are working`);
        alert(`Netlify API fungerar! Site: ${data.site.name}`);
      } else {
        console.error(`❌ Netlify credentials failed:`, data);
        alert(`Netlify API problem: ${data.message}`);
      }
    } catch (err) {
      console.error(`💥 Netlify credentials test error:`, err);
      alert(`Netlify API test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const testNetlifyHealth = async () => {
    console.log(`🏥 Testing Netlify Functions health...`);
    
    try {
      const response = await fetch('/.netlify/functions/health-check');
      const data = await response.json();
      
      console.log(`📡 Health check response:`, data);
      
      if (data.success) {
        console.log(`✅ Netlify Functions are working`);
        alert(`Netlify Functions fungerar! ${data.message}`);
      } else {
        console.error(`❌ Health check failed:`, data);
        alert(`Health check misslyckades: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(`💥 Health check error:`, err);
      alert(`Health check error: ${err instanceof Error ? err.message : 'Network error'}`);
    }
  };

  const testNetlifyAPI = async () => {
    console.log(`🧪 Testing Netlify API via function...`);
    
    try {
      const response = await fetch('/.netlify/functions/test-netlify-api');
      const data = await response.json();
      
      console.log(`📡 Netlify API test response:`, data);
      
      if (data.success) {
        console.log(`✅ Netlify API test successful`);
        alert(`Netlify API fungerar! Site: ${data.site.name}, Env vars: ${data.envVars.count}`);
      } else {
        console.error(`❌ Netlify API test failed:`, data);
        alert(`Netlify API test misslyckades: ${data.message}`);
      }
    } catch (err) {
      console.error(`💥 Netlify API test error:`, err);
      alert(`Netlify API test error: ${err instanceof Error ? err.message : 'Network error'}`);
    }
  };

  const testEnvCreation = async () => {
    console.log(`🧪 Testing environment variable creation...`);
    
    try {
      const response = await fetch('/.netlify/functions/test-env-creation');
      const data = await response.json();
      
      console.log(`📡 Env creation test response:`, data);
      
      if (data.success) {
        console.log(`✅ Environment variable creation successful`);
        alert(`Env var creation fungerar! Test key: ${data.testKey}`);
      } else {
        console.error(`❌ Environment variable creation failed:`, data);
        alert(`Env var creation misslyckades: ${data.message}`);
      }
    } catch (err) {
      console.error(`💥 Env creation test error:`, err);
      alert(`Env creation test error: ${err instanceof Error ? err.message : 'Network error'}`);
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

      case 1: // Enter Notion Token
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Steg 1: Skaffa Notion Token för {userName}
            </Typography>
            
            <Box style={{ backgroundColor: '#2c2c2c', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Typography variant="h6" style={{ color: 'white', marginBottom: 12 }}>
                📋 Skapa Notion Integration:
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 6, color: '#ccc' }}>
                1. Gå till <Link href="https://notion.so/my-integrations" target="_blank" style={{ color: '#2196f3' }}>notion.so/my-integrations</Link>
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 6, color: '#ccc' }}>
                2. Klicka "New integration" och ge den ett namn (t.ex. "Ankiologernas NL - {userName}")
              </Typography>
              <Typography variant="body2" style={{ color: '#ccc' }}>
                3. Kopiera "Internal Integration Token" och klistra in nedan
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Notion Integration Token"
              value={notionToken}
              onChange={(e) => setNotionToken(e.target.value)}
              placeholder="secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX eller ntn_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className={classes.textField}
              margin="normal"
              variant="outlined"
              helperText="Kopiera från notion.so/my-integrations (börjar med 'secret_' eller 'ntn_')"
            />
          </Box>
        );

      case 2: // Test Connection
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Steg 2: Testa Notion Token
            </Typography>
            {isLoading && (
              <Box display="flex" alignItems="center" style={{ gap: 16 }}>
                <CircularProgress size={24} />
                <Typography>Testar din Notion token...</Typography>
              </Box>
            )}
            {testResult && (
              <Box>
                {testResult.success ? (
                  <Alert severity="success" className={classes.successAlert}>
                    ✅ Token test lyckades! Nu kan du ange din kurs-sida.
                  </Alert>
                ) : (
                  <Alert severity="error" className={classes.errorAlert}>
                    ❌ Token test misslyckades: {testResult.error}
                  </Alert>
                )}
              </Box>
            )}
            {!testResult && !isLoading && (
              <Alert severity="info" style={{ backgroundColor: '#1976d2' }}>
                Klicka "Test Connection" för att verifiera din token.
              </Alert>
            )}
          </Box>
        );

      case 3: // Enter Course Page ID
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Steg 3: Ange Course Page ID för {userName} - Klinisk medicin 4
            </Typography>
            
            <Box style={{ backgroundColor: '#2c2c2c', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Typography variant="h6" style={{ color: 'white', marginBottom: 12 }}>
                📋 Skapa Kurs-sida för Klinisk medicin 4:
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 6, color: '#ccc' }}>
                1. Skapa en ny sida i Notion med namnet: <strong>{generateCourseSpecificPageId(userName)}</strong>
              </Typography>
              <Typography variant="body2" style={{ marginBottom: 6, color: '#ccc' }}>
                2. Dela sidan med din integration (klicka "Share" → "Invite" → välj din integration)
              </Typography>
              <Typography variant="body2" style={{ color: '#ccc' }}>
                3. Kopiera sidans ID från URL:en och klistra in nedan
              </Typography>
            </Box>

            <TextField
              fullWidth
              label={`Course Page ID - ${generateCourseSpecificPageId(userName)}`}
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

      case 4: // Save Configuration
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
        
        {/* Delete configuration button - only show if setup exists */}
        {setupStatus?.isSetupComplete && (
          <Button 
            onClick={deleteNotionConfiguration}
            disabled={isLoading}
            style={{ 
              marginRight: 'auto',
              color: '#f44336',
              border: '1px solid #f44336',
              background: 'transparent'
            }}
          >
            {isLoading ? <CircularProgress size={20} /> : 'Delete Notion Config'}
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button 
            onClick={() => setActiveStep(2)}
            disabled={!notionToken || isLoading}
            className={classes.setupButton}
          >
            Nästa: Testa Token
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button 
            onClick={testConnection}
            disabled={!notionToken || isLoading}
            className={classes.setupButton}
          >
            Test Connection
          </Button>
        )}
        
        {activeStep === 3 && (
          <Button 
            onClick={() => setActiveStep(4)}
            disabled={!databaseId || isLoading}
            className={classes.setupButton}
          >
            Nästa: Spara Konfiguration
          </Button>
        )}
        
        {activeStep === 4 && !setupStatus?.isSetupComplete && (
          <Button 
            onClick={saveConfiguration}
            disabled={isLoading}
            className={classes.setupButton}
          >
            Spara till Netlify
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