import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  Collapse,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from "@material-ui/core";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  Feedback as FeedbackIcon,
  Settings as SettingsIcon,
} from "@material-ui/icons";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { useSelector } from "react-redux";
import { 
  recordRecommendationFeedback, 
  getSmartRecommendations, 
  loadUserPreferences,
  getRecommendationExplanation
} from "utils/smartRecommendations";
import { RootState } from "store/types";
import Lecture from "types/lecture";
// Updated to use new AI learning system

// Map username to person (handles special cases like dronnlid -> David)
const mapUserNameToPerson = (fullName: string): string => {
  const nameLower = fullName.toLowerCase();
  
  // Special mapping for dronnlid -> David
  if (nameLower.includes('dronnlid')) {
    return 'David';
  }
  
  // Default: use first name
  return fullName.split(" ")[0];
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    recommendationsContainer: {
      background: "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)",
      borderRadius: "12px",
      padding: theme.spacing(3),
      marginBottom: theme.spacing(3),
      border: "2px solid #404040",
      position: "relative",
      overflow: "hidden",
    },
    header: {
      display: "flex",
      alignItems: "center",
      marginBottom: theme.spacing(2),
    },
    title: {
      color: "white",
      fontWeight: 600,
      marginLeft: theme.spacing(1),
    },
    subtitle: {
      color: "#ccc",
      fontSize: "0.9rem",
      marginBottom: theme.spacing(2),
    },
    recommendationCard: {
      background: "#2c2c2c",
      borderRadius: "8px",
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      border: "1px solid #404040",
      transition: "all 0.3s ease",
      cursor: "pointer",
      "&:hover": {
        borderColor: "#2196f3",
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(33, 150, 243, 0.3)",
      },
    },
    lectureTitle: {
      color: "white",
      fontWeight: 600,
      marginBottom: theme.spacing(1),
    },
    lectureDetails: {
      color: "#ccc",
      fontSize: "0.9rem",
      marginBottom: theme.spacing(1),
    },
    scoreChip: {
      background: "linear-gradient(45deg, #4caf50, #45a049)",
      color: "white",
      fontWeight: 600,
      marginRight: theme.spacing(1),
    },
    reasonChip: {
      background: "#404040",
      color: "#ccc",
      fontSize: "0.8rem",
      margin: theme.spacing(0.5),
    },
    expandButton: {
      color: "#ccc",
      padding: theme.spacing(0.5),
    },
    noRecommendations: {
      color: "#ccc",
      textAlign: "center",
      padding: theme.spacing(2),
    },
    setupButton: {
      background: "linear-gradient(45deg, #2196f3, #1976d2)",
      color: "white",
      fontWeight: 600,
      "&:hover": {
        background: "linear-gradient(45deg, #1976d2, #1565c0)",
      },
    },
    aiIcon: {
      color: "#2196f3",
      fontSize: "24px",
    },
    feedbackButton: {
      background: "linear-gradient(45deg, #ff9800, #f57c00)",
      color: "white",
      fontWeight: 600,
      marginTop: theme.spacing(2),
      "&:hover": {
        background: "linear-gradient(45deg, #f57c00, #ef6c00)",
      },
    },
    feedbackDialog: {
      "& .MuiDialog-paper": {
        background: "#2c2c2c",
        color: "white",
      },
    },
    feedbackTextField: {
      "& .MuiInputBase-root": {
        color: "white",
      },
      "& .MuiInputLabel-root": {
        color: "#ccc",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#404040",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "#2196f3",
      },
    },
  })
);

interface SmartRecommendationsProps {
  lectures: Lecture[];
  onLectureClick: (lecture: Lecture) => void;
  onOpenPreferences: () => void;
}

const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  lectures,
  onLectureClick,
  onOpenPreferences,
}) => {
  const classes = useStyles();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackLecture, setFeedbackLecture] = useState<any>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      const preferences = loadUserPreferences(currentUser.id);
      setUserPreferences(preferences);
      
      if (preferences && preferences.enableSmartRecommendations) {
        const recs = getSmartRecommendations(
          lectures,
          preferences,
          currentUser.full_name ? mapUserNameToPerson(currentUser.full_name) : "",
          2
        );
        setRecommendations(recs);
      } else {
        setRecommendations([]);
      }
    }
  }, [lectures, currentUser]);

  const handleExpand = (lectureId: string) => {
    setExpanded(prev => ({
      ...prev,
      [lectureId]: !prev[lectureId]
    }));
  };

  const handleLectureClick = (lecture: Lecture, recommendation?: any) => {
    // Record that user selected a recommended lecture
    if (recommendation && currentUser) {
      recordRecommendationFeedback(
        currentUser.full_name?.split(" ")[0] || "",
        recommendation.recommendationId,
        lecture.id,
        'selected',
        recommendation.reasons || []
      );
    }
    onLectureClick(lecture);
  };

  const handleFeedbackOpen = (recommendation: any) => {
    setFeedbackLecture(recommendation);
    setFeedbackDialogOpen(true);
  };

  const handleFeedbackClose = () => {
    setFeedbackDialogOpen(false);
    setFeedbackText("");
    setFeedbackLecture(null);
  };

  const handleFeedbackSubmit = () => {
    // Use the new AI learning system to record feedback
    if (currentUser && feedbackLecture && feedbackText.trim()) {
      recordRecommendationFeedback(
        currentUser.full_name?.split(" ")[0] || "",
        feedbackLecture.recommendationId,
        feedbackLecture.lecture.id,
        'rejected', // User provided negative feedback
        feedbackLecture.reasons || [],
        [feedbackText.trim()]
      );
      
      setFeedbackSuccess(true);
      handleFeedbackClose();
      
      // Hide success message after 3 seconds
      setTimeout(() => setFeedbackSuccess(false), 3000);
    }
  };

  if (!userPreferences) {
    return (
      <Paper className={classes.recommendationsContainer}>
        <Box className={classes.header}>
          <LightbulbIcon className={classes.aiIcon} />
          <Typography className={classes.title}>
            Smarta AI-rekommendationer
          </Typography>
        </Box>
        <Typography className={classes.subtitle}>
          Konfigurera dina preferenser för att få personliga föreläsningsrekommendationer
        </Typography>
        <Button
          variant="contained"
          className={classes.setupButton}
          onClick={onOpenPreferences}
        >
          Konfigurera AI-inställningar
        </Button>
      </Paper>
    );
  }

  if (!userPreferences.enableSmartRecommendations) {
    return (
      <Paper className={classes.recommendationsContainer}>
        <Box className={classes.header}>
          <LightbulbIcon className={classes.aiIcon} />
          <Typography className={classes.title}>
            Smarta AI-rekommendationer
          </Typography>
        </Box>
        <Typography className={classes.subtitle}>
          AI-rekommendationer är inaktiverade. Aktivera dem i inställningarna för personliga rekommendationer.
        </Typography>
        <Button
          variant="contained"
          className={classes.setupButton}
          onClick={onOpenPreferences}
        >
          Aktivera AI-rekommendationer
        </Button>
      </Paper>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Paper className={classes.recommendationsContainer}>
        <Box className={classes.header}>
          <LightbulbIcon className={classes.aiIcon} />
          <Typography className={classes.title}>
            Smarta AI-rekommendationer
          </Typography>
        </Box>
        <Typography className={classes.noRecommendations}>
          Inga rekommendationer just nu. Prova att uppdatera dina preferenser eller välj fler fokusområden.
        </Typography>
        <Button
          variant="contained"
          className={classes.setupButton}
          onClick={onOpenPreferences}
        >
          Uppdatera preferenser
        </Button>
      </Paper>
    );
  }

  return (
    <Paper className={classes.recommendationsContainer}>
      <Box className={classes.header}>
        <LightbulbIcon className={classes.aiIcon} />
        <Typography className={classes.title}>
          Smarta AI-rekommendationer
        </Typography>
        <Tooltip title="AI-inställningar">
          <IconButton
            size="small"
            onClick={onOpenPreferences}
            style={{ marginLeft: "auto", color: "#ccc" }}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <Typography className={classes.subtitle}>
        Baserat på dina preferenser rekommenderar AI:n dessa föreläsningar:
      </Typography>

      {recommendations.map((rec, index) => (
        <div
          key={rec.lecture.id}
          className={classes.recommendationCard}
          onClick={() => handleLectureClick(rec.lecture, rec)}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box flex={1}>
              <Typography className={classes.lectureTitle}>
                {rec.lecture.lectureNumber}. {rec.lecture.title}
              </Typography>
              <Typography className={classes.lectureDetails}>
                {rec.lecture.date} • {rec.lecture.time}
              </Typography>
              
              <Box display="flex" alignItems="center" marginTop={1}>
                <Chip
                  label={`AI-poäng: ${rec.score.toFixed(1)}`}
                  className={classes.scoreChip}
                  size="small"
                />
                <Chip
                  label={getRecommendationExplanation(rec)}
                  className={classes.reasonChip}
                  size="small"
                />
              </Box>
            </Box>
            
            <IconButton
              className={classes.expandButton}
              onClick={(e) => {
                e.stopPropagation();
                handleExpand(rec.lecture.id);
              }}
            >
              {expanded[rec.lecture.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expanded[rec.lecture.id]}>
            <Box marginTop={2}>
              <Typography variant="caption" style={{ color: "#ccc", display: "block", marginBottom: 1 }}>
                Varför denna rekommendation:
              </Typography>
              <Box>
                {rec.reasons.map((reason: string, reasonIndex: number) => (
                  <Chip
                    key={reasonIndex}
                    label={reason}
                    className={classes.reasonChip}
                    size="small"
                  />
                ))}
              </Box>
              <Box marginTop={2}>
                <Button
                  size="small"
                  className={classes.feedbackButton}
                  startIcon={<FeedbackIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFeedbackOpen(rec);
                  }}
                >
                  Ge feedback till AI:n
                </Button>
              </Box>
            </Box>
          </Collapse>
        </div>
      ))}

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialogOpen}
        onClose={handleFeedbackClose}
        className={classes.feedbackDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle style={{ color: "white" }}>
          Feedback för AI-rekommendation
        </DialogTitle>
        <DialogContent>
          {feedbackLecture && (
            <Typography variant="body2" style={{ color: "#ccc", marginBottom: 16 }}>
              Föreläsning: {feedbackLecture.lecture.lectureNumber}. {feedbackLecture.lecture.title}
            </Typography>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Berätta vad som var fel med denna rekommendation..."
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className={classes.feedbackTextField}
            placeholder="T.ex. 'Trauma handlade inte om neurologi utan om ortopedi och traumatologi'"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFeedbackClose} style={{ color: "#ccc" }}>
            Avbryt
          </Button>
          <Button 
            onClick={handleFeedbackSubmit} 
            disabled={!feedbackText.trim()}
            style={{ color: "#2196f3" }}
          >
            Skicka feedback
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={feedbackSuccess}
        autoHideDuration={3000}
        onClose={() => setFeedbackSuccess(false)}
      >
        <div style={{ 
          background: "#4caf50", 
          color: "white", 
          padding: "12px 16px", 
          borderRadius: "4px",
          fontWeight: 500
        }}>
          Tack för din feedback! AI:n kommer att lära sig från detta.
        </div>
      </Snackbar>
    </Paper>
  );
};

export default SmartRecommendations; 