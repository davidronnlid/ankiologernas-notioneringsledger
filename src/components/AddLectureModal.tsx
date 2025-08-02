import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@material-ui/core";
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  Close as CloseIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Title as TitleIcon,
} from "@material-ui/icons";
import { useSelector } from "react-redux";
import { RootState } from "store/types";
import { isLectureTitleUnique, generateUniqueTitleSuggestions } from "../utils/uniqueLectureManager";
import Lecture, { SubjectArea } from "../types/lecture";
import { SUBJECT_AREAS, detectSubjectArea } from "../utils/subjectAreas";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dialog: {
      "& .MuiDialog-paper": {
        background: "linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)",
        borderRadius: "16px",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        minWidth: "400px",
      },
    },
    dialogTitle: {
      background: "rgba(255, 255, 255, 0.1)",
      color: "white",
      borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing(2, 3),
    },
    titleText: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      fontWeight: 600,
    },
    closeButton: {
      color: "rgba(255, 255, 255, 0.8)",
      "&:hover": {
        color: "white",
        background: "rgba(255, 255, 255, 0.1)",
      },
    },
    dialogContent: {
      padding: theme.spacing(3),
      color: "white",
    },
    formSection: {
      marginBottom: theme.spacing(3),
    },
    sectionTitle: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
      color: "rgba(255, 255, 255, 0.9)",
      fontWeight: 600,
    },
    textField: {
      "& .MuiOutlinedInput-root": {
        "& fieldset": {
          borderColor: "rgba(255, 255, 255, 0.3)",
        },
        "&:hover fieldset": {
          borderColor: "rgba(255, 255, 255, 0.5)",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#4caf50",
        },
      },
      "& .MuiInputLabel-root": {
        color: "rgba(255, 255, 255, 0.7)",
        "&.Mui-focused": {
          color: "#4caf50",
        },
      },
      "& .MuiInputBase-input": {
        color: "white",
        "&::placeholder": {
          color: "rgba(255, 255, 255, 0.5)",
        },
      },
    },
    timeSection: {
      display: "flex",
      gap: theme.spacing(2),
      alignItems: "flex-end",
    },
    timeField: {
      flex: 1,
    },
    durationChip: {
      background: "rgba(255, 255, 255, 0.2)",
      color: "white",
      fontWeight: 500,
    },
    dialogActions: {
      padding: theme.spacing(2, 3),
      borderTop: "1px solid rgba(255, 255, 255, 0.2)",
      background: "rgba(255, 255, 255, 0.05)",
    },
    cancelButton: {
      background: "rgba(255, 255, 255, 0.1)",
      color: "white",
      "&:hover": {
        background: "rgba(255, 255, 255, 0.2)",
      },
    },
    addButton: {
      background: "linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)",
      color: "white",
      fontWeight: 600,
      "&:hover": {
        background: "linear-gradient(45deg, #388e3c 30%, #4caf50 90%)",
        transform: "translateY(-1px)",
        boxShadow: "0 6px 20px rgba(76, 175, 80, 0.4)",
      },
      transition: "all 0.3s ease",
    },
    errorText: {
      color: "#ff6b6b",
      fontSize: "0.875rem",
      marginTop: theme.spacing(1),
    },
    infoText: {
      color: "rgba(255, 255, 255, 0.7)",
      fontSize: "0.875rem",
      marginTop: theme.spacing(1),
      fontStyle: "italic",
    },
  })
);

interface AddLectureModalProps {
  open: boolean;
  onClose: () => void;
  onAddLecture: (lectureData: {
    title: string;
    date: string;
    time: string;
    lecturer?: string;
    subjectArea: SubjectArea;
    duration: number;
  }) => void;
  suggestedDate?: string;
  suggestedTime?: string;
  isLoading?: boolean;
}

const AddLectureModal: React.FC<AddLectureModalProps> = ({
  open,
  onClose,
  onAddLecture,
  suggestedDate,
  suggestedTime,
  isLoading = false,
}) => {
  const classes = useStyles();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const lecturesData = useSelector((state: RootState) => state.lectures.lectures);
  
  // Authentication check for lecture creation
  const allowedNames = ["David Rönnlid", "Albin Lindberg", "Mattias Österdahl"];
  const isAllowedToCreateLectures = currentUser?.full_name ? allowedNames.includes(currentUser.full_name) : false;
  
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(suggestedDate || "");
  const [startTime, setStartTime] = useState(suggestedTime?.split("-")[0] || "09:00");
  const [endTime, setEndTime] = useState(suggestedTime?.split("-")[1] || "10:00");
  const [lecturer, setLecturer] = useState("");
  const [subjectArea, setSubjectArea] = useState<SubjectArea | "">("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);

  // Auto-detect subject area when title changes
  useEffect(() => {
    if (title.trim() && !subjectArea) {
      const detected = detectSubjectArea(title);
      if (detected) {
        setSubjectArea(detected);
      }
    }
  }, [title, subjectArea]);

  // Get all lectures for uniqueness checking
  const allLectures: Lecture[] = lecturesData.flatMap(week => week.lectures);

  const calculateDuration = (start: string, end: string): number => {
    const startParts = start.split(":").map(Number);
    const endParts = end.split(":").map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    return Math.max(0, endMinutes - startMinutes) / 60;
  };

  const duration = calculateDuration(startTime, endTime);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newErrors.title = "Titel är obligatorisk";
    } else {
      // Check for unique title
      if (!isLectureTitleUnique(title.trim(), allLectures)) {
        const suggestions = generateUniqueTitleSuggestions(title.trim(), allLectures);
        newErrors.title = `En föreläsning med denna titel finns redan. ${
          suggestions.length > 0 
            ? `Förslag: ${suggestions.slice(0, 2).join(", ")}` 
            : 'Vänligen välj en annan titel.'
        }`;
        setTitleSuggestions(suggestions);
      } else {
        setTitleSuggestions([]);
      }
    }

    if (!date) {
      newErrors.date = "Datum är obligatoriskt";
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.date = "Datum kan inte vara i det förflutna";
      }
    }

    if (startTime >= endTime) {
      newErrors.time = "Sluttid måste vara efter starttid";
    }

    if (!subjectArea) {
      newErrors.subjectArea = "Ämnesområde är obligatoriskt";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLecture = () => {
    // Check authentication first
    if (!isAllowedToCreateLectures) {
      setErrors({ auth: "Du måste vara inloggad som David, Albin eller Mattias för att skapa föreläsningar." });
      return;
    }
    
    if (validateForm()) {
      onAddLecture({
        title: title.trim(),
        date,
        time: `${startTime}-${endTime}`,
        lecturer: lecturer.trim() || "",
        subjectArea: subjectArea as SubjectArea,
        duration,
      });
      
      // Reset form
      setTitle("");
      setDate("");
      setStartTime("09:00");
      setEndTime("10:00");
      setLecturer("");
      setSubjectArea("");
      setErrors({});
      setTitleSuggestions([]);
      onClose();
    }
  };

  const handleClose = () => {
    setTitle("");
    setDate("");
    setStartTime("09:00");
    setEndTime("10:00");
    setLecturer("");
    setSubjectArea("");
    setErrors({});
    setTitleSuggestions([]);
    onClose();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTitle(suggestion);
    setTitleSuggestions([]);
    setErrors(prev => ({ ...prev, title: "" }));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className={classes.dialog}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle className={classes.dialogTitle}>
        <div className={classes.titleText}>
          <AddIcon />
          <Typography variant="h6">Lägg till ny föreläsning</Typography>
        </div>
        <IconButton onClick={handleClose} className={classes.closeButton}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        {/* Authentication Error Display */}
        {errors.auth && (
          <div style={{ 
            marginBottom: 24, 
            padding: 16, 
            background: "rgba(244, 67, 54, 0.1)", 
            border: "1px solid rgba(244, 67, 54, 0.3)",
            borderRadius: "8px" 
          }}>
            <Typography className={classes.errorText} style={{ fontSize: "0.9rem" }}>
              ⚠️ {errors.auth}
            </Typography>
          </div>
        )}
        
        <div className={classes.formSection}>
          <div className={classes.sectionTitle}>
            <TitleIcon />
            <Typography variant="subtitle1">Föreläsningstitel</Typography>
          </div>
          <TextField
            fullWidth
            label="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={classes.textField}
            placeholder="T.ex. Introduktion till Kardiologi"
            error={!!errors.title}
            helperText={errors.title}
          />
          
          {/* Title suggestions */}
          {titleSuggestions.length > 0 && (
            <Box mt={1}>
              <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                💡 Förslag för unika titlar:
              </Typography>
              {titleSuggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  style={{
                    marginRight: 8,
                    marginBottom: 4,
                    backgroundColor: "rgba(33, 150, 243, 0.2)",
                    color: "white",
                    border: "1px solid rgba(33, 150, 243, 0.5)",
                    cursor: "pointer"
                  }}
                  size="small"
                />
              ))}
            </Box>
          )}
        </div>

        <div className={classes.formSection}>
          <div className={classes.sectionTitle}>
            <ScheduleIcon />
            <Typography variant="subtitle1">Datum och tid</Typography>
          </div>
          
          <TextField
            fullWidth
            label="Datum"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={classes.textField}
            error={!!errors.date}
            helperText={errors.date}
            style={{ marginBottom: 16 }}
          />

          <div className={classes.timeSection}>
            <TextField
              label="Starttid"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`${classes.textField} ${classes.timeField}`}
              InputLabelProps={{ shrink: true }}
            />
            <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
              till
            </Typography>
            <TextField
              label="Sluttid"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`${classes.textField} ${classes.timeField}`}
              InputLabelProps={{ shrink: true }}
              error={!!errors.time}
            />
          </div>

          {duration > 0 && (
            <Box mt={1}>
              <Chip
                label={`${duration} timmar`}
                className={classes.durationChip}
                size="small"
              />
            </Box>
          )}

          {errors.time && (
            <Typography className={classes.errorText}>
              {errors.time}
            </Typography>
          )}
        </div>

        <div className={classes.formSection}>
          <Typography variant="subtitle1" style={{ marginBottom: 16, color: "rgba(255, 255, 255, 0.9)", fontWeight: 600 }}>
            📚 Föreläsningsdetaljer
          </Typography>
          
          <TextField
            fullWidth
            label="Föreläsare (valfritt)"
            value={lecturer}
            onChange={(e) => setLecturer(e.target.value)}
            className={classes.textField}
            placeholder="T.ex. Dr. Anna Andersson"
            style={{ marginBottom: 16 }}
          />

          <FormControl fullWidth className={classes.textField} error={!!errors.subjectArea}>
            <InputLabel id="subject-area-label">Ämnesområde *</InputLabel>
            <Select
              labelId="subject-area-label"
              value={subjectArea}
              onChange={(e) => setSubjectArea(e.target.value as SubjectArea)}
              label="Ämnesområde *"
            >
              {SUBJECT_AREAS.map((area) => (
                <MenuItem key={area} value={area}>
                  {area}
                </MenuItem>
              ))}
            </Select>
            {errors.subjectArea && (
              <Typography className={classes.errorText}>
                {errors.subjectArea}
              </Typography>
            )}
          </FormControl>
        </div>

        <Typography className={classes.infoText}>
          💡 Föreläsningen kommer att läggas till i {subjectArea ? `${subjectArea}-databasen` : 'den valda ämnesområdesdatabasen'} för alla användare.
        </Typography>
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button onClick={handleClose} className={classes.cancelButton}>
          Avbryt
        </Button>
        <Button
          onClick={handleAddLecture}
          className={classes.addButton}
          startIcon={isLoading ? undefined : <AddIcon />}
          disabled={!title.trim() || !date || !subjectArea || isLoading}
        >
          {isLoading ? "Lägger till..." : "Lägg till föreläsning"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddLectureModal; 