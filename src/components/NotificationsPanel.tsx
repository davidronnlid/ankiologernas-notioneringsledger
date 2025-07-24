import React, { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  IconButton,
  Badge,
  Box,
  Divider,
  Button,
  Chip,
} from "@material-ui/core";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Message as MessageIcon,
  Close as CloseIcon,
  DoneAll as DoneAllIcon,
  Delete as DeleteIcon,
} from "@material-ui/icons";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "store/types";
import {
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  Notification,
} from "store/slices/notificationsReducer";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    notificationButton: {
      color: "white",
      marginLeft: theme.spacing(2),
    },
    drawer: {
      width: 400,
      [theme.breakpoints.down("sm")]: {
        width: "100%",
      },
    },
    drawerHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing(2),
      background: "#2c2c2c",
      borderBottom: "1px solid #404040",
    },
    drawerTitle: {
      color: "white",
      fontWeight: 600,
    },
    notificationList: {
      background: "#1a1a1a",
      height: "100%",
    },
    notificationItem: {
      borderBottom: "1px solid #333",
      transition: "background-color 0.2s ease",
      "&:hover": {
        backgroundColor: "#2a2a2a",
      },
      "&.unread": {
        backgroundColor: "#1a3d1a",
        borderLeft: "4px solid #4caf50",
      },
    },
    notificationContent: {
      padding: theme.spacing(1, 0),
    },
    notificationTitle: {
      color: "white",
      fontWeight: 600,
      fontSize: "0.9rem",
      marginBottom: theme.spacing(0.5),
    },
    notificationMessage: {
      color: "#ccc",
      fontSize: "0.85rem",
      marginBottom: theme.spacing(1),
    },
    notificationMeta: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing(1),
    },
    notificationTime: {
      color: "#888",
      fontSize: "0.75rem",
    },
    notificationActions: {
      display: "flex",
      gap: theme.spacing(1),
    },
    actionButton: {
      minWidth: "auto",
      padding: "4px 8px",
      fontSize: "0.75rem",
    },
    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing(4),
      color: "#888",
    },
    emptyIcon: {
      fontSize: "3rem",
      marginBottom: theme.spacing(2),
      opacity: 0.5,
    },
    drawerActions: {
      padding: theme.spacing(2),
      background: "#2c2c2c",
      borderTop: "1px solid #404040",
    },
    typeChip: {
      fontSize: "0.7rem",
      height: "20px",
      "&.lecture_completed": {
        backgroundColor: "#4caf50",
        color: "white",
      },
      "&.lecture_notified": {
        backgroundColor: "#2196f3",
        color: "white",
      },
    },
  })
);

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  open,
  onClose,
}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const notifications = useSelector(
    (state: RootState) => state.notifications.notifications
  );
  const unreadCount = useSelector(
    (state: RootState) => state.notifications.unreadCount
  );

  const handleMarkAsRead = (notificationId: string) => {
    dispatch(markAsRead(notificationId));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  const handleRemoveNotification = (notificationId: string) => {
    dispatch(removeNotification(notificationId));
  };

  const handleClearAll = () => {
    dispatch(clearAllNotifications());
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "lecture_completed":
        return <CheckCircleIcon style={{ color: "#4caf50" }} />;
      case "lecture_notified":
        return <MessageIcon style={{ color: "#2196f3" }} />;
      default:
        return <NotificationsIcon style={{ color: "#ccc" }} />;
    }
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: sv,
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      classes={{ paper: classes.drawer }}
    >
      <div className={classes.drawerHeader}>
        <Typography variant="h6" className={classes.drawerTitle}>
          Notifieringar
          {unreadCount > 0 && (
            <Chip
              label={unreadCount}
              size="small"
              style={{
                backgroundColor: "#4caf50",
                color: "white",
                marginLeft: 8,
                fontSize: "0.75rem",
              }}
            />
          )}
        </Typography>
        <IconButton onClick={onClose} style={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </div>

      <div className={classes.notificationList}>
        {notifications.length === 0 ? (
          <div className={classes.emptyState}>
            <NotificationsIcon className={classes.emptyIcon} />
            <Typography variant="body2">Inga notifieringar än</Typography>
            <Typography variant="caption" style={{ textAlign: "center" }}>
              Du kommer att få notifieringar när andra användare notifierar dig
              om föreläsningar
            </Typography>
          </div>
        ) : (
          <List>
            {notifications.map((notification: Notification) => (
              <ListItem
                key={notification.id}
                className={`${classes.notificationItem} ${
                  !notification.read ? "unread" : ""
                }`}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <div className={classes.notificationContent}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Typography className={classes.notificationTitle}>
                          {notification.title}
                        </Typography>
                        <Chip
                          label={
                            notification.type === "lecture_completed"
                              ? "Slutförd"
                              : "Notifierad"
                          }
                          className={`${classes.typeChip} ${notification.type}`}
                          size="small"
                        />
                      </div>
                      <Typography className={classes.notificationMessage}>
                        {notification.message}
                      </Typography>
                      <div className={classes.notificationMeta}>
                        <Typography className={classes.notificationTime}>
                          {formatTime(notification.timestamp)}
                        </Typography>
                        <div className={classes.notificationActions}>
                          {!notification.read && (
                            <Button
                              size="small"
                              className={classes.actionButton}
                              onClick={() => handleMarkAsRead(notification.id)}
                              style={{ color: "#4caf50" }}
                            >
                              <DoneAllIcon
                                fontSize="small"
                                style={{ marginRight: 4 }}
                              />
                              Läs
                            </Button>
                          )}
                          <Button
                            size="small"
                            className={classes.actionButton}
                            onClick={() =>
                              handleRemoveNotification(notification.id)
                            }
                            style={{ color: "#f44336" }}
                          >
                            <DeleteIcon
                              fontSize="small"
                              style={{ marginRight: 4 }}
                            />
                            Ta bort
                          </Button>
                        </div>
                      </div>
                    </div>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </div>

      {notifications.length > 0 && (
        <div className={classes.drawerActions}>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              style={{ color: "#4caf50", borderColor: "#4caf50" }}
            >
              <DoneAllIcon fontSize="small" style={{ marginRight: 4 }} />
              Markera alla som lästa
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearAll}
              style={{ color: "#f44336", borderColor: "#f44336" }}
            >
              <DeleteIcon fontSize="small" style={{ marginRight: 4 }} />
              Rensa alla
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default NotificationsPanel;
