# Tutoring App

## Project Background & Competition

**Tutoring for Students (Website/Mobile Application)**

Many students struggle with academic challenges, including difficulty understanding course material, limited access to personalized help, and inefficient study habits.

**The Problem:**
Traditional tutoring services are often expensive, inconvenient, or unavailable outside of fixed hours, leaving students without adequate support when they need it most. This gap hinders academic performance, increases stress, and discourages independent learning.

**Our Solution:**
Develop a tutoring platform that provides on-demand, affordable, and personalized academic assistance. The platform connects students with qualified tutors (including peer tutors), offers interactive learning tools, and provides access to curated study resources. By making tutoring more accessible and effective, this solution enhances learning outcomes, boosts student confidence, and promotes academic success for students of all levels.

**Key Features:**
- Real-time tutoring sessions
- Progress tracking
- AI-driven recommendations
- Collaborative study aids

Technologies used may include React Native or Flutter for mobile app development, Firebase or Supabase for backend services and real-time updates, OpenAI’s API for intelligent tutor matching and content suggestions, and WebRTC for live video tutoring.

---

**Codenection2025:**
This project is being developed by our team for the Codenection2025 competition. We are excited to build an innovative solution to empower students and improve academic outcomes!

A modern AI-powered tutoring platform built with React, Vite, Supabase, and Gemini AI.

## Features
- User authentication and session management
- AI Tutor powered by Gemini (Google Generative Language API)
- File upload and document analysis (PDF, images, text)
- Subject and difficulty selection
- Credit-based question system, personalized tests, review mistakes
- Peer tutoring and instant help requests
- Credit transfer and cash redemption system
- Human tutor escalation for complex questions
- Leaderboard, calendar, notifications, and more

## Tech Stack
- **Frontend:** React (TypeScript), Vite, custom UI components, Sonner (toast notifications), Lucide React icons
- **Backend/Services:** Supabase (auth, database, storage, serverless functions), Gemini AI (Google Generative Language API)
- **Other:** Node.js, dotenv, Git

## Getting Started
1. Clone the repository:
	```bash
	git clone https://github.com/Yongqi0327/tutoring-app.git
	cd tutoring-app
	```
2. Install dependencies:
	```bash
	npm install
	```
3. Create a `.env` file in the project root and add your Supabase and Gemini API keys:
	```env
	VITE_SUPABASE_URL=your-supabase-url
	VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
	VITE_GEMINI_API_KEY=your-gemini-api-key
	```
4. Start the development server:
	```bash
	npm run dev
	```

## Usage
- Sign up or log in to access the dashboard.
- Use the AI Tutor to ask questions or upload study materials.
- Earn experience and credits for each session.
- Escalate to a human tutor for complex questions.

## Project Structure
```
Tutoring_app/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── styles/
│   ├── utils/
│   └── supabase/
├── .env
├── .gitignore
├── index.html
├── package.json
├── README.md
└── vite.config.ts
```

## License
MIT

## Team & Contributions

This project was developed with the assistance of AI-powered coding tools, combined with team collaboration.

- **Chang Yong Qi** – Project setup, AI-assisted coding, integration, documentation.  
- **Ng Rou Rou** – Feature refinement, debugging, and testing.  
- **Khor Chek Lin** – UI/UX improvements, deployment, and presentation prep.  
