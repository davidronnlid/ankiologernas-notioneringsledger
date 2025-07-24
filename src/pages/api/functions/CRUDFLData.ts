import { NextApiRequest, NextApiResponse } from "next";

// Mock user for local development
const mockUser = {
  id: "david-ronnlid-123",
  email: "david.ronnlid@example.com",
  full_name: "David Rönnlid",
  user_metadata: {
    full_name: "David Rönnlid",
  },
};

// Mock lecture data for "Klinisk medicin 4"
const mockLectureData = [
  {
    week: "Vecka 30 (21-27 Juli)",
    course: "Klinisk medicin 4",
    lectures: [
      {
        id: "lecture-1",
        lectureNumber: 1,
        title: "Introduktion till Klinisk Medicin",
        date: "2025-07-25",
        time: "09:00-11:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: false },
          Albin: { confirm: true, unwish: false },
          David: { confirm: false, unwish: false },
        },
      },
      {
        id: "lecture-2",
        lectureNumber: 2,
        title: "Kardiovaskulär Patofysiologi",
        date: "2025-07-26",
        time: "13:00-15:00",
        checkboxState: {
          Mattias: { confirm: true, unwish: false },
          Albin: { confirm: false, unwish: false },
          David: { confirm: false, unwish: true },
        },
      },
    ],
  },
  {
    week: "Vecka 31 (28 Juli - 3 Augusti)",
    course: "Klinisk medicin 4",
    lectures: [
      {
        id: "lecture-3",
        lectureNumber: 3,
        title: "Respiratorisk Fysiologi",
        date: "2025-07-28",
        time: "10:00-12:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: false },
          Albin: { confirm: false, unwish: false },
          David: { confirm: true, unwish: false },
        },
      },
      {
        id: "lecture-4",
        lectureNumber: 4,
        title: "Neurologiska Undersökningar",
        date: "2025-07-30",
        time: "14:00-16:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: true },
          Albin: { confirm: true, unwish: false },
          David: { confirm: false, unwish: false },
        },
      },
      {
        id: "lecture-5",
        lectureNumber: 5,
        title: "Gastrointestinala Sjukdomar",
        date: "2025-08-01",
        time: "09:00-11:00",
        checkboxState: {
          Mattias: { confirm: true, unwish: false },
          Albin: { confirm: false, unwish: false },
          David: { confirm: true, unwish: false },
        },
      },
    ],
  },
  {
    week: "Vecka 32 (4-10 Augusti)",
    course: "Klinisk medicin 4",
    lectures: [
      {
        id: "lecture-6",
        lectureNumber: 6,
        title: "Endokrinologi Grunder",
        date: "2025-08-04",
        time: "08:00-10:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: false },
          Albin: { confirm: false, unwish: true },
          David: { confirm: false, unwish: false },
        },
      },
      {
        id: "lecture-7",
        lectureNumber: 7,
        title: "Hematologi och Onkologi",
        date: "2025-08-06",
        time: "13:00-15:00",
        checkboxState: {
          Mattias: { confirm: true, unwish: false },
          Albin: { confirm: true, unwish: false },
          David: { confirm: false, unwish: false },
        },
      },
      {
        id: "lecture-8",
        lectureNumber: 8,
        title: "Infektionssjukdomar",
        date: "2025-08-08",
        time: "15:00-17:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: false },
          Albin: { confirm: false, unwish: false },
          David: { confirm: true, unwish: false },
        },
      },
    ],
  },
  {
    week: "Vecka 33 (11-17 Augusti)",
    course: "Klinisk medicin 4",
    lectures: [
      {
        id: "lecture-9",
        lectureNumber: 9,
        title: "Dermatologi och Allergologi",
        date: "2025-08-11",
        time: "10:00-12:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: true },
          Albin: { confirm: false, unwish: false },
          David: { confirm: false, unwish: false },
        },
      },
      {
        id: "lecture-10",
        lectureNumber: 10,
        title: "Psykiatri i Primärvård",
        date: "2025-08-13",
        time: "14:00-16:00",
        checkboxState: {
          Mattias: { confirm: true, unwish: false },
          Albin: { confirm: false, unwish: false },
          David: { confirm: true, unwish: false },
        },
      },
      {
        id: "lecture-11",
        lectureNumber: 11,
        title: "Ortopedi och Traumatologi",
        date: "2025-08-15",
        time: "09:00-11:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: false },
          Albin: { confirm: true, unwish: false },
          David: { confirm: false, unwish: true },
        },
      },
      {
        id: "lecture-12",
        lectureNumber: 12,
        title: "Geriatrik och Palliativ Vård",
        date: "2025-08-17",
        time: "13:00-15:00",
        checkboxState: {
          Mattias: { confirm: false, unwish: false },
          Albin: { confirm: false, unwish: false },
          David: { confirm: false, unwish: false },
        },
      },
    ],
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for local development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case "GET":
        // Return mock lecture data and user info
        res.status(200).json({
          lectures: mockLectureData,
          user: mockUser,
          message: "Mock data loaded successfully - logged in as David Rönnlid",
        });
        break;

      case "POST":
        // Mock lecture creation
        const newLecture = req.body;
        console.log("Mock: Creating new lecture:", newLecture);
        res.status(201).json({
          success: true,
          message: "Mock lecture created successfully",
          lecture: newLecture,
        });
        break;

      case "PUT":
        // Mock lecture update (e.g., checkbox state changes)
        const updateData = req.body;
        console.log("Mock: Updating lecture with data:", updateData);

        // Find and update the lecture in mock data
        if (updateData.lectureID && updateData.newCheckboxState) {
          for (let week of mockLectureData) {
            for (let lecture of week.lectures) {
              if (lecture.id === updateData.lectureID) {
                lecture.checkboxState = updateData.newCheckboxState;
                console.log(
                  `Mock: Updated lecture ${updateData.lectureID} checkbox state`
                );
                break;
              }
            }
          }
        }

        res.status(200).json({
          success: true,
          message: "Mock lecture updated successfully",
          data: updateData,
        });
        break;

      case "DELETE":
        // Mock lecture deletion
        const { lectureId } = req.query;
        console.log("Mock: Deleting lecture:", lectureId);
        res.status(200).json({
          success: true,
          message: "Mock lecture deleted successfully",
          lectureId,
        });
        break;

      default:
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("Mock API error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Mock API encountered an error",
    });
  }
}
