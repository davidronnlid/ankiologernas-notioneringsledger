export interface Comment {
  fullName: string;
  comment: string;
  commentId: string;
  lectureId: string;
  dateAdded: Date;
}

export interface CheckboxState {
  [key: string]: {
    confirm: boolean;
    unwish: boolean;
  };
}

// Subject areas for Klinisk medicin 4
export type SubjectArea = 
  | 'Global hälsa'
  | 'Geriatrik'
  | 'Pediatrik'
  | 'Öron-Näsa-Hals'
  | 'Gynekologi & Obstetrik'
  | 'Oftalmologi';

export default interface Lecture {
  title: string;
  lecturer?: string;
  date: string;
  time: string;
  id: string;
  checkboxState: CheckboxState;
  lectureNumber: number;
  subjectArea?: SubjectArea;
  comments?: Comment[];
}
