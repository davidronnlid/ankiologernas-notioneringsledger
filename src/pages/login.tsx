import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { RootState } from '../store/types';
import netlifyIdentity from 'netlify-identity-widget';
import { Box, Button, Typography, Container, Paper } from '@mui/material';

export default function Login() {
  const router = useRouter();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  useEffect(() => {
    // If user is already authenticated, redirect to home
    if (isAuthenticated) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, router]);

  const handleLoginClick = () => {
    netlifyIdentity.open('login');
  };

  const handleSignupClick = () => {
    netlifyIdentity.open('signup');
  };

  return (
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
  );
}
