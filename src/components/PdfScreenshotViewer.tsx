import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
} from '@material-ui/core';
import {
  CloudUpload as UploadIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  GetApp as DownloadIcon,
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  uploadContainer: {
    border: '2px dashed #ccc',
    borderRadius: 8,
    padding: theme.spacing(4),
    textAlign: 'center',
    marginBottom: theme.spacing(3),
    '&:hover': {
      borderColor: '#2196f3',
      backgroundColor: '#f5f5f5',
    },
  },
  uploadActive: {
    borderColor: '#2196f3',
    backgroundColor: '#e3f2fd',
  },
  screenshotContainer: {
    marginTop: theme.spacing(3),
  },
  pageCard: {
    marginBottom: theme.spacing(2),
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  },
  pageImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'contain',
    border: '1px solid #eee',
    borderRadius: 4,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  fullscreenDialog: {
    '& .MuiDialog-paper': {
      maxWidth: '95vw',
      maxHeight: '95vh',
      margin: theme.spacing(1),
    },
  },
  fullscreenImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '80vh',
    objectFit: 'contain',
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    padding: theme.spacing(2),
    borderRadius: 8,
    marginBottom: theme.spacing(2),
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
}));

interface PageScreenshot {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  timestamp: Date;
}

interface ScreenshotResult {
  fileName: string;
  totalPages: number;
  screenshots: PageScreenshot[];
  processingTime: number;
}

const PdfScreenshotViewer: React.FC = () => {
  const classes = useStyles();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<ScreenshotResult | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<PageScreenshot | null>(null);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    setScreenshots(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const generateScreenshots = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      console.log('🚀 Uploading PDF for screenshot generation...');
      
      const response = await fetch('/api/pdf-screenshots', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result: ScreenshotResult = await response.json();
      console.log('📸 Screenshots generated successfully:', result);
      
      setScreenshots(result);
    } catch (err) {
      console.error('❌ Error generating screenshots:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate screenshots');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (screenshot: PageScreenshot) => {
    const link = document.createElement('a');
    link.href = screenshot.imageUrl;
    link.download = `page-${screenshot.pageNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        PDF Page Screenshots
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Upload a PDF to generate high-quality screenshots of each page
      </Typography>

      {/* File Upload Area */}
      <div
        className={`${classes.uploadContainer} ${dragActive ? classes.uploadActive : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload">
          <UploadIcon style={{ fontSize: 48, color: '#666', marginBottom: 16 }} />
          <Typography variant="h6" gutterBottom>
            {selectedFile ? selectedFile.name : 'Drop PDF here or click to select'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Maximum file size: 50MB
          </Typography>
          {selectedFile && (
            <Typography variant="body2" style={{ marginTop: 8 }}>
              File size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </Typography>
          )}
        </label>
      </div>

      {/* Generate Button */}
      {selectedFile && !isLoading && (
        <Box textAlign="center" marginBottom={3}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={generateScreenshots}
            startIcon={<UploadIcon />}
          >
            Generate Page Screenshots
          </Button>
        </Box>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={classes.loadingContainer}>
          <CircularProgress size={60} />
          <Typography variant="h6" style={{ marginTop: 16 }}>
            Generating Screenshots...
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This may take a few moments for large PDFs
          </Typography>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Box 
          style={{ 
            backgroundColor: '#ffebee', 
            border: '1px solid #f44336', 
            borderRadius: 4, 
            padding: 16, 
            marginBottom: 16,
            color: '#d32f2f'
          }}
        >
          <Typography variant="body2">
            ❌ {error}
          </Typography>
        </Box>
      )}

      {/* Results */}
      {screenshots && (
        <div className={classes.screenshotContainer}>
          {/* Stats */}
          <div className={classes.statsContainer}>
            <Typography variant="h6" gutterBottom>
              📄 {screenshots.fileName}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Total Pages:</strong> {screenshots.totalPages}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Screenshots Generated:</strong> {screenshots.screenshots.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2">
                  <strong>Processing Time:</strong> {screenshots.processingTime.toFixed(2)}s
                </Typography>
              </Grid>
            </Grid>
          </div>

          {/* Page Screenshots Grid */}
          <Grid container spacing={2}>
            {screenshots.screenshots.map((screenshot) => (
              <Grid item xs={12} sm={6} md={4} key={screenshot.pageNumber}>
                <Card className={classes.pageCard}>
                  <CardContent>
                    <div className={classes.pageHeader}>
                      <Typography variant="h6">
                        Page {screenshot.pageNumber}
                      </Typography>
                      <Box>
                        <IconButton
                          onClick={() => downloadImage(screenshot)}
                          title="Download Image"
                          size="small"
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => setFullscreenImage(screenshot)}
                          title="View Fullscreen"
                          size="small"
                        >
                          <FullscreenIcon />
                        </IconButton>
                      </Box>
                    </div>
                    <img
                      src={screenshot.imageUrl}
                      alt={`Page ${screenshot.pageNumber}`}
                      className={classes.pageImage}
                      onClick={() => setFullscreenImage(screenshot)}
                    />
                    <Typography variant="caption" display="block" style={{ marginTop: 8 }}>
                      Dimensions: {screenshot.width} × {screenshot.height}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </div>
      )}

      {/* Fullscreen Dialog */}
      <Dialog
        open={!!fullscreenImage}
        onClose={() => setFullscreenImage(null)}
        className={classes.fullscreenDialog}
        maxWidth={false}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Page {fullscreenImage?.pageNumber} - Full Size
            </Typography>
            <IconButton onClick={() => setFullscreenImage(null)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {fullscreenImage && (
            <img
              src={fullscreenImage.imageUrl}
              alt={`Page ${fullscreenImage.pageNumber} - Full Size`}
              className={classes.fullscreenImage}
            />
          )}
        </DialogContent>
        <DialogActions>
          {fullscreenImage && (
            <Button
              onClick={() => downloadImage(fullscreenImage)}
              startIcon={<DownloadIcon />}
            >
              Download Image
            </Button>
          )}
          <Button onClick={() => setFullscreenImage(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdfScreenshotViewer;
