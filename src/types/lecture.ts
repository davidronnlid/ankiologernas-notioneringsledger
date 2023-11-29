export default interface Lecture {
  title: string;
  lecturer?: string;
  date: string;
  time: string;
  id: string;
  checkboxState: Record<string, boolean>;
}
