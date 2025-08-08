import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@material-ui/core";
import { Alert } from "@mui/material";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  Notifications as NotificationsIcon,
} from "@material-ui/icons";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "store/types";
import { addNotification } from "store/slices/notificationsReducer";
import Lecture from "types/lecture";
import { 
  sendToGroupChat,
  openMessengerWithMessage,
  addTeamEmojisIfNeeded
} from "../utils/groupChatNotifications";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    notifyButton: {
      background: "linear-gradient(45deg, #2196f3, #1976d2)",
      color: "white",
      marginTop: theme.spacing(1),
      fontSize: "0.8rem",
      padding: "6px 12px",
      minWidth: "auto",
      animation: "$breathingAnimation 12s ease-in-out infinite",
      "&:hover": {
        background: "linear-gradient(45deg, #1976d2, #1565c0)",
      },
    },
    dialog: {
      "& .MuiDialog-paper": {
        background: "#2c2c2c",
        color: "white",
        minWidth: "400px",
        animation: "$breathingAnimation 12s ease-in-out infinite",
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
    lectureInfo: {
      background: "#1a1a1a",
      padding: theme.spacing(2),
      borderRadius: "8px",
      marginBottom: theme.spacing(2),
      border: "1px solid #404040",
      animation: "$breathingAnimation 12s ease-in-out infinite",
    },
    lectureTitle: {
      color: "white",
      fontWeight: 600,
      marginBottom: theme.spacing(1),
    },
    lectureDetails: {
      color: "#ccc",
      fontSize: "0.9rem",
    },
    messageInput: {
      marginTop: theme.spacing(2),
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
    description: {
      color: "#ccc",
      fontSize: "0.9rem",
      marginBottom: theme.spacing(2),
    },
    lectureSelect: {
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
    sendButton: {
      background: "linear-gradient(45deg, #2196f3, #1976d2)",
      color: "white",
      minWidth: "120px",
      "&:disabled": {
        background: "#666",
        color: "#ccc",
      },
      "&:hover": {
        background: "linear-gradient(45deg, #1976d2, #1565c0)",
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

interface NotifyButtonProps {
  lecture: Lecture;
  allLectures: Lecture[];
  onNotificationSent?: () => void;
}

const NotifyButton: React.FC<NotifyButtonProps> = ({
  lecture,
  allLectures,
  onNotificationSent,
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedLecture, setSelectedLecture] = useState<Lecture>(lecture);
  // Defensive cleanup for any accidental "undefined." prefixes
  const sanitizeMessage = (text: string): string => {
    return (text || '')
      .replace(/^undefined[\.,:\-]?\s*/i, '')
      .trim();
  };


  const allUsers = ["Mattias", "Albin", "David"];
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

  const currentUserName = currentUser?.full_name ? mapUserNameToPerson(currentUser.full_name) : "";
  const otherUsers = allUsers.filter((user) => user !== currentUserName);

  // Get lectures that have been selected by current user only
  const getSelectedLectures = () => {
    return allLectures.filter(lecture => {
      return lecture.checkboxState?.[currentUserName]?.confirm;
    });
  };

  const selectedLectures = getSelectedLectures();

  const handleOpen = () => {
    setOpen(true);
    setSelectedLecture(lecture); // Set the clicked lecture as default
    // Default message without undefined prefix
    const defaultMessage = `${lecture.lectureNumber}. ${lecture.title} färdignotionerad! 💪🔥`;
    const enhancedMessage = addTeamEmojisIfNeeded(defaultMessage);
    setMessage(sanitizeMessage(enhancedMessage));
  };

  const handleClose = () => {
    setOpen(false);
    setMessage("");
    setSelectedLecture(lecture); // Reset to original lecture
  };

  const handleLectureChange = (newLecture: Lecture) => {
    setSelectedLecture(newLecture);
    // Update message to reflect the new lecture
    const defaultMessage = `${newLecture.lectureNumber}. ${newLecture.title} färdignotionerad! 💪🔥`;
    const enhancedMessage = addTeamEmojisIfNeeded(defaultMessage);
    setMessage(sanitizeMessage(enhancedMessage));
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  const handleSendNotifications = async () => {
    if (!sanitizeMessage(message).trim()) return;

    setIsLoading(true);

    try {
      // Send in-app notifications to other users
      otherUsers.forEach((userName) => {
        const notification = {
          id: `${Date.now()}-${userName}-${lecture.id}`, // Deterministic ID to prevent hydration mismatches
          type: "lecture_notified" as const,
          title: `${currentUserName} har notifierat dig`,
          message: sanitizeMessage(message),
          fromUser: currentUserName,
          toUser: userName,
          lectureId: selectedLecture.id,
          lectureTitle: selectedLecture.title,
          timestamp: Date.now(),
          read: false,
        };

        dispatch(addNotification(notification));
      });

      // Send to group chat (Discord/Facebook Messenger/Slack)
      const groupChatSuccess = await sendToGroupChat({
        title: `${currentUserName} har notifierat dig`,
        message: sanitizeMessage(message),
        fromUser: currentUserName,
        lectureTitle: selectedLecture.title,
        type: 'lecture_notified'
      });

      // The function opens Messenger and copies to clipboard
      setSuccessMessage(`Messenger öppnas och meddelandet är kopierat!`);
      setShowSuccess(true);
      handleClose();

      if (onNotificationSent) {
        onNotificationSent();
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      setSuccessMessage("Fel vid sändning av meddelande");
      setShowSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={handleOpen}
        className={classes.notifyButton}
        startIcon={<NotificationsIcon />}
        size="small"
      >
        Notifiera
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        className={classes.dialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className={classes.dialogTitle}>
          Notifiera andra användare
        </DialogTitle>

        <DialogContent className={classes.dialogContent}>
          <div className={classes.lectureInfo}>
            <Typography className={classes.lectureTitle}>
              {selectedLecture.title}
            </Typography>
            <Typography className={classes.lectureDetails}>
              {selectedLecture.date} • {selectedLecture.time}
            </Typography>
          </div>

          {selectedLectures.length > 1 && (
            <FormControl variant="outlined" fullWidth className={classes.lectureSelect}>
              <InputLabel>Välj föreläsning att notifiera för</InputLabel>
              <Select
                value={selectedLecture.id}
                onChange={(e) => {
                  const newLecture = selectedLectures.find(l => l.id === e.target.value);
                  if (newLecture) {
                    handleLectureChange(newLecture);
                  }
                }}
                label="Välj föreläsning att notifiera för"
                MenuProps={{
                  PaperProps: {
                    style: {
                      backgroundColor: "#2c2c2c",
                      color: "white",
                    },
                  },
                }}
              >
                {selectedLectures.map((lectureOption) => (
                  <MenuItem 
                    key={lectureOption.id} 
                    value={lectureOption.id}
                    style={{ color: "white" }}
                  >
                    {lectureOption.lectureNumber}. {lectureOption.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Typography className={classes.description}>
            Skickas automatiskt till {otherUsers.join(" och ")}s Macs samt Messenger-gruppchaten.
          </Typography>

          <TextField
            className={classes.messageInput}
            label="Meddelande"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`${selectedLecture.lectureNumber}. ${selectedLecture.title} färdignotionerad! <3`}
          />
        </DialogContent>

        <DialogActions className={classes.dialogActions}>
          <Button onClick={handleClose} className={classes.cancelButton}>
            Avbryt
          </Button>
          <Button
            variant="contained"
            onClick={handleSendNotifications}
            disabled={!message.trim() || isLoading}
            className={classes.sendButton}
            startIcon={
              isLoading ? <CircularProgress size={16} color="inherit" /> : <NotificationsIcon />
            }
          >
            {isLoading ? "Skickar..." : "Skicka meddelande"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccess}
        autoHideDuration={4000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          style={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default NotifyButton;
