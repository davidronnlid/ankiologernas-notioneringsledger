import Lecture, { SubjectArea } from "../types/lecture";

interface AddLectureData {
  title: string;
  date: string;
  time: string;
  duration: number;
  course: string;
  userFullName: string;
}

interface AddLectureResponse {
  success: boolean;
  message: string;
  lecture: Lecture;
  insertedId?: string;
  development?: boolean;
}

/**
 * Adds a new lecture to the database
 */
export async function addLecture(lectureData: AddLectureData): Promise<AddLectureResponse> {
  const apiUrl = process.env.NODE_ENV === "development"
    ? "/api/functions/addLecture"
    : "/.netlify/functions/addLecture";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lectureData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Lecture added successfully:", result);
    return result;

  } catch (error) {
    console.error("❌ Error adding lecture:", error);
    throw error;
  }
}

/**
 * Refreshes lecture data from the server
 */
export async function refreshLectures(): Promise<Lecture[]> {
  const apiUrl = process.env.NODE_ENV === "development"
    ? "/api/functions/CRUDFLData"
    : "/.netlify/functions/CRUDFLData";

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.events) {
      return data.events;
    } else if (data.lectures) {
      // In development mode, data.lectures is an array of week objects, not individual lectures
      // We need to flatten them into individual lectures
      const allLectures: Lecture[] = [];
      data.lectures.forEach((week: any) => {
        if (week.lectures && Array.isArray(week.lectures)) {
          week.lectures.forEach((lecture: any) => {
            allLectures.push({
              ...lecture,
              course: week.course,
              week: week.week
            });
          });
        }
      });
      return allLectures;
    } else {
      throw new Error("Invalid response format");
    }

  } catch (error) {
    console.error("❌ Error refreshing lectures:", error);
    throw error;
  }
}

/**
 * Calculates the next lecture number based on existing lectures
 */
export function calculateNextLectureNumber(lectures: Lecture[]): number {
  if (lectures.length === 0) return 1;
  
  const maxNumber = Math.max(...lectures.map(l => l.lectureNumber));
  return maxNumber + 1;
}

/**
 * Formats lecture data for API submission
 */
export function formatLectureData(
  title: string,
  date: string,
  time: string,
  duration: number,
  course: string,
  userFullName: string
): AddLectureData {
  return {
    title: title.trim(),
    date,
    time,
    duration,
    course,
    userFullName,
  };
}

/**
 * Interface for edit lecture data
 */
export interface EditLectureData {
  id: string;
  title: string;
  date: string;
  time: string;
  subjectArea: SubjectArea;
  duration: number;
  userFullName: string;
}

/**
 * Interface for edit lecture response
 */
export interface EditLectureResponse {
  success: boolean;
  message: string;
  lecture?: any;
  development?: boolean;
}

/**
 * Edits an existing lecture
 */
export async function editLecture(lectureData: EditLectureData): Promise<EditLectureResponse> {
  const apiUrl = process.env.NODE_ENV === "development"
    ? "/api/functions/editLecture"
    : "/.netlify/functions/editLecture";

  try {
    console.log("📝 Editing lecture:", lectureData);

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lectureData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Lecture edited successfully:", data);

    return data;
  } catch (error) {
    console.error("❌ Error editing lecture:", error);
    throw error;
  }
} 