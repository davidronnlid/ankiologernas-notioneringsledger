import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import { useNotionSync } from '../contexts/NotionSyncContext';
import NotionSetupDialog from './NotionSetupDialog';
import { useSelector } from 'react-redux';
import { RootState } from '../store/types';

const NotionSyncLoader: React.FC = () => {
  const theme = useTheme();
  const { isLoading, isRunningInBackground, currentOperation, progress, messages, error, cancelSync, continueInBackground } = useNotionSync();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNotionSetup, setShowNotionSetup] = useState(false);
  
  // Get current user from Redux store
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
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
  
  const userName = currentUser?.full_name ? mapUserNameToPerson(currentUser.full_name) : "User";

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isLoading || isRunningInBackground) return null;

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog
      open={isLoading}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          borderRadius: 3,
          boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, 0.3)}`,
        }
      }}
      BackdropProps={{
        sx: {
          background: alpha(theme.palette.common.black, 0.7),
          backdropFilter: 'blur(4px)',
        }
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" mb={3}>
          <CircularProgress 
            size={32} 
            sx={{ 
              mr: 2,
              color: theme.palette.primary.main,
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }} 
          />
          <Box>
            <Typography variant="h6" color="primary" fontWeight="bold">
              Notion Sync
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentOperation}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        {progress.total > 0 && (
          <Box mb={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Chip 
                label={`${progress.current}/${progress.total}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progressPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }
              }}
            />
          </Box>
        )}

        {/* Real-time Messages */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" mb={2}>
            Real-time Updates
          </Typography>
          <Box
            sx={{
              maxHeight: 300,
              overflowY: 'auto',
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.background.default, 0.3),
              p: 1,
            }}
          >
            <List dense sx={{ py: 0 }}>
              {messages.map((message, index) => (
                <ListItem key={index} sx={{ py: 0.5, px: 1 }}>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: error && index === messages.length - 1 
                            ? theme.palette.error.main 
                            : 'text.primary',
                          lineHeight: 1.4,
                        }}
                      >
                        {message}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
            <div ref={messagesEndRef} />
          </Box>
        </Box>

        {/* Error State */}
        {error && (
          <Box mt={2}>
            <Chip 
              label={`Error: ${error}`}
              color="error"
              variant="outlined"
              sx={{ 
                width: '100%',
                '& .MuiChip-label': {
                  whiteSpace: 'normal',
                  textAlign: 'center',
                }
              }}
            />
          </Box>
        )}

        {/* Animated Dots */}
        <Box display="flex" justifyContent="center" mt={3}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                  '@keyframes pulse': {
                    '0%, 80%, 100%': {
                      opacity: 0.3,
                      transform: 'scale(0.8)',
                    },
                    '40%': {
                      opacity: 1,
                      transform: 'scale(1)',
                    },
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      
      {/* Action Buttons */}
      <DialogActions sx={{ px: 4, pb: 3, gap: 1 }}>
        <Button 
          onClick={() => setShowNotionSetup(true)}
          variant="outlined"
          color="secondary"
          size="medium"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            px: 3,
            marginRight: 'auto',
            '&:hover': {
              backgroundColor: alpha(theme.palette.secondary.main, 0.1),
            }
          }}
        >
          Notion Config
        </Button>
        <Button 
          onClick={continueInBackground}
          variant="outlined"
          color="primary"
          size="medium"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            px: 3,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            }
          }}
        >
          Continue in Background
        </Button>
        <Button 
          onClick={cancelSync}
          variant="outlined"
          color="error"
          size="medium"
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            px: 3,
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.1),
            }
          }}
        >
          Cancel Sync
        </Button>
      </DialogActions>
    </Dialog>

    {/* Notion Setup Dialog */}
    <NotionSetupDialog
      open={showNotionSetup}
      userName={userName}
      onClose={() => {
        setShowNotionSetup(false);
        // If sync is running, also close the sync loader
        if (isLoading) {
          cancelSync();
        }
      }}
      onSetupComplete={() => {
        setShowNotionSetup(false);
        // If sync is running, also close the sync loader
        if (isLoading) {
          cancelSync();
        }
      }}
    />
  );
};

export default NotionSyncLoader;