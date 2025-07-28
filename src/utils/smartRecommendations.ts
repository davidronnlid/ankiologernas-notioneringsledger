import Lecture from "types/lecture";
import { calculateDuration } from "./processLectures";

interface UserPreferences {
  aiInstructions: string;
  preferredFocus: string[];
  avoidTopics: string[];
  learningStyle: string;
  timePreference: string;
  enableSmartRecommendations: boolean;
}

interface RecommendationScore {
  lecture: Lecture;
  score: number;
  reasons: string[];
  recommendationId: string; // For tracking feedback
}

// New interfaces for AI learning system
interface FeedbackData {
  recommendationId: string;
  lectureId: string;
  userId: string;
  action: 'accepted' | 'rejected' | 'selected' | 'ignored';
  timestamp: number;
  userReasons?: string[]; // User-provided feedback
  contextFactors: string[]; // What factors influenced the recommendation
}

interface LearningWeights {
  specialtyKeywords: number;
  specialtyThemes: number;
  relatedTopics: number;
  learningStyle: number;
  timePreference: number;
  contentAnalysis: number;
  diversityBonus: number;
  aiInstructions: number;
  userSpecificPatterns: { [pattern: string]: number };
}

interface UserLearningModel {
  userId: string;
  weights: LearningWeights;
  feedbackHistory: FeedbackData[];
  successPatterns: string[];
  failurePatterns: string[];
  adaptationCount: number;
  lastUpdated: number;
}

// Default learning weights (will be adapted per user)
const defaultWeights: LearningWeights = {
  specialtyKeywords: 3.0,
  specialtyThemes: 2.0,
  relatedTopics: 1.5,
  learningStyle: 2.0,
  timePreference: 1.0,
  contentAnalysis: 2.0,
  diversityBonus: 1.0,
  aiInstructions: 2.0,
  userSpecificPatterns: {}
};

// Comprehensive medical specialty analysis with context and themes
const specialtyAnalysis: { [key: string]: { 
  keywords: string[], 
  themes: string[], 
  relatedTopics: string[],
  clinicalContext: string[],
  researchAreas: string[]
} } = {
  "Kardiologi": {
    keywords: ["hjärta", "kardiovaskulär", "blodtryck", "arytmi", "infarkt", "angina", "kardiologi", "ekg", "ekokardiografi", "stent", "bypass"],
    themes: ["cirkulation", "blodflöde", "hjärtfunktion", "kardiovaskulär hälsa"],
    relatedTopics: ["hypertension", "hjärtsvikt", "kardiomyopati", "perikardit", "endokardit"],
    clinicalContext: ["akut koronart syndrom", "hjärtinfarkt", "angina pectoris", "hjärtarytmi"],
    researchAreas: ["kardiovaskulär fysiologi", "hjärtkirurgi", "interventionell kardiologi"]
  },
  "Neurologi": {
    keywords: ["hjärna", "nerv", "neurologi", "stroke", "epilepsi", "parkinson", "alzheimer", "ms", "migrän", "neuropati"],
    themes: ["nervsystem", "kognitiv funktion", "neurologiska sjukdomar"],
    relatedTopics: ["dementia", "meningit", "encefalit", "tumör", "trauma"],
    clinicalContext: ["akut stroke", "epileptiskt anfall", "neurologisk undersökning"],
    researchAreas: ["neurofysiologi", "neurokirurgi", "neuroimaging"]
  },
  "Gastroenterologi": {
    keywords: ["mage", "tarm", "lever", "gastroenterologi", "ulcus", "colitis", "hepatit", "pankreas", "gallblåsa", "esofagit"],
    themes: ["matsmältning", "leverfunktion", "gastrointestinal hälsa"],
    relatedTopics: ["ibs", "crohns sjukdom", "levercirros", "pankreatit", "gallsten"],
    clinicalContext: ["akut buk", "gastrointestinal blödning", "leverinsufficiens"],
    researchAreas: ["gastrointestinal fysiologi", "endoskopi", "levertransplantation"]
  },
  "Endokrinologi": {
    keywords: ["hormon", "diabetes", "thyroid", "endokrinologi", "insulin", "kortisol", "adrenalin", "testosteron", "östrogen"],
    themes: ["hormonell balans", "metabolism", "endokrin funktion"],
    relatedTopics: ["hypothyreos", "hyperthyreos", "cushings syndrom", "addisons sjukdom"],
    clinicalContext: ["diabetisk ketoacidos", "thyreotoxisk kris", "hypoglykemi"],
    researchAreas: ["endokrin fysiologi", "hormonterapi", "metabolisk medicin"]
  },
  "Pulmonologi": {
    keywords: ["lunga", "andning", "pulmonologi", "astma", "kronisk", "bronkit", "emfysem", "tuberkulos", "pneumoni"],
    themes: ["respiratorisk funktion", "lunghälsa", "andningssvårigheter"],
    relatedTopics: ["copd", "lungcancer", "pleurit", "pneumothorax", "lungemboli"],
    clinicalContext: ["akut andningssvikt", "pneumoni", "bronkospasm"],
    researchAreas: ["respiratorisk fysiologi", "lungtransplantation", "respiratorisk terapi"]
  },
  "Nefrologi": {
    keywords: ["njure", "nefrologi", "dialys", "glomerulonefrit", "pyelonefrit", "cystit", "urin", "kreatinin"],
    themes: ["njurfunktion", "vattensaltbalans", "renalfunktion"],
    relatedTopics: ["akut njursvikt", "kronisk njursjukdom", "nefrotiskt syndrom"],
    clinicalContext: ["akut njursvikt", "proteinuri", "hematuri"],
    researchAreas: ["njurfysiologi", "dialys", "njurtransplantation"]
  },
  "Hematologi": {
    keywords: ["blod", "leukemi", "anemi", "hematologi", "trombocyt", "koagulation", "hemoglobin", "leukocyt"],
    themes: ["blodsjukdomar", "koagulation", "hematopoes"],
    relatedTopics: ["lymfom", "myelom", "trombocytopeni", "hemofili"],
    clinicalContext: ["akut leukemi", "blödning", "tromboembolism"],
    researchAreas: ["hematopoetisk stamcell", "blodtransfusion", "hematologisk malignitet"]
  },
  "Onkologi": {
    keywords: ["cancer", "tumor", "onkologi", "metastas", "cytostatika", "strålning", "kemoterapi", "immunterapi"],
    themes: ["cancerbehandling", "tumörbiologi", "onkologisk vård"],
    relatedTopics: ["carcinom", "sarkom", "lymfom", "leukemi", "metastaser"],
    clinicalContext: ["akut leukemi", "tumörsyndrom", "cytostatikabiverkningar"],
    researchAreas: ["tumörbiologi", "precision medicine", "immunonkologi"]
  },
  "Infektionssjukdomar": {
    keywords: ["infektion", "bakteri", "virus", "antibiotika", "vaccin", "sepsis", "hiv", "hepatit", "tuberkulos"],
    themes: ["infektionskontroll", "immunologi", "mikrobiologi"],
    relatedTopics: ["antibiotikaresistens", "opportunistiska infektioner", "postoperativa infektioner"],
    clinicalContext: ["akut sepsis", "feber av okänd orsak", "infektionsprofylax"],
    researchAreas: ["mikrobiologi", "vaccinologi", "antimikrobiell terapi"]
  },
  "Reumatologi": {
    keywords: ["led", "artrit", "reumatologi", "lupus", "gikt", "inflammation", "reumatism", "artros"],
    themes: ["inflammation", "autoimmunitet", "ledsjukdomar"],
    relatedTopics: ["reumatoid artrit", "ankyloserande spondylit", "sjögrens syndrom"],
    clinicalContext: ["akut artrit", "inflammatorisk ryggsmärta", "autoimmun sjukdom"],
    researchAreas: ["autoimmunitet", "inflammationsforskning", "reumatologisk behandling"]
  },
  "Dermatologi": {
    keywords: ["hud", "dermatologi", "eksem", "psoriasis", "melanom", "akne", "urticaria", "dermatit"],
    themes: ["hudsjukdomar", "dermatologisk undersökning", "hudvård"],
    relatedTopics: ["atopisk dermatit", "kontaktdermatit", "hudcancer", "infektionssjukdomar"],
    clinicalContext: ["akut urticaria", "allergisk reaktion", "hudinfektion"],
    researchAreas: ["dermatologisk kirurgi", "kosmetisk dermatologi", "immunodermatologi"]
  },
  "Ortopedi": {
    keywords: ["ben", "led", "ortopedi", "fraktur", "artros", "protes", "skada", "kirurgi"],
    themes: ["rörelseapparat", "trauma", "ortopedisk kirurgi"],
    relatedTopics: ["ledskador", "frakturer", "degenerativa sjukdomar", "sportmedicin"],
    clinicalContext: ["akut trauma", "fraktur", "ledsmärta"],
    researchAreas: ["ortopedisk kirurgi", "sportmedicin", "rehabilitering"]
  },
  "Kirurgi": {
    keywords: ["kirurgi", "operation", "anestesi", "postoperativ", "komplikation", "kirurgisk teknik"],
    themes: ["kirurgisk behandling", "perioperativ vård", "kirurgisk teknik"],
    relatedTopics: ["allmänkirurgi", "specialkirurgi", "minimalt invasiv kirurgi"],
    clinicalContext: ["akut kirurgi", "postoperativa komplikationer", "kirurgisk profylax"],
    researchAreas: ["kirurgisk teknik", "robotkirurgi", "kirurgisk utbildning"]
  },
  "Pediatrik": {
    keywords: ["barn", "pediatrik", "neonatal", "barnsjukdom", "vaccin", "utveckling", "tillväxt"],
    themes: ["barnhälsa", "utveckling", "pediatrisk vård"],
    relatedTopics: ["neonatalvård", "barnhälsovård", "pediatrisk akutmedicin"],
    clinicalContext: ["akut barnsjukdom", "utvecklingsstörning", "vaccination"],
    researchAreas: ["pediatrisk utveckling", "neonatologi", "pediatrisk forskning"]
  },
  "Gynekologi": {
    keywords: ["gynekologi", "graviditet", "förlossning", "menstruation", "ovarium", "livmoder", "menopaus"],
    themes: ["kvinnors hälsa", "reproduktiv hälsa", "obstetrik"],
    relatedTopics: ["graviditetskomplikationer", "gynekologisk cancer", "infertilitet"],
    clinicalContext: ["akut gynekologisk smärta", "graviditetskomplikation", "gynekologisk undersökning"],
    researchAreas: ["reproduktiv medicin", "obstetrik", "gynekologisk onkologi"]
  },
  "Psykiatri": {
    keywords: ["psykiatri", "depression", "ångest", "psykos", "beteende", "psykisk hälsa", "terapi"],
    themes: ["psykisk hälsa", "beteendemedicin", "psykiatrisk vård"],
    relatedTopics: ["bipolär sjukdom", "schizofreni", "personlighetsstörning", "missbruk"],
    clinicalContext: ["akut psykos", "självmordsrisk", "psykiatrisk kris"],
    researchAreas: ["neuropsykiatri", "psykofarmakologi", "psykiatrisk forskning"]
  },
  "Global hälsa": {
    keywords: ["global", "epidemiologi", "folkhälsa", "prevention", "värld", "hälsopolitik", "migration"],
    themes: ["folkhälsa", "epidemiologi", "global hälsa"],
    relatedTopics: ["infektionssjukdomar", "migration och hälsa", "hälsopolitik"],
    clinicalContext: ["epidemisk sjukdom", "folkhälsoproblem", "preventiv medicin"],
    researchAreas: ["epidemiologi", "folkhälsa", "global hälsa"]
  },
  "Mekanistisk förståelse": {
    keywords: ["mekanism", "patofysiologi", "molekylär", "cellulär", "biokemi", "fysiologi", "molekylärbiologi"],
    themes: ["molekylär mekanismer", "cellulär funktion", "patofysiologi"],
    relatedTopics: ["signaltransduktion", "genreglering", "cellulär metabolism"],
    clinicalContext: ["molekylär diagnostik", "patofysiologisk förståelse", "mekanistisk behandling"],
    researchAreas: ["molekylärbiologi", "cellbiologi", "biokemi"]
  },
  "Klinisk tillämpning": {
    keywords: ["klinisk", "diagnos", "behandling", "praktisk", "tillämpning", "patient", "undersökning"],
    themes: ["klinisk medicin", "patientvård", "praktisk tillämpning"],
    relatedTopics: ["klinisk beslutsfattande", "evidensbaserad medicin", "klinisk forskning"],
    clinicalContext: ["klinisk undersökning", "diagnostik", "behandlingsplan"],
    researchAreas: ["klinisk forskning", "evidensbaserad medicin", "kvalitetsförbättring"]
  },
  "Forskning och evidens": {
    keywords: ["forskning", "studie", "evidens", "metod", "statistik", "randomiserad", "systematisk"],
    themes: ["vetenskaplig metod", "evidensbaserad medicin", "forskning"],
    relatedTopics: ["kliniska studier", "metaanalys", "systematiska översikter"],
    clinicalContext: ["evidensbaserad behandling", "kliniska riktlinjer", "forskning"],
    researchAreas: ["klinisk forskning", "epidemiologi", "biostatistik"]
  }
};

// Time preferences mapping
const timePreferences: { [key: string]: { start: number; end: number } } = {
  "morning": { start: 8, end: 12 },
  "afternoon": { start: 12, end: 17 },
  "evening": { start: 17, end: 21 },
  "flexible": { start: 0, end: 24 },
};

// AI Learning Functions
export const saveUserLearningModel = (model: UserLearningModel): void => {
  try {
    localStorage.setItem(`aiLearningModel_${model.userId}`, JSON.stringify(model));
  } catch (error) {
    console.error("Error saving learning model:", error);
  }
};

export const loadUserLearningModel = (userId: string): UserLearningModel => {
  try {
    const saved = localStorage.getItem(`aiLearningModel_${userId}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading learning model:", error);
  }
  
  // Return default model for new users
  return {
    userId,
    weights: { ...defaultWeights },
    feedbackHistory: [],
    successPatterns: [],
    failurePatterns: [],
    adaptationCount: 0,
    lastUpdated: Date.now()
  };
};

export const recordRecommendationFeedback = (
  userId: string,
  recommendationId: string,
  lectureId: string,
  action: 'accepted' | 'rejected' | 'selected' | 'ignored',
  contextFactors: string[],
  userReasons?: string[]
): void => {
  const model = loadUserLearningModel(userId);
  
  const feedbackData: FeedbackData = {
    recommendationId,
    lectureId,
    userId,
    action,
    timestamp: Date.now(),
    userReasons,
    contextFactors
  };
  
  model.feedbackHistory.push(feedbackData);
  
  // Limit history to last 100 feedback entries per user
  if (model.feedbackHistory.length > 100) {
    model.feedbackHistory = model.feedbackHistory.slice(-100);
  }
  
  // Update patterns based on feedback
  if (action === 'accepted' || action === 'selected') {
    contextFactors.forEach(factor => {
      if (!model.successPatterns.includes(factor)) {
        model.successPatterns.push(factor);
      }
    });
  } else if (action === 'rejected') {
    contextFactors.forEach(factor => {
      if (!model.failurePatterns.includes(factor)) {
        model.failurePatterns.push(factor);
      }
    });
  }
  
  model.lastUpdated = Date.now();
  saveUserLearningModel(model);
  
  // Trigger model adaptation if enough feedback collected
  if (model.feedbackHistory.length >= 5 && 
      (model.feedbackHistory.length % 5 === 0 || model.adaptationCount === 0)) {
    adaptLearningModel(userId);
  }
};

export const adaptLearningModel = (userId: string): void => {
  const model = loadUserLearningModel(userId);
  const recentFeedback = model.feedbackHistory.slice(-20); // Last 20 interactions
  
  if (recentFeedback.length < 3) return; // Need minimum feedback
  
  // Calculate success rates for different factor types
  const factorPerformance: { [factor: string]: { successes: number, total: number } } = {};
  
  recentFeedback.forEach(feedback => {
    feedback.contextFactors.forEach(factor => {
      if (!factorPerformance[factor]) {
        factorPerformance[factor] = { successes: 0, total: 0 };
      }
      factorPerformance[factor].total++;
      if (feedback.action === 'accepted' || feedback.action === 'selected') {
        factorPerformance[factor].successes++;
      }
    });
  });
  
  // Adapt weights based on performance
  Object.entries(factorPerformance).forEach(([factor, performance]) => {
    const successRate = performance.successes / performance.total;
    const adjustmentFactor = (successRate - 0.5) * 0.2; // -0.1 to +0.1 adjustment
    
    // Map factors to weight categories
    if (factor.includes('Specialintresse')) {
      model.weights.specialtyKeywords = Math.max(0.5, Math.min(5.0, 
        model.weights.specialtyKeywords + adjustmentFactor));
    } else if (factor.includes('Inlärningsstil')) {
      model.weights.learningStyle = Math.max(0.5, Math.min(5.0, 
        model.weights.learningStyle + adjustmentFactor));
    } else if (factor.includes('Tidspreferens')) {
      model.weights.timePreference = Math.max(0.5, Math.min(3.0, 
        model.weights.timePreference + adjustmentFactor));
    } else if (factor.includes('AI-instruktioner')) {
      model.weights.aiInstructions = Math.max(0.5, Math.min(5.0, 
        model.weights.aiInstructions + adjustmentFactor));
    } else if (factor.includes('Innehållsanalys')) {
      model.weights.contentAnalysis = Math.max(0.5, Math.min(5.0, 
        model.weights.contentAnalysis + adjustmentFactor));
    } else if (factor.includes('Diversitet')) {
      model.weights.diversityBonus = Math.max(0.5, Math.min(3.0, 
        model.weights.diversityBonus + adjustmentFactor));
    }
    
    // Store user-specific patterns
    model.weights.userSpecificPatterns[factor] = successRate;
  });
  
  model.adaptationCount++;
  model.lastUpdated = Date.now();
  saveUserLearningModel(model);
  
  console.log(`🤖 AI model adapted for user ${userId}:`, {
    adaptationCount: model.adaptationCount,
    successPatterns: model.successPatterns.length,
    failurePatterns: model.failurePatterns.length,
    recentFeedbackCount: recentFeedback.length
  });
};

export const getSmartRecommendations = (
  lectures: Lecture[],
  userPreferences: UserPreferences,
  currentUser: string,
  maxRecommendations: number = 5
): RecommendationScore[] => {
  if (!userPreferences.enableSmartRecommendations) {
    return [];
  }

  // Load user's personalized learning model
  const learningModel = loadUserLearningModel(currentUser);
  const weights = learningModel.weights;

  const recommendations: RecommendationScore[] = [];

  for (const lecture of lectures) {
    // Skip lectures already selected by current user
    if (lecture.checkboxState?.[currentUser]?.confirm) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];
    const contextFactors: string[] = [];
    const recommendationId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Analyze lecture title and content
    const titleLower = lecture.title.toLowerCase();
    const words = titleLower.split(/\s+/);

    // Check preferred focus areas with comprehensive analysis (using adaptive weights)
    for (const focus of userPreferences.preferredFocus) {
      const analysis = specialtyAnalysis[focus];
      if (!analysis) continue;
      
      // Check keywords (highest priority) - using adaptive weight
      for (const keyword of analysis.keywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
          const baseScore = weights.specialtyKeywords;
          score += baseScore;
          const reason = `🎯 Specialintresse: ${focus} (nyckelord: "${keyword}")`;
          reasons.push(reason);
          contextFactors.push(`Specialintresse:${focus}:keyword:${keyword}`);
          break;
        }
      }
      
      // Check themes (medium priority) - using adaptive weight
      if (score === 0) {
        for (const theme of analysis.themes) {
          if (titleLower.includes(theme.toLowerCase())) {
            const baseScore = weights.specialtyThemes;
            score += baseScore;
            const reason = `🎯 Specialintresse: ${focus} (tema: "${theme}")`;
            reasons.push(reason);
            contextFactors.push(`Specialintresse:${focus}:theme:${theme}`);
            break;
          }
        }
      }
      
      // Check related topics (lower priority) - using adaptive weight
      if (score === 0) {
        for (const topic of analysis.relatedTopics) {
          if (titleLower.includes(topic.toLowerCase())) {
            const baseScore = weights.relatedTopics;
            score += baseScore;
            const reason = `🎯 Specialintresse: ${focus} (relaterat ämne: "${topic}")`;
            reasons.push(reason);
            contextFactors.push(`Specialintresse:${focus}:related:${topic}`);
            break;
          }
        }
      }
    }

    // Check avoided topics with comprehensive analysis
    for (const avoid of userPreferences.avoidTopics) {
      const analysis = specialtyAnalysis[avoid];
      if (!analysis) continue;
      
      // Check keywords (highest penalty)
      for (const keyword of analysis.keywords) {
        if (titleLower.includes(keyword.toLowerCase())) {
          score -= 5;
          const reason = `🚫 Undviker: ${avoid} (nyckelord: "${keyword}")`;
          reasons.push(reason);
          contextFactors.push(`Undviker:${avoid}:keyword:${keyword}`);
          break;
        }
      }
    }

    // Check learning style preferences with adaptive weights
    if (userPreferences.learningStyle === "clinical") {
      const clinicalIndicators = [
        "klinisk", "diagnos", "behandling", "patient", "undersökning", "akut", "akutvård",
        "symptom", "tecken", "differentialdiagnos", "anamnes", "status", "terapi"
      ];
      const clinicalMatches = clinicalIndicators.filter(indicator => 
        titleLower.includes(indicator.toLowerCase())
      );
      if (clinicalMatches.length > 0) {
        const baseScore = weights.learningStyle;
        score += baseScore;
        const reason = `🏥 Inlärningsstil: Klinisk fokus (${clinicalMatches[0]})`;
        reasons.push(reason);
        contextFactors.push(`Inlärningsstil:clinical:${clinicalMatches[0]}`);
      }
    }

    if (userPreferences.learningStyle === "research") {
      const researchIndicators = [
        "forskning", "studie", "evidens", "metod", "statistik", "randomiserad", "systematisk",
        "metaanalys", "klinisk studie", "epidemiologi", "vetenskaplig", "publicering"
      ];
      const researchMatches = researchIndicators.filter(indicator => 
        titleLower.includes(indicator.toLowerCase())
      );
      if (researchMatches.length > 0) {
        const baseScore = weights.learningStyle;
        score += baseScore;
        const reason = `🔬 Inlärningsstil: Forskningsfokus (${researchMatches[0]})`;
        reasons.push(reason);
        contextFactors.push(`Inlärningsstil:research:${researchMatches[0]}`);
      }
    }

    if (userPreferences.learningStyle === "deep") {
      const deepIndicators = [
        "djup", "detalj", "mekanism", "patofysiologi", "molekylär", "cellulär", "biokemi",
        "fysiologi", "anatomi", "histologi", "embryologi", "genetik", "immunologi"
      ];
      const deepMatches = deepIndicators.filter(indicator => 
        titleLower.includes(indicator.toLowerCase())
      );
      if (deepMatches.length > 0) {
        const baseScore = weights.learningStyle;
        score += baseScore;
        const reason = `🧬 Inlärningsstil: Djupgående förståelse (${deepMatches[0]})`;
        reasons.push(reason);
        contextFactors.push(`Inlärningsstil:deep:${deepMatches[0]}`);
      }
    }

    // Check time preferences with adaptive weights
    if (userPreferences.timePreference && userPreferences.timePreference !== 'ingen preferens') {
      const lectureTime = lecture.time;
      const timeMatch = lectureTime.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const timePref = timePreferences[userPreferences.timePreference];
        if (timePref && hour >= timePref.start && hour < timePref.end) {
          const baseScore = weights.timePreference;
          score += baseScore;
          const timeNames: { [key: string]: string } = {
            'morning': 'morgon',
            'afternoon': 'eftermiddag', 
            'evening': 'kväll',
            'flexible': 'flexibel'
          };
          const reason = `⏰ Tidspreferens: ${timeNames[userPreferences.timePreference] || userPreferences.timePreference} (${lecture.time})`;
          reasons.push(reason);
          contextFactors.push(`Tidspreferens:${userPreferences.timePreference}:${hour}`);
        }
      }
    }

    // Advanced content analysis with adaptive weights
    const analyzeLectureContent = (title: string): { 
      likelyTopics: string[], 
      confidence: number, 
      reasoning: string 
    } => {
      const titleLower = title.toLowerCase();
      let likelyTopics: string[] = [];
      let confidence = 0;
      let reasoning = "";

      // Pattern-based analysis (same as before)
      if (titleLower.includes("introduktion") || titleLower.includes("grund")) {
        likelyTopics.push("grundläggande", "översikt", "introduktion");
        confidence = 0.8;
        reasoning = "Introduktionsföreläsning - grundläggande koncept";
      } else if (titleLower.includes("akut") || titleLower.includes("akutvård")) {
        likelyTopics.push("akutmedicin", "akutvård", "akutbehandling");
        confidence = 0.9;
        reasoning = "Akutmedicinsk fokus";
      } else if (titleLower.includes("kronisk") || titleLower.includes("långtid")) {
        likelyTopics.push("kronisk sjukdom", "långtidssjukvård", "rehabilitering");
        confidence = 0.85;
        reasoning = "Kronisk sjukdom och långtidssjukvård";
      } else if (titleLower.includes("diagnos") || titleLower.includes("diagnostik")) {
        likelyTopics.push("diagnostik", "undersökning", "diagnostiska metoder");
        confidence = 0.9;
        reasoning = "Diagnostisk fokus";
      } else if (titleLower.includes("behandling") || titleLower.includes("terapi")) {
        likelyTopics.push("behandling", "terapi", "intervention");
        confidence = 0.9;
        reasoning = "Behandlingsfokus";
      } else if (titleLower.includes("prevention") || titleLower.includes("förebyggande")) {
        likelyTopics.push("prevention", "förebyggande", "folkhälsa");
        confidence = 0.85;
        reasoning = "Preventiv medicin";
      }

      // Specialty-specific patterns
      Object.entries(specialtyAnalysis).forEach(([specialty, analysis]) => {
        const specialtyMatch = analysis.keywords.some(keyword => 
          titleLower.includes(keyword.toLowerCase())
        );
        if (specialtyMatch) {
          likelyTopics.push(specialty);
          confidence = Math.max(confidence, 0.7);
          reasoning = `Innehåller ${specialty.toLowerCase()}-relaterat innehåll`;
        }
      });

      return { likelyTopics, confidence, reasoning };
    };

    // Apply content analysis with adaptive weights
    const contentAnalysis = analyzeLectureContent(lecture.title);
    
    // Check if content analysis matches user preferences
    for (const focus of userPreferences.preferredFocus) {
      if (contentAnalysis.likelyTopics.some(topic => 
        topic.toLowerCase().includes(focus.toLowerCase()) || 
        focus.toLowerCase().includes(topic.toLowerCase())
      )) {
        const baseScore = weights.contentAnalysis * contentAnalysis.confidence;
        score += Math.floor(baseScore);
        const reason = `🎯 Innehållsanalys: ${contentAnalysis.reasoning} (${Math.round(contentAnalysis.confidence * 100)}% säkerhet)`;
        reasons.push(reason);
        contextFactors.push(`Innehållsanalys:${focus}:${contentAnalysis.confidence}`);
        break;
      }
    }

    // Check custom AI instructions with adaptive weights
    if (userPreferences.aiInstructions) {
      const instructions = userPreferences.aiInstructions.toLowerCase();
      
      // Check for global vs mechanistic preferences
      if (instructions.includes("global") && !instructions.includes("mekanistisk")) {
        if (titleLower.includes("global") || titleLower.includes("epidemiologi") || titleLower.includes("folkhälsa")) {
          const baseScore = weights.aiInstructions;
          score += baseScore;
          const reason = "🌍 AI-instruktioner: Global inriktning (epidemiologi/folkhälsa)";
          reasons.push(reason);
          contextFactors.push("AI-instruktioner:global:match");
        }
        if (titleLower.includes("mekanism") || titleLower.includes("molekylär") || titleLower.includes("cellulär")) {
          score -= 1;
          const reason = "⚗️ Mekanistisk inriktning (du föredrar global)";
          reasons.push(reason);
          contextFactors.push("AI-instruktioner:global:mismatch");
        }
      }

      // Additional AI instruction checks (same pattern with adaptive weights)
      if (instructions.includes("mekanistisk") && !instructions.includes("global")) {
        if (titleLower.includes("mekanism") || titleLower.includes("molekylär") || titleLower.includes("cellulär")) {
          const baseScore = weights.aiInstructions;
          score += baseScore;
          const reason = "⚗️ AI-instruktioner: Mekanistisk förståelse (molekylär/cellulär)";
          reasons.push(reason);
          contextFactors.push("AI-instruktioner:mechanistic:match");
        }
      }

      // Other instruction patterns...
      if (instructions.includes("pediatrik") && !instructions.includes("gynekologi")) {
        if (titleLower.includes("barn") || titleLower.includes("pediatrik")) {
          const baseScore = weights.aiInstructions;
          score += baseScore;
          const reason = "👶 AI-instruktioner: Pediatrik (barnsjukdomar)";
          reasons.push(reason);
          contextFactors.push("AI-instruktioner:pediatrik:match");
        }
      }

      if (instructions.includes("gynekologi") && !instructions.includes("pediatrik")) {
        if (titleLower.includes("gynekologi") || titleLower.includes("graviditet")) {
          const baseScore = weights.aiInstructions;
          score += baseScore;
          const reason = "👩 AI-instruktioner: Gynekologi (kvinnosjukdomar)";
          reasons.push(reason);
          contextFactors.push("AI-instruktioner:gynekologi:match");
        }
      }

      if (instructions.includes("klinisk") || instructions.includes("exempel")) {
        if (titleLower.includes("klinisk") || titleLower.includes("fall") || titleLower.includes("exempel")) {
          const baseScore = weights.aiInstructions;
          score += baseScore;
          const reason = "📋 AI-instruktioner: Kliniska exempel/fallstudier";
          reasons.push(reason);
          contextFactors.push("AI-instruktioner:clinical:examples");
        }
      }
    }

    // Apply user-specific pattern bonuses from learning model
    Object.entries(weights.userSpecificPatterns).forEach(([pattern, successRate]) => {
      if (successRate > 0.7) { // High success rate patterns get bonus
        if (contextFactors.some(factor => factor.includes(pattern.split(':')[0]))) {
          const bonus = (successRate - 0.5) * 2; // 0.4 to 1.0 bonus
          score += bonus;
          reasons.push(`🧠 Personlig trend: ${pattern.split(':')[0]} (${Math.round(successRate * 100)}% framgång)`);
        }
      }
    });

    // Bonus for lectures with fewer selections (encourage diversity) - with adaptive weight
    const selectedCount = Object.values(lecture.checkboxState || {}).filter(state => state.confirm).length;
    if (selectedCount === 0) {
      const baseScore = weights.diversityBonus;
      score += baseScore;
      const reason = "💡 Diversitet: Ingen har valt denna föreläsning än";
      reasons.push(reason);
      contextFactors.push("Diversitet:unselected");
    } else if (selectedCount === 1) {
      const baseScore = weights.diversityBonus * 0.5;
      score += baseScore;
      const reason = "📈 Populäritet: Endast en person har valt denna";
      reasons.push(reason);
      contextFactors.push("Diversitet:low_selection");
    }

    // Only include lectures with positive scores
    if (score > 0) {
      recommendations.push({
        lecture,
        score,
        reasons: [...new Set(reasons)], // Remove duplicates
        recommendationId
      });
    }
  }

  // Sort by score (highest first) and return top recommendations
  const finalRecommendations = recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRecommendations);

  // Record that these recommendations were shown
  finalRecommendations.forEach(rec => {
    // Don't record as feedback yet - wait for user action
    // This will be recorded when user accepts/rejects/selects
  });

  return finalRecommendations;
};

export const getRecommendationExplanation = (recommendation: RecommendationScore): string => {
  if (recommendation.reasons.length === 0) {
    return "AI-rekommendation baserad på dina inställningar";
  }

  // Remove emoji from main reason for short display
  const mainReason = recommendation.reasons[0].replace(/^[🎯🚫🏥🔬🧬⏰🌍⚗️👶👩📋💡📈🧠]\s/, '');
  
  if (recommendation.reasons.length === 1) {
    return mainReason;
  }

  const additionalCount = recommendation.reasons.length - 1;
  return `${mainReason} + ${additionalCount} andra faktorer`;
};

export const loadUserPreferences = (userId: string): UserPreferences | null => {
  try {
    const saved = localStorage.getItem(`userPreferences_${userId}`);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Error loading user preferences:", error);
    return null;
  }
};

// Enhanced AI Learning Interfaces
interface SemanticVector {
  keywords: number[];
  topics: number[];
  sentiment: number;
  complexity: number;
  urgency: number;
}

interface UserBehaviorPattern {
  timeOfDay: number[];
  dayOfWeek: number[];
  lectureLength: number;
  topicPreference: number[];
  decisionSpeed: number; // How quickly user makes decisions
  consistencyScore: number; // How consistent user's choices are
}

interface CollaborativeData {
  similarUsers: string[];
  crossUserPatterns: { [pattern: string]: number };
  groupTrends: { [topic: string]: number };
}

interface PredictiveModel {
  successProbability: number;
  timeToDecision: number;
  likelihoodToComplete: number;
  conflictProbability: number;
}

// Advanced ML-powered recommendation engine
export class AdvancedRecommendationEngine {
  private static instance: AdvancedRecommendationEngine;
  private userVectors: Map<string, SemanticVector> = new Map();
  private behaviorPatterns: Map<string, UserBehaviorPattern> = new Map();
  private collaborativeData: Map<string, CollaborativeData> = new Map();
  
  static getInstance(): AdvancedRecommendationEngine {
    if (!AdvancedRecommendationEngine.instance) {
      AdvancedRecommendationEngine.instance = new AdvancedRecommendationEngine();
    }
    return AdvancedRecommendationEngine.instance;
  }

  // Semantic analysis using NLP techniques
  analyzeContent(content: string): SemanticVector {
    const text = content.toLowerCase();
    
    // Medical keyword vectors (simplified - in production would use word embeddings)
    const keywordWeights = {
      acute: 0.9, emergency: 0.95, chronic: 0.7, preventive: 0.6,
      diagnosis: 0.8, treatment: 0.85, research: 0.75, clinical: 0.8,
      mechanism: 0.7, pathophysiology: 0.75, epidemiology: 0.6,
      surgery: 0.9, medication: 0.8, therapy: 0.8, care: 0.7
    };
    
    // Topic categorization vectors
    const topicWeights = {
      cardiology: 0, neurology: 1, gastro: 2, endocrine: 3, pulmonary: 4,
      nephrology: 5, hematology: 6, oncology: 7, infectious: 8, rheumatology: 9,
      dermatology: 10, orthopedic: 11, surgery: 12, pediatric: 13, gynecology: 14,
      psychiatry: 15, global: 16, mechanistic: 17, clinical: 18, research: 19
    };
    
    // Calculate keyword vector
    const keywords = Object.entries(keywordWeights).map(([word, weight]) => 
      text.includes(word) ? weight : 0
    );
    
    // Calculate topic vector
    const topics = new Array(20).fill(0);
    Object.entries(specialtyAnalysis).forEach(([specialty, data], index) => {
      const matchScore = data.keywords.reduce((score, keyword) => 
        score + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0
      ) / data.keywords.length;
      topics[index] = matchScore;
    });
    
    // Calculate sentiment (positive medical terms vs negative)
    const positiveTerms = ['prevention', 'treatment', 'cure', 'improvement', 'success', 'recovery'];
    const negativeTerms = ['complication', 'failure', 'deterioration', 'adverse', 'risk', 'death'];
    const sentiment = (
      positiveTerms.reduce((s, term) => s + (text.includes(term) ? 1 : 0), 0) -
      negativeTerms.reduce((s, term) => s + (text.includes(term) ? 1 : 0), 0)
    ) / 6;
    
    // Calculate complexity
    const complexTerms = ['pathophysiology', 'mechanism', 'molecular', 'cellular', 'biochemical'];
    const complexity = complexTerms.reduce((c, term) => c + (text.includes(term) ? 1 : 0), 0) / complexTerms.length;
    
    // Calculate urgency
    const urgentTerms = ['acute', 'emergency', 'urgent', 'critical', 'immediate'];
    const urgency = urgentTerms.reduce((u, term) => u + (text.includes(term) ? 1 : 0), 0) / urgentTerms.length;
    
    return { keywords, topics, sentiment, complexity, urgency };
  }

  // Advanced user behavior analysis
  analyzeUserBehavior(userId: string, lectures: Lecture[]): UserBehaviorPattern {
    const userSelections = lectures.filter(lecture => 
      lecture.checkboxState?.[userId]?.confirm
    );
    
    if (userSelections.length === 0) {
      return {
        timeOfDay: new Array(24).fill(0),
        dayOfWeek: new Array(7).fill(0),
        lectureLength: 0,
        topicPreference: new Array(20).fill(0),
        decisionSpeed: 0.5,
        consistencyScore: 0.5
      };
    }
    
    // Time of day pattern
    const timeOfDay = new Array(24).fill(0);
    userSelections.forEach(lecture => {
      const hour = parseInt(lecture.time.split(':')[0]);
      timeOfDay[hour] += 1;
    });
    const maxTimeCount = Math.max(...timeOfDay);
    if (maxTimeCount > 0) {
      timeOfDay.forEach((count, i) => { timeOfDay[i] = count / maxTimeCount; });
    }
    
    // Day of week pattern
    const dayOfWeek = new Array(7).fill(0);
    userSelections.forEach(lecture => {
      const day = new Date(lecture.date).getDay();
      dayOfWeek[day] += 1;
    });
    const maxDayCount = Math.max(...dayOfWeek);
    if (maxDayCount > 0) {
      dayOfWeek.forEach((count, i) => { dayOfWeek[i] = count / maxDayCount; });
    }
    
    // Average lecture length preference
    const lectureLength = userSelections.reduce((avg, lecture) => {
      const duration = calculateDuration(lecture.time);
      return avg + duration;
    }, 0) / userSelections.length;
    
    // Topic preference (semantic analysis)
    const topicPreference = new Array(20).fill(0);
    userSelections.forEach(lecture => {
      const vector = this.analyzeContent(lecture.title);
      vector.topics.forEach((weight, i) => {
        topicPreference[i] += weight;
      });
    });
    const maxTopic = Math.max(...topicPreference);
    if (maxTopic > 0) {
      topicPreference.forEach((pref, i) => { topicPreference[i] = pref / maxTopic; });
    }
    
    // Decision speed (how quickly user tends to make decisions)
    // Simplified: based on selection timing patterns
    const decisionSpeed = Math.min(1, userSelections.length / lectures.length * 2);
    
    // Consistency score (how consistent user's choices are with their patterns)
    const consistencyScore = this.calculateConsistencyScore(userSelections);
    
    return {
      timeOfDay,
      dayOfWeek,
      lectureLength,
      topicPreference,
      decisionSpeed,
      consistencyScore
    };
  }

  // Calculate how consistent user's choices are
  private calculateConsistencyScore(selections: Lecture[]): number {
    if (selections.length < 2) return 0.5;
    
    // Analyze consistency in time preferences
    const hours = selections.map(l => parseInt(l.time.split(':')[0]));
    const hourVariance = this.calculateVariance(hours);
    const hourConsistency = Math.max(0, 1 - hourVariance / 100);
    
    // Analyze consistency in topic choices
    const topics = selections.map(l => this.analyzeContent(l.title).topics);
    const topicSimilarity = this.calculateTopicSimilarity(topics);
    
    return (hourConsistency + topicSimilarity) / 2;
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    return variance;
  }

  private calculateTopicSimilarity(topicVectors: number[][]): number {
    if (topicVectors.length < 2) return 0.5;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < topicVectors.length; i++) {
      for (let j = i + 1; j < topicVectors.length; j++) {
        totalSimilarity += this.cosineSimilarity(topicVectors[i], topicVectors[j]);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0.5;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Collaborative filtering
  findSimilarUsers(userId: string, allUsers: string[], lectures: Lecture[]): string[] {
    const userPattern = this.analyzeUserBehavior(userId, lectures);
    const similarities = allUsers
      .filter(u => u !== userId)
      .map(otherUserId => ({
        userId: otherUserId,
        similarity: this.calculateUserSimilarity(userPattern, this.analyzeUserBehavior(otherUserId, lectures))
      }))
      .sort((a, b) => b.similarity - a.similarity);
    
    return similarities.slice(0, 3).map(s => s.userId);
  }

  private calculateUserSimilarity(patternA: UserBehaviorPattern, patternB: UserBehaviorPattern): number {
    const timeSimilarity = this.cosineSimilarity(patternA.timeOfDay, patternB.timeOfDay);
    const daySimilarity = this.cosineSimilarity(patternA.dayOfWeek, patternB.dayOfWeek);
    const topicSimilarity = this.cosineSimilarity(patternA.topicPreference, patternB.topicPreference);
    const lengthSimilarity = 1 - Math.abs(patternA.lectureLength - patternB.lectureLength) / 8;
    
    return (timeSimilarity + daySimilarity + topicSimilarity + lengthSimilarity) / 4;
  }

  // Predictive modeling
  predictSuccessProbability(userId: string, lecture: Lecture, lectures: Lecture[]): PredictiveModel {
    const userPattern = this.analyzeUserBehavior(userId, lectures);
    const lectureVector = this.analyzeContent(lecture.title);
    
    // Success probability based on user-lecture fit
    const topicMatch = this.cosineSimilarity(userPattern.topicPreference, lectureVector.topics);
    const timeMatch = this.calculateTimeMatch(userPattern, lecture);
    const lengthMatch = this.calculateLengthMatch(userPattern.lectureLength, calculateDuration(lecture.time));
    
    const successProbability = (topicMatch * 0.4 + timeMatch * 0.3 + lengthMatch * 0.2 + userPattern.consistencyScore * 0.1);
    
    // Time to decision prediction
    const timeToDecision = this.predictDecisionTime(userPattern, lectureVector);
    
    // Likelihood to complete
    const likelihoodToComplete = successProbability * userPattern.consistencyScore;
    
    // Conflict probability with other users
    const conflictProbability = this.calculateConflictProbability(lecture, lectures);
    
    return {
      successProbability,
      timeToDecision,
      likelihoodToComplete,
      conflictProbability
    };
  }

  private calculateTimeMatch(pattern: UserBehaviorPattern, lecture: Lecture): number {
    const hour = parseInt(lecture.time.split(':')[0]);
    const day = new Date(lecture.date).getDay();
    
    return (pattern.timeOfDay[hour] + pattern.dayOfWeek[day]) / 2;
  }

  private calculateLengthMatch(preferredLength: number, lectureLength: number): number {
    return Math.max(0, 1 - Math.abs(preferredLength - lectureLength) / 8);
  }

  private predictDecisionTime(pattern: UserBehaviorPattern, vector: SemanticVector): number {
    // Users with high decision speed and topic match decide faster
    const basTime = 24; // hours
    const speedFactor = 2 - pattern.decisionSpeed; // 1-2 multiplier
    const complexityFactor = 1 + vector.complexity * 0.5; // complexity increases decision time
    
    return basTime * speedFactor * complexityFactor;
  }

  private calculateConflictProbability(lecture: Lecture, lectures: Lecture[]): number {
    const sameTimeSlots = lectures.filter(l => 
      l.date === lecture.date && 
      Math.abs(parseInt(l.time.split(':')[0]) - parseInt(lecture.time.split(':')[0])) <= 1
    );
    
    return Math.min(1, sameTimeSlots.length / 5);
  }

  // Enhanced recommendation generation
  generateAdvancedRecommendations(
    lectures: Lecture[],
    userId: string,
    userPreferences: UserPreferences,
    allUsers: string[],
    maxRecommendations: number = 5
  ): RecommendationScore[] {
    const recommendations: RecommendationScore[] = [];
    const userPattern = this.analyzeUserBehavior(userId, lectures);
    const similarUsers = this.findSimilarUsers(userId, allUsers, lectures);
    
    // Store patterns for future use
    this.behaviorPatterns.set(userId, userPattern);
    this.collaborativeData.set(userId, {
      similarUsers,
      crossUserPatterns: {},
      groupTrends: {}
    });

    for (const lecture of lectures) {
      // Skip already selected lectures
      if (lecture.checkboxState?.[userId]?.confirm) continue;
      
      const lectureVector = this.analyzeContent(lecture.title);
      const prediction = this.predictSuccessProbability(userId, lecture, lectures);
      
      let score = 0;
      const reasons: string[] = [];
      const contextFactors: string[] = [];
      const recommendationId = `advanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 1. Semantic Content Matching (40% weight)
      const contentScore = this.cosineSimilarity(userPattern.topicPreference, lectureVector.topics) * 100;
      if (contentScore > 20) {
        score += contentScore * 0.4;
        reasons.push(`🧠 Innehåll matchar perfekt dina intressen (${Math.round(contentScore)}% match)`);
        contextFactors.push(`semantic_content:${contentScore}`);
      }
      
      // 2. Predictive Success Probability (30% weight)
      if (prediction.successProbability > 0.6) {
        score += prediction.successProbability * 100 * 0.3;
        reasons.push(`📈 ${Math.round(prediction.successProbability * 100)}% sannolikhet för framgång`);
        contextFactors.push(`prediction_success:${prediction.successProbability}`);
      }
      
      // 3. Collaborative Filtering (20% weight)
      const collaborativeScore = this.calculateCollaborativeScore(lecture, similarUsers, lectures);
      if (collaborativeScore > 0) {
        score += collaborativeScore * 0.2;
        reasons.push(`👥 Användare som dig har valt liknande föreläsningar`);
        contextFactors.push(`collaborative:${collaborativeScore}`);
      }
      
      // 4. Temporal Optimization (10% weight)
      const timeScore = this.calculateTimeMatch(userPattern, lecture) * 100;
      if (timeScore > 30) {
        score += timeScore * 0.1;
        reasons.push(`⏰ Optimal tid enligt dina mönster (${Math.round(timeScore)}% match)`);
        contextFactors.push(`temporal:${timeScore}`);
      }
      
      // Advanced penalties and bonuses
      
      // Diversity bonus
      if (this.calculateTopicDiversity(userId, lecture, lectures) > 0.7) {
        score += 15;
        reasons.push(`🌈 Utökar din ämnesbredd`);
        contextFactors.push(`diversity_bonus`);
      }
      
      // Urgency factor
      if (lectureVector.urgency > 0.5) {
        score += lectureVector.urgency * 20;
        reasons.push(`🚨 Brådskande innehåll identifierat`);
        contextFactors.push(`urgency:${lectureVector.urgency}`);
      }
      
      // Conflict penalty
      if (prediction.conflictProbability > 0.3) {
        score -= prediction.conflictProbability * 30;
        reasons.push(`⚠️ Risk för schemakonflikt`);
        contextFactors.push(`conflict_risk:${prediction.conflictProbability}`);
      }
      
      // Learning curve optimization
      const learningCurveScore = this.calculateLearningCurve(userId, lecture, lectures);
      if (learningCurveScore > 0) {
        score += learningCurveScore;
        reasons.push(`📚 Optimal för din inlärningskurva`);
        contextFactors.push(`learning_curve:${learningCurveScore}`);
      }
      
      // Quality threshold
      if (score > 30) {
        recommendations.push({
          lecture,
          score,
          reasons: [...new Set(reasons)],
          recommendationId
        });
      }
    }
    
    // Sort by score and apply final ranking adjustments
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
      .map((rec, index) => ({
        ...rec,
        score: rec.score * (1 - index * 0.05) // Slight penalty for lower ranks
      }));
  }

  private calculateCollaborativeScore(lecture: Lecture, similarUsers: string[], lectures: Lecture[]): number {
    if (similarUsers.length === 0) return 0;
    
    const selections = similarUsers.reduce((count, userId) => {
      return count + (lecture.checkboxState?.[userId]?.confirm ? 1 : 0);
    }, 0);
    
    return (selections / similarUsers.length) * 100;
  }

  private calculateTopicDiversity(userId: string, lecture: Lecture, lectures: Lecture[]): number {
    const userSelections = lectures.filter(l => l.checkboxState?.[userId]?.confirm);
    const selectedTopics = userSelections.map(l => this.analyzeContent(l.title).topics);
    const newTopic = this.analyzeContent(lecture.title).topics;
    
    if (selectedTopics.length === 0) return 1;
    
    const avgSimilarity = selectedTopics.reduce((sum, topic) => 
      sum + this.cosineSimilarity(topic, newTopic), 0
    ) / selectedTopics.length;
    
    return 1 - avgSimilarity; // Higher diversity = lower similarity
  }

  private calculateLearningCurve(userId: string, lecture: Lecture, lectures: Lecture[]): number {
    const userSelections = lectures.filter(l => l.checkboxState?.[userId]?.confirm);
    const lectureComplexity = this.analyzeContent(lecture.title).complexity;
    
    if (userSelections.length === 0) {
      // New user - prefer simpler content
      return lectureComplexity < 0.3 ? 20 : 0;
    }
    
    const avgComplexity = userSelections.reduce((sum, l) => 
      sum + this.analyzeContent(l.title).complexity, 0
    ) / userSelections.length;
    
    // Optimal complexity is slightly higher than user's average
    const optimalComplexity = Math.min(1, avgComplexity + 0.2);
    const complexityDiff = Math.abs(lectureComplexity - optimalComplexity);
    
    return Math.max(0, 20 - complexityDiff * 50);
  }
}

// Updated main function to use advanced engine
export const getAdvancedSmartRecommendations = (
  lectures: Lecture[],
  userPreferences: UserPreferences,
  currentUser: string,
  allUsers: string[] = ["Mattias", "Albin", "David"],
  maxRecommendations: number = 5
): RecommendationScore[] => {
  if (!userPreferences.enableSmartRecommendations) {
    return [];
  }

  const engine = AdvancedRecommendationEngine.getInstance();
  return engine.generateAdvancedRecommendations(
    lectures,
    currentUser,
    userPreferences,
    allUsers,
    maxRecommendations
  );
};

// Enhanced explanation with ML insights
export const getAdvancedRecommendationExplanation = (recommendation: RecommendationScore): string => {
  if (recommendation.reasons.length === 0) {
    return "AI-rekommendation baserad på avancerad maskininlärning";
  }

  const mainReason = recommendation.reasons[0].replace(/^[🧠📈👥⏰🌈🚨⚠️📚]\s/, '');
  
  if (recommendation.reasons.length === 1) {
    return mainReason;
  }

  return `${mainReason} + ${recommendation.reasons.length - 1} ML-faktorer`;
}; 