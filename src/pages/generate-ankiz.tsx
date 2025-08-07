import React, { useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  Alert,
  Card,
  CardContent,
  IconButton,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  CloudUpload as UploadIcon,
  Description as PdfIcon,
  TextFields as TextIcon,
  TextFields as TextFieldsIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import Layout from '../components/Layout';

interface PageText {
  pageNumber: number;
  text: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ProcessingResult {
  fileName: string;
  pages: PageText[];
  totalPages: number;
  processingTime: number;
}

export default function GenerateAnkiz() {
  const { theme } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<PageText | null>(null);
  const [showPageDialog, setShowPageDialog] = useState(false);
  const [showImageView, setShowImageView] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }
      setUploadedFile(file);
      setError(null);
      setResults(null);
    }
  };

  const handleProcessPdf = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', uploadedFile);

      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewPage = (page: PageText) => {
    setSelectedPage(page);
    setShowPageDialog(true);
  };

  const handleViewImage = (page: PageText) => {
    setSelectedPage(page);
    setShowImageView(true);
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadAll = () => {
    if (!results) return;

    const allText = results.pages
      .map(page => `--- Page ${page.pageNumber} ---\n${page.text}\n`)
      .join('\n');

    const blob = new Blob([allText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${results.fileName.replace('.pdf', '')}_extracted_text.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearResults = () => {
    setResults(null);
    setUploadedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const containerStyles = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    minHeight: 'calc(100vh - 80px)',
  };

  const uploadAreaStyles = {
    border: '2px dashed #666',
    borderRadius: '12px',
    padding: '3rem',
    textAlign: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    '&:hover': {
      borderColor: '#2196f3',
      backgroundColor: 'rgba(33, 150, 243, 0.05)',
    },
  };

  const resultCardStyles = {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '1rem',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      transform: 'translateY(-2px)',
    },
  };

  return (
    <Layout>
      <Box style={containerStyles}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          style={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '2rem',
            textAlign: 'center',
          }}
        >
          Generate Ankiz from PDF
        </Typography>

        <Typography 
          variant="body1" 
          style={{ 
            textAlign: 'center', 
            marginBottom: '3rem',
            color: '#a0a0a0',
            maxWidth: '600px',
            margin: '0 auto 3rem auto',
          }}
        >
          Upload a PDF document to extract text content page by page. 
          Perfect for creating Anki cards from lecture materials, research papers, or any PDF content.
        </Typography>

        {/* Upload Section */}
        <Paper 
          elevation={0}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          <Box style={uploadAreaStyles} onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            <UploadIcon style={{ fontSize: 64, color: '#2196f3', marginBottom: '1rem' }} />
            
            <Typography variant="h6" gutterBottom style={{ color: '#ffffff' }}>
              {uploadedFile ? uploadedFile.name : 'Click to upload PDF'}
            </Typography>
            
            <Typography variant="body2" style={{ color: '#a0a0a0' }}>
              {uploadedFile 
                ? `File size: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB`
                : 'Drag and drop a PDF file here or click to browse'
              }
            </Typography>

            {uploadedFile && (
              <Box style={{ marginTop: '1rem' }}>
                <Button
                  variant="contained"
                  onClick={handleProcessPdf}
                  disabled={isProcessing}
                  startIcon={isProcessing ? <CircularProgress size={20} /> : <TextIcon />}
                  style={{
                    background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {isProcessing ? 'Processing...' : 'Extract Text'}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert 
            severity="error" 
            style={{ marginBottom: '2rem', borderRadius: '8px' }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Results Section */}
        {results && (
          <Paper 
            elevation={0}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '2rem',
            }}
          >
            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <Box>
                <Typography variant="h5" style={{ color: '#ffffff', marginBottom: '0.5rem' }}>
                  Processing Complete
                </Typography>
                <Typography variant="body2" style={{ color: '#a0a0a0' }}>
                  {results.totalPages} pages processed in {results.processingTime.toFixed(2)} seconds
                </Typography>
              </Box>
              
              <Box style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadAll}
                  style={{
                    borderColor: '#4caf50',
                    color: '#4caf50',
                    borderRadius: '8px',
                    textTransform: 'none',
                  }}
                >
                  Download All
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearResults}
                  style={{
                    borderColor: '#f44336',
                    color: '#f44336',
                    borderRadius: '8px',
                    textTransform: 'none',
                  }}
                >
                  Clear
                </Button>
              </Box>
            </Box>

            <Divider style={{ marginBottom: '2rem', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

            <Typography variant="h6" style={{ color: '#ffffff', marginBottom: '1rem' }}>
              Extracted Pages
            </Typography>

            <Box style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.pages.map((page) => (
                <Card key={page.pageNumber} style={resultCardStyles}>
                  <CardContent>
                    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <Box style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PdfIcon style={{ color: '#ff9800' }} />
                        <Typography variant="h6" style={{ color: '#ffffff' }}>
                          Page {page.pageNumber}
                        </Typography>
                        <Chip 
                          label={`${page.text.length} characters`}
                          size="small"
                          style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}
                        />
                      </Box>
                      
                      <Box style={{ display: 'flex', gap: '0.5rem' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewPage(page)}
                          style={{ color: '#2196f3' }}
                          title="View Text"
                        >
                          <ViewIcon />
                        </IconButton>
                        {page.imageUrl && (
                          <IconButton
                            size="small"
                            onClick={() => handleViewImage(page)}
                            style={{ color: '#ff9800' }}
                            title="View Page Image"
                          >
                            <ImageIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleCopyText(page.text)}
                          style={{ color: '#4caf50' }}
                          title="Copy Text"
                        >
                          <CopyIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {/* Improved Layout: Image and Text in separate, clearly delineated sections */}
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      
                      {/* Page Image Section */}
                      <Box style={{ 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '8px', 
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)'
                      }}>
                        <Typography variant="subtitle2" style={{ 
                          color: '#ff9800', 
                          marginBottom: '0.5rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <ImageIcon fontSize="small" />
                          Original PDF Page
                        </Typography>
                        
                        {page.imageUrl ? (
                          <Box 
                            style={{ 
                              width: '100%',
                              maxWidth: '400px',
                              margin: '0 auto',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              backgroundColor: '#ffffff',
                            }} 
                            onClick={() => handleViewImage(page)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.02)';
                              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <img
                              src={page.imageUrl}
                              alt={`Page ${page.pageNumber}`}
                              style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                maxHeight: '300px',
                                objectFit: 'contain',
                              }}
                              onLoad={() => {
                                console.log(`Image loaded successfully for page ${page.pageNumber}`);
                              }}
                              onError={(e) => {
                                console.error(`Image failed to load for page ${page.pageNumber}`, page.imageUrl);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #ff6b6b; background: rgba(255, 107, 107, 0.1);">
                                      <div style="text-align: center;">
                                        <div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>
                                        <div style="font-size: 14px; font-weight: 600;">Image Load Failed</div>
                                        <div style="font-size: 12px; opacity: 0.7;">Page ${page.pageNumber}</div>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          </Box>
                        ) : (
                          <Box style={{
                            width: '100%',
                            height: '200px',
                            borderRadius: '8px',
                            border: '2px dashed rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#666',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)'
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '48px', marginBottom: '8px' }}>📄</div>
                              <div style={{ fontSize: '14px', fontWeight: 600 }}>No Image Available</div>
                              <div style={{ fontSize: '12px', opacity: 0.7 }}>Page {page.pageNumber}</div>
                            </div>
                          </Box>
                        )}
                      </Box>

                      {/* Extracted Text Section */}
                      <Box style={{ 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '8px', 
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)'
                      }}>
                        <Typography variant="subtitle2" style={{ 
                          color: '#4caf50', 
                          marginBottom: '0.5rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <TextFieldsIcon fontSize="small" />
                          Extracted Text ({page.text.length} characters)
                        </Typography>
                        
                        <Typography 
                          variant="body2" 
                          style={{ 
                            color: '#e0e0e0',
                            lineHeight: 1.6,
                            maxHeight: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 5,
                            WebkitBoxOrient: 'vertical',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {page.text || 'No text extracted from this page'}
                        </Typography>
                        
                        {page.text.length > 300 && (
                          <Typography 
                            variant="caption" 
                            style={{ 
                              color: '#999', 
                              marginTop: '0.5rem',
                              fontStyle: 'italic'
                            }}
                          >
                            Text preview truncated. Click "View Text" for full content.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        )}

        {/* Page Detail Dialog */}
        <Dialog 
          open={showPageDialog} 
          onClose={() => setShowPageDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle style={{ color: '#ffffff', backgroundColor: '#2c2c2c' }}>
            Page {selectedPage?.pageNumber} - Text Content
          </DialogTitle>
          <DialogContent style={{ backgroundColor: '#2c2c2c', padding: '1rem' }}>
            {selectedPage && (
              <TextField
                multiline
                rows={20}
                fullWidth
                value={selectedPage.text}
                variant="outlined"
                InputProps={{
                  readOnly: true,
                  style: { 
                    color: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                  }
                }}
              />
            )}
          </DialogContent>
          <DialogActions style={{ backgroundColor: '#2c2c2c', padding: '1rem' }}>
            <Button 
              onClick={() => selectedPage && handleCopyText(selectedPage.text)}
              startIcon={<CopyIcon />}
              style={{ color: '#4caf50' }}
            >
              Copy Text
            </Button>
            <Button 
              onClick={() => setShowPageDialog(false)}
              style={{ color: '#ffffff' }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Page Image Dialog */}
        <Dialog 
          open={showImageView} 
          onClose={() => setShowImageView(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle style={{ color: '#ffffff', backgroundColor: '#2c2c2c' }}>
            Page {selectedPage?.pageNumber} - Original PDF
          </DialogTitle>
          <DialogContent style={{ backgroundColor: '#2c2c2c', padding: '1rem', display: 'flex', justifyContent: 'center' }}>
            {selectedPage?.imageUrl ? (
              <img
                src={selectedPage.imageUrl}
                alt={`Page ${selectedPage.pageNumber}`}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                }}
              />
            ) : (
              <Typography style={{ color: '#ff6b6b', textAlign: 'center' }}>
                No image available for this page
              </Typography>
            )}
          </DialogContent>
          <DialogActions style={{ backgroundColor: '#2c2c2c', padding: '1rem' }}>
            <Button 
              onClick={() => setShowImageView(false)}
              style={{ color: '#ffffff' }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
} 