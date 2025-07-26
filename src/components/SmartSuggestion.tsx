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
  useTheme,
} from "@material-ui/core/styles";
import {
  EmojiObjects as SuggestionIcon,
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Close as CloseIcon,
} from "@material-ui/icons";
import { useSelector } from "react-redux";
import { RootState } from "store/types";
import Lecture from "types/lecture";
import { calculateDuration } from "utils/processLectures";

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
    suggestionIcon: {
      color: "#ffd700",
      fontSize: "1.5rem",
    },
    suggestionTitle: {
      color: "white",
      fontWeight: 600,
      fontSize: "1.1rem",
    },
    lectureCard: {
      background: "rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(10px)",
      borderRadius: "12px",
      padding: theme.spacing(2.5),
      marginBottom: theme.spacing(2),
      border: "1px solid rgba(255, 255, 255, 0.2)",
      position: "relative",
      zIndex: 1,
      animation: "$breathingAnimation 4s ease-in-out infinite",
    },
    lectureNumber: {
      background: "rgba(255, 255, 255, 0.9)",
      color: "#1a237e",
      fontWeight: 900,
      fontSize: "1rem",
      width: "36px",
      height: "36px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing(1.5),
    },
    lectureTitle: {
      color: "white",
      fontWeight: 600,
      fontSize: "1.1rem",
      marginBottom: theme.spacing(1),
    },
    lectureDetails: {
      color: "rgba(255, 255, 255, 0.8)",
      fontSize: "0.9rem",
      marginBottom: theme.spacing(1.5),
    },
    reasonContainer: {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "8px",
      padding: theme.spacing(1.5),
      marginBottom: theme.spacing(2),
      border: "1px solid rgba(255, 255, 255, 0.2)",
      position: "relative",
      zIndex: 1,
    },
    reasonText: {
      color: "white",
      fontSize: "0.95rem",
      fontStyle: "italic",
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
    },
    reasonIcon: {
      color: "#ffd700",
      fontSize: "1.2rem",
    },
    actionContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      position: "relative",
      zIndex: 1,
    },
    selectButton: {
      background: "linear-gradient(45deg, #ffd700, #ffeb3b)",
      color: "#1a237e",
      fontWeight: 600,
      padding: "10px 24px",
      borderRadius: "8px",
      "&:hover": {
        background: "linear-gradient(45deg, #ffeb3b, #fff59d)",
        transform: "translateY(-1px)",
        boxShadow: "0 6px 20px rgba(255, 215, 0, 0.4)",
      },
    },
    confidenceChip: {
      background: "rgba(255, 255, 255, 0.2)",
      color: "white",
      fontWeight: 500,
    },
    closeButton: {
      color: "rgba(255, 255, 255, 0.7)",
      padding: theme.spacing(0.5),
      position: "relative",
      zIndex: 2,
      "&:hover": {
        color: "white",
        background: "rgba(255, 255, 255, 0.1)",
      },
    },
    tooltipReason: {
      cursor: "help",
      "&:hover": {
        background: "rgba(255, 255, 255, 0.15)",
      },
    },
    "@keyframes breathingAnimation": {
      "0%, 100%": {
        transform: "scale(1)",
        boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
      },
      "50%": {
        transform: "scale(1.02)",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
      },
    },

  })
);

interface SmartSuggestionProps {
  onLectureSelect: (lecture: Lecture) => void;
  onDismiss?: () => void;
}

const SmartSuggestion: React.FC<SmartSuggestionProps> = ({ onLectureSelect, onDismiss }) => {
  const classes = useStyles();
  const theme = useTheme();
  const [isDismissed, setIsDismissed] = useState(false);
  
  const weeksData = useSelector((state: RootState) => state.lectures.lectures);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  const currentUserName = currentUser?.full_name?.split(" ")[0] || "";
  const allUsers = ["Mattias", "Albin", "David"];
  const otherUsers = allUsers.filter(user => user !== currentUserName);

  // AI-driven suggestion logic
  const suggestion = useMemo(() => {
    if (!weeksData.length || !currentUserName) return null;

    // Get all lectures for current course
    const allLectures: Lecture[] = [];
    weeksData.forEach(week => {
      week.lectures.forEach(lecture => {
        allLectures.push(lecture);
      });
    });

    // Filter lectures not selected by current user
    const unselectedLectures = allLectures.filter(lecture => 
      !lecture.checkboxState?.[currentUserName]?.confirm
    );

    if (unselectedLectures.length === 0) return null;

    // AI Scoring System - Multiple factors
    const scoredLectures = unselectedLectures.map(lecture => {
      let score = 0;
      let reason = "";
      let reasonIcon = SuggestionIcon;
      let confidence = 0;

      // Factor 1: Prefer lectures others haven't selected (Load balancing)
      const otherUsersSelected = otherUsers.filter(user => 
        lecture.checkboxState?.[user]?.confirm
      );
      if (otherUsersSelected.length === 0) {
        // Bonus for unselected lectures
        score += 50;
        confidence += 30;
        reason = `Ingen annan har valt denna än - bra för arbetsfördelning!`;
        reasonIcon = PeopleIcon;
      } else {
        // Penalty for already selected lectures
        score -= otherUsersSelected.length * 25;
        confidence += 10; // Still some confidence as it shows lecture is viable
        if (otherUsersSelected.length === 2) {
          reason = `Både ${otherUsersSelected.join(" och ")} har redan valt denna - undvik dubbelarbete`;
          reasonIcon = PeopleIcon;
        } else {
          reason = `${otherUsersSelected[0]} har redan valt denna - överväg andra alternativ`;
          reasonIcon = PeopleIcon;
        }
      }

      // Factor 2: Time-based urgency (shorter time = higher score)
      const lectureDate = new Date(lecture.date);
      const today = new Date();
      const daysDiff = Math.ceil((lectureDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      // Higher score for sooner lectures (urgency-based)
      if (daysDiff >= 0) {
        if (daysDiff === 0) {
          score += 60;
          confidence += 30;
          reason = "Denna föreläsning är idag - akut!";
          reasonIcon = ScheduleIcon;
        } else if (daysDiff <= 1) {
          score += 50;
          confidence += 25;
          reason = "Denna föreläsning är imorgon - hög prioritet!";
          reasonIcon = ScheduleIcon;
        } else if (daysDiff <= 3) {
          score += 40;
          confidence += 20;
          reason = `Denna föreläsning är om ${daysDiff} dagar - dags att förbereda!`;
          reasonIcon = ScheduleIcon;
        } else if (daysDiff <= 7) {
          score += 25;
          confidence += 15;
          reason = `${daysDiff} dagar kvar - bra timing`;
          reasonIcon = ScheduleIcon;
        } else if (daysDiff <= 14) {
          score += 10;
          confidence += 10;
        }
        // Past lectures get penalty
      } else {
        score -= Math.abs(daysDiff) * 10; // Penalty for past lectures
      }

      // Factor 3: Pattern matching - user's typical selection behavior
      const userSelections = allLectures.filter(l => 
        l.checkboxState?.[currentUserName]?.confirm
      );
      
      // Check if user typically selects lectures around this time/day
      if (userSelections.length > 0) {
        const userDays = userSelections.map(l => new Date(l.date).getDay());
        const lectureDay = lectureDate.getDay();
        const dayFrequency = userDays.filter(day => day === lectureDay).length;
        
        if (dayFrequency > 0) {
          score += dayFrequency * 15;
          confidence += 15;
          const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
          reason = `Du brukar välja föreläsningar på ${days[lectureDay]}ar`;
          reasonIcon = TrendingIcon;
        }
      }

      // Factor 4: Temporal spacing (avoid clustering lectures too close together)
      if (userSelections.length > 0) {
        const currentLectureDate = new Date(lecture.date);
        
        // Find the closest selected lecture in time
        const timeDifferences = userSelections.map(selectedLecture => {
          const selectedDate = new Date(selectedLecture.date);
          return Math.abs(currentLectureDate.getTime() - selectedDate.getTime()) / (1000 * 3600 * 24);
        });
        
        const closestDaysDiff = Math.min(...timeDifferences);
        
        // Reward lectures that are well-spaced from existing selections
        if (closestDaysDiff >= 7) {
          // At least a week away from other lectures
          score += 40;
          confidence += 25;
          reason = `Bra avstånd från dina andra val - ger tid för reflektion`;
          reasonIcon = ScheduleIcon;
        } else if (closestDaysDiff >= 3) {
          // At least 3 days away
          score += 25;
          confidence += 15;
          reason = `Lagom avstånd från dina andra föreläsningar`;
          reasonIcon = ScheduleIcon;
        } else if (closestDaysDiff >= 1) {
          // At least 1 day away
          score += 10;
          confidence += 10;
        } else {
          // Same day or very close - penalty for clustering
          score -= 30;
          confidence += 5;
          reason = `Mycket nära dina andra val - risk för överbelastning`;
          reasonIcon = ScheduleIcon;
        }
      }

      // Factor 5: Workload balancing (lower weekly load = higher score)
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      
      const userThisWeekCount = allLectures.filter(l => {
        const lDate = new Date(l.date);
        return lDate >= thisWeekStart && 
               lDate < new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000) &&
               l.checkboxState?.[currentUserName]?.confirm;
      }).length;

      // Higher bonus for lower workload
      if (userThisWeekCount === 0) {
        score += 45;
        confidence += 25;
        reason = "Du har inte valt någon föreläsning denna vecka än - bra att komma igång!";
        reasonIcon = StarIcon;
      } else if (userThisWeekCount === 1) {
        score += 30;
        confidence += 20;
        reason = "Du har bara valt 1 föreläsning denna vecka - rum för mer!";
        reasonIcon = StarIcon;
      } else if (userThisWeekCount === 2) {
        score += 15;
        confidence += 10;
        reason = "Du har valt 2 föreläsningar denna vecka - lagom belastning";
        reasonIcon = StarIcon;
      } else {
        // Penalty for high workload
        score -= (userThisWeekCount - 2) * 10;
        confidence += 5;
        reason = `Du har redan valt ${userThisWeekCount} föreläsningar denna vecka - hög belastning`;
        reasonIcon = StarIcon;
      }

      // Factor 6: Duration matching (prefer shorter lectures if user is busy)
      const duration = calculateDuration(lecture.time);
      if (duration <= 2) {
        score += 10;
        confidence += 5;
      }

      // Ensure we have a reason
      if (!reason) {
        reason = "Rekommenderad baserat på dina mönster";
        reasonIcon = SuggestionIcon;
      }

      // Normalize confidence to 0-100
      confidence = Math.min(100, confidence);

      return {
        lecture,
        score,
        reason,
        reasonIcon,
        confidence
      };
    });

    // Sort by score and return top suggestion
    scoredLectures.sort((a, b) => b.score - a.score);
    return scoredLectures[0] || null;
    
  }, [weeksData, currentUserName, otherUsers]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  // Early return after all hooks have been called
  if (!suggestion || isDismissed) return null;

  const { lecture, reason, reasonIcon: ReasonIcon, confidence } = suggestion;
  const duration = calculateDuration(lecture.time);

  // Create detailed tooltip text explaining the AI reasoning
  const selectedByOthers = otherUsers.filter(user => lecture.checkboxState?.[user]?.confirm).length;
  const daysLeft = Math.ceil((new Date(lecture.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  
  const tooltipText = `AI-analys: Denna föreläsning rekommenderas baserat på flera faktorer:
  
  ⚖️ Arbetsfördelning: ${selectedByOthers}/2 andra har valt den (färre = bättre)
  ⏰ Tidsprioritet: ${daysLeft} dagar kvar (kortare tid = högre prioritet)
  📈 Dagmönster: Analyserar vilka veckodagar du brukar välja
  📅 Tidsspridning: Undviker att klumpa föreläsningar tätt tillsammans
  💼 Veckobelastning: Baseras på din nuvarande veckoaktivitet
  
  Konfidenspoäng: ${confidence}%`;

  return (
    <Paper className={classes.suggestionContainer} elevation={0}>
      <div className={classes.suggestionHeader}>
        <div className={classes.headerLeft}>
          <SuggestionIcon className={classes.suggestionIcon} />
          <Typography className={classes.suggestionTitle}>
            Smart rekommendation
          </Typography>
        </div>
        <Tooltip title="Stäng rekommendation" arrow>
          <IconButton 
            className={classes.closeButton}
            onClick={handleDismiss}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className={classes.lectureCard}>
        <div className={classes.lectureNumber}>
          {lecture.lectureNumber}
        </div>
        
        <Typography className={classes.lectureTitle}>
          {lecture.title}
        </Typography>
        
        <Typography className={classes.lectureDetails}>
          {lecture.date} • {lecture.time} • {duration}h
        </Typography>

        <Tooltip title={tooltipText} arrow placement="top">
          <div className={`${classes.reasonContainer} ${classes.tooltipReason}`}>
            <Typography className={classes.reasonText}>
              <ReasonIcon className={classes.reasonIcon} />
              {reason}
            </Typography>
          </div>
        </Tooltip>

        <div className={classes.actionContainer}>
          <Button
            variant="contained"
            className={classes.selectButton}
            onClick={() => onLectureSelect(lecture)}
          >
            Välj denna föreläsning
          </Button>
          
          <Chip
            label={`${confidence}% säkerhet`}
            size="small"
            className={classes.confidenceChip}
          />
        </div>
      </div>
    </Paper>
  );
};

export default SmartSuggestion; 