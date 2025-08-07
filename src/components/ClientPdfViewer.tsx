import React, { useState, useRef, useEffect } from 'react';
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
  Collapse,
  Paper,
  TextField,
  Chip,
} from '@material-ui/core';
import {
  CloudUpload as UploadIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  GetApp as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TextFields as TextIcon,
  CloudUpload as CloudUploadIcon,
} from '@material-ui/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store/types';
import { coursePeriods } from 'utils/coursePeriods';
import { isCourseActive } from 'utils/processLectures';
import Lecture from 'types/lecture';
import { setLectures } from 'store/slices/lecturesReducer';
import { sortLecturesIntoCoursesAndWeeks } from 'utils/processLectures';
import { removeDuplicateLectures } from 'utils/removeDuplicateLectures';

// Extended lecture interface with course information
interface LectureWithCourse extends Lecture {
  course: string;
}

// PDF.js imports
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PageScreenshot {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  textContent: string;
  aiQuestion: string;
}

interface GroupedContent {
  id: string;
  aiQuestion: string;
  pages: PageScreenshot[];
  combinedText: string;
}

interface ProcessingResult {
  fileName: string;
  totalPages: number;
  screenshots: PageScreenshot[];
  groupedContent: GroupedContent[];
  processingTime: number;
}

const ClientPdfViewer: React.FC = () => {
  const dispatch = useDispatch();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<PageScreenshot | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [includeImages, setIncludeImages] = useState<boolean>(false);
  
  // Lecture selector state
  const [selectedLecture, setSelectedLecture] = useState<LectureWithCourse | null>(null);
  const [lectureSearchTerm, setLectureSearchTerm] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data loading function
  const fetchDataAndDispatch = async () => {
    const apiUrl =
      process.env.NODE_ENV === "development"
        ? process.env.NEXT_PUBLIC_API_URL || "/api"
        : "/.netlify";

    try {
      const response = await fetch(`${apiUrl}/functions/CRUDFLData`);
      const data = await response.json();
      
      console.log("🌐 ClientPdfViewer: API response status:", response.status);
      console.log("🌐 ClientPdfViewer: API response data:", data);

      if (data && !data.error) {
        let processedData;

        if (process.env.NODE_ENV === "development" && data.lectures) {
          // Development mode - data comes already grouped as week data
          console.log("Development mode: Using pre-grouped lecture data");
          processedData = data.lectures;
        } else if (data.events) {
          // Production mode - data comes as events that need processing
          console.log("Production mode: Processing events into lectures");
          processedData = sortLecturesIntoCoursesAndWeeks(
            data.events,
            new Date()
          );
        }

        if (processedData) {
          console.log("📊 ClientPdfViewer: Processed data length:", processedData.length);
          
          // Remove duplicate lectures
          const { cleanedData } = removeDuplicateLectures(processedData);
          
          console.log("🧹 ClientPdfViewer: Cleaned data length:", cleanedData.length);
          
          dispatch(setLectures(cleanedData));
          console.log("✅ ClientPdfViewer: Data dispatched to Redux!");
        } else {
          console.log("❌ ClientPdfViewer: No processed data to dispatch");
        }
      } else if (data.message) {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Error fetching lecture data:", error);
    }
  };

  // Get lectures data from Redux store
  const lecturesData = useSelector((state: RootState) => state.lectures.lectures);
  // Current user (used when syncing to Notion)
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // Load data on component mount
  useEffect(() => {
    if (!lecturesData || lecturesData.length === 0) {
      console.log("🔄 ClientPdfViewer: No lectures data, fetching...");
      fetchDataAndDispatch();
    } else {
      console.log("✅ ClientPdfViewer: Lectures data already available:", lecturesData.length, "weeks");
    }
  }, [lecturesData]);
  
  // Get current date for active course determination
  const currentDate = new Date();
  
  // Get all lectures from the store with safety checks
  const allLectures: LectureWithCourse[] = React.useMemo(() => {
    console.log('🔍 Debug: lecturesData from Redux:', lecturesData);
    
    if (!lecturesData || !Array.isArray(lecturesData)) {
      console.log('❌ Debug: No lecturesData or not array');
      return [];
    }
    
    const result = lecturesData.flatMap(weekData => {
      if (!weekData || !weekData.lectures || !Array.isArray(weekData.lectures)) {
        console.log('❌ Debug: Invalid weekData:', weekData);
        return [];
      }
      
      return weekData.lectures.map(lecture => ({
        ...lecture,
        course: weekData.course || 'Okänd kurs' // Add course information to each lecture
      }));
    });
    
    console.log('✅ Debug: Processed lectures:', result.length, 'lectures found');
    console.log('📋 Sample lectures:', result.slice(0, 3).map(l => `${l.lectureNumber}: ${l.title}`));
    return result;
  }, [lecturesData]);
  
  // Filter active courses and their lectures
  const activeCourses = React.useMemo(() => {
    console.log('🔍 Debug: coursePeriods:', coursePeriods);
    console.log('🔍 Debug: currentDate:', currentDate);
    
    if (!coursePeriods || !Array.isArray(coursePeriods)) {
      console.log('❌ Debug: No coursePeriods or not array');
      return [];
    }
    
    const result = coursePeriods.filter(course => 
      isCourseActive(course.title, currentDate)
    );
    
    console.log('✅ Debug: Active courses:', result.map(c => c.title));
    return result;
  }, [currentDate]);
  
  // Get lectures from active courses
  const activeLectures: LectureWithCourse[] = React.useMemo(() => {
    console.log('🔍 Debug: allLectures count:', allLectures.length);
    console.log('🔍 Debug: activeCourses count:', activeCourses.length);
    
    const result = allLectures.filter(lecture => {
      try {
        if (!lecture.date) {
          console.log('❌ Debug: Lecture has no date:', lecture);
          return false;
        }
        const lectureDate = new Date(lecture.date);
        const isInActiveCourse = activeCourses.some(course => {
          const courseStart = new Date(course.startDate);
          const courseEnd = new Date(course.endDate);
          const isInCourse = lectureDate >= courseStart && lectureDate <= courseEnd;
          
          if (isInCourse) {
            console.log('✅ Debug: Lecture in course:', lecture.title, 'Course:', course.title, 'Date:', lecture.date);
          }
          
          return isInCourse;
        });
        
        return isInActiveCourse;
      } catch (error) {
        console.error('Error processing lecture date:', error);
        return false;
      }
    });
    
    console.log('✅ Debug: Active lectures found:', result.length);
    console.log('📋 Sample active lectures:', result.slice(0, 3).map(l => `${l.lectureNumber}: ${l.title} (${l.course})`));
    return result;
  }, [allLectures, activeCourses]);
  
  // Normalize helper for robust matching
  const normalize = (s: string): string =>
    s
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[._:-]/g, ' ')
      .trim();

  // Filter lectures based on search term, supporting Notion-style ("77. Titel")
  const filteredLectures: LectureWithCourse[] = React.useMemo(() => {
    console.log('🔍 Debug: activeLectures count:', activeLectures.length);
    console.log('🔍 Debug: lectureSearchTerm:', lectureSearchTerm);

    if (!lectureSearchTerm) {
      console.log('✅ Debug: No search term, returning all active lectures');
      return activeLectures;
    }

    const q = normalize(lectureSearchTerm);

    const result = activeLectures.filter((lecture) => {
      const numStr = String(lecture.lectureNumber ?? '');
      const title = lecture.title ?? '';
      const subject = lecture.subjectArea ?? '';
      const lecturer = lecture.lecturer ?? '';

      // Build alternative formats
      const notionStyle = `${numStr}. ${title}`; // e.g., "77. Fall och frakturer"
      const legacyStyle = `Föreläsning ${numStr}: ${title}`;

      // Normalize all strings once
      const fields = [
        title,
        subject,
        lecturer,
        numStr,
        notionStyle,
        legacyStyle,
      ].map((s) => normalize(s));

      return fields.some((f) => f.includes(q));
    });

    console.log('✅ Debug: Filtered lectures found:', result.length);
    return result;
  }, [activeLectures, lectureSearchTerm]);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
      setResult(null);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
    }
  };

  const processPDF = async () => {
    if (!file) return;

    setProcessing(true);
    setError('');
    const startTime = Date.now();

    try {
      console.log('🔄 Starting client-side PDF processing...');
      
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDocument = await loadingTask.promise;
      
      const totalPages = pdfDocument.numPages;
      console.log(`📊 PDF has ${totalPages} pages`);
      
      const screenshots: PageScreenshot[] = [];
      
      // Process each page
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          console.log(`🔄 Rendering page ${pageNum}/${totalPages}...`);
          
          // Get the page
          const page = await pdfDocument.getPage(pageNum);
          
          // Calculate scale for good quality (2x for high DPI)
          const scale = 2.0;
          const viewport = page.getViewport({ scale });
          
          // Create canvas
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) {
            throw new Error('Could not get canvas context');
          }
          
          // Set canvas dimensions
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Render page to canvas
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          
          await page.render(renderContext).promise;
          
          // Extract text content from the page
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Generate AI question based on page content
          const aiQuestion = generateAIQuestion(pageText, pageNum);
          
          // Convert canvas to data URL
          const imageUrl = canvas.toDataURL('image/png', 1.0);
          
          screenshots.push({
            pageNumber: pageNum,
            imageUrl,
            width: Math.round(viewport.width),
            height: Math.round(viewport.height),
            canvas: canvas,
            textContent: pageText,
            aiQuestion: aiQuestion,
          });
          
          console.log(`✅ Successfully rendered page ${pageNum} (${Math.round(viewport.width)}x${Math.round(viewport.height)})`);
          
        } catch (pageError) {
          console.error(`❌ Error rendering page ${pageNum}:`, pageError);
          // Continue with other pages even if one fails
        }
      }
      
      // Clean up PDF document
      await pdfDocument.destroy();
      
      // Group pages by content
      const groupedContent = groupPagesByContent(screenshots);
      
      const processingTime = (Date.now() - startTime) / 1000;
      
      const processResult: ProcessingResult = {
        fileName: file.name,
        totalPages: screenshots.length,
        screenshots,
        groupedContent,
        processingTime,
      };
      
      setResult(processResult);
      console.log(`🎉 Successfully processed ${screenshots.length} pages in ${processingTime}s`);
      
    } catch (err) {
      console.error('💥 Error processing PDF:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = (screenshot: PageScreenshot) => {
    const link = document.createElement('a');
    link.download = `${file?.name || 'page'}_page_${screenshot.pageNumber}.png`;
    link.href = screenshot.imageUrl;
    link.click();
  };

  const downloadAllImages = () => {
    if (!result) return;
    
    result.screenshots.forEach((screenshot) => {
      setTimeout(() => downloadImage(screenshot), screenshot.pageNumber * 100);
    });
  };

  const togglePageText = (groupId: string) => {
    const newExpandedPages = new Set(expandedPages);
    if (newExpandedPages.has(groupId)) {
      newExpandedPages.delete(groupId);
    } else {
      newExpandedPages.add(groupId);
    }
    setExpandedPages(newExpandedPages);
  };

  // Generate intelligent medical learning questions
  const generateAIQuestion = (textContent: string, pageNumber: number): string => {
    if (!textContent || textContent.trim().length === 0) {
      return 'Vad visar denna sida?';
    }

    const text = textContent.toLowerCase();
    const words = text.split(' ');
    const keyWords = words.filter(word => 
      word.length > 3 && 
      !['och', 'den', 'det', 'som', 'är', 'var', 'för', 'med', 'till', 'av', 'på', 'i', 'en', 'ett'].includes(word)
    );

    if (keyWords.length === 0) {
      return 'Vad innehåller denna sida?';
    }

    // Extract specific medical terms and concepts
    const medicalTerms = extractMedicalTerms(text);
    const mainTopics = extractMainTopics(text);
    
    // Generate pedagogically intelligent questions for medical learning
    
    // Physiology and Mechanisms
    if (text.includes('graviditet') && text.includes('fysiologi')) {
      return 'Hur kan du förklara de fysiologiska mekanismerna bakom graviditetsförändringarna och varför är denna förståelse kritisk för klinisk bedömning?';
    }
    
    if (text.includes('placenta') && text.includes('funktion')) {
      return 'Vilka är placentas viktigaste funktioner som endokrint organ och hur påverkar dessa funktioner både mor och fostrets hälsa?';
    }
    
    if (text.includes('cirkulation') && text.includes('blod')) {
      return 'Vilka cirkulatoriska anpassningar sker under graviditet och hur påverkar dessa förändringar både normal graviditet och potentiella komplikationer?';
    }
    
    if (text.includes('hjärta') && text.includes('hjärtfrekvens')) {
      return 'Hur förändras hjärtats funktion under graviditet och vilka kliniska tecken kan du förvänta dig att se hos en gravid patient?';
    }
    
    if (text.includes('blodvolym') && text.includes('plasma')) {
      return 'Vilka mekanismer styr blodvolymsförändringarna under graviditet och hur påverkar detta både mor och fostrets cirkulation?';
    }
    
    // Clinical Assessment and Differential Diagnosis
    if (text.includes('symptom') && (text.includes('ofarlig') || text.includes('farlig'))) {
      return 'Hur skiljer du mellan normala graviditetssymptom och tecken på potentiella komplikationer? Vilka röda flaggor bör du vara uppmärksam på?';
    }
    
    if (text.includes('varför') && text.includes('viktigt')) {
      return 'Varför är det viktigt att förstå graviditetsfysiologi i klinisk praxis och när kan gravida patienter inte behandlas som icke-gravida?';
    }
    
    // Endocrine System
    if (text.includes('endokrin') && text.includes('system')) {
      return 'Vilka endokrina förändringar sker under graviditet och hur påverkar dessa förändringar både mor och fostrets utveckling?';
    }
    
    if (text.includes('tyreoidea') || text.includes('sköldkörtel')) {
      return 'Hur påverkar graviditet sköldkörtelns funktion och vilka kliniska implikationer har detta för både mor och fostret?';
    }
    
    if (text.includes('hypofys') || text.includes('prolaktin')) {
      return 'Vilka hypofysrelaterade förändringar sker under graviditet och hur förbereder dessa kroppen för amning?';
    }
    
    if (text.includes('binjurar') || text.includes('kortisol')) {
      return 'Hur påverkar graviditet binjurarnas funktion och vilka kliniska konsekvenser kan detta ha för både mor och fostret?';
    }
    
    // Respiratory System
    if (text.includes('andning') || text.includes('respiratorisk')) {
      return 'Vilka respiratoriska förändringar sker under graviditet och hur påverkar dessa både mor och fostrets syresättning?';
    }
    
    // Gastrointestinal System
    if (text.includes('mage') || text.includes('gastrointestinal')) {
      return 'Vilka gastrointestinala förändringar sker under graviditet och hur påverkar dessa både mor och fostrets näringstillförsel?';
    }
    
    // Renal System
    if (text.includes('urin') || text.includes('renal')) {
      return 'Vilka renala förändringar sker under graviditet och hur påverkar dessa både mor och fostrets vätske- och elektrolytbalans?';
    }
    
    // Clinical Reasoning and Application
    if (text.includes('bedömning') || text.includes('klinisk')) {
      return 'Hur använder du din förståelse för graviditetsfysiologi i klinisk bedömning och vilka faktorer är viktiga att beakta?';
    }
    
    if (text.includes('komplikation') || text.includes('risk')) {
      return 'Vilka riskfaktorer och komplikationer kan uppstå under graviditet och hur identifierar du tidiga tecken på potentiella problem?';
    }
    
    if (text.includes('behandling') || text.includes('intervention')) {
      return 'Hur påverkar graviditetsfysiologi val av behandling och vilka särskilda överväganden måste göras för gravida patienter?';
    }

    // Create detailed learning questions with extracted terms
    if (medicalTerms.length > 0) {
      const termsList = medicalTerms.slice(0, 3).join(', ');
      return `Vilka är de viktigaste aspekterna av ${termsList} under graviditet och hur påverkar dessa både mor och fostret kliniskt?`;
    }

    // Fallback with main topics for learning
    if (mainTopics.length > 0) {
      const topicsList = mainTopics.slice(0, 2).join(' och ');
      return `Hur förstår du ${topicsList} under graviditet och vilka kliniska implikationer har denna kunskap?`;
    }

    // Generic but pedagogically focused question
    const firstFewWords = keyWords.slice(0, 3).join(', ');
    return `Vilka är de viktigaste lärdomarna om ${firstFewWords} under graviditet och hur tillämpar du denna kunskap i klinisk praxis?`;
  };

  // Extract medical terms from text
  const extractMedicalTerms = (text: string): string[] => {
    const medicalTerms = [
      'graviditet', 'fysiologi', 'placenta', 'cirkulation', 'blod', 'hjärta', 'symptom',
      'endokrin', 'system', 'tyreoidea', 'sköldkörtel', 'hypofys', 'prolaktin',
      'binjurar', 'kortisol', 'estrogen', 'renin', 'angiotensin', 'aldosteron',
      'hjärtfrekvens', 'slagvolym', 'hjärtminutvolym', 'blodvolym', 'plasma',
      'perifer', 'resistens', 'blodtryck', 'ofarlig', 'farlig', 'bedömning'
    ];
    
    return medicalTerms.filter(term => text.includes(term));
  };

  // Extract main topics from text
  const extractMainTopics = (text: string): string[] => {
    const topics = [
      'normal graviditet', 'graviditetsfysiologi', 'placenta-fysiologi',
      'cirkulationsförändringar', 'hjärtrelaterade förändringar', 'blodvolymsförändringar',
      'graviditetssymptom', 'klinisk bedömning', 'endokrina systemet'
    ];
    
    return topics.filter(topic => text.includes(topic));
  };

  // Group pages intelligently based on content similarity and AI questions
  const groupPagesByContent = (screenshots: PageScreenshot[]): GroupedContent[] => {
    const groups: GroupedContent[] = [];
    
    if (screenshots.length === 0) return groups;

    // First pass: Generate questions for all pages
    const pagesWithQuestions = screenshots.map(page => ({
      ...page,
      aiQuestion: generateAIQuestion(page.textContent, page.pageNumber)
    }));

    // Second pass: Group ONLY consecutive pages intelligently
    let currentGroup: typeof pagesWithQuestions[0][] = [pagesWithQuestions[0]];
    let currentQuestion = pagesWithQuestions[0].aiQuestion;

    for (let i = 1; i < pagesWithQuestions.length; i++) {
      const currentPage = pagesWithQuestions[i];
      const previousPage = pagesWithQuestions[i - 1];
      
      // Check if pages are consecutive (strict requirement)
      const isConsecutive = currentPage.pageNumber === previousPage.pageNumber + 1;
      
      // Only group if consecutive AND should group intelligently
      const shouldGroup = isConsecutive && shouldGroupPagesIntelligently(previousPage, currentPage, currentGroup.length);
      
      if (shouldGroup && currentGroup.length < 5) {
        // Add to current group
        currentGroup.push(currentPage);
      } else {
        // Finalize current group and start new one
        if (currentGroup.length > 0) {
          const combinedText = currentGroup.map(page => page.textContent).join(' ');
          groups.push({
            id: `group-${groups.length}`,
            aiQuestion: currentQuestion,
            pages: [...currentGroup],
            combinedText: combinedText
          });
        }
        
        // Start new group
        currentGroup = [currentPage];
        currentQuestion = currentPage.aiQuestion;
      }
    }

    // Add final group
    if (currentGroup.length > 0) {
      const combinedText = currentGroup.map(page => page.textContent).join(' ');
      groups.push({
        id: `group-${groups.length}`,
        aiQuestion: currentQuestion,
        pages: [...currentGroup],
        combinedText: combinedText
      });
    }

    // No third pass merging - keep groups strictly consecutive
    return groups;
  };

  // Determine if two consecutive pages should be grouped intelligently
  const shouldGroupPagesIntelligently = (prevPage: any, currentPage: any, currentGroupSize: number): boolean => {
    const prevText = prevPage.textContent.toLowerCase();
    const currentText = currentPage.textContent.toLowerCase();
    
    // If group is already at max size, don't group
    if (currentGroupSize >= 5) return false;
    
    // Check if questions are identical or very similar
    const questionsAreSimilar = areQuestionsSimilar(prevPage.aiQuestion, currentPage.aiQuestion);
    
    // Check for content similarity
    const prevKeywords = extractKeywords(prevText);
    const currentKeywords = extractKeywords(currentText);
    
    // Calculate similarity score
    const commonKeywords = prevKeywords.filter(keyword => currentKeywords.includes(keyword));
    const similarityScore = commonKeywords.length / Math.max(prevKeywords.length, currentKeywords.length);
    
    // Group if questions are similar OR content similarity is high enough OR group is small
    return questionsAreSimilar || similarityScore > 0.25 || currentGroupSize < 2;
  };

  // Check if two AI questions are similar
  const areQuestionsSimilar = (question1: string, question2: string): boolean => {
    const q1 = question1.toLowerCase().replace(/[^\w\såäö]/g, '');
    const q2 = question2.toLowerCase().replace(/[^\w\såäö]/g, '');
    
    // Exact match
    if (q1 === q2) return true;
    
    // Check for key question words
    const questionWords = ['vad', 'vilka', 'hur', 'varför', 'när', 'var'];
    const q1Words = q1.split(' ').filter(word => questionWords.includes(word));
    const q2Words = q2.split(' ').filter(word => questionWords.includes(word));
    
    // If they have the same question structure and similar topics
    if (q1Words.length > 0 && q1Words.join(' ') === q2Words.join(' ')) {
      const q1Topics = extractTopics(q1);
      const q2Topics = extractTopics(q2);
      const commonTopics = q1Topics.filter(topic => q2Topics.includes(topic));
      return commonTopics.length > 0;
    }
    
    return false;
  };

  // Extract topics from question
  const extractTopics = (question: string): string[] => {
    const topics = [
      'graviditet', 'fysiologi', 'placenta', 'cirkulation', 'blod', 'hjärta', 
      'symptom', 'behandling', 'bedömning', 'viktigt', 'blodvolym', 'plasma'
    ];
    
    return topics.filter(topic => question.includes(topic));
  };

  // Merge groups that have identical questions
  const mergeGroupsWithSameQuestions = (groups: GroupedContent[]): GroupedContent[] => {
    const mergedGroups: GroupedContent[] = [];
    const processedGroups = new Set<number>();
    
    for (let i = 0; i < groups.length; i++) {
      if (processedGroups.has(i)) continue;
      
      const currentGroup = groups[i];
      const similarGroups = [currentGroup];
      
      // Find other groups with similar questions
      for (let j = i + 1; j < groups.length; j++) {
        if (processedGroups.has(j)) continue;
        
        if (areQuestionsSimilar(currentGroup.aiQuestion, groups[j].aiQuestion)) {
          similarGroups.push(groups[j]);
          processedGroups.add(j);
        }
      }
      
      // Merge similar groups
      if (similarGroups.length > 1) {
        const allPages = similarGroups.flatMap(group => group.pages);
        const combinedText = allPages.map(page => page.textContent).join(' ');
        
        mergedGroups.push({
          id: `merged-group-${mergedGroups.length}`,
          aiQuestion: currentGroup.aiQuestion,
          pages: allPages,
          combinedText: combinedText
        });
      } else {
        mergedGroups.push(currentGroup);
      }
      
      processedGroups.add(i);
    }
    
    return mergedGroups;
  };

  // Extract keywords from text
  const extractKeywords = (text: string): string[] => {
    const stopWords = ['och', 'den', 'det', 'som', 'är', 'var', 'för', 'med', 'till', 'av', 'på', 'i', 'en', 'ett', 'ett', 'de', 'du', 'har', 'inte', 'jag', 'kan', 'kommer', 'man', 'mycket', 'när', 'så', 'ska', 'skulle', 'under', 'upp', 'ut', 'vad', 'var', 'vem', 'vilka', 'vilkas', 'vars', 'vårt', 'våra', 'ert', 'era', 'hans', 'hennes', 'dess', 'dessa', 'vem', 'vilket', 'vilka', 'samma', 'denna', 'denne', 'detta', 'dessa'];
    
    const words = text.toLowerCase()
      .replace(/[^\w\såäö]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.includes(word) &&
        !/^\d+$/.test(word)
      );
    
    return [...new Set(words)].slice(0, 10); // Top 10 unique keywords
  };

  // Sync flashcards to Notion (with background job + progress polling)
  const syncFlashcardsToNotion = async () => {
    if (!selectedLecture || !result) {
      console.error('❌ Cannot sync: No lecture selected or no processing result');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      console.log('🔄 Starting flashcard sync to Notion...');
      console.log('📋 Selected lecture:', selectedLecture);
      // Use current processing result from state
      const currentResult = result;
      console.log('📋 Processing result:', currentResult);

      // Prepare flashcard groups for sync
      const flashcardGroups = currentResult.groupedContent.map(group => ({
        id: group.id,
        question: group.aiQuestion,
        pages: group.pages.map(page => ({
          pageNumber: page.pageNumber,
          textContent: page.textContent,
          imageDataUrl: page.imageUrl // This is already a data URL
        })),
        summary: `📋 Denna grupp innehåller sidorna: ${group.pages.map(p => p.pageNumber).join(', ')}. Totalt ${group.pages.length} sidor som behandlar samma ämne.`
      }));

      // Get current user from Redux store
      const user = currentUser?.full_name || 'David Rönnlid';

      const syncData = {
        selectedLecture: {
          title: selectedLecture.title,
          lectureNumber: selectedLecture.lectureNumber,
          course: selectedLecture.course
        },
        flashcardGroups,
        user
      };

      console.log('📤 Sending sync data:', { ...syncData, mode: includeImages ? 'full' : 'text-only' });

      // Prefer Next API route for better reliability on current plan
      const endpoint = '/api/syncFlashcardsToNotion';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...syncData, mode: includeImages ? 'full' : 'text-only' }),
      });
      if (!response.ok) {
        const raw = await response.text();
        console.error('❌ Sync HTTP error:', response.status, response.statusText, raw);
        setSyncResult({ success: false, message: `HTTP ${response.status}: ${response.statusText}` });
        return;
      }

      let syncResponse: any = null;
      try {
        syncResponse = await response.json();
      } catch (parseErr) {
        console.error('❌ Failed to parse sync response JSON:', parseErr);
        setSyncResult({ success: false, message: 'Invalid JSON in response' });
        return;
      }

      // Client-side verbose logging instead of relying on Netlify logs
      console.groupCollapsed('🧾 Notion sync response');
      console.log(syncResponse);
      if (Array.isArray(syncResponse.results)) {
        syncResponse.results.forEach((r: any) => {
          console.groupCollapsed(`Result for ${r.user} (${r.success ? 'success' : 'fail'})`);
          if (r.logs) r.logs.forEach((line: string) => console.log(line));
          if (r.error) console.error('Error:', r.error);
          console.groupEnd();
        });
      }
      console.groupEnd();

      if (syncResponse.success) {
        setSyncResult({ success: true, message: syncResponse.message });
      } else {
        setSyncResult({ success: false, message: syncResponse.message || 'Sync failed' });
      }

    } catch (error) {
      console.error('❌ Error during flashcard sync:', error);
      setSyncResult({
        success: false,
        message: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Box style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <Box style={{ textAlign: 'center', marginBottom: 32 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          📄 Notion Flashcard Generator
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Upload a PDF to generate high-quality flashcards for the pages in the PDF
        </Typography>
      </Box>

      {/* Lecture Selector */}
      <Box style={{ marginBottom: 32 }}>
        <Typography variant="h6" gutterBottom style={{ marginBottom: 16 }}>
          📚 Välj föreläsning från aktiva kurser
        </Typography>
        <TextField
          label="Sök och välj föreläsning"
          variant="outlined"
          placeholder="Börja skriva för att söka efter nummer eller titel..."
          value={lectureSearchTerm}
          onChange={(e) => setLectureSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: 16 }}
        />
        {filteredLectures.length > 0 && (
          <Box style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 4 }}>
            {filteredLectures.slice(0, 10).map((lecture, index) => (
              <Box
                key={lecture.id}
                onClick={() => setSelectedLecture(lecture)}
                style={{
                  padding: 12,
                  borderBottom: index < filteredLectures.slice(0, 10).length - 1 ? '1px solid #f0f0f0' : 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedLecture?.id === lecture.id ? '#f5f5f5' : 'transparent'
                }}
              >
                <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                  {lecture.lectureNumber}. {lecture.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {lecture.date} • {lecture.time} • {lecture.subjectArea || 'Inget ämnesområde'}
                </Typography>
                {lecture.lecturer && (
                  <Typography variant="body2" color="textSecondary">
                    Föreläsare: {lecture.lecturer}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
        {selectedLecture && (
          <Box style={{ marginTop: 16 }}>
            <Chip
              label={`Vald föreläsning: ${selectedLecture.lectureNumber}. ${selectedLecture.title}`}
              color="primary"
              onDelete={() => setSelectedLecture(null)}
              style={{ marginRight: 8 }}
            />
            <Chip
              label={`Kurs: ${selectedLecture.course}`}
              variant="outlined"
              style={{ marginRight: 8 }}
            />
            <Chip
              label={`Datum: ${selectedLecture.date}`}
              variant="outlined"
            />
          </Box>
        )}
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          Tillgängliga föreläsningar: {filteredLectures.length} (Klinisk medicin 4)
        </Typography>
      </Box>

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

      {/* File Upload Area */}
      <Card 
        style={{ 
          marginBottom: 24,
          border: dragOver ? '2px dashed #2196f3' : '2px dashed #e0e0e0',
          backgroundColor: dragOver ? '#f3f9ff' : 'inherit'
        }}
      >
        <CardContent>
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              textAlign: 'center',
              padding: 32,
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon style={{ fontSize: 48, color: '#999', marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              {file ? file.name : 'Drop PDF file here or click to browse'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Supports PDF files up to 50MB
            </Typography>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Process Button */}
      {file && !processing && !result && (
        <Box style={{ textAlign: 'center', marginBottom: 24 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={processPDF}
            startIcon={<UploadIcon />}
          >
            Generate Screenshots
          </Button>
        </Box>
      )}

      {/* Processing Indicator */}
      {processing && (
        <Box style={{ textAlign: 'center', marginBottom: 24 }}>
          <CircularProgress size={40} style={{ marginBottom: 16 }} />
          <Typography variant="body1">
            Processing PDF pages... This may take a moment.
          </Typography>
        </Box>
      )}

      {/* Results */}
      {result && (
        <Box>
          {/* Results Header */}
          <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Typography variant="h5">
              📸 Generated {result.totalPages} Screenshots
            </Typography>
            <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                />
                <span style={{ color: '#555' }}>Include images</span>
              </label>
              {selectedLecture && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={syncFlashcardsToNotion}
                  disabled={isSyncing}
                  startIcon={isSyncing ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                >
                  {isSyncing ? 'Syncing...' : 'Sync to Notion'}
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={downloadAllImages}
                startIcon={<DownloadIcon />}
              >
                Download All
              </Button>
            </Box>
          </Box>

          {/* Processing Stats */}
          <Box style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
            <Typography variant="body2">
              <strong>File:</strong> {result.fileName} | 
              <strong> Pages:</strong> {result.totalPages} | 
              <strong> Processing Time:</strong> {result.processingTime.toFixed(2)}s
            </Typography>
          </Box>

          {/* Sync Result Display */}
          {syncResult && (
            <Box style={{ marginBottom: 24 }}>
              <Paper 
                style={{ 
                  padding: 16, 
                  backgroundColor: syncResult.success ? '#e8f5e8' : '#ffebee',
                  border: `1px solid ${syncResult.success ? '#4caf50' : '#f44336'}`,
                  borderRadius: 4
                }}
              >
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography 
                    variant="body1" 
                    style={{ 
                      color: syncResult.success ? '#2e7d32' : '#c62828',
                      fontWeight: 'bold'
                    }}
                  >
                    {syncResult.success ? '✅ ' : '❌ '}{syncResult.message}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => setSyncResult(null)}
                    style={{ color: syncResult.success ? '#2e7d32' : '#c62828' }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Paper>
            </Box>
          )}

          {/* No Lecture Selected Warning */}
          {result && !selectedLecture && (
            <Box style={{ marginBottom: 24 }}>
              <Paper 
                style={{ 
                  padding: 16, 
                  backgroundColor: '#fff3e0',
                  border: '1px solid #ff9800',
                  borderRadius: 4
                }}
              >
                <Typography 
                  variant="body1" 
                  style={{ 
                    color: '#e65100',
                    fontWeight: 'bold'
                  }}
                >
                  ⚠️ Välj en föreläsning ovanför för att kunna synka flashcards till Notion.
                </Typography>
              </Paper>
            </Box>
          )}

                    {/* Grouped Content List */}
          <Box>
            {result.groupedContent.map((group, index) => (
              <Box key={group.id}>
                <Card style={{ marginBottom: 8 }}>
                  <CardContent>
                    {/* Group Header */}
                    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Typography variant="h6" style={{ color: '#000000', fontWeight: 'bold' }}>
                        {group.pages.length} sidor grupperade
                      </Typography>
                      <Box style={{ display: 'flex', gap: 8 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show first page in fullscreen
                            setSelectedPage(group.pages[0]);
                          }}
                        >
                          <FullscreenIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {/* AI Question Toggle */}
                    <Box 
                      style={{ 
                        cursor: 'pointer',
                        padding: '12px 16px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: 6,
                        border: '1px solid #2196f3',
                        marginBottom: 8
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageText(group.id);
                      }}
                    >
                      <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" style={{ color: '#000000', fontWeight: 'bold', flex: 1 }}>
                          {group.aiQuestion}
                        </Typography>
                        <IconButton
                          size="small"
                          style={{ padding: 4, color: '#2196f3' }}
                        >
                          {expandedPages.has(group.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {/* Expanded Content */}
                    <Collapse in={expandedPages.has(group.id)}>
                      <Box style={{ marginTop: 12 }}>
                        {/* Combined Extracted Text */}
                        <Paper 
                          style={{ 
                            padding: 16, 
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #e0e0e0',
                            marginBottom: 12
                          }}
                        >
                          <Typography variant="subtitle2" style={{ fontWeight: 'bold', color: '#000000', display: 'block', marginBottom: 8 }}>
                            📝 Kombinerad extraherad text:
                          </Typography>
                          <Typography variant="body2" style={{ fontSize: '0.875rem', lineHeight: 1.5, color: '#000000' }}>
                            {group.combinedText || 'Ingen text hittades.'}
                          </Typography>
                        </Paper>
                        
                        {/* All Page Images */}
                        {group.pages.map((page, index) => (
                          <Paper 
                            key={page.pageNumber}
                            style={{ 
                              padding: 12, 
                              backgroundColor: '#ffffff',
                              border: '1px solid #e0e0e0',
                              marginBottom: index < group.pages.length - 1 ? 8 : 0
                            }}
                          >
                            <Typography variant="subtitle2" style={{ fontWeight: 'bold', color: '#000000', display: 'block', marginBottom: 8 }}>
                              📄 Sida {page.pageNumber}:
                            </Typography>
                            <img
                              src={page.imageUrl}
                              alt={`Page ${page.pageNumber}`}
                              style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: 300,
                                objectFit: 'contain',
                                backgroundColor: '#f5f5f5'
                              }}
                            />
                          </Paper>
                        ))}
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
                
                {/* Summary between toggles */}
                {index < result.groupedContent.length - 1 && (
                  <Box style={{ marginBottom: 16, textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      style={{ 
                        fontStyle: 'italic', 
                        color: '#666666',
                        fontSize: '0.75rem'
                      }}
                    >
                      📋 Denna grupp innehåller sidorna: {group.pages.map(p => p.pageNumber).join(', ')}. 
                      Totalt {group.pages.length} sidor som behandlar samma ämne.
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Full Screen Dialog */}
      <Dialog
        open={Boolean(selectedPage)}
        onClose={() => setSelectedPage(null)}
        maxWidth="lg"
        fullWidth
      >
        {selectedPage && (
          <>
            <DialogTitle>
              Page {selectedPage.pageNumber} - Full Size
              <IconButton
                style={{ position: 'absolute', right: 8, top: 8 }}
                onClick={() => setSelectedPage(null)}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box style={{ textAlign: 'center' }}>
                <img
                  src={selectedPage.imageUrl}
                  alt={`Page ${selectedPage.pageNumber} Full Size`}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    backgroundColor: '#f5f5f5'
                  }}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => downloadImage(selectedPage)}
                startIcon={<DownloadIcon />}
                color="primary"
              >
                Download Image
              </Button>
              <Button onClick={() => setSelectedPage(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default ClientPdfViewer;
