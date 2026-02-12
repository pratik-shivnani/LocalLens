<p align="center">
  <img src="https://raw.githubusercontent.com/pratik-shivnani/LocalLens/main/frontend/public/logo.png" alt="LocalLens" width="120" height="120">
</p>

<h1 align="center">LocalLens</h1>

<p align="center">
  <strong>Your photos, your machine, your privacy.</strong>
</p>

LocalLens is a self-hosted, ML-powered photo and video organizer that runs entirely on your machine. No cloud uploads, no subscriptions, no privacy concerns — just intelligent organization of your personal media library with face recognition, natural language search, and automatic tagging.

![LocalLens](https://img.shields.io/badge/status-active-brightgreen) ![Python](https://img.shields.io/badge/python-3.11+-blue) ![React](https://img.shields.io/badge/react-18+-61dafb) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 🎨 Theming
- **Light/Dark Mode** - Toggle between light and dark themes
- **System Preference** - Automatically detects your OS theme preference
- **Persistent Choice** - Theme preference saved across sessions

### 📸 Gallery & Organization
- **Infinite Scroll Gallery** - Browse all your photos with smooth endless scrolling
- **Monthly Grouping** - Photos automatically organized by month with visual dividers
- **Media Filtering** - Filter by photos, videos, or view all
- **Tag Filtering** - Filter gallery by auto-generated tags

### 👥 People Recognition
- **Face Detection** - Automatically detect faces in photos using InsightFace
- **Face Clustering** - Group similar faces together using embedding similarity
- **Person Naming** - Name recognized people for easy identification
- **Face Thumbnails** - Cropped face thumbnails for each person
- **Person Photos** - View all photos containing a specific person

### � Albums
- **Create Albums** - Organize photos into custom albums/collections
- **Add to Album** - Add photos to albums directly from the photo viewer
- **Album Management** - Edit album names, delete albums with confirmation
- **Album View** - Browse photos within an album with full photo modal support
- **Remove from Album** - Remove individual photos from albums

### �🔍 Smart Search
- **Natural Language Search** - Find photos using plain English queries ("photos at the beach", "birthday cake")
- **AI-Powered** - Uses CLIP embeddings for semantic understanding
- **Fast Results** - ChromaDB vector database for quick similarity search

### 🏷️ Auto-Tagging
- **Scene Detection** - Automatically identify scenes (indoor, outdoor, nature, etc.)
- **Object Recognition** - Detect objects in photos
- **EXIF Extraction** - Extract camera info, date taken, GPS coordinates
- **Location Reverse Geocoding** - Convert GPS to city/country names

### 📥 Import & Processing
- **Folder Import** - Import from any local folder
- **Google Photos Takeout** - Import your Google Photos export
- **Background Processing** - Process photos in the background
- **Progress Tracking** - Real-time processing progress with speed stats
- **Thumbnail Generation** - Auto-generate thumbnails in multiple sizes

### 🎬 Video Support
- **Video Thumbnails** - Extract frames for video previews
- **Video Playback** - Play videos directly in the app
- **Video Metadata** - Duration, resolution, codec info

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy |
| **ML Models** | PyTorch, OpenCLIP, InsightFace |
| **Vector DB** | ChromaDB (embeddings storage) |
| **Database** | SQLite (metadata) |
| **Frontend** | React 18, TypeScript, TailwindCSS |
| **UI Components** | Lucide Icons, React Query |

## Quick Start

### Prerequisites

- Python 3.11+ (3.13 supported)
- Node.js 18+
- 8GB+ RAM recommended for ML models
- macOS (Apple Silicon), Linux, or Windows

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.main
```

The backend runs on `http://localhost:8000` with auto-reload enabled.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

### First Run

1. Start the backend server
2. Start the frontend dev server
3. Go to **Import** page and add a folder to scan
4. Click **Start Processing** to process photos
5. Browse your organized photos in the **Gallery**

## Pages & Features

### Gallery (`/`)
- Browse all photos with infinite scroll
- Photos grouped by month with visual dividers
- Filter by: All / Photos / Videos
- Filter by tags using dropdown
- Click any photo to view full-size with details

### Search (`/search`)
- Natural language semantic search
- Example queries provided for quick start
- Results ranked by relevance

### People (`/people`)
- View all detected people
- Click to see all photos of a person
- Edit icon to name/rename people
- Face thumbnails for easy identification

### Import (`/import`)
- Add folders to scan for photos
- View scanning progress
- Start/stop background processing
- See processing stats and speed

### Settings (`/settings`)
- View library statistics
- Processing configuration
- Storage information

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── db/              # Database models
│   │   ├── ml/              # ML pipelines (CLIP, InsightFace)
│   │   ├── services/        # Business logic
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── pages/           # Page views
│   │   └── lib/api.ts       # API client
│   └── package.json
└── data/                    # Local storage (gitignored)
```

## Configuration

Create a `.env` file in the backend directory:

```env
# Photo library path
PHOTOS_LIBRARY_PATH=/path/to/your/photos

# Storage paths
THUMBNAIL_PATH=./data/thumbnails
DATABASE_URL=sqlite:///./data/db/photos.db
CHROMA_PATH=./data/embeddings

# ML device (mps for Apple Silicon, cuda for NVIDIA, cpu for fallback)
DEVICE=mps

# Processing settings
BATCH_SIZE=32
SIMILARITY_THRESHOLD=0.6
```

## ML Models Used

| Model | Purpose | Size |
|-------|---------|------|
| **OpenCLIP ViT-B/32** | Image embeddings & search | ~400MB |
| **InsightFace buffalo_l** | Face detection & recognition | ~300MB |

Models are downloaded automatically on first run.

## Performance Tips

- **Apple Silicon**: Use `DEVICE=mps` for GPU acceleration
- **NVIDIA GPU**: Use `DEVICE=cuda` for faster processing
- **Large Libraries**: Process in batches, use SSD storage
- **Memory**: 16GB+ RAM recommended for large libraries

## Troubleshooting

### Port already in use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### Face detection not working
```bash
# Ensure InsightFace is installed
pip install insightface onnxruntime

# Queue photos for face processing
curl -X POST http://localhost:8000/api/processing/queue-faces
curl -X POST http://localhost:8000/api/processing/start-continuous
```

### Slow processing
- Check DEVICE setting matches your hardware
- Reduce BATCH_SIZE if running out of memory
- Use SSD for thumbnail storage

## License

MIT
