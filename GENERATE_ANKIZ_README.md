# Generate Ankiz Feature

## Overview

The Generate Ankiz feature allows users to upload PDF documents and extract text content page by page using OCR (Optical Character Recognition). This is perfect for creating Anki cards from lecture materials, research papers, or any PDF content.

## Features

### 📄 PDF Upload
- Drag and drop PDF files or click to browse
- Support for PDF files up to 50MB
- Real-time file validation

### 🔍 OCR Processing
- Page-by-page text extraction
- Realistic simulation of OCR processing
- Processing time tracking
- Error handling for individual pages

### 📋 Results Management
- View extracted text for each page
- **View original PDF page images alongside text**
- Copy individual page text to clipboard
- Download all extracted text as a single file
- Clear results and start over

### 🎨 User Experience
- Modern, responsive design
- Dark theme integration
- Loading states and progress indicators
- Error messages and validation feedback

## How to Use

1. **Navigate to the Feature**
   - Click on your profile picture in the header
   - Select "Generate Ankiz" from the dropdown menu

2. **Upload a PDF**
   - Click the upload area or drag and drop a PDF file
   - The system will validate the file type and size

3. **Process the PDF**
   - Click "Extract Text" to start processing
   - The system will process each page individually
   - Progress is shown with a loading indicator

4. **View Results**
   - Each page is displayed as a card with:
     - Page number
     - Character count
     - Preview of extracted text
     - **Thumbnail of the original PDF page**
   - Click "View" to see the full text in a dialog
   - Click the image icon to view the original PDF page
   - Click "Copy" to copy the text to clipboard

5. **Download or Clear**
   - Use "Download All" to save all text as a .txt file
   - Use "Clear" to start over with a new file

## Technical Implementation

### Frontend (`src/pages/generate-ankiz.tsx`)
- React component with Material-UI
- File upload handling with drag-and-drop support
- State management for processing status and results
- Responsive design with dark theme

### Backend (`src/pages/api/process-pdf.ts`)
- Next.js API route using formidable for file uploads
- PDF processing with pdf-lib and pdf-parse libraries
- **PDF to image conversion using pdf2pic**
- Text extraction and image generation for each page
- Error handling and file cleanup

### Navigation
- Added to header menu with TextFields icon
- Integrated with existing authentication system
- Consistent with app's design language

## Dependencies Added

- `formidable`: File upload handling
- `pdf-lib`: PDF document processing
- `pdf-parse`: Text extraction from PDFs
- `pdf2pic`: PDF to image conversion
- `@types/formidable`: TypeScript definitions

## Future Enhancements

1. **Real OCR Integration**
   - Integrate with Tesseract.js for actual OCR processing
   - Add support for multiple languages
   - Improve text accuracy and formatting

2. **Advanced Features**
   - Direct Anki card generation
   - Text formatting options
   - Batch processing of multiple files
   - Export to different formats

3. **Performance Improvements**
   - Background processing for large files
   - Progress tracking for individual pages
   - Caching of processed results

## File Structure

```
src/
├── pages/
│   ├── generate-ankiz.tsx          # Main page component
│   └── api/
│       └── process-pdf.ts          # PDF processing API
└── components/
    └── Header.tsx                  # Updated with navigation menu
```

## Usage Notes

- **Real PDF text extraction** using pdf-parse library
- **PDF page images** are generated and displayed alongside extracted text
- Users can view both text and original page images for easy comparison
- The feature is fully integrated with the existing authentication and theme system
- Perfect for creating Anki cards with visual context from the original document 