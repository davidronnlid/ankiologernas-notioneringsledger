import React, { useState, useMemo, useRef, useEffect, Fragment } from "react";
import Layout from "@/components/Layout";
import {
  Typography,
  Grid,
  Box,
  Paper,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
  LinearProgress,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@material-ui/core";
import NotifyButton from "@/components/NotifyButton";

import NotionSetupManager from "@/components/NotionSetupManager";
import NotionIntegrationSetup from "@/components/NotionIntegrationSetup";
import SmartRecommendations from "@/components/SmartRecommendations";
import UserPreferencesDialog from "@/components/UserPreferencesDialog";
import WeeklySummary from "@/components/WeeklySummary";
import ExamProgressChart from "@/components/ExamProgressChart";
import DuplicateRemovalNotification from "@/components/DuplicateRemovalNotification";
import AddLectureModal from "@/components/AddLectureModal";
import EditLectureModal from "@/components/EditLectureModal";
import {
  makeStyles,
  Theme,
  createStyles,
  useTheme as useMuiTheme,
} from "@material-ui/core/styles";
import { useTheme } from "../contexts/ThemeContext";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import BlockIcon from "@mui/icons-material/Block";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Lecture from "types/lecture";
import { RootState } from "store/types";
import { useSelector, useDispatch } from "react-redux";
import {
  calculateDuration,
  calculateTotalCourseHours,
  getDisplayCourseTitle,
  sortLecturesIntoCoursesAndWeeks,
} from "utils/processLectures";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";
import { updateLectureCheckboxState, setLectures } from "store/slices/lecturesReducer";
import { addNotification } from "store/slices/notificationsReducer";
import { isMac, sendMultiChannelMacNotification } from "utils/macNotifications";
import { getProfilePicUrl } from "../utils/profilePicMapper";
import { coursePeriods } from "../utils/coursePeriods";
import { 
  updateNotionLectureTags, 
  isNotionIntegrationEnabled, 
  getNotionUpdateNotification 
} from "utils/notionIntegration";
import { handleLectureUrlHash } from "../utils/urlGenerator";
import { syncLectureUrls, updateLectureUrl } from "../utils/notionUrlSync";
import { logNotionEnvironmentVariables, testNotionConnection } from "../utils/notionDebug";
import { syncAllLecturesToNotion } from "../utils/notionLectureSync";
import { SubjectArea } from "../types/lecture";
import { 
  addLecture, 
  calculateNextLectureNumber, 
  formatLectureData,
  editLecture,
  EditLectureData
} from "utils/lectureAPI";
import { dataSyncManager } from "utils/dataSync";
import { DatabaseNotifications } from "utils/notificationSystem";
import { removeDuplicateLectures } from "utils/removeDuplicateLectures";
import { useNotionSetup } from "../hooks/useNotionSetup";
import { useNotionSync } from "../contexts/NotionSyncContext";
import {
  isWithinInterval,
  parseISO,
  startOfWeek,
  endOfWeek,
  parse,
  isBefore,
  isAfter,
  isSameDay,
} from "date-fns";

type PersonStats = {
  [key: string]: { selected: number; hours: number };
};

interface PersonTotals {
  FL: number;
  hours: number;
  wishedHours: number;
}

type Totals = {
  [key: string]: PersonTotals;
};

const useStyles = makeStyles((muiTheme: Theme) =>
  createStyles({
    pageContainer: {
      padding: muiTheme.spacing(4),
      maxWidth: "1400px",
      margin: "0 auto",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      minHeight: "100vh",
      transition: "all 0.5s ease-in-out",
    },
    headerSection: {
      textAlign: "center" as const,
      marginBottom: muiTheme.spacing(4),
    },
    statsSection: {
      marginBottom: muiTheme.spacing(6),
    },
    userStatsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: muiTheme.spacing(3),
      marginBottom: muiTheme.spacing(4),
    },
    statsCard: {
      background: "linear-gradient(135deg, rgba(44, 44, 44, 0.9) 0%, rgba(26, 26, 26, 0.9) 100%)",
      borderRadius: "20px",
      padding: muiTheme.spacing(3),
      border: "2px solid rgba(64, 64, 64, 0.6)",
      transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative",
      overflow: "hidden",
      animation: "$breathingAnimation 12s ease-in-out infinite",
      backdropFilter: "blur(10px)",
      "&:hover": {
        transform: "translateY(-6px)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        borderColor: "rgba(102, 102, 102, 0.8)",
        background: "linear-gradient(135deg, rgba(44, 44, 44, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)",
      },
      "&.currentUser": {
        background: "linear-gradient(135deg, rgba(44, 44, 44, 0.95) 0%, rgba(26, 61, 26, 0.95) 100%)",
        borderColor: "rgba(76, 175, 80, 0.8)",
        boxShadow: "0 15px 35px rgba(76, 175, 80, 0.2)",
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-2px",
          left: "-2px",
          right: "-2px",
          bottom: "-2px",
          background: "linear-gradient(45deg, rgba(76, 175, 80, 0.6), rgba(102, 187, 106, 0.6), rgba(76, 175, 80, 0.6))",
          borderRadius: "20px",
          zIndex: -1,
          animation: "$breathingAnimation 12s ease-in-out infinite",
        },
        "& .MuiTypography-root": {
          color: "white !important",
        },
        "& span": {
          color: "white !important",
        },
      },
    },
    statsHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: muiTheme.spacing(2),
    },
    userName: {
      fontSize: "1.3rem",
      fontWeight: 600,
      color: "white",
      display: "flex",
      alignItems: "center",
      gap: muiTheme.spacing(1),
    },
    currentUserBadge: {
      background: "linear-gradient(45deg, #4caf50, #66bb6a)",
      color: "white",
      fontSize: "0.7rem",
      padding: "4px 8px",
      borderRadius: "12px",
      fontWeight: 600,
    },
    statRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: muiTheme.spacing(1),
      padding: muiTheme.spacing(0.5, 0),
    },
    statLabel: {
      fontSize: "0.9rem",
      color: "#ccc",
    },
    statValue: {
      fontSize: "1rem",
      fontWeight: 600,
      color: "white",
    },
    progressContainer: {
      marginTop: muiTheme.spacing(2),
      marginBottom: muiTheme.spacing(1),
    },
    progressLabel: {
      fontSize: "0.85rem",
      color: "white",
      marginBottom: muiTheme.spacing(1),
    },
    progressBar: {
      height: "12px",
      borderRadius: "6px",
      backgroundColor: "#333",
    },
    progressText: {
      fontSize: "0.8rem",
      color: "#ccc",
      textAlign: "center" as const,
      marginTop: muiTheme.spacing(1),
    },
    milestoneReached: {
      animation: "$celebration 2s ease-in-out",
    },
    searchSection: {
      marginBottom: muiTheme.spacing(4),
      display: "flex",
      justifyContent: "center",
      gap: muiTheme.spacing(2),
      alignItems: "center",
      flexWrap: "wrap" as const,
    },
    searchField: {
      maxWidth: "400px",
      width: "100%",
      "& .MuiOutlinedInput-root": {
        background: "#2c2c2c",
        "& fieldset": {
          borderColor: "#404040",
        },
        "&:hover fieldset": {
          borderColor: "#666",
        },
        "&.Mui-focused fieldset": {
          borderColor: "white",
        },
      },
      "& .MuiInputBase-input": {
        color: "white",
      },
      "& .MuiInputLabel-root": {
        color: "#ccc",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "white",
      },
    },
    filterField: {
      minWidth: "200px",
      "& .MuiOutlinedInput-root": {
        background: "#2c2c2c",
        "& fieldset": {
          borderColor: "#404040",
        },
        "&:hover fieldset": {
          borderColor: "#666",
        },
        "&.Mui-focused fieldset": {
          borderColor: "white",
        },
      },
      "& .MuiInputBase-input": {
        color: "white",
      },
      "& .MuiInputLabel-root": {
        color: "#ccc",
      },
      "& .MuiInputLabel-root.Mui-focused": {
        color: "white",
      },
      "& .MuiSelect-icon": {
        color: "#ccc",
      },
    },
    lectureCard: {
      background: "linear-gradient(135deg, rgba(44, 44, 44, 0.9) 0%, rgba(26, 26, 26, 0.9) 100%)",
      borderRadius: "16px",
      padding: muiTheme.spacing(3),
      marginBottom: muiTheme.spacing(3),
      border: "2px solid rgba(64, 64, 64, 0.6)",
      transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative",
      overflow: "hidden",
      cursor: "pointer",
      animation: "$breathingAnimation 12s ease-in-out infinite",
      backdropFilter: "blur(8px)",
      "&:hover": {
        transform: "translateY(-6px) scale(1.01)",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.3)",
        borderColor: "rgba(102, 102, 102, 0.8)",
        background: "linear-gradient(135deg, rgba(44, 44, 44, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)",
      },
      "&.selected": {
        background: "linear-gradient(135deg, rgba(44, 44, 44, 0.95) 0%, rgba(26, 77, 26, 0.95) 100%)",
        borderColor: "rgba(76, 175, 80, 0.8)",
        boxShadow: "0 15px 35px rgba(76, 175, 80, 0.25)",
        transform: "translateY(-2px)",
      },
      "&.lecture-highlight": {
        borderColor: "#ffeb3b",
        boxShadow: "0 0 20px rgba(255, 235, 59, 0.6)",
        background: "linear-gradient(135deg, rgba(44, 44, 44, 0.95) 0%, rgba(77, 77, 26, 0.95) 100%)",
        animation: "$highlightPulse 2s ease-in-out 2",
      },
    },
    // Compact add button positioned between lecture cards
    compactAddButton: {
      position: "absolute",
      right: "-24px",
      top: "50%",
      transform: "translateY(-50%)",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      background: "rgba(76, 175, 80, 0.9)",
      border: "2px solid rgba(255, 255, 255, 0.9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "all 0.3s ease",
      zIndex: 100,
      opacity: 0.8,
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
      "&:hover": {
        background: "rgba(76, 175, 80, 1)",
        borderColor: "rgba(255, 255, 255, 1)",
        transform: "translateY(-50%) scale(1.15)",
        opacity: 1,
        boxShadow: "0 4px 12px rgba(76, 175, 80, 0.5)",
      },
      "&:active": {
        transform: "translateY(-50%) scale(0.95)",
      },
    },
    compactAddIcon: {
      fontSize: "1rem",
      color: "rgba(255, 255, 255, 1)",
      fontWeight: "bold",
    },
    lectureNumber: {
      background: "#000000",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: "1.1rem",
      width: "40px",
      height: "40px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: muiTheme.spacing(2),
      transition: "all 0.3s ease",
      boxShadow: "0 3px 10px rgba(0, 0, 0, 0.5)",
      border: "2px solid #FFFFFF",
      "&.selected": {
        background: "#000000",
        color: "#FFD700",
        animation: "$bounce 0.6s ease-in-out",
        transform: "scale(1.1)",
        border: "2px solid #FFD700",
        boxShadow: "0 4px 15px rgba(255, 215, 0, 0.6)",
      },
    },
    lectureTitle: {
      fontSize: "1.1rem",
      fontWeight: 500,
      color: "white",
      marginBottom: muiTheme.spacing(2),
      lineHeight: "1.4",
      transition: "color 0.3s ease",
      ".selected &": {
        color: "#FFD700",
      },
    },
    categoryTag: {
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: "16px",
      fontSize: "0.75rem",
      fontWeight: 600,
      marginBottom: muiTheme.spacing(1),
      textAlign: "center" as const,
      color: "white",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      minWidth: "80px",
    },
    lectureInfo: {
      fontSize: "0.875rem",
      color: "#ccc",
      marginBottom: muiTheme.spacing(1),
      transition: "color 0.3s ease",
      ".selected &": {
        color: "#b8d4b8",
      },
    },
    selectionStatus: {
      display: "flex",
      gap: muiTheme.spacing(1),
      marginTop: muiTheme.spacing(2),
      marginBottom: muiTheme.spacing(2),
    },
    personChip: {
      height: "26px",
      fontSize: "0.75rem",
      color: "white",
      transition: "all 0.3s ease",
      "&:hover": {
        transform: "scale(1.05)",
      },
    },
    selectedChip: {
      background: "linear-gradient(45deg, #4caf50, #66bb6a)",
      color: "white",
      animation: "$pulse 2s ease-in-out infinite",
      boxShadow: "0 2px 8px rgba(76, 175, 80, 0.4)",
    },
    unselectedChip: {
      background: "#555",
      color: "#ccc",
    },
    searchResults: {
      color: "#ccc",
      fontSize: "0.875rem",
      marginBottom: muiTheme.spacing(2),
      textAlign: "center" as const,
    },
    completionBadge: {
      position: "absolute",
      top: "12px",
      // right position will be set inline to handle conditional logic
      background: "linear-gradient(45deg, #4caf50, #66bb6a)",
      color: "white",
      borderRadius: "50%",
      width: "32px",
      height: "32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      fontWeight: 700,
      animation: "$celebration 0.6s ease-in-out",
      boxShadow: "0 4px 12px rgba(76, 175, 80, 0.5)",
    },
    "@keyframes bounce": {
      "0%, 20%, 50%, 80%, 100%": { transform: "scale(1.1) translateY(0)" },
      "40%": { transform: "scale(1.15) translateY(-4px)" },
      "60%": { transform: "scale(1.1) translateY(-2px)" },
    },
    "@keyframes pulse": {
      "0%": {
        transform: "scale(1)",
        boxShadow: "0 2px 8px rgba(76, 175, 80, 0.4)",
      },
      "50%": {
        transform: "scale(1.05)",
        boxShadow: "0 4px 16px rgba(76, 175, 80, 0.6)",
      },
      "100%": {
        transform: "scale(1)",
        boxShadow: "0 2px 8px rgba(76, 175, 80, 0.4)",
      },
    },
    "@keyframes celebration": {
      "0%": { transform: "scale(0) rotate(0deg)", opacity: 0 },
      "50%": { transform: "scale(1.3) rotate(180deg)", opacity: 1 },
      "100%": { transform: "scale(1) rotate(360deg)", opacity: 1 },
    },
    "@keyframes breathingAnimation": {
      "0%": { transform: "scale(1)", filter: "brightness(1)" },
      "50%": { transform: "scale(1.02)", filter: "brightness(1.1)" },
      "100%": { transform: "scale(1)", filter: "brightness(1)" },
    },
    "@keyframes confirmationPop": {
      "0%": { 
        transform: "translate(-50%, -50%) scale(0.5)",
        opacity: 0,
      },
      "20%": { 
        transform: "translate(-50%, -50%) scale(1.2)",
        opacity: 1,
      },
      "100%": { 
        transform: "translate(-50%, -50%) scale(1)",
        opacity: 1,
      },
    },
    "@keyframes confirmationText": {
      "0%": { 
        transform: "translateY(20px)",
        opacity: 0,
      },
      "30%": { 
        transform: "translateY(0)",
        opacity: 1,
      },
      "100%": { 
        transform: "translateY(0)",
        opacity: 1,
      },
    },
    "@keyframes highlight": {
      "0%": {
        boxShadow: "0 0 0 0 rgba(33, 150, 243, 0.7)",
      },
      "70%": {
        boxShadow: "0 0 0 10px rgba(33, 150, 243, 0)",
      },
      "100%": {
        boxShadow: "0 0 0 0 rgba(33, 150, 243, 0)",
      },
    },
    "@keyframes highlightPulse": {
      "0%": {
        boxShadow: "0 0 20px rgba(255, 235, 59, 0.6)",
        borderColor: "#ffeb3b",
      },
      "50%": {
        boxShadow: "0 0 40px rgba(255, 235, 59, 0.9)",
        borderColor: "#fff176",
      },
      "100%": {
        boxShadow: "0 0 20px rgba(255, 235, 59, 0.6)",
        borderColor: "#ffeb3b",
      },
    },
    // Celebration Animation Styles
    celebrationOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      zIndex: 9999,
      pointerEvents: "none",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    celebrationContainer: {
      position: "relative",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    // Base celebration elements
    celebrationElement: {
      position: "absolute",
      fontSize: "200px",
      transformOrigin: "center",
    },
    celebrationProfile: {
      width: "150px",
      height: "150px",
      borderRadius: "50%",
      border: "4px solid white",
      zIndex: 1,
      boxShadow: "0 0 30px rgba(255, 255, 255, 0.8)",
    },
    // Animation 0: Original Heart + Spin
    celebration0Heart: {
      color: "#ff69b4",
      animation:
        "$heartPulse 1s ease-in-out infinite, $celebration0In 1s ease-out, $celebration0Out 1s ease-in 1s forwards",
    },
    celebration0Profile: {
      animation:
        "$celebration0In 0.5s ease-out, $celebration0Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 1: Rainbow Stars + Bounce
    celebration1Stars: {
      color: "#ffd700",
      animation:
        "$starTwinkle 0.5s ease-in-out infinite, $celebration1In 1s ease-out, $celebration1Out 1s ease-in 1s forwards",
    },
    celebration1Profile: {
      animation:
        "$celebration1In 0.5s ease-out, $celebration1Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 2: Fireworks + Zoom
    celebration2Fireworks: {
      color: "#ff4444",
      animation:
        "$fireworksExplode 1s ease-out infinite, $celebration2In 1s ease-out, $celebration2Out 1s ease-in 1s forwards",
    },
    celebration2Profile: {
      animation:
        "$celebration2In 0.5s ease-out, $celebration2Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 3: Lightning + Shake
    celebration3Lightning: {
      color: "#00ffff",
      animation:
        "$lightningFlash 0.3s ease-in-out infinite, $celebration3In 1s ease-out, $celebration3Out 1s ease-in 1s forwards",
    },
    celebration3Profile: {
      animation:
        "$celebration3In 0.5s ease-out, $celebration3Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 4: Spiral + Tornado
    celebration4Tornado: {
      color: "#9d4edd",
      animation:
        "$tornadoSpin 0.8s linear infinite, $celebration4In 1s ease-out, $celebration4Out 1s ease-in 1s forwards",
    },
    celebration4Profile: {
      animation:
        "$celebration4In 0.5s ease-out, $celebration4Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 5: Confetti + Float
    celebration5Confetti: {
      color: "#ff6b6b",
      animation:
        "$confettiFall 1.5s linear infinite, $celebration5In 1s ease-out, $celebration5Out 1s ease-in 1s forwards",
    },
    celebration5Profile: {
      animation:
        "$celebration5In 0.5s ease-out, $celebration5Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 6: Magic Sparkles + Glow
    celebration6Sparkles: {
      color: "#ffd93d",
      animation:
        "$sparkleGlow 0.6s ease-in-out infinite, $celebration6In 1s ease-out, $celebration6Out 1s ease-in 1s forwards",
    },
    celebration6Profile: {
      animation:
        "$celebration6In 0.5s ease-out, $celebration6Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 7: Rocket + Blast Off
    celebration7Rocket: {
      color: "#ff8c00",
      animation:
        "$rocketBoost 1s ease-out, $celebration7In 1s ease-out, $celebration7Out 1s ease-in 1s forwards",
    },
    celebration7Profile: {
      animation:
        "$celebration7In 0.5s ease-out, $celebration7Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 8: Butterfly + Flutter
    celebration8Butterfly: {
      color: "#ff69b4",
      animation:
        "$butterflyFlutter 0.8s ease-in-out infinite, $celebration8In 1s ease-out, $celebration8Out 1s ease-in 1s forwards",
    },
    celebration8Profile: {
      animation:
        "$celebration8In 0.5s ease-out, $celebration8Out 0.5s ease-in 0.5s forwards",
    },
    // Animation 9: Crown + Royal
    celebration9Crown: {
      color: "#ffd700",
      animation:
        "$crownShine 1s ease-in-out infinite, $celebration9In 1s ease-out, $celebration9Out 1s ease-in 1s forwards",
    },
    celebration9Profile: {
      animation:
        "$celebration9In 0.5s ease-out, $celebration9Out 0.5s ease-in 0.5s forwards",
    },
    "@keyframes heartPulse": {
      "0%": {
        transform: "scale(1)",
      },
      "50%": {
        transform: "scale(1.2)",
      },
      "100%": {
        transform: "scale(1)",
      },
    },
    // Animation 0: Original Heart + Spin
    "@keyframes celebration0In": {
      "0%": { transform: "scale(0) rotate(-180deg)", opacity: 0 },
      "50%": { transform: "scale(1.2) rotate(-90deg)", opacity: 1 },
      "100%": { transform: "scale(1) rotate(0deg)", opacity: 1 },
    },
    "@keyframes celebration0Out": {
      "0%": { transform: "scale(1) rotate(0deg)", opacity: 1 },
      "50%": { transform: "scale(1.3) rotate(90deg)", opacity: 0.8 },
      "100%": { transform: "scale(0) rotate(180deg)", opacity: 0 },
    },
    // Animation 1: Rainbow Stars + Bounce
    "@keyframes celebration1In": {
      "0%": { transform: "translateY(-100vh) scale(0)", opacity: 0 },
      "70%": { transform: "translateY(50px) scale(1.3)", opacity: 1 },
      "100%": { transform: "translateY(0) scale(1)", opacity: 1 },
    },
    "@keyframes celebration1Out": {
      "0%": { transform: "translateY(0) scale(1)", opacity: 1 },
      "30%": { transform: "translateY(-50px) scale(1.2)", opacity: 0.8 },
      "100%": { transform: "translateY(100vh) scale(0)", opacity: 0 },
    },
    "@keyframes starTwinkle": {
      "0%, 100%": { filter: "brightness(1) hue-rotate(0deg)" },
      "50%": { filter: "brightness(1.5) hue-rotate(180deg)" },
    },
    // Animation 2: Fireworks + Zoom
    "@keyframes celebration2In": {
      "0%": { transform: "scale(0.1)", opacity: 0 },
      "50%": { transform: "scale(2)", opacity: 0.8 },
      "100%": { transform: "scale(1)", opacity: 1 },
    },
    "@keyframes celebration2Out": {
      "0%": { transform: "scale(1)", opacity: 1 },
      "50%": { transform: "scale(3)", opacity: 0.5 },
      "100%": { transform: "scale(0)", opacity: 0 },
    },
    "@keyframes fireworksExplode": {
      "0%": { transform: "scale(1)", filter: "brightness(1)" },
      "50%": { transform: "scale(1.5)", filter: "brightness(2)" },
      "100%": { transform: "scale(1)", filter: "brightness(1)" },
    },
    // Animation 3: Lightning + Shake
    "@keyframes celebration3In": {
      "0%": { transform: "translateX(-100vw) rotate(-45deg)", opacity: 0 },
      "50%": { transform: "translateX(30px) rotate(15deg)", opacity: 1 },
      "100%": { transform: "translateX(0) rotate(0deg)", opacity: 1 },
    },
    "@keyframes celebration3Out": {
      "0%": { transform: "translateX(0) rotate(0deg)", opacity: 1 },
      "50%": { transform: "translateX(-30px) rotate(-15deg)", opacity: 0.8 },
      "100%": { transform: "translateX(100vw) rotate(45deg)", opacity: 0 },
    },
    "@keyframes lightningFlash": {
      "0%, 100%": { filter: "brightness(1)" },
      "50%": { filter: "brightness(3) drop-shadow(0 0 20px cyan)" },
    },
    // Animation 4: Spiral + Tornado
    "@keyframes celebration4In": {
      "0%": {
        transform: "rotate(0deg) translateX(200px) rotate(0deg) scale(0)",
        opacity: 0,
      },
      "100%": {
        transform: "rotate(720deg) translateX(0px) rotate(-720deg) scale(1)",
        opacity: 1,
      },
    },
    "@keyframes celebration4Out": {
      "0%": {
        transform: "rotate(0deg) translateX(0px) rotate(0deg) scale(1)",
        opacity: 1,
      },
      "100%": {
        transform: "rotate(-720deg) translateX(-200px) rotate(720deg) scale(0)",
        opacity: 0,
      },
    },
    "@keyframes tornadoSpin": {
      "0%": { transform: "rotate(0deg) scale(1)" },
      "100%": { transform: "rotate(360deg) scale(1.1)" },
    },
    // Animation 5: Confetti + Float
    "@keyframes celebration5In": {
      "0%": {
        transform: "translateY(-50px) scale(0) rotate(0deg)",
        opacity: 0,
      },
      "100%": {
        transform: "translateY(0) scale(1) rotate(360deg)",
        opacity: 1,
      },
    },
    "@keyframes celebration5Out": {
      "0%": { transform: "translateY(0) scale(1) rotate(0deg)", opacity: 1 },
      "100%": {
        transform: "translateY(50px) scale(0) rotate(-360deg)",
        opacity: 0,
      },
    },
    "@keyframes confettiFall": {
      "0%": { transform: "translateY(-10px)" },
      "50%": { transform: "translateY(10px)" },
      "100%": { transform: "translateY(-10px)" },
    },
    // Animation 6: Magic Sparkles + Glow
    "@keyframes celebration6In": {
      "0%": { transform: "scale(0)", opacity: 0, filter: "blur(10px)" },
      "50%": { transform: "scale(1.3)", opacity: 0.8, filter: "blur(2px)" },
      "100%": { transform: "scale(1)", opacity: 1, filter: "blur(0px)" },
    },
    "@keyframes celebration6Out": {
      "0%": { transform: "scale(1)", opacity: 1, filter: "blur(0px)" },
      "50%": { transform: "scale(1.3)", opacity: 0.5, filter: "blur(5px)" },
      "100%": { transform: "scale(0)", opacity: 0, filter: "blur(20px)" },
    },
    "@keyframes sparkleGlow": {
      "0%, 100%": { filter: "brightness(1) drop-shadow(0 0 5px gold)" },
      "50%": { filter: "brightness(2) drop-shadow(0 0 20px gold)" },
    },
    // Animation 7: Rocket + Blast Off
    "@keyframes celebration7In": {
      "0%": {
        transform: "translateY(100vh) rotate(0deg) scale(0.5)",
        opacity: 0,
      },
      "70%": {
        transform: "translateY(-30px) rotate(360deg) scale(1.2)",
        opacity: 1,
      },
      "100%": {
        transform: "translateY(0) rotate(360deg) scale(1)",
        opacity: 1,
      },
    },
    "@keyframes celebration7Out": {
      "0%": { transform: "translateY(0) rotate(0deg) scale(1)", opacity: 1 },
      "30%": {
        transform: "translateY(30px) rotate(-180deg) scale(1.1)",
        opacity: 0.8,
      },
      "100%": {
        transform: "translateY(-100vh) rotate(-360deg) scale(0.5)",
        opacity: 0,
      },
    },
    "@keyframes rocketBoost": {
      "0%": { filter: "brightness(1)" },
      "50%": { filter: "brightness(1.5) drop-shadow(0 5px 10px orange)" },
      "100%": { filter: "brightness(1)" },
    },
    // Animation 8: Butterfly + Flutter
    "@keyframes celebration8In": {
      "0%": { transform: "translateX(-100vw) scale(0)", opacity: 0 },
      "100%": { transform: "translateX(0) scale(1)", opacity: 1 },
    },
    "@keyframes celebration8Out": {
      "0%": { transform: "translateX(0) scale(1)", opacity: 1 },
      "100%": { transform: "translateX(100vw) scale(0)", opacity: 0 },
    },
    "@keyframes butterflyFlutter": {
      "0%": { transform: "translateY(0px) rotate(-5deg)" },
      "25%": { transform: "translateY(-8px) rotate(5deg)" },
      "50%": { transform: "translateY(0px) rotate(-5deg)" },
      "75%": { transform: "translateY(8px) rotate(5deg)" },
      "100%": { transform: "translateY(0px) rotate(-5deg)" },
    },
    // Animation 9: Crown + Royal
    "@keyframes celebration9In": {
      "0%": { transform: "scale(0) rotateY(0deg)", opacity: 0 },
      "50%": { transform: "scale(1.3) rotateY(180deg)", opacity: 0.8 },
      "100%": { transform: "scale(1) rotateY(360deg)", opacity: 1 },
    },
    "@keyframes celebration9Out": {
      "0%": { transform: "scale(1) rotateY(0deg)", opacity: 1 },
      "50%": { transform: "scale(1.3) rotateY(-180deg)", opacity: 0.8 },
      "100%": { transform: "scale(0) rotateY(-360deg)", opacity: 0 },
    },
    "@keyframes crownShine": {
      "0%, 100%": { filter: "brightness(1) drop-shadow(0 0 5px gold)" },
      "50%": { filter: "brightness(2) drop-shadow(0 0 15px gold)" },
    },
    // New styles for celebration text
    celebrationLectureText: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 10,
      textAlign: "center",
      color: "white",
      fontSize: "1.5rem",
      fontWeight: 700,
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
      pointerEvents: "none",
      animation: "$confirmationPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      background: "rgba(0, 0, 0, 0.7)",
      borderRadius: "16px",
      padding: muiTheme.spacing(3),
      border: "2px solid #4caf50",
      boxShadow: "0 8px 32px rgba(76, 175, 80, 0.3)",
    },
    celebrationLectureNumber: {
      fontSize: "3rem",
      lineHeight: 1,
      marginBottom: muiTheme.spacing(0.5),
      color: "#FFD700",
      fontWeight: 900,
      textShadow: "3px 3px 6px rgba(0, 0, 0, 0.8)",
    },
    celebrationLectureTitle: {
      fontSize: "1.4rem",
      marginBottom: muiTheme.spacing(1),
      lineHeight: 1.2,
      animation: "$confirmationText 0.8s ease-out 0.2s both",
    },
    celebrationConfirmText: {
      fontSize: "1.1rem",
      color: "#4caf50",
      fontWeight: 600,
      animation: "$confirmationText 0.8s ease-out 0.4s both",
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
    },
    celebrationLogo: {
      position: "absolute",
      top: "20px",
      left: "20px",
      zIndex: 10,
    },
  })
);

const courseTitle = "Klinisk medicin 4";

// Get course date range for default values
const getCurrentCourse = () => {
  return coursePeriods.find(course => course.title === courseTitle);
};

const currentCourse = getCurrentCourse();
const defaultStartDate = currentCourse?.startDate || "";
const defaultEndDate = currentCourse?.endDate || "";

export default function Index() {
  const classes = useStyles();
  const muiTheme = useMuiTheme();
  const { theme: currentTheme } = useTheme();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("alla");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [dateFilterType, setDateFilterType] = useState("alla"); // "alla", "intervall"
  const [expandedWeeklyDetails, setExpandedWeeklyDetails] = useState<{
    [key: string]: boolean;
  }>({});
  const previousProgressRef = useRef<{
    [key: string]: number;
  }>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationUser, setCelebrationUser] = useState<string | null>(null);
  const [celebrationType, setCelebrationType] = useState<number>(0);
  const [celebrationLecture, setCelebrationLecture] = useState<{title: string, number: number} | null>(null);
  const weeksData = useSelector((state: RootState) => state.lectures.lectures);
  

  

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
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
  
  // Authentication check for lecture creation - use mapped names
  const allowedNames = ["David Rönnlid", "Albin Lindberg", "Mattias Österdahl"];
  const mappedUserName = currentUser?.full_name ? mapUserNameToPerson(currentUser.full_name) : null;
  const isAllowedToCreateLectures = mappedUserName ? ["David", "Albin", "Mattias"].includes(mappedUserName) : false;
  
  // Debug logging for development
  React.useEffect(() => {
    console.log("🔍 Index Debug Info:");
    console.log("- isAuthenticated:", isAuthenticated);
    console.log("- currentUser:", currentUser);
    console.log("- currentUser.full_name:", currentUser?.full_name);
    console.log("- isAllowedToCreateLectures:", isAllowedToCreateLectures);
    console.log("- allowedNames:", allowedNames);
    console.log("- weeksData length:", weeksData?.length || 0);
  }, [isAuthenticated, currentUser, weeksData, isAllowedToCreateLectures]);
  
  // Authentication status indicator
  const authStatusMessage = () => {
    if (!isAuthenticated) {
      return "Du måste logga in för att lägga till, redigera eller ta bort föreläsningar.";
    }
    if (!isAllowedToCreateLectures) {
      return "Endast David, Albin och Mattias kan lägga till, redigera eller ta bort föreläsningar.";
    }
    return `Inloggad som ${currentUser?.full_name} - Du kan lägga till, redigera och ta bort föreläsningar.`;
  };
  
  // State for duplicate removal notification
  const [showDuplicateNotification, setShowDuplicateNotification] = useState(false);
  const [removedDuplicates, setRemovedDuplicates] = useState<string[]>([]);
  const [totalRemoved, setTotalRemoved] = useState(0);
  
  // State for add lecture modal
  const [showAddLectureModal, setShowAddLectureModal] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState<string>("");
  const [suggestedTime, setSuggestedTime] = useState<string>("");
  
  // Edit lecture modal state
  const [showEditLectureModal, setShowEditLectureModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [showNotionSetup, setShowNotionSetup] = useState(false);
  const [urlSyncCompleted, setUrlSyncCompleted] = useState(false);
  const [lectureSyncCompleted, setLectureSyncCompleted] = useState(false);
  const [showLectures, setShowLectures] = useState(true);
  
  // Check Notion setup status
  const notionSetupStatus = useNotionSetup(currentUser);
  
  // Notion sync loading state
  const { startSync, addMessage, finishSync, setError } = useNotionSync();
  
  // Toggle weekly details for a specific person
  const toggleWeeklyDetails = (person: string) => {
    setExpandedWeeklyDetails(prev => ({
      ...prev,
      [person]: !prev[person]
    }));
  };

  // Check for removed duplicates notification
  useEffect(() => {
    const storedDuplicates = localStorage.getItem('removedDuplicates');
    if (storedDuplicates) {
      const duplicates = JSON.parse(storedDuplicates);
      if (duplicates.length > 0) {
        setRemovedDuplicates(duplicates);
        setTotalRemoved(duplicates.length);
        setShowDuplicateNotification(true);
        // Clear from localStorage after showing
        localStorage.removeItem('removedDuplicates');
      }
    }
  }, []);

  // Check Notion setup status and prompt if needed
  useEffect(() => {
    if (!notionSetupStatus.isLoading && !notionSetupStatus.isSetup && notionSetupStatus.userName) {
      // Show setup dialog for new users OR users who need reconfiguration
      const timer = setTimeout(() => {
        setShowNotionSetup(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [notionSetupStatus]);

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Global keyboard search functionality
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is already typing in an input, textarea, or contenteditable element
      const activeElement = document.activeElement;
      const isInputField = activeElement?.tagName === 'INPUT' || 
                          activeElement?.tagName === 'TEXTAREA' || 
                          activeElement?.getAttribute('contenteditable') === 'true';
      
      // Don't trigger for modifier keys, function keys, etc.
      if (event.ctrlKey || event.metaKey || event.altKey || 
          event.key.length > 1 && !['Backspace', 'Delete'].includes(event.key)) {
        return;
      }

      // Handle Escape key to clear search and blur input
      if (event.key === 'Escape') {
        setSearchTerm('');
        searchInputRef.current?.blur();
        return;
      }

      // If user starts typing and not already in an input field, focus search and add the character
      if (!isInputField && event.key.match(/^[a-zA-Z0-9åäöÅÄÖ\s]$/)) {
        event.preventDefault();
        searchInputRef.current?.focus();
        
        // Add the typed character to search term
        if (event.key === ' ' || event.key.match(/^[a-zA-Z0-9åäöÅÄÖ]$/)) {
          setSearchTerm(prev => prev + event.key);
        }
      }

      // Handle backspace when search field is focused but empty
      if (event.key === 'Backspace' && searchInputRef.current === activeElement && searchTerm === '') {
        // Allow normal backspace behavior
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [searchTerm]);

  const isLoading = !weeksData || weeksData.length === 0;

  // Only show weeks for Klinisk medicin 4 - moved before useMemo hooks
  const km4Weeks = useMemo(() => {
    return weeksData.filter((week) => week.course === courseTitle);
  }, [weeksData, courseTitle]);

  // Get all lectures from active course only (Klinisk medicin 4) - moved before early return
  const allLectures = useMemo(() => {
    return km4Weeks.reduce((acc: Lecture[], week) => {
      return [...acc, ...week.lectures];
    }, []);
  }, [km4Weeks]);

  // Handle URL hash navigation to specific lectures
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#lecture-')) {
        const lectureNumber = parseInt(hash.replace('#lecture-', ''));
        if (!isNaN(lectureNumber)) {
          // Find the lecture element and scroll to it
          const lectureElement = document.querySelector(`[data-lecture-number="${lectureNumber}"]`);
          if (lectureElement) {
            lectureElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            // Add a subtle highlight effect
            lectureElement.classList.add('lecture-highlight');
            setTimeout(() => {
              lectureElement.classList.remove('lecture-highlight');
            }, 3000);
          }
        }
      }
    };

    // Handle initial load
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [allLectures]);

  // Calculate user statistics with weekly breakdown - made reactive with useMemo
  const userStats = useMemo(() => {
    console.log("🔄 Recalculating user statistics...");
    console.log("km4Weeks for stats calculation:", km4Weeks);
    
    const initialTotals: Totals = {
      Mattias: { FL: 0, hours: 0, wishedHours: 0 },
      Albin: { FL: 0, hours: 0, wishedHours: 0 },
      David: { FL: 0, hours: 0, wishedHours: 0 },
    };

    const result = km4Weeks.reduce<Totals>(
      (acc, weekData) => {
        const newAcc = { ...acc };

        weekData.lectures.forEach((lecture) => {
          const duration = calculateDuration(lecture.time);
          console.log(`Lecture: ${lecture.title}, Duration: ${duration}, CheckboxState:`, lecture.checkboxState);

          Object.keys(acc).forEach((person) => {
            if (lecture.checkboxState?.[person]?.confirm) {
              console.log(`✅ ${person} confirmed lecture: ${lecture.title}`);
              newAcc[person].FL += 1;
              newAcc[person].hours += duration;
            }
            if (lecture.checkboxState?.[person]?.unwish) {
              console.log(`❌ ${person} unwished lecture: ${lecture.title}`);
              newAcc[person].wishedHours += duration;
            }
          });
        });

        return newAcc;
      },
      { ...initialTotals }
    );
    
    console.log("📊 Final user statistics:", result);
    return result;
  }, [km4Weeks]); // React to changes in km4Weeks (which includes checkbox states)

  // Calculate weekly breakdown for each user - simplified
  const weeklyBreakdown = (() => {
    const breakdown: {
      [key: string]: { week: string; FL: number; hours: number }[];
    } = {
      Mattias: [],
      Albin: [],
      David: [],
    };

    km4Weeks.forEach((weekData) => {
      const weekStats = {
        Mattias: { FL: 0, hours: 0 },
        Albin: { FL: 0, hours: 0 },
        David: { FL: 0, hours: 0 },
      };

      weekData.lectures.forEach((lecture) => {
        const duration = calculateDuration(lecture.time);

        Object.keys(weekStats).forEach((person) => {
          if (lecture.checkboxState?.[person]?.confirm) {
            weekStats[person as keyof typeof weekStats].FL += 1;
            weekStats[person as keyof typeof weekStats].hours += duration;
          }
        });
      });

      // Add week to breakdown if any person has selections
      Object.keys(breakdown).forEach((person) => {
        if (
          weekStats[person as keyof typeof weekStats].FL > 0 ||
          weekStats[person as keyof typeof weekStats].hours > 0
        ) {
          breakdown[person].push({
            week: weekData.week,
            ...weekStats[person as keyof typeof weekStats],
          });
        }
      });
    });

    return breakdown;
  })();

  const totalCourseHours = (() => {
    return km4Weeks.reduce((total, week) => {
      return (
        total +
        week.lectures.reduce((weekTotal, lecture) => {
          return weekTotal + calculateDuration(lecture.time);
        }, 0)
      );
    }, 0);
  })();



  // Handle URL hash on page load and sync URLs to Notion - moved before early return
  useEffect(() => {
    try {
      // Handle URL hash for direct lecture links
      handleLectureUrlHash();
      
      // Sync URLs to Notion when app loads (only once)
      if (!urlSyncCompleted && allLectures.length > 0 && currentUser) {
        setUrlSyncCompleted(true);
        
        // Debug Notion configuration
        const userName = currentUser.full_name || currentUser.email || 'Unknown';
        console.log(`🔍 Debugging Notion setup for user: ${userName}`);
        logNotionEnvironmentVariables(userName);
        
        // Test Notion connection
        testNotionConnection(userName, 'Global hälsa').then(success => {
          if (success) {
            console.log('✅ Notion connection test passed');
            
            // First: Comprehensive lecture sync to ensure all lectures have correct titles
            // Automatic sync removed - now only happens via manual button
            console.log('✅ Notion connection test passed - sync available via menu button');
          } else {
            console.error('❌ Notion connection test failed - skipping sync');
          }
        }).catch(error => {
          console.error('❌ Notion connection test error:', error);
        });
      }
    } catch (error) {
      console.error('❌ UseEffect error in index.tsx:', error);
    }
  }, [allLectures.length, currentUser?.id, urlSyncCompleted, lectureSyncCompleted]);

  // Check for milestone achievements
  useEffect(() => {
    Object.entries(userStats).forEach(([person, stats]) => {
      const goal = totalCourseHours / 3;
      const currentProgress = goal > 0 ? (stats.hours / goal) * 100 : 0;
      const previousProg = previousProgressRef.current[person] || 0;

      // Check if we crossed a milestone
      const milestones = [25, 50, 75, 100];
      const crossedMilestone = milestones.find(
        (milestone) => previousProg < milestone && currentProgress >= milestone
      );

      if (
        crossedMilestone &&
        mapUserNameToPerson(currentUser?.full_name || "") === person
      ) {
        console.log(`🎉 MILESTONE REACHED: ${crossedMilestone}% 🎉`);
      }
      
      // Update the ref with current progress
      previousProgressRef.current[person] = currentProgress;
    });
  }, [userStats, totalCourseHours, currentUser]);

  // Filter lectures based on search term and selected filter - simplified
  const filteredWeeks = (() => {
    return km4Weeks
      .map((week) => ({
        ...week,
        lectures: week.lectures.filter((lecture) => {
          // Text search filter
          const searchTerm = debouncedSearchTerm.trim().toLowerCase();
          const matchesSearch = searchTerm === '' || 
            lecture.title.toLowerCase().includes(searchTerm) ||
            lecture.lectureNumber?.toString().includes(searchTerm) ||
            lecture.subjectArea?.toLowerCase().includes(searchTerm);

          // Person selection filter
          let matchesPersonFilter = true;
          if (selectedFilter !== "alla") {
            if (selectedFilter === "ej-valda") {
              // Show lectures that nobody has selected
              const hasAnySelection = Object.values(
                lecture.checkboxState || {}
              ).some((state: any) => state?.confirm);
              matchesPersonFilter = !hasAnySelection;
            } else {
              // Show lectures selected by specific person
              const isSelectedByPerson =
                lecture.checkboxState?.[selectedFilter]?.confirm || false;
              matchesPersonFilter = isSelectedByPerson;
            }
          }

          // Date filter
          let matchesDateFilter = true;
          if (startDate && endDate) {
            try {
              // Parse lecture date (assuming format "YYYY-MM-DD" or similar)
              const lectureDate = parseISO(lecture.date);
              const startFilterDate = parse(startDate, "yyyy-MM-dd", new Date());
              const endFilterDate = parse(endDate, "yyyy-MM-dd", new Date());

              // Check if lecture date is within the interval (inclusive)
              matchesDateFilter = isWithinInterval(lectureDate, {
                start: startFilterDate,
                end: endFilterDate,
              });
            } catch (error) {
              console.warn("Invalid date format:", lecture.date, startDate, endDate);
              matchesDateFilter = true; // Don't filter out if date parsing fails
            }
          }



          return matchesSearch && matchesPersonFilter && matchesDateFilter;
        }),
      }))
      .filter((week) => week.lectures.length > 0);
  })();

  // Count total filtered lectures - simplified
  const totalFilteredLectures = (() => {
    return filteredWeeks.reduce(
      (total, week) => total + week.lectures.length,
      0
    );
  })();

  // Format hours to show exact values without unnecessary decimals
  const formatHours = (hours: number): string => {
    // Remove trailing zeros and show exact value
    // This handles cases like 3.0 -> "3" and 3.25 -> "3.25"
    return parseFloat(hours.toString()).toString();
  };

  // Check if lecture is selected by current user - simplified
  const isLectureSelected = (lecture: Lecture): boolean => {
    if (!currentUser?.full_name) return false;
    const userName = mapUserNameToPerson(currentUser.full_name);
    return lecture.checkboxState?.[userName]?.confirm || false;
  };

  // Handle card click to toggle selection
  const handleGapClick = (date?: string, time?: string) => {
    setSuggestedDate(date || "");
    setSuggestedTime(time || "");
    setShowAddLectureModal(true);
  };

  const handleEditLecture = (lecture: Lecture) => {
    // Check authentication first
    if (!isAllowedToCreateLectures) {
      alert("Du måste vara inloggad som David, Albin eller Mattias för att redigera föreläsningar.");
      return;
    }
    setEditingLecture(lecture);
    setShowEditLectureModal(true);
  };

  const handleCopyLectureTitle = async (lecture: Lecture) => {
    try {
      const textToCopy = `${lecture.lectureNumber}. ${lecture.title}`;
      await navigator.clipboard.writeText(textToCopy);
      
      // Show success message
      console.log(`📋 Copied lecture title: ${textToCopy}`);
      
      // Optional: Show a brief visual feedback
      const originalText = document.title;
      document.title = `✓ Kopierade: ${textToCopy}`;
      setTimeout(() => {
        document.title = originalText;
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to copy lecture title:', error);
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${lecture.lectureNumber}. ${lecture.title}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      console.log(`📋 Copied lecture title (fallback): ${lecture.lectureNumber}. ${lecture.title}`);
    }
  };

  const handleDeleteLecture = async (lecture: Lecture) => {
    // Check authentication first
    if (!isAllowedToCreateLectures) {
      alert("Du måste vara inloggad som David, Albin eller Mattias för att ta bort föreläsningar.");
      return;
    }
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Är du säker på att du vill ta bort föreläsningen "${lecture.title}"?\n\nDenna åtgärd kan inte ångras.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      // Show loading state
      setIsUpdating(`deleting-${lecture.id}`);
      
      console.log("🗑️ Deleting lecture:", lecture.title, "ID:", lecture.id);

      // Call delete API
      const apiUrl = process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL || "/api"
        : "/.netlify";

      // Use appropriate endpoint based on environment
      const deleteEndpoint = process.env.NODE_ENV === "development"
        ? `${apiUrl}/functions/CRUDFLData`
        : `${apiUrl}/functions/deleteLecture`;

      console.log("🗑️ Making DELETE request to:", deleteEndpoint);
      console.log("🗑️ Request payload:", { lectureId: lecture.id, action: "deleteLecture" });

      const response = await fetch(deleteEndpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          lectureId: lecture.id,
          action: "deleteLecture",
          userFullName: currentUser?.full_name || ""
        }),
      });

      console.log("🗑️ Response status:", response.status);
      console.log("🗑️ Response ok:", response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Lecture deleted successfully:", result);
        
        // Refresh data to update UI
        await dataSyncManager.forceRefresh();
        
        // Show success message
        DatabaseNotifications.lectureDeleted(lecture.title);
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete lecture");
      }
      
    } catch (error) {
      console.error("❌ Error deleting lecture:", error);
      
      // Show error message  
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      DatabaseNotifications.lectureDeleteError(errorMessage);
      
    } finally {
      // Clear loading state
      setIsUpdating(null);
    }
  };

  const handleUpdateLecture = async (lectureData: EditLectureData) => {
    try {
      // Show loading state
      setIsUpdating("editing-lecture");
      
      console.log("🔄 Updating lecture:", lectureData);

      // Call edit API
      const response = await editLecture(lectureData);
      
      if (response.success) {
        // Use DataSyncManager to refresh the UI with updated data
        await dataSyncManager.forceRefresh();
        
        // Close modal and show success message
        setShowEditLectureModal(false);
        setEditingLecture(null);
        console.log(`✅ Föreläsning "${lectureData.title}" har uppdaterats!`);
        DatabaseNotifications.lectureUpdated(lectureData.title);
        
      } else {
        throw new Error("Failed to update lecture");
      }
      
    } catch (error) {
      console.error("❌ Error updating lecture:", error);
      
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      console.error(`❌ Ett fel uppstod när föreläsningen skulle uppdateras: ${errorMessage}`);
      DatabaseNotifications.lectureUpdateError(errorMessage);
      
    } finally {
      // Clear loading state
      setIsUpdating(null);
    }
  };

  const handleAddLecture = async (lectureData: {
    title: string;
    date: string;
    time: string;
    lecturer?: string;
    subjectArea: SubjectArea;
    duration: number;
  }) => {
    try {
      // Show loading state
      setIsUpdating("adding-lecture");
      
      // Format data for API
      const apiData = formatLectureData(
        lectureData.title,
        lectureData.date,
        lectureData.time,
        lectureData.duration,
        courseTitle,
        currentUser?.full_name || ""
      );

      // Add lecture to database
      const response = await addLecture(apiData);
      
      if (response.success) {
        // Check if lecture was skipped (already exists with same config)
        if (response.skipped) {
          console.log(`⚠️ Lecture "${lectureData.title}" already exists with same configuration - skipping`);
          setShowAddLectureModal(false);
          DatabaseNotifications.lectureSkipped(lectureData.title);
          return;
        }
        // Use DataSyncManager to refresh the UI with the new lecture
        await dataSyncManager.forceRefresh();
        
        // Close modal and show success message
        setShowAddLectureModal(false);
        console.log(`✅ Föreläsning "${lectureData.title}" har lagts till!`);
        DatabaseNotifications.lectureAdded(lectureData.title);
        
        console.log("🎉 Lecture added successfully:", response.lecture);
        
        // Trigger Notion subject sync for the new lecture
        if (currentUser) {
          try {
            // Start loading for new lecture sync
            startSync('Add new lecture to Notion', 1);
            addMessage(`🔄 Starting Notion sync for new lecture: ${lectureData.title}`);
            addMessage(`📚 Subject: ${lectureData.subjectArea}`);
            
            // Debug user and environment
            const userName = currentUser.full_name || currentUser.email || 'Unknown';
            addMessage(`👤 User: ${userName} | Environment: ${process.env.NODE_ENV}`);
            
            // Test Notion connection for this specific subject area
            addMessage('🔍 Testing Notion connection...');
            const connectionTest = await testNotionConnection(userName, lectureData.subjectArea);
            if (!connectionTest) {
              setError(`Notion connection test failed for ${userName} - ${lectureData.subjectArea}`);
              finishSync();
              return;
            }
            addMessage('✅ Notion connection test passed');
            
            // Wait a moment for the database to be updated and then get the lecture ID
            addMessage('⏳ Waiting for database update...');
            setTimeout(async () => {
              try {
                // Trigger a data refresh to get the latest data with the new lecture
                addMessage('🔄 Refreshing data...');
                await dataSyncManager.forceRefresh();
                
                // Find the newly created lecture to get its ID and properties
                // We'll attempt to sync even without the full lecture object
                const newLectureForNotion = {
                  id: response.lecture?.id || `temp-${Date.now()}`, // Use returned ID or temp ID
                  title: lectureData.title,
                  lectureNumber: response.lecture?.lectureNumber || 0,
                  date: lectureData.date,
                  time: lectureData.time,
                  lecturer: lectureData.lecturer || '',
                  subjectArea: lectureData.subjectArea,
                };
                
                addMessage(`📤 Sending lecture data to Notion...`);
                await updateLectureUrl(newLectureForNotion, 'lecture_created', currentUser);
                addMessage(`✅ Notion sync completed for: ${lectureData.title}`);
                finishSync('🎉 New lecture added to Notion successfully!');
              } catch (notionError) {
                console.error('❌ Notion sync failed for new lecture:', notionError);
                setError(notionError instanceof Error ? notionError.message : 'Unknown error');
                finishSync();
              }
            }, 2000);
          } catch (syncError) {
            console.error('❌ Error setting up Notion sync:', syncError);
            setError(syncError instanceof Error ? syncError.message : 'Setup error');
            finishSync();
          }
        }
        
      } else {
        throw new Error("Failed to add lecture");
      }
      
    } catch (error) {
      console.error("❌ Error adding lecture:", error);
      
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Okänt fel';
      console.error(`❌ Ett fel uppstod när föreläsningen skulle läggas till: ${errorMessage}`);
      DatabaseNotifications.lectureAddError(errorMessage);
      
    } finally {
      // Clear loading state
      setIsUpdating(null);
    }
  };

  const handleCardClick = async (lecture: Lecture) => {
    if (!currentUser?.full_name) return;

    const userName = mapUserNameToPerson(currentUser.full_name);
    const currentState = lecture.checkboxState?.[userName]?.confirm || false;
    const newState = !currentState;

    setIsUpdating(lecture.id);

    const updatedState = {
      ...lecture.checkboxState,
      [userName]: {
        ...lecture.checkboxState?.[userName],
        confirm: newState,
        unwish: false, // Clear unwish when selecting
      },
    };

    try {
      await dispatch(
        updateCheckboxStateThunk({
          lectureID: lecture.id,
          newCheckboxState: updatedState,
        })
      );

      dispatch(
        updateLectureCheckboxState({
          lectureID: lecture.id,
          newCheckboxState: updatedState,
        })
      );

      // Update Notion databases for all users
      if (isNotionIntegrationEnabled()) {
        try {
          // Start loading for individual lecture sync
          const action = newState ? 'select' : 'unselect';
          startSync(`${action} lecture`, 1);
          addMessage(`🔄 ${action === 'select' ? 'Selecting' : 'Unselecting'} "${lecture.title}" in Notion...`);
          addMessage(`👤 User: ${userName} | Subject: ${lecture.subjectArea || 'Global hälsa'}`);
          
          const notionResponse = await updateNotionLectureTags(
            lecture.title,
            lecture.lectureNumber,
            userName,
            lecture.subjectArea || 'Global hälsa', // Default if no subject area
            action
          );
          
          // Log the result and show in loading dialog
          const notificationMessage = getNotionUpdateNotification(notionResponse);
          addMessage(`📝 ${notificationMessage}`);
          
          if (notionResponse.success && notionResponse.summary.successfulUpdates > 0) {
            addMessage(`✅ Successfully updated ${notionResponse.summary.successfulUpdates} Notion database(s)`);
            finishSync('🎉 Notion updated successfully!');
            
            // Optionally dispatch an in-app notification about Notion update
            dispatch(addNotification({
              id: `notion-${Date.now()}`,
              type: "lecture_notified" as const,
              title: "Notion uppdaterat",
              message: notificationMessage,
              fromUser: "System",
              toUser: userName,
              lectureId: lecture.id,
              lectureTitle: lecture.title,
              timestamp: Date.now(),
              read: false,
            }));
          } else {
            setError('No databases were updated');
            finishSync();
          }
        } catch (notionError) {
          console.error("❌ Notion integration error:", notionError);
          setError(notionError instanceof Error ? notionError.message : 'Unknown error');
          finishSync();
        }
      } else {
        console.log("ℹ️ Notion integration disabled or not configured");
      }

      // Trigger celebration animation if lecture was selected (not deselected)
      if (newState) {
        // Deterministically select celebration animation to prevent hydration mismatches
        const userHash = userName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const randomAnimation = userHash % 10;
        setCelebrationType(randomAnimation);
        setCelebrationUser(userName);
        setCelebrationLecture({ title: lecture.title, number: lecture.lectureNumber });
        setShowCelebration(true);

        // Hide celebration after 2 seconds (1s in + 1s out)
        setTimeout(() => {
          setShowCelebration(false);
          setCelebrationUser(null);
          setCelebrationLecture(null);
        }, 2000);
      }
    } catch (error) {
      console.error("Error updating checkbox state:", error);
    } finally {
      setIsUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className={classes.pageContainer}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "50vh",
            }}
          >
            <CircularProgress style={{ color: "white" }} />
          </div>
        </div>
      </Layout>
    );
  }

      const currentUserName = currentUser?.full_name ? mapUserNameToPerson(currentUser.full_name) : "";

  return (
    <Layout>
      <>
        {/* Celebration Animation Overlay */}
        {showCelebration && celebrationUser && celebrationLecture && (
          <div className={classes.celebrationOverlay}>
            <div className={classes.celebrationContainer}>
              {/* Ankiologia Logo at the top */}
              <div className={classes.celebrationLogo}>
                <img
                  src={getProfilePicUrl(celebrationUser)}
                  alt={celebrationUser}
                  className={
                    `${classes.celebrationProfile} ` +
                    (classes as any)[`celebration${celebrationType}Profile`]
                  }
                />
              </div>

              {/* Lecture Confirmation Text */}
              <div className={classes.celebrationLectureText}>
                <div className={classes.celebrationLectureNumber}>
                  {celebrationLecture.number}
                </div>
                <div className={classes.celebrationLectureTitle}>
                  {celebrationLecture.title}
                </div>
                <div className={classes.celebrationConfirmText}>
                  ✅ Vald av {celebrationUser}!
                </div>
              </div>
              
              {/* Dynamic Celebration Element */}
              <div
                className={
                  `${classes.celebrationElement} ` +
                  (classes as any)[
                    `celebration${celebrationType}${
                      celebrationType === 0
                        ? "Heart"
                        : celebrationType === 1
                        ? "Stars"
                        : celebrationType === 2
                        ? "Fireworks"
                        : celebrationType === 3
                        ? "Lightning"
                        : celebrationType === 4
                        ? "Tornado"
                        : celebrationType === 5
                        ? "Confetti"
                        : celebrationType === 6
                        ? "Sparkles"
                        : celebrationType === 7
                        ? "Rocket"
                        : celebrationType === 8
                        ? "Butterfly"
                        : "Crown"
                    }`
                  ]
                }
              >
                {celebrationType === 0
                  ? "💖"
                  : celebrationType === 1
                  ? "⭐"
                  : celebrationType === 2
                  ? "🎆"
                  : celebrationType === 3
                  ? "⚡"
                  : celebrationType === 4
                  ? "🌪️"
                  : celebrationType === 5
                  ? "🎊"
                  : celebrationType === 6
                  ? "✨"
                  : celebrationType === 7
                  ? "🚀"
                  : celebrationType === 8
                  ? "🦋"
                  : "👑"}
              </div>
            </div>
          </div>
        )}

        <div className={classes.pageContainer}>
          {/* Header Section */}
          <div className={classes.headerSection}>
            <Typography
              variant="h4"
              gutterBottom
              style={{
                fontWeight: "normal",
                marginBottom: "16px",
                color: "white",
              }}
            >
              {getDisplayCourseTitle(courseTitle)}
            </Typography>
          </div>







          {/* Search and Filter Section */}
          <div className={classes.searchSection}>
            <TextField
              className={classes.searchField}
              label="Sök föreläsningar..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ color: "#ccc" }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl variant="outlined" className={classes.filterField}>
              <InputLabel style={{ color: "#ccc" }}>
                Filtera efter person
              </InputLabel>
              <Select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as string)}
                label="Filtera efter person"
                style={{ color: "white" }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      backgroundColor: "#2c2c2c",
                      color: "white",
                    },
                  },
                }}
              >
                <MenuItem value="alla" style={{ color: "white" }}>
                  <FilterListIcon style={{ marginRight: 8, color: "#ccc" }} />
                  Alla föreläsningar
                </MenuItem>
                <MenuItem value="Mattias" style={{ color: "white" }}>
                  🔵 Mattias har valt
                </MenuItem>
                <MenuItem value="Albin" style={{ color: "white" }}>
                  🟢 Albin har valt
                </MenuItem>
                <MenuItem value="David" style={{ color: "white" }}>
                  🟡 David har valt
                </MenuItem>
                <MenuItem value="ej-valda" style={{ color: "white" }}>
                  <BlockIcon style={{ marginRight: 8, color: "#f44336" }} />
                  🔴 Ej valda föreläsningar
                </MenuItem>
              </Select>
            </FormControl>
          </div>

          {/* Date Filter Section - Second Row */}
          <div className={classes.searchSection} style={{ marginTop: muiTheme.spacing(2) }}>
            <TextField
              className={classes.searchField}
              label="Från datum"
              type="date"
              variant="outlined"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                style: { color: "#ccc" },
              }}
              InputProps={{
                style: { color: "white" },
              }}
            />
            <TextField
              className={classes.searchField}
              label="Till datum"
              type="date"
              variant="outlined"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
                style: { color: "#ccc" },
              }}
              InputProps={{
                style: { color: "white" },
              }}
            />
          </div>

          {/* Search Results Info */}
          {(debouncedSearchTerm ||
            selectedFilter !== "alla" ||
            dateFilterType !== "alla" ||
            (startDate && endDate)) && (
            <div className={classes.searchResults}>
              {totalFilteredLectures > 0 ? (
                <>
                  Visar {totalFilteredLectures} föreläsning
                  {totalFilteredLectures !== 1 ? "ar" : ""}
                  {debouncedSearchTerm &&
                    ` som matchar "${debouncedSearchTerm}"`}
                  {selectedFilter !== "alla" &&
                    selectedFilter !== "ej-valda" &&
                    ` som ${selectedFilter} har valt`}
                  {selectedFilter === "ej-valda" && ` som ingen har valt`}
                  {startDate && endDate && (
                    <>
                      {startDate === defaultStartDate && endDate === defaultEndDate
                        ? ` (alla ${getDisplayCourseTitle(courseTitle)})`
                        : ` mellan ${startDate} och ${endDate}`}
                    </>
                  )}
                </>
              ) : (
                <>
                  Inga föreläsningar hittades
                  {debouncedSearchTerm &&
                    ` som matchar "${debouncedSearchTerm}"`}
                  {selectedFilter !== "alla" &&
                    selectedFilter !== "ej-valda" &&
                    ` som ${selectedFilter} har valt`}
                  {selectedFilter === "ej-valda" && ` som ingen har valt`}
                  {startDate && endDate && (
                    <>
                      {startDate === defaultStartDate && endDate === defaultEndDate
                        ? ` (alla ${getDisplayCourseTitle(courseTitle)})`
                        : ` mellan ${startDate} och ${endDate}`}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Lectures Toggle Button */}
          <div style={{ 
            marginTop: muiTheme.spacing(4), 
            marginBottom: muiTheme.spacing(2),
            display: 'flex',
            justifyContent: 'center'
          }}>
            <Button
              variant="outlined"
              onClick={() => setShowLectures(!showLectures)}
              style={{
                color: '#fff',
                borderColor: '#666',
                borderRadius: '20px',
                padding: '8px 24px',
                textTransform: 'none',
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
              startIcon={showLectures ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showLectures ? 'Dölj föreläsningar' : 'Visa föreläsningar'}
            </Button>
          </div>

          {/* Lectures Grid */}
          {showLectures && (
            <div style={{ marginTop: muiTheme.spacing(4), overflow: "visible" }}>
            <Grid container spacing={3} style={{ overflow: "visible" }}>
              {filteredWeeks.map((week) => {
                // Group lectures by date for better gap placement
                const lecturesByDate = week.lectures.reduce((acc, lecture) => {
                  const date = lecture.date;
                  if (!acc[date]) {
                    acc[date] = [];
                  }
                  acc[date].push(lecture);
                  return acc;
                }, {} as { [date: string]: Lecture[] });

                return Object.entries(lecturesByDate).map(([date, lectures]) => (
                  <Fragment key={date}>
                    {/* Lectures for this date */}
                    {lectures.map((lecture: Lecture) => {
                  const duration = calculateDuration(lecture.time);
                  const isSelected = isLectureSelected(lecture);

                  // Count who selected this lecture
                  const selectedBy = Object.entries(lecture.checkboxState || {})
                    .filter(([_, state]) => state.confirm)
                    .map(([person, _]) => person);

                  // Get detailed status for each person - OPTIMIZED
                  const getPersonStatus = (person: string) => {
                    const state = lecture.checkboxState?.[person];
                    if (state?.confirm) return "confirmed";
                    if (state?.unwish) return "unwished";
                    return "neutral";
                  };

                  return (
                    <Grid item xs={12} sm={6} md={4} key={lecture.id}>
                      <Paper
                        id={`lecture-${lecture.id}`}
                        className={`${classes.lectureCard} ${
                          isSelected ? "selected" : ""
                        }`}
                        elevation={0}
                        onClick={() => handleCardClick(lecture)}
                        data-lecture-id={lecture.id}
                        data-lecture-number={lecture.lectureNumber}
                        style={{
                          cursor: "pointer",
                          opacity: isUpdating === lecture.id ? 0.7 : 1,
                          pointerEvents:
                            isUpdating === lecture.id ? "none" : "auto",
                          position: "relative", // For positioning add button
                        }}
                      >

                                                {/* Action Buttons Container - properly spaced icons */}
                        {isAllowedToCreateLectures && (
                          <div style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            display: "flex",
                            gap: "8px",
                            zIndex: 20,
                          }}>
                            {/* Edit Button */}
                            <div 
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: "rgba(255, 255, 255, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                opacity: 0.7,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditLecture(lecture);
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                                e.currentTarget.style.opacity = "1";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.opacity = "0.7";
                              }}
                              title="Redigera föreläsning"
                            >
                              <EditIcon style={{ fontSize: "14px", color: "white" }} />
                            </div>

                            {/* Delete Button */}
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: isUpdating === `deleting-${lecture.id}` 
                                  ? "rgba(244, 67, 54, 0.3)" 
                                  : "rgba(244, 67, 54, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: isUpdating === `deleting-${lecture.id}` ? "not-allowed" : "pointer",
                                transition: "all 0.3s ease",
                                opacity: isUpdating === `deleting-${lecture.id}` ? 1 : 0.7,
                                pointerEvents: isUpdating === `deleting-${lecture.id}` ? "none" : "auto",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isUpdating !== `deleting-${lecture.id}`) {
                                  handleDeleteLecture(lecture);
                                }
                              }}
                              onMouseEnter={(e) => {
                                if (isUpdating !== `deleting-${lecture.id}`) {
                                  e.currentTarget.style.background = "rgba(244, 67, 54, 0.2)";
                                  e.currentTarget.style.opacity = "1";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isUpdating !== `deleting-${lecture.id}`) {
                                  e.currentTarget.style.background = "rgba(244, 67, 54, 0.1)";
                                  e.currentTarget.style.opacity = "0.7";
                                }
                              }}
                              title={isUpdating === `deleting-${lecture.id}` ? "Tar bort..." : "Ta bort föreläsning"}
                            >
                              {isUpdating === `deleting-${lecture.id}` ? (
                                <CircularProgress size={14} style={{ color: "#f44336" }} />
                              ) : (
                                <DeleteIcon style={{ fontSize: "14px", color: "#f44336" }} />
                              )}
                            </div>
                          </div>
                        )}



                        {/* Completion Badge */}
                        {isSelected && (
                          <div 
                            className={classes.completionBadge}
                            style={{
                              right: isAllowedToCreateLectures ? "88px" : "12px", // Move left to avoid action buttons when present
                            }}
                          >
                            ✓
                          </div>
                        )}

                        {/* Lecture Number - now permanent */}
                        <div className={classes.lectureNumber}>
                          {lecture.lectureNumber}
                        </div>

                        {/* Lecture Title with Copy Icon */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                          <Typography className={classes.lectureTitle}>
                            {lecture.title}
                          </Typography>
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              background: "rgba(255, 255, 255, 0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              opacity: 0.7,
                              flexShrink: 0,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLectureTitle(lecture);
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                              e.currentTarget.style.opacity = "1";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                              e.currentTarget.style.opacity = "0.7";
                            }}
                            title="Kopiera föreläsningsnamn"
                          >
                            <ContentCopyIcon style={{ fontSize: "12px", color: "white" }} />
                          </div>
                        </div>

                        {/* Category Tag */}
                        {lecture.subjectArea && (
                          <div className={classes.categoryTag}>
                            {lecture.subjectArea}
                          </div>
                        )}

                        {/* Lecture Info */}
                        <div className={classes.lectureInfo}>
                          {lecture.date}
                        </div>
                        <div className={classes.lectureInfo}>
                          {lecture.time} ({duration}h)
                        </div>

                        {/* Selection Status */}
                        <div className={classes.selectionStatus}>
                          {["Mattias", "Albin", "David"].map((person) => {
                            const isPersonSelected =
                              lecture.checkboxState?.[person]?.confirm || false;
                            return (
                              <Chip
                                key={person}
                                label={person}
                                size="small"
                                className={`${classes.personChip} ${
                                  isPersonSelected
                                    ? classes.selectedChip
                                    : classes.unselectedChip
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Notify Button - only show if lecture is selected by current user */}
                        <div 
                          style={{ 
                            marginTop: muiTheme.spacing(1),
                            display: isSelected ? 'block' : 'none' 
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <NotifyButton
                            lecture={lecture}
                            allLectures={allLectures}
                            onNotificationSent={() => {
                              // Optional: Add any additional logic when notification is sent
                              console.log(
                                "Notification sent for lecture:",
                                lecture.title
                              );
                            }}
                          />
                        </div>

                        {/* Loading indicator */}
                        {isUpdating === lecture.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              zIndex: 10,
                            }}
                          >
                            <CircularProgress
                              size={24}
                              style={{ color: "#4caf50" }}
                            />
                          </div>
                        )}
                      </Paper>
                    </Grid>
                    )
                    })}
                  </Fragment>
                ));
          })}
                    
              {/* Add lecture button as last card - only for authenticated users */}
              {isAllowedToCreateLectures && (
                    <Grid item xs={12} sm={6} md={4}>
                      <div 
                    onClick={() => handleGapClick()}
                        style={{
                          height: "200px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          borderRadius: "12px",
                          background: "rgba(76, 175, 80, 0.1)",
                          border: "2px dashed rgba(76, 175, 80, 0.5)",
                          transition: "all 0.3s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(76, 175, 80, 0.2)";
                          e.currentTarget.style.borderColor = "rgba(76, 175, 80, 0.8)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(76, 175, 80, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(76, 175, 80, 0.5)";
                        }}
                    title="Lägg till ny föreläsning"
                      >
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "rgba(76, 175, 80, 0.9)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "24px",
                          fontWeight: "bold"
                        }}>
                          +
                        </div>
                      </div>
                    </Grid>
              )}

              {/* Login prompt card for unauthenticated users */}
              {!isAllowedToCreateLectures && (
                    <Grid item xs={12} sm={6} md={4}>
                      <div 
                        style={{
                          height: "200px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "12px",
                          background: "rgba(255, 152, 0, 0.1)",
                          border: "2px dashed rgba(255, 152, 0, 0.5)",
                          padding: "16px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "rgba(255, 152, 0, 0.9)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "20px",
                          marginBottom: "12px"
                        }}>
                          🔒
                        </div>
                        <Typography 
                          variant="body2" 
                          style={{ 
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.9rem",
                            lineHeight: "1.4"
                          }}
                        >
                          Logga in för att lägga till, redigera eller ta bort föreläsningar
                        </Typography>
                      </div>
                    </Grid>
              )}
            </Grid>
          </div>

          {filteredWeeks.length === 0 &&
            !searchTerm &&
            selectedFilter === "alla" && (
              <Box style={{ textAlign: "center", marginTop: "64px" }}>
                <Typography
                  variant="h6"
                  style={{ color: "#ccc", marginBottom: "16px" }}
                >
                  Inga föreläsningar hittades för {getDisplayCourseTitle(courseTitle)}
                </Typography>
              </Box>
            )}
          </div>
        )}

        {/* Smart AI Recommendations */}
                  <SmartRecommendations
            lectures={allLectures}
            onLectureClick={handleCardClick}
            onOpenPreferences={() => setShowPreferencesDialog(true)}
          />



        {/* User Statistics Section */}
        <div className={classes.statsSection}>
          <div className={classes.userStatsGrid}>
            {Object.entries(userStats).map(([person, stats]) => {
              const goal = totalCourseHours / 3;
              const progress = goal > 0 ? (stats.hours / goal) * 100 : 0;
              const isCurrentUser = person === currentUserName;

              return (
                <div
                  key={person}
                  className={`${classes.statsCard} ${
                    isCurrentUser ? "currentUser" : ""
                  }`}
                >
                  <div className={classes.statsHeader}>
                    <Typography className={classes.userName}>
                      {person}
                      {isCurrentUser && (
                        <span className={classes.currentUserBadge}>Du</span>
                      )}
                    </Typography>
                  </div>

                  <Divider
                    style={{
                      backgroundColor: "#404040",
                      marginBottom: "16px",
                    }}
                  />

                  <div className={classes.statRow}>
                    <span className={classes.statLabel}>Föreläsningar:</span>
                    <span className={classes.statValue}>{stats.FL}</span>
                  </div>
                  <div className={classes.statRow}>
                    <span className={classes.statLabel}>Timmar:</span>
                    <span className={classes.statValue}>
                      {formatHours(stats.hours)}
                    </span>
                  </div>

                  {/* Weekly Breakdown */}
                  {weeklyBreakdown[person].length > 0 && (
                    <div
                      style={{
                        marginTop: muiTheme.spacing(2),
                      }}
                    >
                      <div
                        onClick={() => toggleWeeklyDetails(person)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          padding: muiTheme.spacing(1),
                          background: "#1a1a1a",
                          borderRadius: "8px",
                          border: "1px solid #333",
                          transition: "all 0.3s ease"
                        }}
                      >
                        <Typography
                          style={{
                            fontSize: "0.8rem",
                            color: "#ccc",
                            fontWeight: 500,
                          }}
                        >
                          Detaljer per vecka
                        </Typography>
                        {expandedWeeklyDetails[person] ? (
                          <ExpandLessIcon style={{ color: "#ccc", fontSize: "1rem" }} />
                        ) : (
                          <ExpandMoreIcon style={{ color: "#ccc", fontSize: "1rem" }} />
                        )}
                      </div>
                      
                      {expandedWeeklyDetails[person] && (
                        <div
                          style={{
                            marginTop: muiTheme.spacing(1),
                            padding: muiTheme.spacing(1.5),
                            background: "#1a1a1a",
                            borderRadius: "8px",
                            border: "1px solid #333",
                          }}
                        >
                          {weeklyBreakdown[person].map((weekData, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: index === weeklyBreakdown[person].length - 1 ? 0 : muiTheme.spacing(0.5),
                                fontSize: "0.75rem",
                                color: "#ccc",
                              }}
                            >
                              <span>{weekData.week}:</span>
                              <span>
                                {weekData.FL} FL ({formatHours(weekData.hours)}h)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={classes.progressContainer}>
                    <div className={classes.progressLabel}>
                      Mål för terminen: {goal.toFixed(0)} timmar
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "12px",
                        backgroundColor: "#333",
                        borderRadius: "6px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(progress, 100)}%`,
                          height: "100%",
                          backgroundColor:
                            progress >= 100
                              ? "#4caf50"
                              : progress > 50
                              ? "#ff9800"
                              : "#f44336",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <Typography className={classes.progressText}>
                      Progress: {isNaN(progress) ? 0 : Math.round(progress)}%
                    </Typography>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Weekly Summary - efter föreläsningslistan */}
        <WeeklySummary lectures={allLectures} />

        {/* Exam Progress Chart - längst ned på sidan */}
        <ExamProgressChart courseTitle={courseTitle} />

        <UserPreferencesDialog
          open={showPreferencesDialog}
          onClose={() => setShowPreferencesDialog(false)}
        />
        
        {/* Duplicate Removal Notification */}
        <DuplicateRemovalNotification
          removedDuplicates={removedDuplicates}
          totalRemoved={totalRemoved}
          onClose={() => setShowDuplicateNotification(false)}
        />
        
        {/* Add Lecture Modal */}
        <AddLectureModal
          open={showAddLectureModal}
          onClose={() => setShowAddLectureModal(false)}
          onAddLecture={handleAddLecture}
          suggestedDate={suggestedDate}
          suggestedTime={suggestedTime}
          isLoading={isUpdating === "adding-lecture"}
        />

        {/* Edit Lecture Modal */}
        <EditLectureModal
          open={showEditLectureModal}
          lecture={editingLecture}
          onClose={() => {
            setShowEditLectureModal(false);
            setEditingLecture(null);
          }}
          onUpdate={handleUpdateLecture}
          isLoading={isUpdating === "editing-lecture"}
        />

        {/* Notion Integration Setup */}
        <NotionIntegrationSetup
          open={showNotionSetup}
          onClose={() => setShowNotionSetup(false)}
          userName={notionSetupStatus.userName || ""}
          isReconfiguration={notionSetupStatus.needsReconfiguration || false}
          onSetupComplete={() => {
            setShowNotionSetup(false);
            // Refresh setup status
            window.location.reload();
          }}
        />
      </>
    </Layout>
  );
}


