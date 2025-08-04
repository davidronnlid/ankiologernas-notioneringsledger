import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Divider, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Chip,
  Paper
} from '@mui/material';
import { 
  Search as SearchIcon,
  Sync as SyncIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckIcon,
  Star as StarIcon,
  MenuBook as DocsIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useTheme } from '../contexts/ThemeContext';

const DocsPage: React.FC = () => {
  const { theme } = useTheme();

  const featureCards = [
    {
      title: '🔍 Smart Sökning',
      icon: null,
      description: 'Hitta föreläsningar snabbt och enkelt',
      features: [
        'Börja skriva direkt - ingen klickning på sökrutan behövs',
        'Sök på föreläsningsnamn, nummer eller ämnesområde',
        'Realtidsfiltrering när du skriver'
      ]
    },
    {
      title: '📋 Notion-synkronisering',
      icon: null,
      description: 'Synka dina föreläsningar till Notion',
      features: [
        'Klicka på menyikonen och välj "Sync all to Notion"',
        'Automatisk skapande av inline-databas i din Notion-sida',
        'Automatisk taggning för varje person som väljer en föreläsning'
      ]
    },
    {
      title: '✏️ Föreläsningshantering',
      icon: null,
      description: 'Redigera och hantera föreläsningar',
      features: [
        'Klicka på föreläsningskort för att markera de som du ska notionera',
        'Redigera-knapp (penna) för att ändra detaljer',
        'Ta bort-knapp (papperskorg) för att radera',
        'Kopiera-knapp för att kopiera föreläsningsnamn',
        'Lägg till nya föreläsningar med "+" knappen'
      ]
    },
    {
      title: '🔔 Notifieringar',
      icon: null,
      description: 'Skicka färdignotieringsmeddelanden till Ankiologernachatten',
      features: [
        'NOTIFIERA-knapp kopierar färdignotieringsmeddelande automatiskt',
        'Öppnar Ankiologernachatten i Messenger direkt',
        'Snabb delning av dina valda föreläsningar',
        'Tre klick för att meddela gruppen vad du notionerat'
      ]
    }
  ];

  const quickTips = [
    { icon: <SearchIcon />, tip: 'Börja skriva direkt för att söka - ingen klickning behövs!' },
    { icon: <CheckIcon />, tip: 'Markera föreläsningar genom att klicka på korten' },
  ];

  return (
    <Layout title="Dokumentation & Guide - Ankiologernas NL">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={6}>
          <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
            <DocsIcon sx={{ fontSize: 40, mr: 2, color: '#ff9800' }} />
            <Typography variant="h3" component="h1" fontWeight="bold" sx={{ color: 'white' }}>
              Dokumentation
            </Typography>
          </Box>
        </Box>

        {/* Quick Tips */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4, 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: theme === 'dark' ? '1px solid #333' : '1px solid #ddd'
          }}
        >
          <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: 'white' }}>
            ⚡ Snabbtips
          </Typography>
          <List dense>
            {quickTips.map((tip, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {React.cloneElement(tip.icon, { 
                    sx: { fontSize: 20, color: 'white' } 
                  })}
                </ListItemIcon>
                <ListItemText 
                  primary={tip.tip}
                  primaryTypographyProps={{ variant: 'body2', sx: { color: 'white' } }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Feature Cards */}
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3} mb={6}>
          {featureCards.map((card, index) => (
            <Card 
              key={index} 
              elevation={3}
              sx={{ 
                height: '100%',
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                border: theme === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  {card.icon && card.icon}
                  <Typography variant="h6" fontWeight="bold" ml={card.icon ? 1 : 0} sx={{ color: 'white' }}>
                    {card.title}
                  </Typography>
                </Box>
                <Typography variant="body2" mb={3} sx={{ color: 'white' }}>
                  {card.description}
                </Typography>
                <List dense>
                  {card.features.map((feature, featureIndex) => (
                    <ListItem key={featureIndex} sx={{ px: 0, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <StarIcon sx={{ fontSize: 16, color: 'white' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2', sx: { color: 'white' } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </Box>





        {/* Footer */}
        <Box textAlign="center" mt={6} pt={4} borderTop="1px solid" borderColor="divider">
          <Typography variant="body2" sx={{ color: 'white' }}>
            Behöver du hjälp? Kontakta David genom att skriva till honom på Messenger.
          </Typography>
          <Box mt={2}>
            <Chip 
              label="Version 4.0.0" 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default DocsPage;