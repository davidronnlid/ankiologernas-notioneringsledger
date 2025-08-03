import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/types';
import NotionSetupDialog from './NotionSetupDialog';
import {
  Button,
  Snackbar,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@material-ui/core';
// Simple Alert component since @material-ui/lab is not available
const Alert: React.FC<{ severity: 'success' | 'error' | 'info' | 'warning'; onClose?: () => void; children: React.ReactNode }> = ({ severity, onClose, children }) => {
  const colors = {
    success: '#388e3c',
    error: '#d32f2f', 
    info: '#1976d2',
    warning: '#f57c00'
  };
  
  return (
    <Box 
      style={{ 
        backgroundColor: colors[severity], 
        color: 'white', 
        padding: '12px 16px', 
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div>{children}</div>
      {onClose && (
        <Button onClick={onClose} style={{ color: 'white', minWidth: 'auto', padding: 4 }}>
          ✕
        </Button>
      )}
    </Box>
  );
};
import {
  Settings as SettingsIcon,
  CloudOff as CloudOffIcon,
  Notifications as NotificationsIcon,
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  setupPrompt: {
    background: 'linear-gradient(45deg, #ff9800 30%, #f57c00 90%)',
    color: 'white',
    padding: theme.spacing(2),
    borderRadius: 8,
    margin: theme.spacing(2, 0),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setupButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    fontWeight: 'bold',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
    },
  },
  notionIcon: {
    marginRight: theme.spacing(1),
  },
  quickSetupIcon: {
    color: '#ff9800',
    marginLeft: theme.spacing(1),
  },
}));

interface NotionSetupManagerProps {
  // Show setup prompt automatically for users who need it
  autoPrompt?: boolean;
  // Course context for setup
  currentCourse?: string;
  // Custom trigger element
  children?: React.ReactNode;
}

const NotionSetupManager: React.FC<NotionSetupManagerProps> = ({
  autoPrompt = true,
  currentCourse = 'Klinisk medicin 4',
  children,
}) => {
  const classes = useStyles();
  const [showDialog, setShowDialog] = useState(false);
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // Map username to person (handles special cases like dronnlid -> David)
  const mapUserNameToPerson = (fullName: string): string => {
    const nameLower = fullName.toLowerCase();
    
    // Special mapping for dronnlid -> David
    if (nameLower.includes('dronnlid')) {
      return 'David';
    }
    
    // Extract first name and capitalize
    const firstName = fullName.split(" ")[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  const userName = currentUser?.full_name ? mapUserNameToPerson(currentUser.full_name) : null;

  // Check setup status when user changes
  useEffect(() => {
    if (isAuthenticated && userName && ['David', 'Albin', 'Mattias'].includes(userName)) {
      checkSetupStatus();
    }
  }, [isAuthenticated, userName]);

  const checkSetupStatus = async () => {
    if (!userName) return;

    try {
      const response = await fetch('/api/notion-setup-check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSetupStatus(data);
        
        // Show prompt if user needs setup and auto-prompt is enabled
        if (autoPrompt && data.needsSetup) {
          setShowPrompt(true);
        }
        
        console.log(`📊 Notion setup status for ${userName}:`, data);
      }
    } catch (error) {
      console.error('Failed to check Notion setup status:', error);
    }
  };

  const handleSetupComplete = () => {
    setSnackbarMessage(`✅ Notion integration configured for ${userName}!`);
    setShowPrompt(false);
    setShowDialog(false);
    // Refresh setup status
    setTimeout(() => checkSetupStatus(), 1000);
  };

  const handleOpenSetup = () => {
    setShowDialog(true);
    setShowPrompt(false);
  };

  const handleClosePrompt = () => {
    setShowPrompt(false);
  };

  // Don't render anything if user is not authenticated or not a valid user
  if (!isAuthenticated || !userName || !['David', 'Albin', 'Mattias'].includes(userName)) {
    return null;
  }

  return (
    <>
      {/* Auto-prompt banner for users who need setup */}
      {showPrompt && setupStatus?.needsSetup && (
        <div className={classes.setupPrompt}>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <CloudOffIcon className={classes.notionIcon} />
            <Box>
              <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                Connect your Notion database
              </Typography>
              <Typography variant="body2">
                Set up automatic lecture sync for {currentCourse}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Button 
              className={classes.setupButton}
              onClick={handleOpenSetup}
              startIcon={<SettingsIcon />}
            >
              Set Up Now
            </Button>
            <IconButton 
              onClick={handleClosePrompt}
              style={{ color: 'white', marginLeft: 8 }}
              size="small"
            >
              ✕
            </IconButton>
          </Box>
        </div>
      )}

      {/* Custom trigger element (if provided) */}
      {children && (
        <Box onClick={handleOpenSetup} style={{ cursor: 'pointer' }}>
          {children}
        </Box>
      )}

      {/* Quick setup icon for users who need it */}
      {setupStatus?.needsSetup && !children && !showPrompt && (
        <Tooltip title={`Set up Notion integration for ${userName}`}>
          <IconButton 
            onClick={handleOpenSetup}
            className={classes.quickSetupIcon}
          >
            <NotificationsIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* Setup Dialog */}
      <NotionSetupDialog
        open={showDialog}
        userName={userName}
        onClose={() => setShowDialog(false)}
        onSetupComplete={handleSetupComplete}
      />

      {/* Success notification */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackbarMessage('')}
      >
        <Alert severity="success" onClose={() => setSnackbarMessage('')}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotionSetupManager;