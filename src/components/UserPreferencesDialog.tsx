import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Chip,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
} from "@material-ui/core";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "store/types";
import {
  loadUserPreferences,
  loadUserLearningModel
} from "../utils/smartRecommendations";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dialog: {
      "& .MuiDialog-paper": {
        background: "#2c2c2c",
        color: "white",
        minWidth: "500px",
        [theme.breakpoints.down("sm")]: {
          minWidth: "90vw",
        },
      },
    },
    dialogTitle: {
      background: "#1a1a1a",
      borderBottom: "1px solid #404040",
      "& .MuiTypography-root": {
        color: "white",
        fontWeight: 600,
      },
    },
    dialogContent: {
      padding: theme.spacing(3),
    },
    section: {
      marginBottom: theme.spacing(3),
    },
    sectionTitle: {
      color: "white",
      fontWeight: 600,
      marginBottom: theme.spacing(2),
    },
    description: {
      color: "#ccc",
      fontSize: "0.9rem",
      marginBottom: theme.spacing(2),
    },
    preferenceChip: {
      margin: theme.spacing(0.5),
      background: "#404040",
      color: "white",
      "&.selected": {
        background: "#2196f3",
        color: "white",
      },
      "&:hover": {
        background: "#666",
      },
    },
    textField: {
      marginBottom: theme.spacing(2),
      "& .MuiOutlinedInput-root": {
        background: "#1a1a1a",
        "& fieldset": {
          borderColor: "#404040",
        },
        "&:hover fieldset": {
          borderColor: "#666",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#2196f3",
        },
      },
      "& .MuiInputBase-input": {
        color: "white",
      },
      "& .MuiInputLabel-root": {
        color: "#ccc",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "#2196f3",
      },
    },
    select: {
      marginBottom: theme.spacing(2),
      "& .MuiOutlinedInput-root": {
        background: "#1a1a1a",
        "& fieldset": {
          borderColor: "#404040",
        },
        "&:hover fieldset": {
          borderColor: "#666",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#2196f3",
        },
      },
      "& .MuiInputBase-input": {
        color: "white",
      },
      "& .MuiInputLabel-root": {
        color: "#ccc",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "#2196f3",
      },
      "& .MuiSelect-icon": {
        color: "#ccc",
      },
    },
    dialogActions: {
      background: "#1a1a1a",
      borderTop: "1px solid #404040",
      padding: theme.spacing(2),
      justifyContent: "space-between",
    },
    cancelButton: {
      color: "#ccc",
      "&:hover": {
        background: "rgba(255, 255, 255, 0.08)",
      },
    },
    saveButton: {
      background: "linear-gradient(45deg, #2196f3, #1976d2)",
      color: "white",
      "&:hover": {
        background: "linear-gradient(45deg, #1976d2, #1565c0)",
      },
    },
  })
);

interface UserPreferences {
  aiInstructions: string;
  preferredFocus: string[];
  avoidTopics: string[];
  learningStyle: string;
  timePreference: string;
  enableSmartRecommendations: boolean;
}

interface UserPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

const UserPreferencesDialog: React.FC<UserPreferencesDialogProps> = ({
  open,
  onClose,
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [preferences, setPreferences] = useState<UserPreferences>({
    aiInstructions: "",
    preferredFocus: [],
    avoidTopics: [],
    learningStyle: "holistic_clinical",
    timePreference: "morning",
    enableSmartRecommendations: true,
  });

  const focusOptions = [
    // Prioriterade kliniska områden
    "ÖNH (Öron-Näsa-Hals)",
    "Geriatrik",
    "Gynekologi",
    "Pediatrik",
    "Oftalmologi",
    "Global hälsa",
    
    // Andra stora kliniska områden
    "Kardiologi",
    "Neurologi", 
    "Gastroenterologi",
    "Endokrinologi",
    "Pulmonologi",
    "Nefrologi",
    "Hematologi",
    "Onkologi",
    "Infektionssjukdomar",
    "Reumatologi",
    "Dermatologi",
    "Ortopedi",
    "Kirurgi",
    "Psykiatri",
    "Anestesi och intensivvård",
    "Radiologi",
    "Patologi",
  ];

  const topicOptions = [
    "ÖNH (Öron-Näsa-Hals)",
    "Geriatrik",
    "Gynekologi",
    "Pediatrik",
    "Oftalmologi",
    "Global hälsa",
    "Kardiologi",
    "Neurologi",
    "Gastroenterologi",
    "Endokrinologi",
    "Pulmonologi",
    "Nefrologi",
    "Hematologi",
    "Onkologi",
    "Infektionssjukdomar",
    "Reumatologi",
    "Dermatologi",
    "Ortopedi",
    "Kirurgi",
    "Psykiatri",
  ];

  const learningStyles = [
    { value: "research_focus", label: "Djupgående forskningsfokus" },
    { value: "holistic_clinical", label: "Helhetsbalans med klinisk tillämpning" },
  ];

  const timePreferences = [
    { value: "morning", label: "Morgon (08:00-12:00)" },
    { value: "afternoon", label: "Eftermiddag (12:00-17:00)" },
    { value: "flexible", label: "Flexibel - alla tider" },
  ];

  useEffect(() => {
    // Load existing preferences from localStorage
    const savedPreferences = localStorage.getItem(`userPreferences_${currentUser?.id}`);
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(parsed);
      } catch (error) {
        console.error("Error loading user preferences:", error);
      }
    }
  }, [currentUser?.id]);

  const handleSave = () => {
    // Save preferences to localStorage
    localStorage.setItem(`userPreferences_${currentUser?.id}`, JSON.stringify(preferences));
    onClose();
  };

  const handleFocusToggle = (focus: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredFocus: prev.preferredFocus.includes(focus)
        ? prev.preferredFocus.filter(f => f !== focus)
        : [...prev.preferredFocus, focus]
    }));
  };

  const handleAvoidToggle = (topic: string) => {
    setPreferences(prev => ({
      ...prev,
      avoidTopics: prev.avoidTopics.includes(topic)
        ? prev.avoidTopics.filter(t => t !== topic)
        : [...prev.avoidTopics, topic]
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={classes.dialog}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle className={classes.dialogTitle}>
        AI-rekommendationsinställningar
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <div className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Anpassade instruktioner till AI:n
          </Typography>
          <Typography className={classes.description}>
            Beskriv dina preferenser för föreläsningar. AI:n kommer att använda denna information för att ge dig smartare rekommendationer.
          </Typography>
          <TextField
            className={classes.textField}
            label="Instruktioner till AI:n"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={preferences.aiInstructions}
            onChange={(e) => setPreferences(prev => ({ ...prev, aiInstructions: e.target.value }))}
            placeholder="T.ex: 'Jag föredrar föreläsningar med global inriktning framför mekanistisk. Jag gillar pediatrik men vill undvika gynekologi. Jag lär mig bäst genom kliniska exempel.'"
          />
        </div>

        <div className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Föredragna fokusområden
          </Typography>
          <Typography className={classes.description}>
            Välj ämnesområden du är mest intresserad av. AI:n kommer att prioritera föreläsningar inom dessa områden.
          </Typography>
          <Box>
            {focusOptions.map((focus) => (
              <Chip
                key={focus}
                label={focus}
                className={`${classes.preferenceChip} ${
                  preferences.preferredFocus.includes(focus) ? "selected" : ""
                }`}
                onClick={() => handleFocusToggle(focus)}
                clickable
              />
            ))}
          </Box>
        </div>

        <div className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Ämnen att undvika
          </Typography>
          <Typography className={classes.description}>
            Välj ämnesområden du helst vill undvika. AI:n kommer att nedprioritera dessa föreläsningar.
          </Typography>
          <Box>
            {topicOptions.map((topic) => (
              <Chip
                key={topic}
                label={topic}
                className={`${classes.preferenceChip} ${
                  preferences.avoidTopics.includes(topic) ? "selected" : ""
                }`}
                onClick={() => handleAvoidToggle(topic)}
                clickable
              />
            ))}
          </Box>
        </div>

        <div className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Inlärningsstil
          </Typography>
          <Typography className={classes.description}>
            Välj hur du föredrar att lära dig. Detta påverkar vilken typ av föreläsningar AI:n rekommenderar.
          </Typography>
          <FormControl variant="outlined" fullWidth className={classes.select}>
            <InputLabel>Inlärningsstil</InputLabel>
            <Select
              value={preferences.learningStyle}
              onChange={(e) => setPreferences(prev => ({ ...prev, learningStyle: e.target.value as string }))}
              label="Inlärningsstil"
              MenuProps={{
                PaperProps: {
                  style: {
                    backgroundColor: "#2c2c2c",
                    color: "white",
                  },
                },
              }}
            >
              {learningStyles.map((style) => (
                <MenuItem key={style.value} value={style.value} style={{ color: "white" }}>
                  {style.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className={classes.section}>
          <Typography className={classes.sectionTitle}>
            Tidsföredrag
          </Typography>
          <Typography className={classes.description}>
            Välj när du föredrar att ha föreläsningar. AI:n kommer att prioritera föreläsningar vid dessa tider.
          </Typography>
          <FormControl variant="outlined" fullWidth className={classes.select}>
            <InputLabel>Tidsföredrag</InputLabel>
            <Select
              value={preferences.timePreference}
              onChange={(e) => setPreferences(prev => ({ ...prev, timePreference: e.target.value as string }))}
              label="Tidsföredrag"
              MenuProps={{
                PaperProps: {
                  style: {
                    backgroundColor: "#2c2c2c",
                    color: "white",
                  },
                },
              }}
            >
              {timePreferences.map((time) => (
                <MenuItem key={time.value} value={time.value} style={{ color: "white" }}>
                  {time.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className={classes.section}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.enableSmartRecommendations}
                onChange={(e) => setPreferences(prev => ({ ...prev, enableSmartRecommendations: e.target.checked }))}
                color="primary"
              />
            }
            label="Aktivera smarta AI-rekommendationer"
            style={{ color: "white" }}
          />
          <Typography className={classes.description}>
            När aktiverat kommer AI:n att använda dina preferenser för att ge personliga rekommendationer av föreläsningar.
          </Typography>
        </div>

        {/* AI Learning Statistics Section */}
        <Box mt={3} mb={2}>
          <Typography variant="h6" gutterBottom>
            🤖 AI Lärandestatistik
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Visa hur AI:n lär sig från dina val och feedback
          </Typography>
          
          {(() => {
            const userId = currentUser?.id;
            if (!userId) {
              return null;
            }
            const learningModel = loadUserLearningModel(userId);
            return (
              <Box mt={2} p={2} border="1px solid rgba(255,255,255,0.1)" borderRadius="8px">
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Totala anpassningar:</strong> {learningModel.adaptationCount}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Feedback historik:</strong> {learningModel.feedbackHistory.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Framgångsmönster:</strong> {learningModel.successPatterns.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      <strong>Sist uppdaterad:</strong> {new Date(learningModel.lastUpdated).toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
                
                {learningModel.feedbackHistory.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="body2" color="textSecondary">
                      Senaste feedback:
                    </Typography>
                    <Box mt={1}>
                      {learningModel.feedbackHistory.slice(-3).reverse().map((feedback, index) => (
                        <Chip 
                          key={index}
                          label={`${feedback.action} - ${new Date(feedback.timestamp).toLocaleDateString()}`}
                          size="small"
                          color={feedback.action === 'accepted' || feedback.action === 'selected' ? 'primary' : 'default'}
                          style={{ margin: '2px' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">
                    AI Vikter (anpassas automatiskt):
                  </Typography>
                  <Box mt={1} maxHeight="150px" overflow="auto">
                    {Object.entries(learningModel.weights).filter(([key, value]) => 
                      key !== 'userSpecificPatterns' && typeof value === 'number'
                    ).map(([key, value]) => (
                      <Box key={key} display="flex" justifyContent="space-between" py={0.5}>
                        <Typography variant="caption">{key}:</Typography>
                        <Typography variant="caption">{(value as number).toFixed(2)}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            );
          })()}
        </Box>
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button onClick={onClose} className={classes.cancelButton}>
          Avbryt
        </Button>
        <Button onClick={handleSave} className={classes.saveButton}>
          Spara inställningar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserPreferencesDialog; 