export interface Comment {
  fullName: string;
  comment: string;
  commentId: string;
}

export default interface Lecture {
  title: string;
  lecturer?: string;
  date: string;
  time: string;
  id: string;
  checkboxState: Record<string, boolean>;
  lectureNumber: number;
  comments?: Comment[];
}
