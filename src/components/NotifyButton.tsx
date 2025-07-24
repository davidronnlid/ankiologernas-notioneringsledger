import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Snackbar,
  CircularProgress,
} from "@material-ui/core";
import { Alert } from "@mui/material";
import {
  makeStyles,
  Theme,
  createStyles,
  useTheme,
} from "@material-ui/core/styles";
import {
  Notifications as NotificationsIcon,
  Facebook as FacebookIcon,
} from "@material-ui/icons";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "store/types";
import { addNotification } from "store/slices/notificationsReducer";
import Lecture from "types/lecture";
import { isMac } from "../utils/macNotifications";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    notifyButton: {
      background: "linear-gradient(45deg, #2196f3, #1976d2)",
      color: "white",
      marginTop: theme.spacing(1),
      fontSize: "0.8rem",
      padding: "6px 12px",
      minWidth: "auto",
      "&:hover": {
        background: "linear-gradient(45deg, #1976d2, #1565c0)",
      },
    },
    dialog: {
      "& .MuiDialog-paper": {
        background: "#2c2c2c",
        color: "white",
        minWidth: "400px",
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
    userSelection: {
      marginTop: theme.spacing(2),
    },
    userCheckbox: {
      color: "#2196f3",
      "&.Mui-checked": {
        color: "#2196f3",
      },
    },
    userLabel: {
      color: "white",
      fontSize: "0.9rem",
    },
    selectedUsers: {
      marginTop: theme.spacing(2),
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing(1),
    },
    selectedChip: {
      background: "linear-gradient(45deg, #2196f3, #1976d2)",
      color: "white",
    },
    dialogActions: {
      background: "#1a1a1a",
      borderTop: "1px solid #404040",
      padding: theme.spacing(2),
    },
    actionButton: {
      marginLeft: theme.spacing(1),
    },
    messengerButton: {
      background: "linear-gradient(45deg, #1877f2, #166fe5)",
      color: "white",
      "&:hover": {
        background: "linear-gradient(45deg, #166fe5, #1464c7)",
      },
    },
    loadingButton: {
      background: "linear-gradient(45deg, #2196f3, #1976d2)",
      color: "white",
      "&:disabled": {
        background: "#666",
        color: "#ccc",
      },
    },
  })
);

interface NotifyButtonProps {
  lecture: Lecture;
  onNotificationSent?: () => void;
}

const NotifyButton: React.FC<NotifyButtonProps> = ({
  lecture,
  onNotificationSent,
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const allUsers = ["Mattias", "Albin", "David"];
  const currentUserName = currentUser?.full_name?.split(" ")[0] || "";
  const availableUsers = allUsers.filter((user) => user !== currentUserName);

  const handleOpen = () => {
    setOpen(true);
    setSelectedUsers([]);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedUsers([]);
  };

  const handleUserToggle = (userName: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userName)
        ? prev.filter((user) => user !== userName)
        : [...prev, userName]
    );
  };

  const handleNotify = async () => {
    if (selectedUsers.length === 0) return;

    setIsLoading(true);

    try {
      // Create in-app notifications for each selected user
      selectedUsers.forEach((userName) => {
        const notification = {
          id: `${Date.now()}-${Math.random()}`,
          type: "lecture_notified" as const,
          title: `${currentUserName} har notifierat dig`,
          message: `${currentUserName} har notifierat dig om att de har notionerat färdigt föreläsningen "${lecture.title}"`,
          fromUser: currentUserName,
          toUser: userName,
          lectureId: lecture.id,
          lectureTitle: lecture.title,
          timestamp: Date.now(),
          read: false,
        };

        dispatch(addNotification(notification));
      });

      setSuccessMessage(`Notifierat ${selectedUsers.length} användare!`);
      setShowSuccess(true);
      handleClose();

      if (onNotificationSent) {
        onNotificationSent();
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      setSuccessMessage("Fel vid sändning av notifieringar");
      setShowSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessengerShare = () => {
    const message = `Hej! Jag har just notionerat färdigt föreläsningen "${lecture.title}" i Klinisk medicin 4! 📚✨\n\nKolla Notioneringsledger: ${window.location.href}`;
    const encodedMessage = encodeURIComponent(message);

    // Facebook Messenger URL scheme
    const messengerUrl = `fb-messenger://share/?text=${encodedMessage}`;

    // Fallback to web version if app is not installed
    const fallbackUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(
      window.location.href
    )}&app_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(
      window.location.href
    )}`;

    try {
      // Try to open Messenger app first
      window.location.href = messengerUrl;

      // Fallback after a short delay if Messenger app didn't open
      setTimeout(() => {
        window.open(fallbackUrl, "_blank", "width=600,height=400");
      }, 1000);
    } catch (error) {
      // Direct fallback to web version
      window.open(fallbackUrl, "_blank", "width=600,height=400");
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  const handleFacebookShare = () => {
    // TODO: Implementera Facebook-delning
    alert("Facebook-delning är inte implementerad ännu!");
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        className={classes.notifyButton}
        onClick={handleOpen}
        startIcon={<NotificationsIcon />}
      >
        Notifiera andra
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
              {lecture.title}
            </Typography>
            <Typography className={classes.lectureDetails}>
              {lecture.date} • {lecture.time} • Klinisk medicin 4
            </Typography>
          </div>

          <Typography
            variant="body2"
            style={{ color: "#ccc", marginBottom: theme.spacing(2) }}
          >
            Välj vilka användare du vill notifiera om att du har notionerat
            färdigt denna föreläsning. Du kan skicka in-app notifieringar eller
            dela via Messenger.
          </Typography>

          <div className={classes.userSelection}>
            {availableUsers.map((userName) => (
              <FormControlLabel
                key={userName}
                control={
                  <Checkbox
                    checked={selectedUsers.includes(userName)}
                    onChange={() => handleUserToggle(userName)}
                    className={classes.userCheckbox}
                  />
                }
                label={userName}
                className={classes.userLabel}
              />
            ))}
          </div>

          {selectedUsers.length > 0 && (
            <div className={classes.selectedUsers}>
              <Typography
                variant="body2"
                style={{ color: "#ccc", marginBottom: theme.spacing(1) }}
              >
                Valda användare:
              </Typography>
              {selectedUsers.map((userName) => (
                <Chip
                  key={userName}
                  label={userName}
                  className={classes.selectedChip}
                  size="small"
                />
              ))}
            </div>
          )}
        </DialogContent>

        <DialogActions className={classes.dialogActions}>
          <Button onClick={handleClose} style={{ color: "#ccc" }}>
            Avbryt
          </Button>

          {isMac() && selectedUsers.length > 0 && (
            <>
              <Button
                variant="contained"
                onClick={() => {
                  const contacts = getMacUserContacts();
                  selectedUsers.forEach((userName) => {
                    const contact = contacts[userName as keyof typeof contacts];
                    if (contact) {
                      sendToiMessage(
                        contact.phone,
                        `📚 ${currentUserName} har notionerat färdigt "${lecture.title}"! Kolla Notioneringsledger.`
                      );
                    }
                  });
                }}
                className={`${classes.actionButton} ${classes.iMessageButton}`}
                startIcon={<PhoneIcon />}
              >
                iMessage
              </Button>

              <Button
                variant="contained"
                onClick={() => {
                  const contacts = getMacUserContacts();
                  selectedUsers.forEach((userName) => {
                    const contact = contacts[userName as keyof typeof contacts];
                    if (contact) {
                      sendToAppleMail(
                        contact.email,
                        `Notioneringsledger: ${currentUserName} har slutfört en föreläsning`,
                        `Hej ${userName}!\n\n${currentUserName} har notionerat färdigt "${lecture.title}".\n\nKolla Notioneringsledger för detaljer!`
                      );
                    }
                  });
                }}
                className={`${classes.actionButton} ${classes.macButton}`}
                startIcon={<EmailIcon />}
              >
                Mail
              </Button>
            </>
          )}

          <Button
            variant="contained"
            onClick={handleFacebookShare}
            className={`${classes.actionButton} ${classes.shareButton}`}
            startIcon={<FacebookIcon />}
          >
            Dela på Facebook
          </Button>
          <Button
            variant="contained"
            onClick={handleNotify}
            disabled={selectedUsers.length === 0 || isLoading}
            className={`${classes.actionButton} ${classes.loadingButton}`}
            startIcon={
              isLoading ? <CircularProgress size={16} /> : <NotificationsIcon />
            }
          >
            {isLoading
              ? "Skickar..."
              : isMac()
              ? "Skicka Mac-notifieringar"
              : "Skicka notifieringar"}
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
