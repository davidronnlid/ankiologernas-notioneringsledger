# Local Development Setup

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the development server:**

   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

## Local Development Features

### ✅ What Works Locally:

- **Mock lecture data** - 12 sample lectures with realistic data
- **All UI components** - Modern interface with selection tracking
- **Selection changes** - Interactive buttons and visual feedback
- **Progress tracking** - Real-time statistics and progress bars
- **Comments system** - Mock comment posting and deletion
- **Both pages** - Home page and detailed view (`/detaljer`)

### 🎯 Mock Data Includes:

- **Week 1**: Global Health lectures
- **Week 2**: Infectious Diseases
- **Week 3**: Child Health & Pediatrics
- **Realistic selection states** for all three users (Mattias, Albin, David)
- **Various time slots** and durations

### 🔧 Technical Details:

- **Local API**: `src/pages/api/functions/CRUDFLData.ts`
- **Auto-detected environment**: Development mode uses local API
- **Console logging**: Check browser console for API calls
- **No database required**: Everything runs in memory

### 🚀 Development Workflow:

1. Make changes to UI components
2. See changes instantly with hot reload
3. Test all functionality locally
4. Deploy when satisfied

### 📝 Notes:

- **Selection changes**: Persist only during the session (not saved to database)
- **Comments**: Mock responses for testing UI
- **Real data**: To connect to production database, update the API route with your MongoDB connection

## Switching to Production Data

To use real production data locally:

1. Update `src/pages/api/functions/CRUDFLData.ts`
2. Add your MongoDB connection string
3. Replace mock responses with actual database operations

This gives you the best of both worlds - fast local development with mock data, and the ability to connect to real data when needed!
