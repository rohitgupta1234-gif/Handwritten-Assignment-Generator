# AI Handwritten Assignment Generator

A full-stack application that generates personalized handwritten assignments using AI-powered handwriting synthesis. Students can upload their handwriting sample once, and the system creates assignments that look authentically handwritten by them.

## Features

### Core Features
- **Personalized Handwriting Profiles** - Upload one page of handwriting, AI analyzes 16+ characteristics
- **AI Answer Generation** - Enter questions, get accurate answers via LLM integration
- **Realistic Notebook Rendering** - Answers appear on ruled/plain/grid paper with proper margins
- **Automatic Page Management** - Long answers automatically flow across multiple pages
- **PDF & DOCX Export** - Download complete assignments as high-quality documents
- **Secure & Private** - Your handwriting data stays secure

### Handwriting Analysis (16 Characteristics)
1. Letter height and width
2. Capital and small letter dimensions
3. Character spacing
4. Word spacing
5. Line spacing
6. Writing angle and slant
7. Pen thickness
8. Natural handwriting variations
9. Baseline alignment
10. Paragraph spacing
11. Average words per line
12. Page margins (top, right, bottom, left)
13. Slant direction (left/right/vertical)
14. Pressure variation
15. Connectedness
16. Extracted handwriting samples

### Assignment Features
- Multiple question support (manual entry, paste, file upload)
- Subject and academic level selection
- Answer length selection (short/medium/detailed)
- Answer editing before handwriting conversion
- Live preview with zoom and page navigation
- Question layout options (continuous/new line/new page)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Zustand** for state management
- **Framer Motion** for animations
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Better-SQLite3** for database
- **JWT** for authentication
- **Multer** for file uploads
- **OpenAI API** for answer generation
- **Tesseract.js** for OCR
- **PDFKit** for PDF generation
- **docx** for Word document generation

## Project Structure

```
handwritten-assignment-generator/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # Base components (Button, Input, Modal, etc.)
│   │   │   └── layout/      # Layout components (Sidebar, Header)
│   │   ├── pages/           # Page components
│   │   ├── context/         # React contexts (Auth, Handwriting)
│   │   ├── hooks/           # Custom hooks
│   │   ├── utils/           # Utilities (API, helpers)
│   │   ├── types/           # TypeScript types
│   │   └── styles/          # Global styles
│   └── package.json
├── backend/                  # Express backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── services/        # Business logic
│   │   ├── models/          # Data models
│   │   ├── database/        # Database schema & queries
│   │   ├── utils/           # Utilities
│   │   └── config/          # Configuration
│   └── package.json
├── .env.example             # Environment variables template
├── package.json             # Root package.json
└── README.md
```

## Pages

1. **Landing Page** - Marketing page with features, testimonials, CTAs
2. **Login/Register** - Authentication with email/password and OAuth
3. **Student Dashboard** - Stats, recent assignments, quick actions
4. **Create Assignment** - Multi-step form (questions → settings → generate → preview)
5. **Handwriting Profile** - Upload, analyze, review, approve handwriting
6. **My Assignments** - List with filters, search, bulk actions
7. **Assignment Preview** - Page-by-page preview with zoom, edit, download
8. **Settings** - Profile, account, notifications, appearance, data, danger zone

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key (for answer generation)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd handwritten-assignment-generator
```

2. **Install all dependencies**
```bash
npm run install:all
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `OPENAI_API_KEY` - For AI answer generation
- `JWT_SECRET` - Secure random string (min 32 chars)
- `FRONTEND_URL` - Frontend URL (default: http://localhost:3000)

4. **Start development servers**
```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Handwriting Profiles
- `POST /api/handwriting/profiles` - Create profile (upload image)
- `GET /api/handwriting/profiles` - List user profiles
- `GET /api/handwriting/profiles/:id` - Get profile details
- `PUT /api/handwriting/profiles/:id` - Update profile
- `DELETE /api/handwriting/profiles/:id` - Delete profile
- `POST /api/handwriting/profiles/:id/analyze` - Trigger analysis

### Assignments
- `POST /api/assignments` - Create assignment
- `GET /api/assignments` - List assignments
- `GET /api/assignments/:id` - Get assignment
- `PUT /api/assignments/:id` - Update assignment
- `DELETE /api/assignments/:id` - Delete assignment
- `POST /api/assignments/:id/generate` - Generate answers
- `GET /api/assignments/:id/preview` - Get preview
- `GET /api/assignments/:id/pdf` - Download PDF
- `GET /api/assignments/:id/docx` - Download DOCX

### AI Services
- `POST /api/ai/generate-answer` - Generate single answer
- `POST /api/ai/generate-answers` - Generate multiple answers
- `POST /api/ai/ocr` - OCR on uploaded image
- `GET /api/ai/subjects` - Get subject list

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent` - Get recent assignments
- `GET /api/dashboard/activity` - Get activity log

## Database Schema

### Users
- id, email, password_hash, name, avatar_url, bio, institution, academic_level, created_at, updated_at

### Handwriting Profiles
- id, user_id, name, original_image_url, analyzed_image_url, characteristics (JSON), samples (JSON), status, is_active, created_at, updated_at

### Assignments
- id, user_id, title, subject, level, questions (JSON), answers (JSON), handwriting_profile_id, paper_style, page_size, settings (JSON), status, total_pages, pdf_url, docx_url, created_at, updated_at

### Questions
- id, assignment_id, text, type, subject, order_index, estimated_length, created_at

### Answers
- id, question_id, content, handwriting_content (JSON), length, is_edited, edited_content, generated_at

### Files
- id, user_id, original_name, stored_name, mime_type, size, url, purpose, created_at

### Activity Log
- id, user_id, type, title, description, metadata (JSON), created_at

### User Settings
- user_id, settings (JSON), updated_at

### Refresh Tokens
- id, user_id, token_hash, expires_at, created_at

## Known Limitations

1. **Handwriting Synthesis** - Currently uses font-based rendering with CSS transformations. True stroke-level synthesis requires integration with specialized ML models (e.g., GAN-based handwriting generation).

2. **OCR Accuracy** - Tesseract.js works best with clear, high-contrast images. Handwritten text recognition is limited.

3. **Answer Generation** - Requires OpenAI API key. Mock responses are used in development.

4. **PDF/DOCX Generation** - Current implementation uses html2canvas for PDF. For production, consider server-side rendering with Puppeteer or dedicated PDF libraries.

5. **File Storage** - Uses local filesystem. For production, integrate with S3 or similar cloud storage.

6. **Real-time Updates** - No WebSocket implementation yet. Polling or Server-Sent Events needed for real-time generation status.

7. **Handwriting Analysis** - Mock analysis returns fixed values. Real implementation needs computer vision pipeline.

## Future Enhancements

- [ ] True stroke-level handwriting synthesis (GAN/Transformer models)
- [ ] Real-time collaboration on assignments
- [ ] Mobile app (React Native)
- [ ] Teacher grading interface
- [ ] Assignment templates library
- [ ] Multi-language support
- [ ] Advanced OCR with handwriting recognition
- [ ] Cloud storage integration
- [ ] Webhook notifications
- [ ] Analytics dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub issue tracker.