import { SubjectArea } from '../types/lecture';

// Subject areas for Klinisk medicin 4
export const SUBJECT_AREAS: SubjectArea[] = [
  'Global hälsa',
  'Geriatrik', 
  'Pediatrik',
  'Öron-Näsa-Hals',
  'Gynekologi & Obstetrik',
  'Oftalmologi'
];

// Mapping from subject area to database environment variable suffix
export const SUBJECT_TO_DB_SUFFIX: { [key in SubjectArea]: string } = {
  'Global hälsa': 'GLOBAL_HALSA',
  'Geriatrik': 'GERIATRIK',
  'Pediatrik': 'PEDIATRIK',
  'Öron-Näsa-Hals': 'ORON_NASA_HALS',
  'Gynekologi & Obstetrik': 'GYNEKOLOGI_OBSTETRIK',
  'Oftalmologi': 'OFTALMOLOGI'
};

// Get database environment variable names for a user and subject
export const getNotionEnvVars = (userName: string, subjectArea: SubjectArea) => {
  const dbSuffix = SUBJECT_TO_DB_SUFFIX[subjectArea];
  return {
    tokenKey: `NOTION_TOKEN_${userName.toUpperCase()}`,
    databaseKey: `NOTION_DATABASE_${userName.toUpperCase()}_${dbSuffix}`
  };
};

// Get all database environment variable names for a user
export const getAllNotionEnvVars = (userName: string) => {
  return SUBJECT_AREAS.map(subject => ({
    subject,
    ...getNotionEnvVars(userName, subject)
  }));
};

// Auto-detect subject area from lecture title (basic implementation)
export const detectSubjectArea = (lectureTitle: string): SubjectArea | null => {
  const title = lectureTitle.toLowerCase();
  
  if (title.includes('global') || title.includes('världshälsa')) {
    return 'Global hälsa';
  }
  if (title.includes('geriatrik') || title.includes('äldre')) {
    return 'Geriatrik';
  }
  if (title.includes('pediatrik') || title.includes('barn') || title.includes('neonatal')) {
    return 'Pediatrik';
  }
  if (title.includes('öron') || title.includes('näsa') || title.includes('hals') || title.includes('önh')) {
    return 'Öron-Näsa-Hals';
  }
  if (title.includes('gynekologi') || title.includes('obstetrik') || title.includes('förlossning') || title.includes('gravid')) {
    return 'Gynekologi & Obstetrik';
  }
  if (title.includes('oftalmologi') || title.includes('ögon')) {
    return 'Oftalmologi';
  }
  
  // Additional keyword mappings for common medical specialties
  if (title.includes('allergologi') || title.includes('allergi') || title.includes('dermatologi') || title.includes('hud')) {
    return 'Oftalmologi'; // Default mapping for dermatology/allergy
  }
  if (title.includes('kardiologi') || title.includes('hjärt') || title.includes('kärl')) {
    return 'Global hälsa'; // Default mapping for cardiology
  }
  if (title.includes('endokrinologi') || title.includes('diabetes') || title.includes('sköldkörtel')) {
    return 'Global hälsa'; // Default mapping for endocrinology
  }
  if (title.includes('neurologi') || title.includes('neuro') || title.includes('hjärn')) {
    return 'Global hälsa'; // Default mapping for neurology
  }
  if (title.includes('psykiatri') || title.includes('psyk') || title.includes('mental')) {
    return 'Global hälsa'; // Default mapping for psychiatry
  }
  if (title.includes('ortopedi') || title.includes('ben') || title.includes('fraktur') || title.includes('trauma')) {
    return 'Global hälsa'; // Default mapping for orthopedics
  }
  
  return null; // Default to null if can't detect
};