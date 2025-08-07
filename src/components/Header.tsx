import React, { useEffect, useState, useRef } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import useScrollTrigger from "@material-ui/core/useScrollTrigger";
import netlifyIdentity from "netlify-identity-widget";
import { useDispatch, useSelector } from "react-redux";
import { signIn, signOut } from "../store/slices/authReducer";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";

import Slide from "@material-ui/core/Slide";
import { 
  Button, 
  Box, 
  Menu, 
  MenuItem, 
  IconButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import NotionSetupDialog from './NotionSetupDialog';
import { RootState } from "store/types";
import { persistor } from "store/store";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import SyncIcon from "@mui/icons-material/Sync";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import EventNoteIcon from "@mui/icons-material/EventNote";

import UserPreferencesDialog from "./UserPreferencesDialog";
import { useTheme } from "../contexts/ThemeContext";
import { syncAllLecturesToNotionPages, filterLecturesByActiveCourse } from "utils/notionCRUD";
import { useNotionSync } from "../contexts/NotionSyncContext";
import { DatabaseNotifications } from "utils/notificationSystem";

interface Props {
  children: React.ReactElement;
}

function HideOnScroll(props: Props) {
  const { children } = props;
  const trigger = useScrollTrigger({ target: undefined });

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const { startSync, addMessage, updateProgress, finishSync, setError, isCancelled, isLoading, isRunningInBackground, showSyncUI, getCancellationChecker } = useNotionSync();

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleOpenPreferences = () => {
    setShowPreferencesDialog(true);
    handleCloseMenu();
  };

  const handleLogout = () => {
    netlifyIdentity.logout();
    handleCloseMenu();
  };

  const handleDocsClick = () => {
    router.push('/docs');
    setAnchorEl(null);
  };

  const [showNotionSetup, setShowNotionSetup] = useState(false);

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

  const handleSyncToNotion = async () => {
    try {
      handleCloseMenu();
      
      // If sync is already running in background, show the UI
      if (isLoading && isRunningInBackground) {
        showSyncUI();
        return;
      }
      
      if (!lectures || lectures.length === 0) {
        alert('No lectures found to sync. Please load the main page first.');
        return;
      }

      if (!currentUser) {
        alert('Please log in to sync to Notion.');
        return;
      }

      const userName = mapUserNameToPerson(currentUser.full_name);

      // Check Notion setup status first
      console.log(`🔍 Checking Notion setup for ${userName}...`);
      
      // Get user's email for database lookup
      const userEmail = `${userName.toLowerCase()}@psychedevs.gmail.com`;
      
      const setupResponse = await fetch(`/.netlify/functions/notion-user-config?userEmail=${encodeURIComponent(userEmail)}`);
      const setupData = await setupResponse.json();
      
      if (!setupData.success || !setupData.config.isSetup) {
        console.log(`⚠️ ${userName} needs Notion setup`);
        
        // Show setup dialog directly without intermediate alert
        setShowNotionSetup(true);
        return;
      }

      console.log(`✅ ${userName} has Notion setup configured`);
      console.log(`🔑 Token: ${setupData.config.notionToken ? 'SET' : 'NOT SET'}`);
      console.log(`📄 Database ID: ${setupData.config.databaseId || 'NOT SET'}`);

      // Add user information to sync for better tracking
      addMessage(`👤 Syncing for user: ${userName} (${userEmail})`);
      addMessage(`🔑 Token status: ${setupData.config.notionToken ? 'Configured' : 'Missing'}`);
      addMessage(`📄 Database ID: ${setupData.config.databaseId || 'Missing'}`);

      // Filter lectures for active course
      const activeCourseData = filterLecturesByActiveCourse(lectures);
      const activeCourseLectures = activeCourseData.activeLectures;
      
      if (activeCourseLectures.length === 0) {
        alert('No lectures found for the active course.');
        return;
      }

      console.log(`🔄 Starting automatic sync to Notion for ${activeCourseLectures.length} lectures...`);
      
      // Start sync with progress tracking
      startSync(`Automatic sync to Notion (${activeCourseLectures.length} lectures)`, activeCourseLectures.length);
      addMessage(`🔄 Starting automatic sync for ${activeCourseLectures.length} lectures...`);
      addMessage(`⚠️ Keep this browser tab open while syncing to Notion!`);

      // Get the cancellation checker from context
      const isCancelledChecker = getCancellationChecker();

      // Perform the sync
      const results = await syncAllLecturesToNotionPages(activeCourseLectures, {
        onLectureStart: (lectureNumber, title, current, total) => {
          console.log(`🔄 Lecture start callback: ${lectureNumber}. ${title} (${current}/${total})`);
          updateProgress(current, `${current}/${total}: Syncing ${lectureNumber}. ${title}...`);
        },
        onLectureComplete: (lectureNumber, title, success, current, total) => {
          console.log(`📊 Lecture complete callback: ${lectureNumber}. ${title} - success: ${success}`);
          if (success) {
            updateProgress(current, `${current}/${total}: ${lectureNumber}. ${title} - synced`);
          } else {
            updateProgress(current, `${current}/${total}: ${lectureNumber}. ${title} - Check Notion DB to double-check if lecture was inserted.`);
          }
        },
        onLectureError: (lectureNumber, title, error, current, total) => {
          console.log(`❌ Lecture error callback: ${lectureNumber}. ${title} - error: ${error}`);
          updateProgress(current, `${current}/${total}: ${lectureNumber}. ${title} - Check Notion DB to double-check if lecture was inserted.`);
        }
      }, isCancelledChecker);

      if (results.success) {
        addMessage(`✅ Manual sync completed successfully!`);
        
        // Show success notification with lecture count
        const lectureCount = activeCourseLectures.length;
        DatabaseNotifications.notionSyncCompleted(lectureCount);
        
        finishSync('🎉 Automatic sync to Notion completed successfully!');
      } else {
        addMessage(`❌ Automatic sync failed: ${results.message}`);
        setError(`Automatic sync failed: ${results.message}`);
        DatabaseNotifications.notionSyncError(results.message);
        finishSync();
      }

    } catch (error) {
      console.error('❌ Error during automatic sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Automatic sync error: ${errorMessage}`);
      DatabaseNotifications.notionSyncError(errorMessage);
      finishSync();
    }
  };

  // Get authentication state and user's username from Redux store
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const profile_pic = useSelector(
    (state: RootState) => state.auth.user?.profile_pic
  );

  const lectures = useSelector((state: RootState) => state.lectures.lectures);
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const router = useRouter();

  useEffect(() => {
    // Wait for DOM to be ready before initializing Netlify Identity
    if (typeof window === 'undefined') return;
    
    const initializeIdentity = () => {
      try {
        console.log("Initializing Netlify Identity...");
        
        // Initialize Netlify Identity with proper configuration
        netlifyIdentity.init({
          locale: 'en', // Optional: specify locale
          // Add production-specific configuration
          ...(process.env.NODE_ENV === 'production' && {
            APIUrl: window.location.origin + '/.netlify/identity',
          })
          // Removed container specification to use default body container
        });

        // Check if a user is already logged in
        const currentUser = netlifyIdentity.currentUser();
        console.log("Current user check:", currentUser);
        console.log("Environment:", process.env.NODE_ENV);
        console.log("Window location:", window.location.origin);
        
        if (currentUser) {
          console.log("Found existing user:", currentUser);
          console.log("User metadata:", currentUser.user_metadata);
          console.log("User token:", currentUser.token ? "Present" : "Missing");
          
          const userData = {
            email: currentUser.email || "",
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.email || "",
          };
          console.log("Dispatching user data:", userData);
          dispatch(signIn(userData));
        } else {
          console.log("No existing user found");
        }

        // Handle login events
        const handleLogin = (user: any) => {
          try {
            console.log("Login event received, user data:", user);
            console.log("User metadata:", user.user_metadata);
            console.log("User app_metadata:", user.app_metadata);
            
            const userData = {
              email: user.email || "",
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email || "",
            };
            
            console.log("Dispatching sign in with userData:", userData);
            dispatch(signIn(userData));
            
            // Close the modal after successful login
            netlifyIdentity.close();
            
            // Navigate to user account page
            router.push("/userAccount");
          } catch (error) {
            console.error("Error handling login:", error);
          }
        };

        // Handle logout events
        const handleLogout = () => {
          try {
            console.log("Logout event received");
            dispatch(signOut());
            persistor.purge();
            router.push("/login");
          } catch (error) {
            console.error("Error handling logout:", error);
          }
        };

        // Handle error events
        const handleError = (error: any) => {
          console.error("Netlify Identity error:", error);
          // If there's a token error, try to refresh or logout the user
          if (error && error.message && error.message.includes("token")) {
            console.warn("Token error detected, logging out user");
            dispatch(signOut());
            persistor.purge();
          } else if (error && error.message) {
            console.error("Netlify Identity error message:", error.message);
          } else {
            console.error("Netlify Identity error (no message):", error);
          }
        };

        // Add event listeners
        netlifyIdentity.on("login", handleLogin);
        netlifyIdentity.on("logout", handleLogout);
        netlifyIdentity.on("error", handleError);

        // Cleanup function to remove event listeners
        return () => {
          netlifyIdentity.off("login", handleLogin);
          netlifyIdentity.off("logout", handleLogout);
          netlifyIdentity.off("error", handleError);
        };

      } catch (error) {
        console.error("Error initializing Netlify Identity:", error);
        return () => {}; // Return empty cleanup function on error
      }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeIdentity);
      return () => document.removeEventListener('DOMContentLoaded', initializeIdentity);
    } else {
      return initializeIdentity();
    }
  }, [dispatch, router]);

  const handleSignup = () => {
    console.log("called handleSignup");
    netlifyIdentity.open("signup");
  };

  const headerStyles = {
    background: 'rgba(48, 46, 50, 0.95)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    position: 'relative' as const,
    minHeight: '80px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  };

  const logoContainerStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    padding: '10px 20px',
    borderRadius: '16px',
    background: 'rgba(48, 46, 50, 0.95)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      background: 'rgba(48, 46, 50, 0.95)',
      transform: 'translateY(-1px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
    }
  };

  const logoImageStyles = {
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'rgba(48, 46, 50, 0.95)',
    transition: 'all 0.4s ease',
    '&:hover': {
      transform: 'rotate(360deg) scale(1.05)',
    }
  };

  const titleStyles = {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: 600,
    fontSize: '1.2rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '-0.02em',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  const userSectionStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 16px',
    borderRadius: '16px',
    background: 'rgba(48, 46, 50, 0.95)',
    backdropFilter: 'blur(10px)',
  };



  const profileButtonStyles = {
    padding: 0,
    borderRadius: '50%',
    overflow: 'hidden',
    background: 'rgba(48, 46, 50, 0.95)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 6px 20px rgba(11, 114, 185, 0.25)'
    }
  };

  const loginButtonStyles = {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: 600,
    fontSize: '0.9rem',
    letterSpacing: '0.025em',
    padding: '12px 24px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
    color: '#ffffff',
    textTransform: 'none' as const,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(33, 150, 243, 0.3)',
    '&:hover': {
      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(33, 150, 243, 0.5)'
    }
  };

  return (
    <React.Fragment>

      
      <HideOnScroll>
        <AppBar elevation={0} style={headerStyles}>
          <Toolbar
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 2rem',
              minHeight: '80px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <Link href="/" passHref>
              <Box style={logoContainerStyles}>
                <Box style={logoImageStyles}>
                  <Image
                    src="/images/logo.png"
                    alt="Ankiologerna Logo"
                    width={44}
                    height={44}
                    style={{ 
                      borderRadius: '50%',
                      transition: 'transform 0.3s ease'
                    }}
                  />
                </Box>
                <Typography style={titleStyles}>
                  Ankiologernas Notioneringsledger
                </Typography>
              </Box>
            </Link>

            {isAuthenticated && (
              <Box style={userSectionStyles}>

                
                <IconButton 
                  onClick={handleProfileClick}
                  style={profileButtonStyles}
                >
                  <Image
                    src={profile_pic || "/images/banner.png"}
                    alt="User profile image"
                    width={44}
                    height={44}
                    style={{ 
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                </IconButton>
                
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  PaperProps={{
                    style: {
                      backgroundColor: '#2c2c2c',
                      color: 'white',
                      border: '1px solid #404040',
                      borderRadius: '8px',
                      marginTop: '8px',
                    }
                  }}
                >
                  <MenuItem onClick={() => { router.push('/calendar'); handleCloseMenu(); }}>
                    <ListItemIcon>
                      <EventNoteIcon style={{ color: '#90caf9' }} />
                    </ListItemIcon>
                    <ListItemText primary="Kalender" />
                  </MenuItem>
                  <MenuItem onClick={handleDocsClick}>
                    <ListItemIcon>
                      <MenuBookIcon style={{ color: '#ff9800' }} />
                    </ListItemIcon>
                    <ListItemText primary="Dokumentation" />
                  </MenuItem>
                  <MenuItem onClick={() => { router.push('/generate-ankiz'); handleCloseMenu(); }}>
                    <ListItemIcon>
                      <TextFieldsIcon style={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="Generate Ankiz" />
                  </MenuItem>
                  <MenuItem onClick={handleOpenPreferences}>
                    <ListItemIcon>
                      <SettingsIcon style={{ color: '#2196f3' }} />
                    </ListItemIcon>
                    <ListItemText primary="AI-rekommendationsinställningar" />
                  </MenuItem>
                  <MenuItem onClick={handleSyncToNotion}>
                    <ListItemIcon>
                      <SyncIcon style={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary="Sync all to Notion" />
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon style={{ color: '#f44336' }} />
                    </ListItemIcon>
                    <ListItemText primary="Logga ut" />
                  </MenuItem>
                </Menu>
              </Box>
            )}

            {!isAuthenticated && (
              <Button onClick={handleSignup} style={loginButtonStyles}>
                LOGGA IN
              </Button>
            )}
          </Toolbar>
        </AppBar>
      </HideOnScroll>
      
      <Toolbar style={{ minHeight: '80px' }} />

      <UserPreferencesDialog
        open={showPreferencesDialog}
        onClose={() => setShowPreferencesDialog(false)}
      />

      {/* Notion Setup Dialog */}
      <NotionSetupDialog
        open={showNotionSetup}
        userName={currentUser ? mapUserNameToPerson(currentUser.full_name) : ''}
        onClose={() => setShowNotionSetup(false)}
        onSetupComplete={() => {
          setShowNotionSetup(false);
          // Optionally trigger sync after setup
          setTimeout(() => handleSyncToNotion(), 1000);
        }}
      />

    </React.Fragment>
  );
}
