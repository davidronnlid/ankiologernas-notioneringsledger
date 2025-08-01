import React, { useEffect, useState } from "react";
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
import { RootState } from "store/types";
import { persistor } from "store/store";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

import UserPreferencesDialog from "./UserPreferencesDialog";
import { useTheme } from "../contexts/ThemeContext";

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

  // Get authentication state and user's username from Redux store
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const profile_pic = useSelector(
    (state: RootState) => state.auth.user?.profile_pic
  );

  const router = useRouter();

  useEffect(() => {
    try {
      // Initialize Netlify Identity with proper configuration
      netlifyIdentity.init({
        container: '#netlify-modal', // Optional: specify modal container
        locale: 'en' // Optional: specify locale
      });

      // Check if a user is already logged in
      const currentUser = netlifyIdentity.currentUser();
      if (currentUser) {
        console.log("Found existing user:", currentUser);
        const userData = {
          email: currentUser.email || "",
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.email || "",
        };
        dispatch(signIn(userData));
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
        if (error.message && error.message.includes("token")) {
          console.warn("Token error detected, logging out user");
          dispatch(signOut());
          persistor.purge();
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
    background: 'rgba(48, 46, 50, 0.95)',
    color: '#ffffff',
    textTransform: 'none' as const,
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      background: 'rgba(48, 46, 50, 0.95)',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(11, 114, 185, 0.4)'
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
                  <MenuItem onClick={handleOpenPreferences}>
                    <ListItemIcon>
                      <SettingsIcon style={{ color: '#2196f3' }} />
                    </ListItemIcon>
                    <ListItemText primary="AI-rekommendationsinställningar" />
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

    </React.Fragment>
  );
}
