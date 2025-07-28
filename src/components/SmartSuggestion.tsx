import React, { useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  EmojiObjects as SuggestionIcon,
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Close as CloseIcon,
  ThumbUp as AcceptIcon,
  ThumbDown as RejectIcon,
} from "@material-ui/icons";
import { useSelector } from "react-redux";
import { RootState } from "store/types";
import Lecture from "types/lecture";
import { calculateDuration } from "utils/processLectures";
import { 
  recordRecommendationFeedback, 
  getSmartRecommendations, 
  loadUserPreferences,
  getRecommendationExplanation
} from "utils/smartRecommendations";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    suggestionContainer: {
      background: "linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)",
      borderRadius: "16px",
      padding: theme.spacing(3),
      marginBottom: theme.spacing(4),
      border: "2px solid rgba(255, 255, 255, 0.1)",
      position: "relative",
      boxShadow: "0 8px 32px rgba(26, 35, 126, 0.3)",
      animation: "$breathingAnimation 12s ease-in-out infinite",
    },
    suggestionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
      position: "relative",
      zIndex: 1,
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(0.5),
    },
    aiIcon: {
      fontSize: "2rem",
      color: "#FFD700",
      filter: "drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))",
    },
    title: {
      fontWeight: 700,
      color: "white",
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
    },
    confidenceChip: {
      background: "rgba(255, 255, 255, 0.15)",
      color: "white",
      fontWeight: 600,
      backdropFilter: "blur(10px)",
    },
    closeButton: {
      color: "rgba(255, 255, 255, 0.8)",
      "&:hover": {
        color: "white",
        background: "rgba(255, 255, 255, 0.1)",
      },
    },
    lectureInfo: {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    lectureTitle: {
      fontWeight: 600,
      color: "white",
      marginBottom: theme.spacing(1),
    },
    lectureDetails: {
      display: "flex",
      gap: theme.spacing(2),
      marginBottom: theme.spacing(1),
      flexWrap: "wrap",
    },
    detailChip: {
      background: "rgba(255, 255, 255, 0.2)",
      color: "white",
      fontWeight: 500,
    },
    reasonSection: {
      marginBottom: theme.spacing(2),
    },
    reasonText: {
      color: "rgba(255, 255, 255, 0.9)",
      fontStyle: "italic",
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
    },
    reasonIcon: {
      fontSize: "1.2rem",
      color: "#FFD700",
    },
    actionButtons: {
      display: "flex",
      gap: theme.spacing(1),
      justifyContent: "center",
    },
    acceptButton: {
      background: "linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)",
      color: "white",
      fontWeight: 600,
      "&:hover": {
        background: "linear-gradient(45deg, #388e3c 30%, #4caf50 90%)",
        transform: "translateY(-2px)",
        boxShadow: "0 6px 20px rgba(76, 175, 80, 0.4)",
      },
      transition: "all 0.3s ease",
    },
    rejectButton: {
      background: "linear-gradient(45deg, #f44336 30%, #ef5350 90%)",
      color: "white",
      fontWeight: 600,
      "&:hover": {
        background: "linear-gradient(45deg, #d32f2f 30%, #f44336 90%)",
        transform: "translateY(-2px)",
        boxShadow: "0 6px 20px rgba(244, 67, 54, 0.4)",
      },
      transition: "all 0.3s ease",
    },
    feedbackButtons: {
      display: "flex",
      gap: theme.spacing(0.5),
      marginLeft: theme.spacing(1),
    },
    feedbackButton: {
      minWidth: "auto",
      padding: theme.spacing(0.5),
      color: "rgba(255, 255, 255, 0.7)",
      "&:hover": {
        color: "white",
        background: "rgba(255, 255, 255, 0.1)",
      },
    },
    "@keyframes breathingAnimation": {
      "0%": { transform: "scale(1)", filter: "brightness(1)" },
      "50%": { transform: "scale(1.02)", filter: "brightness(1.1)" },
      "100%": { transform: "scale(1)", filter: "brightness(1)" },
    },
  })
);

interface SmartSuggestionProps {
  onLectureSelect: (lecture: Lecture) => void;
  onDismiss?: () => void;
}

interface SuggestionData {
  lecture: Lecture;
  score: number;
  reason: string;
  reasonIcon: any;
  confidence: number;
  recommendationId: string;
}

const SmartSuggestion: React.FC<SmartSuggestionProps> = ({ onLectureSelect, onDismiss }) => {
  const classes = useStyles();
  const [isDismissed, setIsDismissed] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  
  const weeksData = useSelector((state: RootState) => state.lectures.lectures);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const currentUserName = currentUser?.full_name?.split(" ")[0] || "";
  const allUsers = ["Mattias", "Albin", "David"];
  const otherUsers = allUsers.filter(user => user !== currentUserName);

  // New AI-driven suggestion using learning system
  const suggestion: SuggestionData | null = useMemo(() => {
    if (!weeksData.length || !currentUserName) return null;

    // Get all lectures for current course
    const allLectures: Lecture[] = [];
    weeksData.forEach(week => {
      week.lectures.forEach(lecture => {
        allLectures.push(lecture);
      });
    });

    // Load user preferences
    const userPreferences = loadUserPreferences(currentUserName);
    if (!userPreferences || !userPreferences.enableSmartRecommendations) return null;

    // Get AI recommendations using the new learning system
    const recommendations = getSmartRecommendations(
      allLectures, 
      userPreferences, 
      currentUserName, 
      1 // Get only the top recommendation for display
    );

    if (recommendations.length === 0) return null;

    // Use the top recommendation from the new AI system
    const topRecommendation = recommendations[0];

    return {
      lecture: topRecommendation.lecture,
      score: topRecommendation.score,
      reason: getRecommendationExplanation(topRecommendation),
      reasonIcon: SuggestionIcon,
      confidence: Math.min(95, Math.max(50, topRecommendation.score * 10)), // Convert score to confidence percentage
      recommendationId: topRecommendation.recommendationId
    };
    
  }, [weeksData, currentUserName]);

  const handleAccept = () => {
    if (suggestion) {
      // Record positive feedback
      recordRecommendationFeedback(
        currentUserName,
        suggestion.recommendationId,
        suggestion.lecture.id,
        'accepted',
        [suggestion.reason]
      );
      
      setFeedbackGiven(true);
      onLectureSelect(suggestion.lecture);
    }
  };

  const handleReject = () => {
    if (suggestion) {
      // Record negative feedback
      recordRecommendationFeedback(
        currentUserName,
        suggestion.recommendationId,
        suggestion.lecture.id,
        'rejected',
        [suggestion.reason]
      );
      
      setFeedbackGiven(true);
      setIsDismissed(true);
      if (onDismiss) {
        onDismiss();
      }
    }
  };

  const handleDismiss = () => {
    if (suggestion) {
      // Record that recommendation was ignored
      recordRecommendationFeedback(
        currentUserName,
        suggestion.recommendationId,
        suggestion.lecture.id,
        'ignored',
        [suggestion.reason]
      );
    }
    
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleFeedback = (isPositive: boolean) => {
    if (suggestion && !feedbackGiven) {
      recordRecommendationFeedback(
        currentUserName,
        suggestion.recommendationId,
        suggestion.lecture.id,
        isPositive ? 'accepted' : 'rejected',
        [suggestion.reason],
        isPositive ? ['Bra rekommendation'] : ['Dålig rekommendation']
      );
      setFeedbackGiven(true);
    }
  };

  // Early return after all hooks have been called
  if (!suggestion || isDismissed) return null;

  const { lecture, reason, reasonIcon: ReasonIcon, confidence, recommendationId } = suggestion;
  const duration = calculateDuration(lecture.time);

  // Create detailed tooltip text explaining the AI reasoning
  const selectedByOthers = otherUsers.filter(user => lecture.checkboxState?.[user]?.confirm).length;
  const daysLeft = Math.ceil((new Date(lecture.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  
  const tooltipText = `🤖 AI-rekommendation med ${confidence}% säkerhet

📊 Personaliserad analys baserad på:
• Dina inställningar och preferenser
• Tidigare val och feedback
• Föreläsningens innehåll och timing
• Arbetsfördelning (${selectedByOthers}/2 andra har valt)
• ${daysLeft} dagar kvar till föreläsning

💡 ${reason}

🧠 AI:n lär sig från din feedback för att ge bättre rekommendationer!`;

  return (
    <Paper className={classes.suggestionContainer} elevation={3}>
      <div className={classes.suggestionHeader}>
        <div className={classes.headerLeft}>
          <SuggestionIcon className={classes.aiIcon} />
          <Typography variant="h6" className={classes.title}>
            🤖 AI Rekommendation
          </Typography>
          <Chip 
            label={`${confidence}% säker`} 
            size="small" 
            className={classes.confidenceChip}
          />
        </div>
        <div className={classes.headerRight}>
          {!feedbackGiven && (
            <div className={classes.feedbackButtons}>
              <Tooltip title="Bra rekommendation - hjälper AI:n att lära sig">
                <IconButton 
                  size="small" 
                  className={classes.feedbackButton}
                  onClick={() => handleFeedback(true)}
                >
                  <AcceptIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Dålig rekommendation - hjälper AI:n att förbättras">
                <IconButton 
                  size="small" 
                  className={classes.feedbackButton}
                  onClick={() => handleFeedback(false)}
                >
                  <RejectIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          )}
          <IconButton 
            size="small" 
            onClick={handleDismiss}
            className={classes.closeButton}
          >
            <CloseIcon />
          </IconButton>
        </div>
      </div>

      <div className={classes.lectureInfo}>
        <Typography variant="h6" className={classes.lectureTitle}>
          {lecture.title}
        </Typography>
        
        <div className={classes.lectureDetails}>
          <Chip 
            icon={<ScheduleIcon />} 
            label={`${lecture.date} • ${lecture.time}`} 
            className={classes.detailChip}
            size="small"
          />
          <Chip 
            label={`${duration} min`} 
            className={classes.detailChip}
            size="small"
          />
          <Chip 
            icon={<PeopleIcon />} 
            label={`${selectedByOthers}/2 andra har valt`} 
            className={classes.detailChip}
            size="small"
          />
        </div>
      </div>

      <div className={classes.reasonSection}>
        <div className={classes.reasonText}>
          <ReasonIcon className={classes.reasonIcon} />
          <span>{reason}</span>
        </div>
      </div>

      <Tooltip title={tooltipText} placement="top">
        <div className={classes.actionButtons}>
          <Button
            variant="contained"
            startIcon={<StarIcon />}
            onClick={handleAccept}
            className={classes.acceptButton}
          >
            Välj föreläsning
          </Button>
          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={handleReject}
            className={classes.rejectButton}
          >
            Inte intresserad
          </Button>
        </div>
      </Tooltip>

      {feedbackGiven && (
        <Box mt={1} textAlign="center">
          <Typography variant="caption" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            ✅ Tack för din feedback! AI:n använder detta för att förbättra framtida rekommendationer.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default SmartSuggestion; 