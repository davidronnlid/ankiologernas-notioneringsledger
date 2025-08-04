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
      icon: <SearchIcon color="primary" />,
      description: 'Hitta föreläsningar snabbt och enkelt',
      features: [
        'Börja skriva direkt - ingen klickning på sökrutan behövs',
        'Sök på föreläsningsnamn, nummer eller ämnesområde',
        'Realtidsfiltrering när du skriver',
        'Tryck Escape för att rensa sökningen'
      ]
    },
    {
      title: '📋 Notion-synkronisering',
      icon: <SyncIcon color="success" />,
      description: 'Synka dina föreläsningar till Notion',
      features: [
        'Klicka på menyikonen och välj "Sync all to Notion"',
        'Automatisk skapande av inline-databas i din Notion-sida',

        'Automatisk dupliceringshantering'
      ]
    },
    {
      title: '✏️ Föreläsningshantering',
      icon: <EditIcon color="info" />,
      description: 'Redigera och hantera föreläsningar',
      features: [
        'Klicka på föreläsningskort för att markera dem som du ska notionera',
        'Redigera-knapp (penna) för att ändra detaljer',
        'Ta bort-knapp (papperskorg) för att radera',
        'Kopiera-knapp för att kopiera föreläsningsnamn',
        'Lägg till nya föreläsningar med "+" knappen'
      ]
    },
    {
      title: '🔔 Notifieringar',
      icon: <NotificationsIcon color="warning" />,
      description: 'Håll koll på föreläsningar och uppdateringar',
      features: [
        'NOTIFIERA-knapp för att skicka påminnelser',
        'Automatiska meddelanden vid ändringar',
        'Visuell feedback för alla åtgärder',
        'Realtidsstatusuppdateringar'
      ]
    }
  ];

  const quickTips = [
    { icon: <SearchIcon />, tip: 'Börja skriva direkt för att söka - ingen klickning behövs!' },
    { icon: <CheckIcon />, tip: 'Markera föreläsningar genom att klicka på korten' },
    { icon: <CopyIcon />, tip: 'Använd kopiera-knappen för att snabbt dela föreläsningsnamn' },
    { icon: <SyncIcon />, tip: 'Synka till Notion via menyn för att backup dina data' },
    { icon: <FilterIcon />, tip: 'Filtrera på person genom att klicka på namnchips' },
  ];

  return (
    <Layout title="Dokumentation & Guide - Ankiologernas NL">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={6}>
          <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
            <DocsIcon sx={{ fontSize: 40, mr: 2, color: '#ff9800' }} />
            <Typography variant="h3" component="h1" fontWeight="bold" sx={{ color: 'white' }}>
              Dokumentation & Guide
            </Typography>
          </Box>
          <Typography variant="h6" maxWidth="600px" mx="auto" sx={{ color: 'white' }}>
            Allt du behöver veta för att använda Ankiologernas Notioneringsledger effektivt
          </Typography>
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
                  {card.icon}
                  <Typography variant="h6" fontWeight="bold" ml={1} sx={{ color: 'white' }}>
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

        {/* Workflow Section */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mb: 4,
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: theme === 'dark' ? '1px solid #333' : '1px solid #ddd'
          }}
        >
          <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: 'white' }}>
            📋 Typiskt Arbetsflöde
          </Typography>
          <Box component="ol" sx={{ pl: 2 }}>
            <Box component="li" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>Sök efter föreläsningar</Typography>
              <Typography variant="body2" sx={{ color: 'white' }}>
                Börja skriva direkt när du kommer till sidan - ingen klickning på sökrutan behövs
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>Markera relevanta föreläsningar</Typography>
              <Typography variant="body2" sx={{ color: 'white' }}>
                Klicka på föreläsningskorten för att markera dem som du ska notionera
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>Synka till Notion (valfritt)</Typography>
              <Typography variant="body2" sx={{ color: 'white' }}>
                Persontaggning i din Notion-databas sker automatiskt när du väljer en föreläsning i ledgern
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>Hantera föreläsningar</Typography>
              <Typography variant="body2" sx={{ color: 'white' }}>
                Redigera, kopiera eller ta bort föreläsningar från ledgern med ikonerna i övre högra hörnet av ett föreläsningskort. Synka sedan till notion för att uppdatera föreläsningens siffra utifrån den nya föreläsningsordningen
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Technical Info */}
        <Card 
          elevation={3}
          sx={{ 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: theme === 'dark' ? '1px solid #333' : '1px solid #e0e0e0'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ color: 'white' }}>
              ⚙️ Teknisk Information
            </Typography>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>Notion-integration</Typography>
                <Typography variant="body2" paragraph sx={{ color: 'white' }}>
                  Appen integrerar med Notion API för att skapa och uppdatera databaser. 
                  Dina Notion-tokens och sidor konfigureras säkert via miljövariabler.
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>Datahantering</Typography>
                <Typography variant="body2" paragraph sx={{ color: 'white' }}>
                  All data sparas lokalt och synkroniseras med backend-API:er. 
                  Föreläsningsdata hämtas från ICS-filer och bearbetas automatiskt.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

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