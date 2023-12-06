export interface Comment {
  fullName: string;
  comment: string;
  commentId: string;
  lectureId: string;
  date: Date;
}

export interface CheckboxState {
  [key: string]: {
    confirm: boolean;
    unwish: boolean;
  };
}

export default interface Lecture {
  title: string;
  lecturer?: string;
  date: string;
  time: string;
  id: string;
  checkboxState: CheckboxState;
  lectureNumber: number;
  comments?: Comment[];
}
