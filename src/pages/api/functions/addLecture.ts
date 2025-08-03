import { NextApiRequest, NextApiResponse } from "next";
import { addLectureToMemory } from './CRUDFLData';

// Mock user for local development
const mockUser = {
  id: "david-ronnlid-123",
  email: "david.ronnlid@example.com",
  full_name: "David Rönnlid",
  user_metadata: {
    full_name: "David Rönnlid",
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, date, time, duration, course, userFullName } = req.body;
    
    // Authentication check for lecture creation
    const allowedNames = ["David Rönnlid", "Albin Lindberg", "Mattias Österdahl"];
    if (!userFullName || !allowedNames.includes(userFullName)) {
      return res.status(403).json({ 
        error: 'Unauthorized',
        message: 'Only authorized users (David, Albin, or Mattias) can create lectures'
      });
    }

    // Validate required fields
    if (!title || !date || !time || !course) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'title, date, time, and course are required'
      });
    }

    // Check for existing lecture with same title in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Checking for existing lecture with title:', title.trim());
      
      // Import the function to check existing lectures
      const { loadAddedLectures } = await import('./CRUDFLData');
      const existingLectures = loadAddedLectures();
      
      const existingLecture = existingLectures.find((lecture: any) => 
        lecture.title === title.trim() && lecture.course === course
      );

      if (existingLecture) {
        console.log('⚠️ Lecture with same title already exists:', existingLecture.title);
        
        // Check if subject area and person assignments are the same
        const hasSameSubjectArea = existingLecture.subjectArea === (req.body.subjectArea || null);
        const hasSamePersonAssignments = JSON.stringify(existingLecture.checkboxState) === JSON.stringify({
          Mattias: { confirm: false, unwish: false },
          Albin: { confirm: false, unwish: false },
          David: { confirm: false, unwish: false },
        });

        if (hasSameSubjectArea && hasSamePersonAssignments) {
          console.log('✅ Lecture exists with same subject area and person assignments - skipping');
          return res.status(200).json({
            success: true,
            message: 'Lecture already exists with same configuration - no changes needed',
            lecture: existingLecture,
            skipped: true,
            development: true
          });
        } else {
          console.log('⚠️ Lecture exists but with different configuration - proceeding with new lecture');
        }
      }
    }

    // Create new lecture object
    const newLecture = {
      id: `lecture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lectureNumber: 0, // Will be calculated by the frontend
      title: title.trim(),
      date: date,
      time: time,
      course: course,
      checkboxState: {
        Mattias: { confirm: false, unwish: false },
        Albin: { confirm: false, unwish: false },
        David: { confirm: false, unwish: false },
      },
      comments: [],
      createdAt: new Date().toISOString(),
      createdBy: mockUser.full_name,
    };

    console.log('📝 Adding new lecture:', newLecture);

    // In development, save to the shared in-memory storage
    // In production, this would save to MongoDB
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Development mode - adding to in-memory storage');
      
      // Add to shared memory storage
      addLectureToMemory(newLecture);
      
      return res.status(200).json({
        success: true,
        message: 'Lecture added successfully',
        lecture: newLecture,
        development: true
      });
    }

    // TODO: Add MongoDB integration for production
    // const client = new MongoClient(process.env.MONGODB_URI!);
    // await client.connect();
    // const database = client.db("ankiologernasnotioneringsledger");
    // const collection = database.collection("forelasningsdata");
    // await collection.insertOne(newLecture);
    // await client.close();

    return res.status(200).json({
      success: true,
      message: 'Lecture added successfully',
      lecture: newLecture
    });

  } catch (error) {
    console.error('❌ Error adding lecture:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 