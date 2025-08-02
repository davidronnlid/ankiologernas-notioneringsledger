import { NextApiRequest, NextApiResponse } from "next";
import { loadAddedLectures, saveAddedLectures, loadEditedLectures, saveEditedLectures } from './CRUDFLData';

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
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, title, date, time, subjectArea, duration } = req.body;

    if (!id || !title || !date || !time || !subjectArea) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('📝 Editing lecture:', { id, title, date, time, subjectArea, duration });

    // In development, update the lecture in persistent storage
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Development mode - updating in persistent storage');
      
      // Load existing added lectures
      const addedLectures = loadAddedLectures();
      
      // Find and update the lecture in added lectures first
      const lectureIndex = addedLectures.findIndex(lecture => lecture.id === id);
      
      if (lectureIndex >= 0) {
        // Update existing added lecture
        addedLectures[lectureIndex] = {
          ...addedLectures[lectureIndex],
          title,
          date,
          time,
          subjectArea,
          updatedAt: new Date().toISOString(),
          updatedBy: mockUser.full_name,
        };
        
        saveAddedLectures(addedLectures);
        
        console.log('💾 Updated added lecture in persistent storage:', addedLectures[lectureIndex].title);
        
        return res.status(200).json({
          success: true,
          message: 'Lecture updated successfully',
          lecture: addedLectures[lectureIndex],
          development: true
        });
      } else {
        // This is likely a mock data lecture, store the edit separately
        console.log('📝 Editing mock data lecture, storing edit separately');
        
        const editedLectures = loadEditedLectures();
        
        // Store the edit with the lecture ID as key
        editedLectures[id] = {
          id,
          title,
          date,
          time,
          subjectArea,
          updatedAt: new Date().toISOString(),
          updatedBy: mockUser.full_name,
        };
        
        saveEditedLectures(editedLectures);
        
        console.log('💾 Stored mock lecture edit:', title);
        
        return res.status(200).json({
          success: true,
          message: 'Mock lecture edit stored successfully',
          lecture: editedLectures[id],
          development: true,
          editType: 'mock-edit'
        });
      }
    }

    // TODO: Add MongoDB integration for production
    // const client = new MongoClient(process.env.MONGODB_URI!);
    // await client.connect();
    // const database = client.db("ankiologernasnotioneringsledger");
    // const lectures = database.collection("lectures");
    // 
    // const result = await lectures.updateOne(
    //   { _id: new ObjectId(id) },
    //   { 
    //     $set: { 
    //       title, 
    //       date, 
    //       time,
    //       updatedAt: new Date(),
    //       updatedBy: mockUser.full_name
    //     } 
    //   }
    // );
    // 
    // await client.close();
    // 
    // if (result.matchedCount === 0) {
    //   return res.status(404).json({ error: 'Lecture not found' });
    // }
    // 
    // return res.status(200).json({
    //   success: true,
    //   message: 'Lecture updated successfully',
    //   lectureId: id
    // });

    return res.status(501).json({ 
      error: 'Production mode not implemented yet',
      message: 'MongoDB integration for editing lectures is not implemented yet'
    });

  } catch (error) {
    console.error('❌ Error editing lecture:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}