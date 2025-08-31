import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Meeting } from './components/Meeting';
import { LoginForm } from "./components/LoginForm";
import { SignupForm } from "./components/SignupForm";
import { Dashboard } from "./components/Dashboard";
import { PersonalizedTest } from "./components/PersonalizedTest";
import { Leaderboard } from "./components/Leaderboard";
import { TodoList } from "./components/TodoList";
import { TodosProvider } from "./hooks/TodosContext";
import { PastYearPapers } from "./components/PastYearPapers";
import { CalendarTimetable } from "./components/CalendarTimetable";
import { PeerLearning } from "./components/PeerLearning";
import { CreditsManager } from "./components/CreditsManager";
import { AITutor } from "./components/AITutor";
import { FeatureNavigation } from "./components/FeatureNavigation";
import { Notifications } from "./components/Notifications";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Coins, BookOpen, Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { supabase } from "./utils/supabase/client";
import { TutorSessions } from "./components/TutorSessions";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ProfileSettings from './components/ProfileSettings';

const CLIENT_ID = "946439376376220-ne6pkqb3calao32l104bjrplpikl68n8.apps.googleusercontent.com";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  credits: number;
  role: string;
  experience: number;
  level: number;
  total_earnings: number;
  streak: number;
  sessions_completed: number;
  weak_subjects: string[];
  preferred_learning_style: string;
}


function Layout({ user, onLogout, accessToken, onCreditsUpdate }: { user: User, onLogout: () => void, accessToken: string, onCreditsUpdate: (credits: number) => void }) {
  const location = useLocation();
  const pathToFeatureId: Record<string, string> = {
    '/dashboard': 'overview',
    '/ai-tutor-assistant': 'ai-tutor',
    '/personalized-test': 'personalized-test',
    '/past-papers': 'past-papers',
    '/tutor-sessions': 'tutor-sessions',
    '/leaderboard': 'leaderboard',
    '/peer-learning-groups': 'peer-groups',
    '/credits': 'credits',
    '/calendar-timetable': 'calendar',
    '/todo-list': 'todo-list',
    '/profile-settings': 'profile',
  };
  let pathname = location.pathname;
  if (pathname.startsWith('/meeting/')) pathname = '/meeting/:sessionId';
  const currentFeature = pathToFeatureId[pathname] || 'overview';
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1>TutorPlatform</h1>
              <FeatureNavigation
                onFeatureSelect={() => { }}
                currentFeature={currentFeature}
                userCredits={user?.credits || 0}
                userRole={user?.role || "student"}
              />
            </div>
            <div className="flex items-center space-x-4">
              <Notifications />
              <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 rounded-full">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">{user?.credits || 0}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.first_name?.[0]}{user?.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm">{user?.first_name} {user?.last_name}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {user?.role}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Level {user?.level}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { }}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ onCreditsUpdate }} />
      </main>
    </div>
  );
}

function AppRoutes() {
  type AuthView = 'login' | 'signup' | 'dashboard' | 'loading';
  const [currentView, setCurrentView] = useState<AuthView>('loading');
  const [user, setUser] = useState<User | null>(null);
  // This function will be passed to all children and header for instant credit updates
  const handleCreditsUpdate = (newCredits: number) => {
    setUser(prev => prev ? { ...prev, credits: newCredits } : prev);
  };
  const [accessToken, setAccessToken] = useState<string>('');
  const [routerKey, setRouterKey] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const fetchUserProfile = async (accessToken: string) => {
    // Get the real user from Supabase Auth
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      toast.error('Failed to fetch user profile.');
      setUser(null);
      setCurrentView('login');
      return;
    }
    // Fetch additional profile info from your DB if needed
    const { data: profileData } = await supabase
      .from('student_information')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();
    if (!profileData) {
      toast.error('No profile found for this user. Please complete your profile setup.');
      setUser({
        id: data.user.id,
        first_name: '',
        last_name: '',
        email: data.user.email || '',
        credits: 0,
        role: 'student',
        experience: 0,
        level: 1,
        total_earnings: 0,
        streak: 0,
        sessions_completed: 0,
        weak_subjects: [],
        preferred_learning_style: ''
      });
      setCurrentView('dashboard');
      return;
    }
    setUser({
      id: data.user.id, // UUID from Supabase Auth
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      email: data.user.email || '',
      credits: profileData.credits || 0,
      role: profileData.role || 'student',
      experience: profileData.experience || 0,
      level: profileData.level || 1,
      total_earnings: profileData.total_earnings || 0,
      streak: profileData.streak || 0,
      sessions_completed: profileData.sessions_completed || 0,
      weak_subjects: profileData.weak_subjects || [],
      preferred_learning_style: profileData.preferred_learning_style || ''
    });
    setCurrentView('dashboard');
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(`Login failed: ${error.message}`);
        setIsLoggingIn(false);
        return;
      }
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
        await fetchUserProfile(data.session.access_token);
        toast.success('Welcome back! Successfully logged in.');
        setRouterKey(prev => prev + 1);
        setIsLoggingIn(false);
        navigate('/dashboard');
      } else {
        toast.error('Login failed: No access token returned.');
        setIsLoggingIn(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred during login.');
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    qualifications?: string[];
    subjects?: string[];
    role: string;
  }) => {
    try {
      if (userData.role === 'student') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              display_name: `${userData.firstName} ${userData.lastName}`,
              first_name: userData.firstName,
              last_name: userData.lastName,
              role: 'student'
            }
          }
        });
        if (authError) {
          toast.error(`Signup failed: ${authError.message}`);
          return;
        }
        const userId = data?.user?.id;
        if (!userId) {
          toast.error('No user id returned from Auth signup.');
          return;
        }
        await supabase.from('student_information').insert([
          { id: userId, first_name: userData.firstName, last_name: userData.lastName, email: userData.email, credits: 0, role: 'student', experience: 0, level: 1, total_earnings: 0, streak: 0, sessions_completed: 0, weak_subjects: [], preferred_learning_style: '' }
        ]);
        toast.success('Student account created! Please sign in.');
        setCurrentView('login');
        navigate('/login');
      } else if (userData.role === 'tutor') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              display_name: `${userData.firstName} ${userData.lastName}`,
              first_name: userData.firstName,
              last_name: userData.lastName,
              role: 'tutor',
              subjects: userData.subjects || [],
              qualifications: userData.qualifications || []
            }
          }
        });
        if (authError) {
          toast.error(`Signup failed: ${authError.message}`);
          return;
        }
        const tutorId = data?.user?.id;
        if (!tutorId) {
          toast.error('No user id returned from Auth signup.');
          return;
        }
        await supabase.from('tutor_information').insert([
          {
            id: tutorId,
            first_name: userData.firstName,
            last_name: userData.lastName,
            email: userData.email,
            role: 'tutor',
            rating: 0.0,
            total_sessions: 0,
            subjects: userData.subjects || [],
            qualifications: userData.qualifications || [],
            is_favorite: false,
            is_online: false,
            credits_earned: 0,
            is_verified: true
          }
        ]);
        toast.success('Tutor account created! Please sign in.');
        setCurrentView('login');
        navigate('/login');
      }
    } catch (error) {
      toast.error('An unexpected error occurred during signup.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAccessToken('');
      setCurrentView('login');
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch (error) {
      toast.error('Error logging out.');
    }
  };

  const switchToSignup = () => {
    navigate('/signup');
  };

  const switchToLogin = () => {
    setCurrentView('login');
    navigate('/login');
  };

  return (
    <>
      <Toaster />
      {isLoggingIn ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <span className="text-lg text-gray-600">Logging in...</span>
        </div>
      ) : (
        <TodosProvider userId={user?.id ?? ''}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              accessToken
                ? <Navigate to="/dashboard" />
                : <LoginForm onLogin={handleLogin} onSwitchToSignup={switchToSignup} />
            } />
            <Route path="/signup" element={
              accessToken
                ? <Navigate to="/dashboard" />
                : <SignupForm onSignup={handleSignup} onSwitchToLogin={switchToLogin} />
            } />

            {/* Protected routes with persistent header/banner */}
            {accessToken && user ? (
              <Route element={<Layout user={user} onLogout={handleLogout} accessToken={accessToken} onCreditsUpdate={handleCreditsUpdate} />}>
                <Route path="/dashboard" element={<Dashboard onLogout={handleLogout} accessToken={accessToken} />} />
                <Route path="/ai-tutor-assistant" element={<AITutor user={user!} accessToken={accessToken} onCreditsUpdate={handleCreditsUpdate} />} />
                <Route path="/personalized-test" element={<PersonalizedTest user={user!} accessToken={accessToken} />} />
                <Route path="/leaderboard" element={<Leaderboard user={user!} accessToken={accessToken} />} />
                <Route path="/todo-list" element={<TodoList user={user!} />} />
                <Route path="/past-papers" element={<PastYearPapers user={user!} accessToken={accessToken} />} />
                <Route path="/calendar-timetable" element={<CalendarTimetable user={user!} />} />
                <Route path="/peer-learning-groups" element={<PeerLearning user={user!} accessToken={accessToken} />} />
                <Route path="/credits" element={<CreditsManager user={user!} accessToken={accessToken} onCreditsUpdate={handleCreditsUpdate} />} />
                <Route path="/meeting/:sessionId" element={<Meeting user={user || {
                  id: '',
                  first_name: '',
                  last_name: '',
                  email: '',
                  credits: 0,
                  role: '',
                  experience: 0,
                  level: 0,
                  total_earnings: 0,
                  streak: 0,
                  sessions_completed: 0,
                  weak_subjects: [],
                  preferred_learning_style: ''
                }} />} />
                <Route path="/tutor-sessions" element={<TutorSessions user={user!} accessToken={accessToken} />} />
              </Route>
            ) : (
              <Route element={<Navigate to="/login" />} />
            )}
            <Route
              path="/profile-settings"
              element={
                accessToken && user ? (
                  <ProfileSettings
                    user={{
                      id: user.id,
                      email: user.email,
                      firstName: user.first_name,
                      lastName: user.last_name,
                      role: user.role,
                      level: user.level,
                      streak: user.streak,
                      preferredLearningStyle: user.preferred_learning_style,
                    }}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            {/* Catch-all route */}
            <Route path="/*" element={<Navigate to={accessToken ? '/dashboard' : '/login'} />} />
          </Routes>
        </TodosProvider>
      )}
    </>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Router>
        <AppRoutes />
      </Router>
    </GoogleOAuthProvider>
  );
}