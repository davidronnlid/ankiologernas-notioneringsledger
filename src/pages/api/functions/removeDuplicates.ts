import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Development API endpoint for removing duplicate lectures
 * In development mode, this is a no-op since we use mock data
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for local development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { lectureIds } = req.body;

    if (!lectureIds || !Array.isArray(lectureIds)) {
      res.status(400).json({
        error: "Missing or invalid lectureIds array",
      });
      return;
    }

    console.log(`🔧 Development mode: Simulating removal of ${lectureIds.length} duplicate lectures`);
    console.log('📋 Lecture IDs to remove:', lectureIds);

    // In development mode, we don't actually remove anything from mock data
    // This is just a simulation for testing the duplicate detection logic
    res.status(200).json({
      success: true,
      message: `Development mode: Simulated removal of ${lectureIds.length} duplicate lectures`,
      deletedCount: lectureIds.length,
      requestedIds: lectureIds,
      note: "This is a development simulation - no actual data was modified"
    });

  } catch (error) {
    console.error("❌ Error in development duplicate removal:", error);
    
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}