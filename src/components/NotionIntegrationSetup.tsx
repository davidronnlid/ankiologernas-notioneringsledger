import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Chip,
  Link,
} from "@material-ui/core";
// Custom Alert component since @material-ui/lab might not be available
const CustomAlert: React.FC<{ severity: 'success' | 'error'; children: React.ReactNode; style?: any }> = ({ severity, children, style }) => (
  <Box
    style={{
      padding: '12px 16px',
      borderRadius: '4px',
      backgroundColor: severity === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
      border: `1px solid ${severity === 'success' ? '#4caf50' : '#f44336'}`,
      color: severity === 'success' ? '#4caf50' : '#f44336',
      ...style
    }}
  >
    {children}
  </Box>
);
import {
  makeStyles,
  Theme,
  createStyles,
} from "@material-ui/core/styles";
import {
  Settings as IntegrationIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Launch as LaunchIcon,
} from "@material-ui/icons";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    dialog: {
      "& .MuiDialog-paper": {
        background: "linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)",
        borderRadius: "16px",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        minWidth: "600px",
        maxWidth: "800px",
      },
    },
    dialogTitle: {
      background: "rgba(255, 255, 255, 0.1)",
      color: "white",
      borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
    },
    titleIcon: {
      fontSize: "1.5rem",
    },
    stepper: {
      background: "transparent",
      "& .MuiStepLabel-label": {
        color: "rgba(255, 255, 255, 0.8)",
        "&.MuiStepLabel-active": {
          color: "white",
        },
        "&.MuiStepLabel-completed": {
          color: "#4caf50",
        },
      },
      "& .MuiStepIcon-root": {
        color: "rgba(255, 255, 255, 0.3)",
        "&.MuiStepIcon-active": {
          color: "#2196f3",
        },
        "&.MuiStepIcon-completed": {
          color: "#4caf50",
        },
      },
    },
    stepContent: {
      borderLeft: "2px solid rgba(255, 255, 255, 0.2)",
      marginLeft: "12px",
      paddingLeft: theme.spacing(2),
    },
    instructionBox: {
      background: "rgba(255, 255, 255, 0.1)",
      borderRadius: "8px",
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      border: "1px solid rgba(255, 255, 255, 0.2)",
    },
    codeBlock: {
      background: "rgba(0, 0, 0, 0.3)",
      padding: theme.spacing(1),
      borderRadius: "4px",
      fontFamily: "monospace",
      fontSize: "0.875rem",
      color: "#90caf9",
      marginTop: theme.spacing(1),
    },
    tokenInput: {
      "& .MuiOutlinedInput-root": {
        background: "rgba(255, 255, 255, 0.1)",
        "& fieldset": {
          borderColor: "rgba(255, 255, 255, 0.3)",
        },
        "&:hover fieldset": {
          borderColor: "rgba(255, 255, 255, 0.5)",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#2196f3",
        },
      },
      "& .MuiInputBase-input": {
        color: "white",
        fontFamily: "monospace",
        fontSize: "0.875rem",
      },
      "& .MuiInputLabel-root": {
        color: "rgba(255, 255, 255, 0.7)",
      },
    },
    successChip: {
      background: "#4caf50",
      color: "white",
      fontWeight: "bold",
    },
    errorChip: {
      background: "#f44336",
      color: "white",
      fontWeight: "bold",
    },
    externalLink: {
      color: "#90caf9",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: theme.spacing(0.5),
      "&:hover": {
        textDecoration: "underline",
      },
    },
    screenshot: {
      width: "100%",
      maxWidth: "400px",
      borderRadius: "8px",
      border: "2px solid rgba(255, 255, 255, 0.2)",
      marginTop: theme.spacing(1),
    },
  })
);

interface NotionIntegrationSetupProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  onSetupComplete: () => void;
  isReconfiguration?: boolean;
}

const NotionIntegrationSetup: React.FC<NotionIntegrationSetupProps> = ({
  open,
  onClose,
  userName,
  onSetupComplete,
  isReconfiguration = false,
}) => {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [notionToken, setNotionToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [setupStatus, setSetupStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const steps = [
    "Skapa Notion Integration",
    "Skapa din kurssida",
    "Koppla integration till sidan",
    "Konfigurera token i appen"
  ];

  const testNotionToken = async () => {
    if (!notionToken) return;

    setIsTestingToken(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/notion-setup-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: notionToken,
          userName: userName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSetupStatus("success");
        if (result.pageId) {
          setPageId(result.pageId);
        }
      } else {
        setSetupStatus("error");
        setErrorMessage(result.message || "Token verifiering misslyckades");
      }
    } catch (error) {
      setSetupStatus("error");
      setErrorMessage("Kunde inte kontakta servern");
    } finally {
      setIsTestingToken(false);
    }
  };

  const saveConfiguration = async () => {
    if (!notionToken || setupStatus !== "success") return;

    setIsSavingConfig(true);

    try {
      const response = await fetch("/api/notion-setup-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: userName,
          token: notionToken,
          pageId: pageId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSetupComplete();
        onClose();
      } else {
        setErrorMessage(result.message || "Kunde inte spara konfiguration");
      }
    } catch (error) {
      setErrorMessage("Kunde inte spara konfiguration");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: 16 }}>
              Skapa en ny Notion integration för att koppla ditt konto:
            </Typography>
            
            <Box className={classes.instructionBox}>
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>1.</strong> Gå till Notion Integrations:
              </Typography>
              <Link
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noopener noreferrer"
                className={classes.externalLink}
              >
                https://www.notion.so/my-integrations
                <LaunchIcon fontSize="small" />
              </Link>
              
              <Typography variant="body2" style={{ marginTop: 16, marginBottom: 8 }}>
                <strong>2.</strong> Klicka på "New integration"
              </Typography>
              
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>3.</strong> Fyll i:
              </Typography>
              <Box className={classes.codeBlock}>
                Name: Ankiologernas Notioneringsledger - {userName}<br/>
                Associated workspace: [Välj din workspace]<br/>
                Capabilities: Read content, Update content, Insert content
              </Box>
              
              <Typography variant="body2" style={{ marginTop: 16 }}>
                <strong>4.</strong> Klicka "Submit" och kopiera din "Internal Integration Token"
              </Typography>
            </Box>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: 16 }}>
              Skapa en sida för dina föreläsningar:
            </Typography>
            
            <Box className={classes.instructionBox}>
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>1.</strong> Öppna Notion i din workspace
              </Typography>
              
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>2.</strong> Skapa en ny sida med titeln:
              </Typography>
              <Box className={classes.codeBlock}>
                Klinisk medicin 4
              </Box>
              
              <Typography variant="body2" style={{ marginTop: 16 }}>
                <strong>3.</strong> Lämna sidan tom - appen kommer att fylla i innehållet automatiskt
              </Typography>
            </Box>
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: 16 }}>
              Ge din integration åtkomst till sidan:
            </Typography>
            
            <Box className={classes.instructionBox}>
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>1.</strong> Öppna din "Klinisk medicin 4" sida
              </Typography>
              
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>2.</strong> Klicka på "..." (tre punkter) i övre högra hörnet
              </Typography>
              
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>3.</strong> Välj "Connect to" → "Add connections"
              </Typography>
              
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                <strong>4.</strong> Hitta och välj din integration:
              </Typography>
              <Box className={classes.codeBlock}>
                Ankiologernas Notioneringsledger - {userName}
              </Box>
              
              <Typography variant="body2" style={{ marginTop: 16 }}>
                <strong>5.</strong> Klicka "Allow access" för att ge integrationen behörighet
              </Typography>
            </Box>
          </Box>
        );
      
      case 3:
        return (
          <Box>
            <Typography variant="body2" style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: 16 }}>
              {isReconfiguration 
                ? `Klistra in din Notion token här. Du kan använda din befintliga token eller skapa en ny enligt instruktionerna ovan:`
                : `Klistra in din Notion token här för att slutföra kopplingen:`
              }
            </Typography>
            
            <TextField
              fullWidth
              label="Notion Integration Token"
              variant="outlined"
              value={notionToken}
              onChange={(e) => setNotionToken(e.target.value)}
              placeholder="secret_abc123... eller ntn_abc123..."
              className={classes.tokenInput}
              helperText="Tokennet börjar med 'secret_' eller 'ntn_'"
              multiline={false}
              style={{ marginBottom: 16 }}
            />
            
            {setupStatus === "success" && (
              <CustomAlert severity="success" style={{ marginBottom: 16 }}>
                ✅ Token verifierad! {pageId && `Sida hittad: ${pageId.substring(0, 8)}...`}
              </CustomAlert>
            )}
            
            {setupStatus === "error" && (
              <CustomAlert severity="error" style={{ marginBottom: 16 }}>
                ❌ {errorMessage}
              </CustomAlert>
            )}
            
            <Box display="flex" style={{ gap: '16px' }}>
              <Button
                variant="outlined"
                onClick={testNotionToken}
                disabled={!notionToken || isTestingToken}
                style={{ color: "white", borderColor: "rgba(255, 255, 255, 0.5)" }}
              >
                {isTestingToken ? <CircularProgress size={20} /> : "Testa Token"}
              </Button>
              
              {setupStatus === "success" && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={saveConfiguration}
                  disabled={isSavingConfig}
                >
                  {isSavingConfig ? <CircularProgress size={20} /> : "Spara Konfiguration"}
                </Button>
              )}
            </Box>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className={classes.dialog}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle className={classes.dialogTitle}>
        <IntegrationIcon className={classes.titleIcon} />
        <Typography variant="h6">
          {isReconfiguration ? `Uppdatera Notion Integration - ${userName}` : `Notion Integration Setup - ${userName}`}
        </Typography>
      </DialogTitle>
      
      <DialogContent style={{ padding: "24px" }}>
        <Typography variant="body1" style={{ color: "white", marginBottom: 24 }}>
          {isReconfiguration 
            ? `Hej ${userName}! Du behöver uppdatera din Notion-integration till det nya sidbaserade systemet. Detta ersätter det gamla databasbaserade systemet med en mer flexibel lösning. Din gamla konfiguration kommer automatiskt ersättas.`
            : `Välkommen! För att koppla ditt konto till Notion behöver vi göra en enkel installation. Detta behöver bara göras en gång.`
          }
        </Typography>
        
        <Stepper activeStep={activeStep} orientation="vertical" className={classes.stepper}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>
                <Typography variant="body2">{label}</Typography>
              </StepLabel>
              <StepContent className={classes.stepContent}>
                {getStepContent(index)}
                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setActiveStep(activeStep + 1)}
                    disabled={
                      index === steps.length - 1 || 
                      (index === 3 && setupStatus !== "success")
                    }
                    style={{ marginRight: 8 }}
                  >
                    {index === steps.length - 1 ? "Slutför" : "Nästa"}
                  </Button>
                  {index > 0 && (
                    <Button
                      onClick={() => setActiveStep(activeStep - 1)}
                      style={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      Tillbaka
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      
      <DialogActions style={{ padding: "16px 24px" }}>
        <Button
          onClick={onClose}
          style={{ color: "rgba(255, 255, 255, 0.7)" }}
        >
          Avbryt
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotionIntegrationSetup;