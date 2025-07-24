import React, { useState, useMemo, useRef, useEffect } from "react";
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
} from "@material-ui/core";
import NotifyButton from "@/components/NotifyButton";
import {
  makeStyles,
  Theme,
  createStyles,
  useTheme,
} from "@material-ui/core/styles";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import BlockIcon from "@mui/icons-material/Block";
import Lecture from "types/lecture";
import { RootState } from "store/types";
import { useSelector, useDispatch } from "react-redux";
import {
  calculateDuration,
  calculateTotalCourseHours,
} from "utils/processLectures";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";
import { updateLectureCheckboxState } from "store/slices/lecturesReducer";
import { addNotification } from "store/slices/notificationsReducer";
import { isMac, sendMultiChannelMacNotification } from "utils/macNotifications";
import { getProfilePicUrl } from "../utils/profilePicMapper";
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

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    pageContainer: {
      padding: theme.spacing(4),
      maxWidth: "1400px",
      margin: "0 auto",
    },
    headerSection: {
      textAlign: "center" as const,
      marginBottom: theme.spacing(4),
    },
    statsSection: {
      marginBottom: theme.spacing(6),
    },
    userStatsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: theme.spacing(3),
      marginBottom: theme.spacing(4),
    },
    statsCard: {
      background: "linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)",
      borderRadius: "16px",
      padding: theme.spacing(3),
      border: "2px solid #404040",
      transition: "all 0.3s ease",
      position: "relative",
      overflow: "hidden",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.4)",
        borderColor: "#666",
      },
      "&.currentUser": {
        background: "linear-gradient(135deg, #2c2c2c 0%, #1a3d1a 100%)",
        borderColor: "#4caf50",
        boxShadow: "0 8px 25px rgba(76, 175, 80, 0.3)",
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-2px",
          left: "-2px",
          right: "-2px",
          bottom: "-2px",
          background: "linear-gradient(45deg, #4caf50, #66bb6a, #4caf50)",
          borderRadius: "16px",
          zIndex: -1,
        },
      },
    },
    statsHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing(2),
    },
    userName: {
      fontSize: "1.3rem",
      fontWeight: 600,
      color: "white",
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
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
      marginBottom: theme.spacing(1),
      padding: theme.spacing(0.5, 0),
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
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
    },
    progressLabel: {
      fontSize: "0.85rem",
      color: "#ccc",
      marginBottom: theme.spacing(1),
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
      marginTop: theme.spacing(1),
    },
    milestoneReached: {
      animation: "$celebration 2s ease-in-out",
    },
    searchSection: {
      marginBottom: theme.spacing(4),
      display: "flex",
      justifyContent: "center",
      gap: theme.spacing(2),
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
      background: "#2c2c2c",
      borderRadius: "12px",
      padding: theme.spacing(3),
      marginBottom: theme.spacing(3),
      border: "2px solid #404040",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative",
      overflow: "hidden",
      cursor: "pointer",
      "&:hover": {
        transform: "translateY(-4px) scale(1.02)",
        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.4)",
        borderColor: "#666",
      },
      "&.selected": {
        background: "linear-gradient(135deg, #2c2c2c 0%, #1a4d1a 100%)",
        borderColor: "#4caf50",
        boxShadow: "0 8px 30px rgba(76, 175, 80, 0.3)",
      },
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
      marginBottom: theme.spacing(2),
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
      marginBottom: theme.spacing(2),
      lineHeight: "1.4",
      transition: "color 0.3s ease",
      ".selected &": {
        color: "#FFD700",
      },
    },
    lectureInfo: {
      fontSize: "0.875rem",
      color: "#ccc",
      marginBottom: theme.spacing(1),
      transition: "color 0.3s ease",
      ".selected &": {
        color: "#b8d4b8",
      },
    },
    selectionStatus: {
      display: "flex",
      gap: theme.spacing(1),
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
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
      marginBottom: theme.spacing(2),
      textAlign: "center" as const,
    },
    completionBadge: {
      position: "absolute",
      top: "12px",
      right: "12px",
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
        "$celebration0In 1s ease-out, $celebration0Out 1s ease-in 1s forwards",
    },
    // Animation 1: Rainbow Stars + Bounce
    celebration1Stars: {
      color: "#ffd700",
      animation:
        "$starTwinkle 0.5s ease-in-out infinite, $celebration1In 1s ease-out, $celebration1Out 1s ease-in 1s forwards",
    },
    celebration1Profile: {
      animation:
        "$celebration1In 1s ease-out, $celebration1Out 1s ease-in 1s forwards",
    },
    // Animation 2: Fireworks + Zoom
    celebration2Fireworks: {
      color: "#ff4444",
      animation:
        "$fireworksExplode 1s ease-out infinite, $celebration2In 1s ease-out, $celebration2Out 1s ease-in 1s forwards",
    },
    celebration2Profile: {
      animation:
        "$celebration2In 1s ease-out, $celebration2Out 1s ease-in 1s forwards",
    },
    // Animation 3: Lightning + Shake
    celebration3Lightning: {
      color: "#00ffff",
      animation:
        "$lightningFlash 0.3s ease-in-out infinite, $celebration3In 1s ease-out, $celebration3Out 1s ease-in 1s forwards",
    },
    celebration3Profile: {
      animation:
        "$celebration3In 1s ease-out, $celebration3Out 1s ease-in 1s forwards",
    },
    // Animation 4: Spiral + Tornado
    celebration4Tornado: {
      color: "#9d4edd",
      animation:
        "$tornadoSpin 0.8s linear infinite, $celebration4In 1s ease-out, $celebration4Out 1s ease-in 1s forwards",
    },
    celebration4Profile: {
      animation:
        "$celebration4In 1s ease-out, $celebration4Out 1s ease-in 1s forwards",
    },
    // Animation 5: Confetti + Float
    celebration5Confetti: {
      color: "#ff6b6b",
      animation:
        "$confettiFall 1.5s linear infinite, $celebration5In 1s ease-out, $celebration5Out 1s ease-in 1s forwards",
    },
    celebration5Profile: {
      animation:
        "$celebration5In 1s ease-out, $celebration5Out 1s ease-in 1s forwards",
    },
    // Animation 6: Magic Sparkles + Glow
    celebration6Sparkles: {
      color: "#ffd93d",
      animation:
        "$sparkleGlow 0.6s ease-in-out infinite, $celebration6In 1s ease-out, $celebration6Out 1s ease-in 1s forwards",
    },
    celebration6Profile: {
      animation:
        "$celebration6In 1s ease-out, $celebration6Out 1s ease-in 1s forwards",
    },
    // Animation 7: Rocket + Blast Off
    celebration7Rocket: {
      color: "#ff8c00",
      animation:
        "$rocketBoost 1s ease-out, $celebration7In 1s ease-out, $celebration7Out 1s ease-in 1s forwards",
    },
    celebration7Profile: {
      animation:
        "$celebration7In 1s ease-out, $celebration7Out 1s ease-in 1s forwards",
    },
    // Animation 8: Butterfly + Flutter
    celebration8Butterfly: {
      color: "#ff69b4",
      animation:
        "$butterflyFlutter 0.8s ease-in-out infinite, $celebration8In 1s ease-out, $celebration8Out 1s ease-in 1s forwards",
    },
    celebration8Profile: {
      animation:
        "$celebration8In 1s ease-out, $celebration8Out 1s ease-in 1s forwards",
    },
    // Animation 9: Crown + Royal
    celebration9Crown: {
      color: "#ffd700",
      animation:
        "$crownShine 1s ease-in-out infinite, $celebration9In 1s ease-out, $celebration9Out 1s ease-in 1s forwards",
    },
    celebration9Profile: {
      animation:
        "$celebration9In 1s ease-out, $celebration9Out 1s ease-in 1s forwards",
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
  })
);

const courseTitle = "Klinisk medicin 4";

export default function Index() {
  const classes = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("alla");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState("alla"); // "alla", "före", "efter", "exakt"
  const [previousProgress, setPreviousProgress] = useState<{
    [key: string]: number;
  }>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationUser, setCelebrationUser] = useState<string | null>(null);
  const [celebrationType, setCelebrationType] = useState<number>(0);
  const weeksData = useSelector((state: RootState) => state.lectures.lectures);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const isLoading = !weeksData || weeksData.length === 0;

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }, []);

  // Only show weeks for Klinisk medicin 4
  const km4Weeks = weeksData.filter((week) => week.course === courseTitle);

  // Calculate user statistics with weekly breakdown
  const userStats = useMemo(() => {
    const initialTotals: Totals = {
      Mattias: { FL: 0, hours: 0, wishedHours: 0 },
      Albin: { FL: 0, hours: 0, wishedHours: 0 },
      David: { FL: 0, hours: 0, wishedHours: 0 },
    };

    return km4Weeks.reduce<Totals>(
      (acc, weekData) => {
        const newAcc = { ...acc };

        weekData.lectures.forEach((lecture) => {
          const duration = calculateDuration(lecture.time);

          Object.keys(acc).forEach((person) => {
            if (lecture.checkboxState?.[person]?.confirm) {
              newAcc[person].FL += 1;
              newAcc[person].hours += duration;
            }
            if (lecture.checkboxState?.[person]?.unwish) {
              newAcc[person].wishedHours += duration;
            }
          });
        });

        return newAcc;
      },
      { ...initialTotals }
    );
  }, [km4Weeks]);

  // Calculate weekly breakdown for each user
  const weeklyBreakdown = useMemo(() => {
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
  }, [km4Weeks]);

  const totalCourseHours = useMemo(() => {
    return km4Weeks.reduce((total, week) => {
      return (
        total +
        week.lectures.reduce((weekTotal, lecture) => {
          return weekTotal + calculateDuration(lecture.time);
        }, 0)
      );
    }, 0);
  }, [km4Weeks]);

  // Play milestone celebration sound
  const playMilestoneSound = (milestone: number) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;

    // Create a child-like "Yaaaay!" sound using oscillators
    const createYaySound = (
      frequency: number,
      delay: number,
      duration: number
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      // Child-like voice simulation
      osc.type = "sawtooth";
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, ctx.currentTime + delay);
      filter.frequency.exponentialRampToValueAtTime(
        1200,
        ctx.currentTime + delay + duration * 0.3
      );
      filter.frequency.exponentialRampToValueAtTime(
        600,
        ctx.currentTime + delay + duration
      );

      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(
        frequency * 1.5,
        ctx.currentTime + delay + duration * 0.2
      );
      osc.frequency.exponentialRampToValueAtTime(
        frequency * 0.8,
        ctx.currentTime + delay + duration
      );

      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.15,
        ctx.currentTime + delay + 0.05
      );
      gain.gain.exponentialRampToValueAtTime(
        0.1,
        ctx.currentTime + delay + duration * 0.5
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + duration
      );

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    // Create "Yaaaay!" sequence - higher pitch for child-like sound
    createYaySound(350, 0, 0.3); // Ya
    createYaySound(400, 0.1, 0.4); // aaa
    createYaySound(320, 0.3, 0.3); // ay!

    // Add some harmonics for richness
    createYaySound(700, 0.05, 0.2);
    createYaySound(1050, 0.15, 0.25);

    console.log(`🎉 MILESTONE REACHED: ${milestone}% - YAAAAY!!! 🎉`);
  };

  // Check for milestone achievements
  useEffect(() => {
    Object.entries(userStats).forEach(([person, stats]) => {
      const goal = totalCourseHours / 3;
      const currentProgress = goal > 0 ? (stats.hours / goal) * 100 : 0;
      const previousProg = previousProgress[person] || 0;

      // Check if we crossed a milestone
      const milestones = [25, 50, 75, 100];
      const crossedMilestone = milestones.find(
        (milestone) => previousProg < milestone && currentProgress >= milestone
      );

      if (
        crossedMilestone &&
        currentUser?.full_name?.split(" ")[0] === person
      ) {
        playMilestoneSound(crossedMilestone);
      }
    });

    // Update previous progress
    const newProgress: { [key: string]: number } = {};
    Object.entries(userStats).forEach(([person, stats]) => {
      const goal = totalCourseHours / 3;
      newProgress[person] = goal > 0 ? (stats.hours / goal) * 100 : 0;
    });
    setPreviousProgress(newProgress);
  }, [userStats, totalCourseHours, currentUser, previousProgress]);

  // Filter lectures based on search term and selected filter - MEMOIZED
  const filteredWeeks = useMemo(() => {
    return km4Weeks
      .map((week) => ({
        ...week,
        lectures: week.lectures.filter((lecture) => {
          // Text search filter
          const matchesSearch = lecture.title
            .toLowerCase()
            .includes(debouncedSearchTerm.toLowerCase());

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
          if (dateFilter && dateFilterType !== "alla") {
            try {
              // Parse lecture date (assuming format "YYYY-MM-DD" or similar)
              const lectureDate = parseISO(lecture.date);
              const filterDate = parse(dateFilter, "yyyy-MM-dd", new Date());

              switch (dateFilterType) {
                case "exakt":
                  matchesDateFilter = isSameDay(lectureDate, filterDate);
                  break;
                case "före":
                  matchesDateFilter = isBefore(lectureDate, filterDate);
                  break;
                case "efter":
                  matchesDateFilter = isAfter(lectureDate, filterDate);
                  break;
                default:
                  matchesDateFilter = true;
              }
            } catch (error) {
              console.warn("Invalid date format:", lecture.date, dateFilter);
              matchesDateFilter = true; // Don't filter out if date parsing fails
            }
          }

          return matchesSearch && matchesPersonFilter && matchesDateFilter;
        }),
      }))
      .filter((week) => week.lectures.length > 0);
  }, [
    km4Weeks,
    debouncedSearchTerm,
    selectedFilter,
    dateFilter,
    dateFilterType,
  ]);

  // Count total filtered lectures - MEMOIZED
  const totalFilteredLectures = useMemo(() => {
    return filteredWeeks.reduce(
      (total, week) => total + week.lectures.length,
      0
    );
  }, [filteredWeeks]);

  // Check if lecture is selected by current user - MEMOIZED
  const isLectureSelected = useMemo(() => {
    return (lecture: Lecture): boolean => {
      if (!currentUser?.full_name) return false;
      const userName = currentUser.full_name.split(" ")[0]; // Get first name
      return lecture.checkboxState?.[userName]?.confirm || false;
    };
  }, [currentUser?.full_name]);

  // Handle card click to toggle selection
  const handleCardClick = async (lecture: Lecture) => {
    if (!currentUser?.full_name) return;

    const userName = currentUser.full_name.split(" ")[0];
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

      // Add notification when lecture is completed
      if (newState) {
        const allUsers = ["Mattias", "Albin", "David"];
        const otherUsers = allUsers.filter((user) => user !== userName);

        for (const otherUser of otherUsers) {
          const notification = {
            id: `${Date.now()}-${Math.random()}`,
            type: "lecture_completed" as const,
            title: `${userName} har slutfört en föreläsning`,
            message: `${userName} har just notionerat färdigt "${lecture.title}"`,
            fromUser: userName,
            toUser: otherUser,
            lectureId: lecture.id,
            lectureTitle: lecture.title,
            timestamp: Date.now(),
            read: false,
          };

          dispatch(addNotification(notification));

          // Send Mac-specific notifications if on Mac
          if (isMac()) {
            await sendMultiChannelMacNotification(otherUser, {
              title: `${userName} har slutfört en föreläsning`,
              message: `${userName} har notionerat färdigt "${lecture.title}"`,
              fromUser: userName,
              lectureTitle: lecture.title,
              sound: "success",
              badge: 1,
            });
          }
        }

        // Trigger celebration animation if lecture was selected (not deselected)
        // Randomly select one of the 10 celebration animations (0-9)
        const randomAnimation = Math.floor(Math.random() * 10);
        setCelebrationType(randomAnimation);
        setCelebrationUser(userName);
        setShowCelebration(true);

        // Hide celebration after 2 seconds (1s in + 1s out)
        setTimeout(() => {
          setShowCelebration(false);
          setCelebrationUser(null);
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

  const currentUserName = currentUser?.full_name?.split(" ")[0] || "";

  return (
    <Layout>
      <>
        {/* Celebration Animation Overlay */}
        {showCelebration && celebrationUser && (
          <div className={classes.celebrationOverlay}>
            <div className={classes.celebrationContainer}>
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
              {/* User Profile Picture */}
              <img
                src={getProfilePicUrl(celebrationUser)}
                alt={celebrationUser}
                className={
                  `${classes.celebrationProfile} ` +
                  (classes as any)[`celebration${celebrationType}Profile`]
                }
              />
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
              {courseTitle}
            </Typography>
          </div>

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
                        {stats.hours.toFixed(1)}
                      </span>
                    </div>

                    {/* Weekly Breakdown */}
                    {weeklyBreakdown[person].length > 0 && (
                      <div
                        style={{
                          marginTop: theme.spacing(2),
                          padding: theme.spacing(1.5),
                          background: "#1a1a1a",
                          borderRadius: "8px",
                          border: "1px solid #333",
                        }}
                      >
                        <Typography
                          style={{
                            fontSize: "0.8rem",
                            color: "#ccc",
                            marginBottom: theme.spacing(1),
                            fontWeight: 500,
                          }}
                        >
                          Veckovisning:
                        </Typography>
                        {weeklyBreakdown[person].map((weekData, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: theme.spacing(0.5),
                              fontSize: "0.75rem",
                              color: "#ccc",
                            }}
                          >
                            <span>{weekData.week}:</span>
                            <span>
                              {weekData.FL} FL ({weekData.hours.toFixed(1)}h)
                            </span>
                          </div>
                        ))}
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

          {/* Search and Filter Section */}
          <div className={classes.searchSection}>
            <TextField
              className={classes.searchField}
              label="Sök föreläsningar..."
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

            {/* Date Filter Controls */}
            <FormControl variant="outlined" className={classes.filterField}>
              <InputLabel style={{ color: "#ccc" }}>
                Filtrera efter datum
              </InputLabel>
              <Select
                value={dateFilterType}
                onChange={(e) => setDateFilterType(e.target.value as string)}
                label="Filtrera efter datum"
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
                  📅 Alla datum
                </MenuItem>
                <MenuItem value="exakt" style={{ color: "white" }}>
                  🎯 Exakt datum
                </MenuItem>
                <MenuItem value="före" style={{ color: "white" }}>
                  ⬅️ Före datum
                </MenuItem>
                <MenuItem value="efter" style={{ color: "white" }}>
                  ➡️ Efter datum
                </MenuItem>
              </Select>
            </FormControl>

            {/* Date Input Field */}
            {dateFilterType !== "alla" && (
              <TextField
                className={classes.searchField}
                label="Välj datum"
                type="date"
                variant="outlined"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                  style: { color: "#ccc" },
                }}
                InputProps={{
                  style: { color: "white" },
                }}
              />
            )}
          </div>

          {/* Search Results Info */}
          {(debouncedSearchTerm ||
            selectedFilter !== "alla" ||
            dateFilterType !== "alla") && (
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
                  {dateFilterType !== "alla" && dateFilter && (
                    <>
                      {dateFilterType === "exakt" && ` på datum ${dateFilter}`}
                      {dateFilterType === "före" && ` före ${dateFilter}`}
                      {dateFilterType === "efter" && ` efter ${dateFilter}`}
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
                  {dateFilterType !== "alla" && dateFilter && (
                    <>
                      {dateFilterType === "exakt" && ` på datum ${dateFilter}`}
                      {dateFilterType === "före" && ` före ${dateFilter}`}
                      {dateFilterType === "efter" && ` efter ${dateFilter}`}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Lectures Grid - Moved to bottom */}
          <div style={{ marginTop: theme.spacing(6) }}>
            <Typography
              variant="h5"
              style={{
                color: "white",
                marginBottom: theme.spacing(3),
                textAlign: "center",
              }}
            >
              Föreläsningar
            </Typography>

            <Grid container spacing={3}>
              {filteredWeeks.map((week) =>
                week.lectures.map((lecture: Lecture) => {
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
                        className={`${classes.lectureCard} ${
                          isSelected ? "selected" : ""
                        }`}
                        elevation={0}
                        onClick={() => handleCardClick(lecture)}
                        style={{
                          cursor: "pointer",
                          opacity: isUpdating === lecture.id ? 0.7 : 1,
                          pointerEvents:
                            isUpdating === lecture.id ? "none" : "auto",
                        }}
                      >
                        {/* Completion Badge */}
                        {isSelected && (
                          <div className={classes.completionBadge}>✓</div>
                        )}

                        {/* Lecture Number - now permanent */}
                        <div className={classes.lectureNumber}>
                          {lecture.lectureNumber}
                        </div>

                        {/* Lecture Title */}
                        <Typography className={classes.lectureTitle}>
                          {lecture.title}
                        </Typography>

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
                        {isSelected && (
                          <div style={{ marginTop: theme.spacing(1) }}>
                            <NotifyButton
                              lecture={lecture}
                              onNotificationSent={() => {
                                // Optional: Add any additional logic when notification is sent
                                console.log(
                                  "Notification sent for lecture:",
                                  lecture.title
                                );
                              }}
                            />
                          </div>
                        )}

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
                  );
                })
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
                  Inga föreläsningar hittades för {courseTitle}
                </Typography>
              </Box>
            )}
        </div>
      </>
    </Layout>
  );
}
