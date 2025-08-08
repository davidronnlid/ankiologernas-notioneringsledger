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
  const [syncProgressOpen, setSyncProgressOpen] = useState<boolean>(false);
  const [syncMessages, setSyncMessages] = useState<string[]>([]);
  const progressEndRef = useRef<HTMLDivElement | null>(null);

  const pushProgress = (message: string) => {
    const ts = new Date().toLocaleTimeString();
    setSyncMessages((prev) => [...prev, `[${ts}] ${message}`]);
  };

  useEffect(() => {
    if (progressEndRef.current) {
      progressEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncMessages]);
  
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

  // Generate intelligent, Swedish medical-school questions for a page
  const generateAIQuestion = (textContent: string, pageNumber: number): string => {
    if (!textContent || textContent.trim().length === 0) {
      return 'Vad visar denna sida?';
    }

    // Normalize Swedish text
    const text = textContent
      .replace(/\s+/g, ' ')
      .replace(/[\u00AD]/g, '')
      .toLowerCase();

    // Quick utilities
    const containsAny = (arr: string[]) => arr.some((t) => text.includes(t));
    const match = (re: RegExp) => re.test(text);

    // Domain signals
    const sectionSignals: Record<string, string[]> = {
      definition: ['definition', 'vad är', 'karaktäriseras av'],
      epidemiology: ['epidemiologi', 'incidens', 'prevalens'],
      etiology: ['etiologi', 'orsak', 'orsaker', 'patogenes'],
      risk: ['riskfaktor', 'riskfaktorer'],
      symptoms: ['symtom', 'symptom', 'klinisk bild'],
      status: ['status', 'fynd vid status'],
      diagnostics: ['diagnostik', 'diagnos', 'kriterier', 'utredning'],
      labs: ['prover', 'lab', 'laboratorie', 'blodprov'],
      imaging: ['röntgen', 'rtg', 'ultraljud', 'ulj', 'ct', 'mr', 'mri', 'angiografi', 'doppler'],
      ekg: ['ekg', 'qrs', 'st-höjning', 'st-sänkning', 't-våg', 'avledning'],
      treatment: ['behandling', 'handläggning', 'terapi', 'åtgärd', 'intervention'],
      complications: ['komplikation', 'följd', 'biverkning'],
      followup: ['uppföljning', 'kontroll', 'monitorering'],
      ddx: ['ddx', 'differentialdiagnos', 'differentialdiagnoser']
    };

    const systems = [
      'kardiologi','pneumologi','endokrinologi','gastroenterologi','nefrologi','hematologi','neurologi',
      'infektion','reumatologi','dermatologi','psykiatri','obstetrik','gynekologi','pediatrik','kirurgi',
      'ortopedi','onkologi','urologi','öron', 'öga'
    ];

    // Helpful extracted features
    const hasNumbers = match(/\b\d+(,\d+|\.\d+)?\s?(mmhg|mmol\/l|mg\/l|µ?mol\/l|bpm|°c|kpa|ml\/min|%|g\/dl)\b/);
    const looksLikeList = match(/(^|\n)[\-•\d\)]\s+/m) || (text.match(/,\s?/g) || []).length >= 5;

    // Try to infer the main concept (very lightweight)
    const mainConcept = (() => {
      // pick frequent capitalized tokens from the original (best-effort)
      const raw = textContent.match(/([A-ZÅÄÖ][A-Za-zÅÄÖåäö\-]{2,})(?:\s+[A-ZÅÄÖ][A-Za-zÅÄÖåäö\-]{2,})?/g) || [];
      const candidate = raw.map((s) => s.trim()).sort((a,b) => a.length - b.length)[0];
      return candidate || '';
    })();

    // Special modalities
    if (containsAny(sectionSignals.ekg)) {
      return 'Tolka EKG‑fynden: vilka diagnostiska kriterier och akuta åtgärder är relevanta i detta fall?';
    }
    if (containsAny(sectionSignals.imaging)) {
      return 'Vilka bilddiagnostiska fynd förväntas här och hur påverkar de handläggning och vidare utredning?';
    }

    // Section‑driven templates (prioritized)
    if (containsAny(sectionSignals.diagnostics)) {
      return mainConcept
        ? `Hur ställs diagnosen ${mainConcept}? Ange nyckelkriterier, viktiga prover och eventuella bildfynd.`
        : 'Hur ställs diagnosen? Ange kriterier, relevanta prover och eventuella bildfynd.';
    }
    if (containsAny(sectionSignals.treatment)) {
      return mainConcept
        ? `Hur handläggs och behandlas ${mainConcept}? Prioritera akuta åtgärder, förstahandsbehandling och uppföljning.`
        : 'Hur handläggs tillståndet? Beskriv akuta åtgärder, förstahandsbehandling och uppföljning.';
    }
    if (containsAny(sectionSignals.symptoms)) {
      return mainConcept
        ? `Vilka kardinalsymtom och statusfynd är typiska för ${mainConcept}, och vilka röda flaggor kräver akut åtgärd?`
        : 'Vilka kardinalsymtom och statusfynd är typiska, och vilka röda flaggor kräver akut åtgärd?';
    }
    if (containsAny(sectionSignals.etiology) || containsAny(sectionSignals.risk)) {
      return mainConcept
        ? `Vilka är de viktigaste orsakerna och riskfaktorerna till ${mainConcept}, och hur kopplas dessa till patofysiologin?`
        : 'Vilka är de viktigaste orsakerna och riskfaktorerna, och hur kopplas dessa till patofysiologin?';
    }
    if (containsAny(sectionSignals.ddx)) {
      return mainConcept
        ? `Vilka är de viktigaste differentialdiagnoserna till ${mainConcept} och hur särskiljer du dem kliniskt och laboratoriemässigt?`
        : 'Vilka är de viktigaste differentialdiagnoserna och hur särskiljer du dem?';
    }
    if (containsAny(sectionSignals.complications)) {
      return mainConcept
        ? `Vilka komplikationer är vanligast vid ${mainConcept} och hur kan de förebyggas respektive upptäckas tidigt?`
        : 'Vilka komplikationer är vanligast och hur förebyggs respektive upptäcks de tidigt?';
    }

    // System‑level prompts
    if (containsAny(['graviditet','obstetrik','placenta','förlossning','puerperium','preeklampsi','eclampsi'])) {
      if (containsAny(['fysiologi','patofysiologi'])) {
        return 'Förklara de centrala fysiologiska och patofysiologiska förändringarna vid graviditet och deras kliniska betydelse.';
      }
      return 'Vilka är de viktigaste kliniska prioriteringarna och röda flaggorna vid graviditet i detta sammanhang?';
    }
    if (containsAny(['hjärta','kardiologi','ischemi','infarkt','svikt','klaff','arytmi'])) {
      return 'Redogör för patofysiologi, typiska symtom/status samt diagnostik och initial handläggning i kardiologiskt fokus.';
    }
    if (containsAny(['lungor','pneumoni','kols','astma','andningssvikt','embol'])) {
      return 'Vilka fynd styr misstanke och hur bekräftas diagnosen? Beskriv även akuta åtgärder och syrgas/ventilationsstrategi.';
    }
    if (containsAny(['infektion','sepsis','antibiotika','feber'])) {
      return 'Hur riskstratifierar du och väljer empirisk antibiotika? Ange nyckelprover och omedelbara åtgärder.';
    }

    // Numeric thresholds or long lists suggest enumeration questions
    if (hasNumbers) {
      return 'Vilka centrala gränsvärden, kriterier eller målvärden gäller här och hur påverkar de diagnos respektive behandling?';
    }
    if (looksLikeList) {
      return 'Nämn de viktigaste punkterna i listan och förklara varför de är kliniskt relevanta.';
    }

    // Knowledge‑backed generic fallbacks
    const medicalTerms = extractMedicalTerms(text);
    if (medicalTerms.length >= 2) {
      const termsList = medicalTerms.slice(0, 3).join(', ');
      return `Syntetisera innehållet: hur hänger ${termsList} ihop patofysiologiskt och hur påverkar det diagnostik och handläggning?`;
    }

    const mainTopics = extractMainTopics(text);
    if (mainTopics.length > 0) {
      const topicsList = mainTopics.slice(0, 2).join(' och ');
      return `Förklara huvuddragen i ${topicsList} och ange hur det omsätts i praktisk handläggning.`;
    }

    // Last‑resort
    return 'Vad är den viktigaste kliniska lärdomen från denna sida och hur påverkar den diagnostik eller behandling?';
  };

  // Extract medical terms from text (Swedish, broad med‑school set)
  const extractMedicalTerms = (text: string): string[] => {
    const medicalTerms = [
      // Core physiology & patho
      'fysiologi','patofysiologi','homeostas','inflammation','ischemi','hypoxi','nekros','apoptos',
      // Systems & organs
      'hjärta','lungor','lever','njure','hjärna','pankreas','magsäck','tarm','mjälte','sköldkörtel','binjurar','hypofys',
      // Common conditions
      'infarkt','angina','hjärtsvikt','arytmi','pneumoni','kols','astma','sepsis','diabetes','ketoacidos',
      'hypertyreos','hypotyreos','njursvikt','levercirros','ulcerös kolit','crohn',
      // OBGYN
      'graviditet','placenta','preeklampsi','eclampsi','puerperium','amning',
      // Diagnostics & therapy
      'ekg','röntgen','ultraljud','ct','mr','angiografi','prover','lab',
      'antibiotika','antikoagulantia','ace‑hämmare','betablockerare','diuretika','insulin','metformin',
      // Misc
      'riskfaktor','differentialdiagnos','komplikation','behandling','handläggning','uppföljning'
    ];
    return medicalTerms.filter((term) => text.includes(term));
  };

  // Extract main topics from text (phrases commonly found in med school notes)
  const extractMainTopics = (text: string): string[] => {
    const topics = [
      'diagnostiska kriterier','klinisk bedömning','initial handläggning','behandlingsprinciper','differentialdiagnoser',
      'komplikationer och uppföljning','patofysiologi och mekanismer','riskfaktorer och prevention',
      'bilddiagnostik','ekg‑tolkning','akut omhändertagande'
    ];
    return topics.filter((topic) => text.includes(topic));
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
      setSyncProgressOpen(true);
      setSyncMessages([]);
      pushProgress('Starting flashcard sync…');
      console.log('📋 Selected lecture:', selectedLecture);
      // Use current processing result from state
      const currentResult = result;
      console.log('📋 Processing result:', currentResult);

      // Scope summary
      const totalGroups = currentResult.groupedContent.length;
      const totalGroupedPages = currentResult.groupedContent.reduce((acc, g) => acc + g.pages.length, 0);
      pushProgress(`Scope: ${totalGroups} grupp(er) • ${totalGroupedPages} sidor i grupper`);

      // Optional pre-upload of images to shrink payload size
      const uploadImage = async (dataUrl: string): Promise<string | null> => {
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const isNetlify = typeof window !== 'undefined' && window.location.host.includes('netlify.app');
          const storeUrl = `${origin}/.netlify/functions/storeImage`;
          const resp = await fetch(storeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: dataUrl })
          });
          if (!resp.ok) return null;
          const { url } = await resp.json();
          return url || null;
        } catch (e) {
          console.warn('Pre-upload image failed:', e);
          return null;
        }
      };

      // Prepare flashcard groups for sync
      const flashcardGroups: any[] = [];
      for (const group of currentResult.groupedContent) {
        const pages: any[] = [];
        for (let i = 0; i < group.pages.length; i++) {
          const page = group.pages[i];
          if (includeImages) {
            console.log(`🖼️ Uploading image ${i + 1}/${group.pages.length} for group ${group.id}...`);
            pushProgress(`Uploading image ${i + 1}/${group.pages.length} for group ${group.id}…`);
            const uploadedUrl = await uploadImage(page.imageUrl);
            pages.push({ pageNumber: page.pageNumber, textContent: page.textContent, imageUrl: uploadedUrl || undefined });
          } else {
            pages.push({ pageNumber: page.pageNumber, textContent: page.textContent });
          }
        }
        flashcardGroups.push({
          id: group.id,
          question: group.aiQuestion,
          pages,
          summary: `📋 Denna grupp innehåller sidorna: ${group.pages.map(p => p.pageNumber).join(', ')}. Totalt ${group.pages.length} sidor som behandlar samma ämne.`
        });
      }

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

      const payload = { ...syncData, mode: includeImages ? 'full' : 'text-only' };
      const payloadStr = JSON.stringify(payload);
      console.log('📤 Sending sync data:', { ...payload, flashcardGroups: `Array(${flashcardGroups.length})` });
      console.log(`📦 Payload size: ~${(payloadStr.length / 1024).toFixed(1)} KB`);
      pushProgress(`Sending sync (mode: ${includeImages ? 'full' : 'text-only'})… payload ~${(payloadStr.length / 1024).toFixed(1)} KB`);

      // Prefer Next API route for better reliability on current plan
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const nextEndpoint = `${origin}/api/syncFlashcardsToNotion`;
      const netlifyEndpoint = `${origin}/.netlify/functions/syncFlashcardsToNotion`;

      const doRequest = async (url: string) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payloadStr });

      let response = await doRequest(nextEndpoint);
      if (!response.ok && (response.type === 'opaque' || response.status === 0)) {
        console.warn('⚠️ Next API route blocked/redirected. Retrying via Netlify Functions endpoint...');
        pushProgress('Next API blocked; retrying via Netlify Functions endpoint…');
        response = await doRequest(netlifyEndpoint);
      }
      if (!response.ok) {
        const raw = await response.text();
        console.error('❌ Sync HTTP error:', response.status, response.statusText, raw);
        pushProgress(`HTTP error ${response.status}: ${response.statusText}`);
        // Auto-fallback: send a tiny dry-run request (no append) with text-only and 1 group for diagnostics
        try {
          const diagPayload = JSON.stringify({
            ...syncData,
            mode: 'text-only',
            dryRun: true,
            flashcardGroups: flashcardGroups.slice(0, 1).map((g: any) => ({
              id: g.id,
              question: g.question,
              pages: (g.pages as Array<{ pageNumber: number; textContent: string }>).map(
                (p: { pageNumber: number; textContent: string }) => ({
                  pageNumber: p.pageNumber,
                  textContent: p.textContent,
                })
              ),
              summary: g.summary,
            }))
          });
          console.log('🧪 Retrying in dry-run (text-only, 1 group) to fetch detailed logs...');
          pushProgress('Retrying in dry‑run (text-only, 1 group) to collect diagnostics…');
          let diagResp = await fetch(nextEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: diagPayload });
          if (!diagResp.ok && (diagResp.type === 'opaque' || diagResp.status === 0)) {
            diagResp = await fetch(netlifyEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: diagPayload });
          }
          const diagJson = await diagResp.json().catch(() => ({}));
          console.groupCollapsed('🧪 Dry-run diagnostic response');
          console.log(diagJson);
          pushProgress('Received diagnostics from server.');
          if (Array.isArray(diagJson.results)) {
            diagJson.results.forEach((r: any) => {
              if (r.logs) r.logs.forEach((line: string) => { console.log(line); pushProgress(line); });
            });
          }
          console.groupEnd();
        } catch (diagErr) {
          console.warn('Dry-run diagnostic failed:', diagErr);
          pushProgress(`Dry‑run diagnostics failed: ${diagErr instanceof Error ? diagErr.message : String(diagErr)}`);
        }
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
          pushProgress(`Result for ${r.user}: ${r.success ? 'success' : 'failed'}`);
          if (r.logs) r.logs.forEach((line: string) => pushProgress(line));
          if (r.error) pushProgress(`Error: ${r.error}`);
        });
      }
      console.groupEnd();

      if (syncResponse.success) {
        setSyncResult({ success: true, message: syncResponse.message });
        pushProgress(`✅ ${syncResponse.message}`);
      } else {
        setSyncResult({ success: false, message: syncResponse.message || 'Sync failed' });
        pushProgress(`❌ ${syncResponse.message || 'Sync failed'}`);
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

          {/* Grouping overview for sync scope */}
          <Box style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Chip label={`Grupper att synka: ${result.groupedContent.length}`} color="primary" />
            <Chip label={`Totalt sidor i grupper: ${result.groupedContent.reduce((a,g)=>a+g.pages.length,0)}`} variant="outlined" />
            <Chip label={`Medel sidor/grupp: ${(result.groupedContent.reduce((a,g)=>a+g.pages.length,0) / Math.max(1,result.groupedContent.length)).toFixed(1)}`} variant="outlined" />
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

      {/* Sync progress modal */}
      <Dialog open={syncProgressOpen} onClose={() => setSyncProgressOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Notion sync progress
          <IconButton style={{ position: 'absolute', right: 8, top: 8 }} onClick={() => setSyncProgressOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box style={{ fontFamily: 'monospace', fontSize: 13, maxHeight: 400, overflowY: 'auto' }}>
            {syncMessages.map((m, idx) => (
              <div key={idx}>{m}</div>
            ))}
            <div ref={progressEndRef} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncProgressOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

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
