import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';

// Disable body parsing, we'll handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tempDir = '/tmp';
  let pdfFilePath = '';
  let browser: any = null;

  try {
    const startTime = Date.now();
    console.log('🖼️ Starting PDF screenshot generation with Puppeteer...');
    
    // Parse the form data
    const form = formidable({
      uploadDir: tempDir,
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

    pdfFilePath = pdfFile.filepath;
    console.log(`📄 Processing PDF: ${pdfFile.originalFilename}`);

    const screenshots: PageScreenshot[] = [];
    
    try {
      // Read the PDF file
      const pdfBuffer = fs.readFileSync(pdfFilePath);
      
      // Get total pages using pdf-lib
      console.log(`📊 Determining total pages...`);
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();
      console.log(`📊 PDF has ${totalPages} pages`);
      
      // Launch Puppeteer browser
      console.log(`🔄 Launching browser for PDF rendering...`);
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
        ],
      });
      
      // Convert PDF buffer to base64 for browser loading
      const pdfBase64 = pdfBuffer.toString('base64');
      const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
      
      // Process each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          console.log(`🔄 Rendering page ${pageNum}/${totalPages}...`);
          
          const page = await browser.newPage();
          
          // Set viewport for consistent sizing
          await page.setViewport({
            width: 1654,  // A4 width at 200 DPI
            height: 2339, // A4 height at 200 DPI
            deviceScaleFactor: 2, // High DPI
          });
          
          // Create HTML to display the PDF page
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  background: white;
                  overflow: hidden;
                }
                #pdf-viewer {
                  width: 100vw;
                  height: 100vh;
                  border: none;
                }
              </style>
            </head>
            <body>
              <embed id="pdf-viewer" src="${pdfDataUrl}#page=${pageNum}&view=FitH&zoom=100" type="application/pdf">
            </body>
            </html>
          `;
          
          await page.setContent(html, { waitUntil: 'networkidle0' });
          
          // Wait a bit for PDF to load
          await page.waitForTimeout(2000);
          
          // Take screenshot
          const screenshot = await page.screenshot({
            type: 'png',
            fullPage: true,
            quality: 100,
          });
          
          await page.close();
          
          // Convert screenshot to base64
          const imageBase64 = screenshot.toString('base64');
          const imageUrl = `data:image/png;base64,${imageBase64}`;
          
          screenshots.push({
            pageNumber: pageNum,
            imageUrl,
            width: 1654,
            height: 2339,
            timestamp: new Date(),
          });
          
          console.log(`✅ Successfully captured page ${pageNum}`);
          
        } catch (pageError) {
          console.error(`❌ Error capturing page ${pageNum}:`, pageError);
          
          // Create error image for this page
          const errorImageUrl = createErrorImage(pageNum);
          screenshots.push({
            pageNumber: pageNum,
            imageUrl: errorImageUrl,
            width: 800,
            height: 600,
            timestamp: new Date(),
          });
        }
      }
      
    } catch (conversionError) {
      console.error('❌ PDF screenshot conversion failed:', conversionError);
      return res.status(500).json({ 
        error: 'PDF screenshot conversion failed',
        details: conversionError instanceof Error ? conversionError.message : 'Unknown error',
        suggestion: 'Please ensure the PDF is not corrupted and is a valid PDF file.'
      });
    }

    // Clean up the uploaded PDF file
    if (fs.existsSync(pdfFilePath)) {
      fs.unlinkSync(pdfFilePath);
    }

    const processingTime = (Date.now() - startTime) / 1000;

    const result: ScreenshotResult = {
      fileName: pdfFile.originalFilename || 'unknown.pdf',
      totalPages: screenshots.length,
      screenshots,
      processingTime,
    };

    console.log(`🎉 Successfully generated ${screenshots.length} screenshots in ${processingTime}s`);
    res.status(200).json(result);

  } catch (error) {
    console.error('💥 Error generating PDF screenshots:', error);
    
    // Clean up files on error
    if (pdfFilePath && fs.existsSync(pdfFilePath)) {
      fs.unlinkSync(pdfFilePath);
    }
    
    res.status(500).json({ 
      error: 'Error generating PDF screenshots',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Always close browser
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn('Warning: Could not close browser:', e);
      }
    }
  }
}

// Helper function to create error image as base64
function createErrorImage(pageNumber: number): string {
  // Simple SVG error image
  const svgContent = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff" stroke="#ff6b6b" stroke-width="3"/>
      <rect x="50" y="50" width="700" height="500" fill="#fff5f5" stroke="#ff6b6b" stroke-width="1"/>
      <text x="400" y="250" font-family="Arial, sans-serif" font-size="24" fill="#ff6b6b" text-anchor="middle" font-weight="bold">
        ⚠️ Page ${pageNumber} Rendering Failed
      </text>
      <text x="400" y="300" font-family="Arial, sans-serif" font-size="18" fill="#666" text-anchor="middle">
        Could not generate screenshot
      </text>
      <text x="400" y="350" font-family="Arial, sans-serif" font-size="14" fill="#999" text-anchor="middle">
        Please ensure PDF is not corrupted
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
}