import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
// @ts-ignore
import pdfParse from 'pdf-parse';
import { createCanvas } from 'canvas';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

interface PageText {
  pageNumber: number;
  text: string;
  timestamp: Date;
  imageUrl: string;
}

interface ProcessingResult {
  fileName: string;
  pages: PageText[];
  totalPages: number;
  processingTime: number;
}





export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Parse the form data
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const pdfFile = Array.isArray(files.pdf) ? files.pdf[0] : files.pdf;
    
    if (!pdfFile) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Validate file type
    if (!pdfFile.mimetype || !pdfFile.mimetype.includes('pdf')) {
      return res.status(400).json({ error: 'File must be a PDF' });
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfFile.filepath);
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) {
      return res.status(400).json({ error: 'PDF has no pages' });
    }

    const pages: PageText[] = [];

    // Extract text and create page previews
    try {
      console.log(`Processing PDF with ${pageCount} pages...`);
      
      // Extract text using pdf-parse
      const pdfData = await pdfParse(pdfBuffer);
      const totalText = pdfData.text;
      const textLength = totalText.length;
      const charsPerPage = Math.ceil(textLength / pageCount);
      
      console.log(`Total text length: ${textLength} characters, ~${charsPerPage} chars per page`);
      
      // Process each page
      for (let i = 0; i < pageCount; i++) {
        const pageNumber = i + 1;
        console.log(`Processing page ${pageNumber}/${pageCount}...`);
        
        // Extract text for this page (approximate)
        const startIndex = i * charsPerPage;
        const endIndex = Math.min((i + 1) * charsPerPage, textLength);
        const pageText = totalText.substring(startIndex, endIndex);
        
        // Clean up the text
        const cleanedText = pageText
          .replace(/\n\s*\n/g, '\n\n')
          .replace(/^\s+|\s+$/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\n /g, '\n')
          .trim();
        
        // Create a preview image with the text content
        const canvas = createCanvas(800, 1000);
        const context = canvas.getContext('2d');
        
        // White background
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 800, 1000);
        
        // Page border
        context.strokeStyle = '#cccccc';
        context.lineWidth = 2;
        context.strokeRect(20, 20, 760, 960);
        
        // Page header
        context.fillStyle = '#333333';
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.fillText(`Page ${pageNumber} of ${pageCount}`, 400, 50);
        
        // Document title
        context.font = '12px Arial';
        context.fillStyle = '#666666';
        context.fillText('Extracted Text Preview', 400, 70);
        
        // Text content
        context.font = '14px Arial';
        context.fillStyle = '#000000';
        context.textAlign = 'left';
        
        // Wrap text and display it
        const maxWidth = 720;
        const lineHeight = 18;
        const startY = 100;
        let currentY = startY;
        
        if (cleanedText) {
          const words = cleanedText.split(' ');
          let line = '';
          
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
              context.fillText(line, 40, currentY);
              line = words[n] + ' ';
              currentY += lineHeight;
              
              // Stop if we run out of space
              if (currentY > 900) {
                context.fillText('...', 40, currentY);
                break;
              }
            } else {
              line = testLine;
            }
          }
          
          // Draw the last line if there's space
          if (currentY <= 900 && line.trim()) {
            context.fillText(line, 40, currentY);
          }
        } else {
          context.fillStyle = '#999999';
          context.font = 'italic 14px Arial';
          context.fillText('No text content found on this page', 40, startY);
        }
        
        // Add footer
        context.fillStyle = '#999999';
        context.font = '10px Arial';
        context.textAlign = 'center';
        context.fillText(`Generated from: ${pdfFile.originalFilename || 'PDF Document'}`, 400, 980);
        
        const imageUrl = canvas.toDataURL('image/png');
        
        pages.push({
          pageNumber: pageNumber,
          text: cleanedText || `No text found on page ${pageNumber}`,
          timestamp: new Date(),
          imageUrl: imageUrl,
        });
        
        console.log(`✅ Successfully processed page ${pageNumber}/${pageCount} - extracted ${cleanedText.length} characters`);
      }
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      // Fallback: create pages with error message and simple images
      for (let i = 0; i < pageCount; i++) {
        const canvas = createCanvas(800, 600);
        const context = canvas.getContext('2d');
        
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 800, 600);
        
        context.strokeStyle = '#ff6b6b';
        context.lineWidth = 3;
        context.strokeRect(20, 20, 760, 560);
        
        context.fillStyle = '#ff6b6b';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.fillText('⚠️ PDF Processing Failed', 400, 250);
        
        context.font = '18px Arial';
        context.fillStyle = '#666666';
        context.fillText(`Page ${i + 1}`, 400, 300);
        
        context.font = '14px Arial';
        context.fillStyle = '#999999';
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        context.fillText(errorMsg.substring(0, 60), 400, 350);
        
        const fallbackImageUrl = canvas.toDataURL('image/png');
        
        pages.push({
          pageNumber: i + 1,
          text: `Error extracting text from PDF: ${errorMsg}`,
          timestamp: new Date(),
          imageUrl: fallbackImageUrl,
        });
      }
    }

    // Clean up the uploaded file
    fs.unlinkSync(pdfFile.filepath);

    const processingTime = (Date.now() - startTime) / 1000; // Convert to seconds

    const result: ProcessingResult = {
      fileName: pdfFile.originalFilename || 'unknown.pdf',
      pages,
      totalPages: pageCount,
      processingTime,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ 
      error: 'Error processing PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 