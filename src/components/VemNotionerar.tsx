import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateCheckboxStateThunk } from "store/updateCheckboxStateThunk";
import { updateLectureCheckboxState } from "store/slices/lecturesReducer";
import { RootState } from "store/types";
import Lecture from "types/lecture";
import { Box, Button, Typography } from "@material-ui/core";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      marginTop: theme.spacing(2),
      padding: theme.spacing(2),
      background: "#333",
      borderRadius: "4px",
      position: "relative",
      overflow: "hidden",
    },
    celebrationOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(45deg, #FFD700, #FFA500, #FF6B6B, #4ECDC4)",
      opacity: 0,
      borderRadius: "4px",
      transition: "opacity 0.3s ease",
      pointerEvents: "none",
      zIndex: 1,
    },
    celebrationActive: {
      opacity: 0.15,
      animation: "$pulse 0.6s ease-in-out",
    },
    personRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing(1),
      position: "relative",
      zIndex: 2,
      "&:last-child": {
        marginBottom: 0,
      },
    },
    personName: {
      fontSize: "0.875rem",
      fontWeight: 500,
      color: "white",
      minWidth: "60px",
      position: "relative",
      zIndex: 2,
    },
    actionButtons: {
      display: "flex",
      gap: theme.spacing(1),
      position: "relative",
      zIndex: 2,
    },
    confirmButton: {
      background: "linear-gradient(45deg, #4caf50, #66bb6a)",
      color: "white",
      minWidth: "auto",
      padding: "6px 16px",
      fontSize: "0.75rem",
      textTransform: "none" as const,
      borderRadius: "20px",
      transition: "all 0.3s ease",
      position: "relative",
      overflow: "hidden",
      "&:hover": {
        background: "linear-gradient(45deg, #45a049, #5da55f)",
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(76, 175, 80, 0.4)",
      },
      "&.selected": {
        background: "linear-gradient(45deg, #FFD700, #FFA500)",
        animation: "$glow 2s ease-in-out infinite alternate",
        transform: "scale(1.05)",
        boxShadow: "0 4px 20px rgba(255, 215, 0, 0.6)",
      },
    },
    unwishButton: {
      background: "linear-gradient(45deg, #ff9800, #ffb74d)",
      color: "white",
      minWidth: "auto",
      padding: "6px 16px",
      fontSize: "0.75rem",
      textTransform: "none" as const,
      borderRadius: "20px",
      transition: "all 0.3s ease",
      "&:hover": {
        background: "linear-gradient(45deg, #f57c00, #ff9800)",
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(255, 152, 0, 0.4)",
      },
      "&.selected": {
        background: "linear-gradient(45deg, #f44336, #e57373)",
        animation: "$shake 0.5s ease-in-out",
      },
    },
    resetButton: {
      background: "linear-gradient(45deg, #666, #888)",
      color: "white",
      minWidth: "auto",
      padding: "6px 16px",
      fontSize: "0.75rem",
      textTransform: "none" as const,
      borderRadius: "20px",
      transition: "all 0.3s ease",
      "&:hover": {
        background: "linear-gradient(45deg, #555, #777)",
        transform: "translateY(-2px)",
      },
    },
    statusText: {
      fontSize: "0.75rem",
      color: "#ccc",
      position: "relative",
      zIndex: 2,
    },
    confettiContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: "none",
      zIndex: 3,
    },
    confetti: {
      position: "absolute",
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      animation: "$confettiFall 2s ease-out forwards",
    },
    achievementBadge: {
      position: "absolute",
      top: "-10px",
      right: "-10px",
      background: "linear-gradient(45deg, #FFD700, #FFA500)",
      color: "#333",
      borderRadius: "50%",
      width: "24px",
      height: "24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: 700,
      animation: "$bounce 0.8s ease-in-out infinite",
      zIndex: 4,
    },
    "@keyframes pulse": {
      "0%": { opacity: 0.15 },
      "50%": { opacity: 0.3 },
      "100%": { opacity: 0.15 },
    },
    "@keyframes glow": {
      "0%": { boxShadow: "0 4px 20px rgba(255, 215, 0, 0.6)" },
      "100%": { boxShadow: "0 6px 30px rgba(255, 215, 0, 0.9)" },
    },
    "@keyframes shake": {
      "0%, 100%": { transform: "translateX(0)" },
      "25%": { transform: "translateX(-2px)" },
      "75%": { transform: "translateX(2px)" },
    },
    "@keyframes confettiFall": {
      "0%": {
        transform: "translateY(-10px) rotate(0deg)",
        opacity: 1,
      },
      "100%": {
        transform: "translateY(100px) rotate(360deg)",
        opacity: 0,
      },
    },
    "@keyframes bounce": {
      "0%, 20%, 50%, 80%, 100%": { transform: "translateY(0)" },
      "40%": { transform: "translateY(-8px)" },
      "60%": { transform: "translateY(-4px)" },
    },
  })
);

interface Props {
  lectureID: string;
  checkboxState: any;
}

const VemNotionerar: React.FC<Props> = ({ lectureID }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [confetti, setConfetti] = useState<
    Array<{ id: number; color: string; left: number; delay: number }>
  >([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const full_name = useSelector(
    (state: RootState) => state.auth.user?.full_name
  );

  const lecturesData = useSelector(
    (state: RootState) => state.lectures.lectures
  );

  const lecture = lecturesData
    .flatMap((week) => week.lectures)
    .find((lecture: Lecture) => lecture.id === lectureID);

  // Create confetti effect
  const createConfetti = () => {
    const newConfetti = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      color: ["#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"][
        i % 6
      ],
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));

    setConfetti(newConfetti);

    // Clear confetti after animation
    setTimeout(() => setConfetti([]), 2000);
  };

  // Trigger celebration
  const triggerCelebration = () => {
    setShowCelebration(true);
    createConfetti();

    // Show achievement badge briefly
    setShowAchievement(true);
    setTimeout(() => setShowAchievement(false), 2000);

    // Reset celebration background
    setTimeout(() => setShowCelebration(false), 600);
  };

  const handleCheckboxChange = async (
    name: string,
    field: "confirm" | "unwish",
    isChecked: boolean
  ) => {
    if (lecture) {
      setIsUpdating(`${name}-${field}`);

      const updatedState = {
        ...lecture.checkboxState,
        [name]: {
          ...lecture.checkboxState[name],
          [field]: isChecked,
          [field === "confirm" ? "unwish" : "confirm"]: isChecked
            ? false
            : lecture.checkboxState[name][
                field === "confirm" ? "unwish" : "confirm"
              ],
        },
      };

      try {
        await dispatch(
          updateCheckboxStateThunk({
            lectureID,
            newCheckboxState: updatedState,
          })
        );

        dispatch(
          updateLectureCheckboxState({
            lectureID,
            newCheckboxState: updatedState,
          })
        );

        // Trigger celebration only for confirm actions
        if (field === "confirm" && isChecked) {
          setTimeout(() => triggerCelebration(), 200);
        }
      } catch (error) {
        console.error("Error updating checkbox state:", error);
      } finally {
        setIsUpdating(null);
      }
    }
  };

  const canCheck = (label: string) => {
    return full_name?.toLowerCase().includes(label.toLowerCase());
  };

  const getPersonStatus = (person: string) => {
    const state = lecture?.checkboxState?.[person];
    if (state?.confirm) return "confirmed";
    if (state?.unwish) return "unwished";
    return "neutral";
  };

  if (!lecture) return null;

  const persons = ["Mattias", "Albin", "David"];

  return (
    <Box className={classes.container}>
      {/* Celebration overlay */}
      <div
        className={`${classes.celebrationOverlay} ${
          showCelebration ? classes.celebrationActive : ""
        }`}
      />

      {/* Achievement badge */}
      {showAchievement && <div className={classes.achievementBadge}>🏆</div>}

      {/* Confetti particles */}
      {confetti.length > 0 && (
        <div className={classes.confettiContainer}>
          {confetti.map((particle) => (
            <div
              key={particle.id}
              className={classes.confetti}
              style={{
                backgroundColor: particle.color,
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {persons.map((person) => {
        const status = getPersonStatus(person);
        const canUserCheck = canCheck(person);
        const isCurrentlyUpdating = isUpdating?.startsWith(person);

        return (
          <div key={person} className={classes.personRow}>
            <Typography className={classes.personName}>{person}</Typography>

            {canUserCheck ? (
              <div className={classes.actionButtons}>
                <Button
                  className={`${classes.confirmButton} ${
                    status === "confirmed" ? "selected" : ""
                  }`}
                  disabled={isCurrentlyUpdating}
                  onClick={() =>
                    handleCheckboxChange(
                      person,
                      "confirm",
                      status !== "confirmed"
                    )
                  }
                >
                  {status === "confirmed" ? "✨ Vald!" : "🎯 Välj"}
                </Button>

                <Button
                  className={`${classes.unwishButton} ${
                    status === "unwished" ? "selected" : ""
                  }`}
                  disabled={isCurrentlyUpdating}
                  onClick={() =>
                    handleCheckboxChange(
                      person,
                      "unwish",
                      status !== "unwished"
                    )
                  }
                >
                  {status === "unwished"
                    ? "❌ Ej intresserad"
                    : "🚫 Ej för mig"}
                </Button>

                {status !== "neutral" && (
                  <Button
                    className={classes.resetButton}
                    disabled={isCurrentlyUpdating}
                    onClick={() => {
                      handleCheckboxChange(
                        person,
                        status === "confirmed" ? "confirm" : "unwish",
                        false
                      );
                    }}
                  >
                    🔄 Återställ
                  </Button>
                )}
              </div>
            ) : (
              <Typography className={classes.statusText}>
                {status === "confirmed"
                  ? "✅ Vald"
                  : status === "unwished"
                  ? "❌ Ej intresserad"
                  : "⚪ Ej vald"}
              </Typography>
            )}
          </div>
        );
      })}
    </Box>
  );
};

export default VemNotionerar;
