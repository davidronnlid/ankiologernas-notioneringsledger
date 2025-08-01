import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/types';
import { signIn } from '../store/slices/authReducer';
import netlifyIdentity from 'netlify-identity-widget';
import { Box, Button, Typography, Container, Paper } from '@mui/material';
import Layout from '../components/Layout';

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (isAuthenticated) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Initialize Netlify Identity for the login page
    if (typeof window === 'undefined') return;

    const initializeIdentity = () => {
      try {
        console.log("Initializing Netlify Identity on login page...");
        
        // Initialize Netlify Identity
        netlifyIdentity.init({
          locale: 'en',
          // Add production-specific configuration
          ...(process.env.NODE_ENV === 'production' && {
            APIUrl: window.location.origin + '/.netlify/identity',
          })
        });

        // Handle login events
        const handleLogin = (user: any) => {
          try {
            console.log("Login successful on login page:", user);
            
            const userData = {
              email: user.email || "",
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email || "",
            };
            
            dispatch(signIn(userData));
            netlifyIdentity.close();
            
            // Redirect to home page after successful login
            router.push('/');
            
          } catch (error) {
            console.error("Error handling login on login page:", error);
          }
        };

        // Handle error events
        const handleError = (error: any) => {
          console.error("Netlify Identity error on login page:", error);
        };

        // Add event listeners
        netlifyIdentity.on("login", handleLogin);
        netlifyIdentity.on("error", handleError);

        // Cleanup function
        return () => {
          netlifyIdentity.off("login", handleLogin);
          netlifyIdentity.off("error", handleError);
        };

      } catch (error) {
        console.error("Error initializing Netlify Identity on login page:", error);
        return () => {};
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

  const handleLoginClick = () => {
    console.log("Login button clicked on login page");
    try {
      netlifyIdentity.open('login');
    } catch (error) {
      console.error("Error opening login modal:", error);
    }
  };

  const handleSignupClick = () => {
    console.log("Signup button clicked on login page");
    try {
      netlifyIdentity.open('signup');
    } catch (error) {
      console.error("Error opening signup modal:", error);
    }
  };

  return (
    <Layout title="Logga in - Ankiologernas Notioneringsledger">
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            backgroundColor: '#2c2c2c',
            border: '1px solid #404040',
            borderRadius: 2
          }}
        >
          <Box textAlign="center">
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom
              sx={{ color: 'white', mb: 3 }}
            >
              Ankiologernas Notioneringsledger
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ color: '#cccccc', mb: 4 }}
            >
              Logga in för att komma åt föreläsningsanteckningar och kommentarer
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleLoginClick}
                sx={{
                  backgroundColor: '#2196f3',
                  color: 'white',
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': {
                    backgroundColor: '#1976d2'
                  }
                }}
              >
                Logga in
              </Button>

              <Button
                variant="outlined"
                onClick={handleSignupClick}
                sx={{
                  borderColor: '#2196f3',
                  color: '#2196f3',
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': {
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)'
                  }
                }}
              >
                Skapa konto
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}
