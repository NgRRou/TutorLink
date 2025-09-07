import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Meeting } from './components/Meeting';
import { LoginForm } from "./components/LoginForm";
import { SignupForm } from "./components/SignupForm";
import { Dashboard } from "./components/Dashboard";
import { PersonalizedTest } from "./components/PersonalizedTest";
import { Leaderboard } from "./components/Leaderboard";
import { TodoList } from "./components/TodoList";
import ProfileSettings from "./components/ProfileSettings";
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
import TutorCreditsManager from "./components/TutorCreditsManager";

const CLIENT_ID = "946439376220-ne6pkqb3calao32l104bjrplpikl68n8.apps.googleusercontent.com";

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
  const navigate = useNavigate();
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
    '/tutor-credits': 'tutor-credits', // <-- Add this line
  };
  let pathname = location.pathname;
  if (pathname.startsWith('/meeting/')) pathname = '/meeting/:sessionId';
  const currentFeature = pathToFeatureId[pathname] || 'overview';

  const [headerCredits, setHeaderCredits] = React.useState(user?.credits || 0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    async function fetchCredits() {
      if (!user?.id) return;
      if (user.role === 'tutor') {
        const { data, error } = await supabase
          .from('tutor_information')
          .select('credits_earned')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data && typeof data.credits_earned === 'number') {
          setHeaderCredits(data.credits_earned);
        }
      } else {
        const { data, error } = await supabase
          .from('student_information')
          .select('credits')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data && typeof data.credits === 'number') {
          setHeaderCredits(data.credits);
        }
      }
    }
    fetchCredits();
    interval = setInterval(fetchCredits, 2000);
    return () => clearInterval(interval);
  }, [user?.id, user?.role]);

  const handleCreditsUpdate = (credits: number) => {
    setHeaderCredits(credits);
    onCreditsUpdate(credits);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1>TutorLink</h1>
              <FeatureNavigation
                onFeatureSelect={() => { }}
                currentFeature={currentFeature}
                userCredits={headerCredits}
                userRole={user?.role || "student"}
              />
            </div>
            <div className="flex items-center space-x-4">
              <Notifications />
              <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 rounded-full">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">{headerCredits}</span>
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
                onClick={() => navigate('/profile-settings')}
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
        <Outlet context={{ onCreditsUpdate: handleCreditsUpdate }} />
      </main>
    </div>
  );
}

function AppRoutes() {
  type AuthView = 'login' | 'signup' | 'dashboard' | 'loading';
  const [currentView, setCurrentView] = useState<AuthView>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'tutor') return;

    const markOnline = async () => {
      await supabase.from('tutor_information').update({ is_online: true }).eq('id', user.id);
    };

    markOnline();
    const interval = setInterval(markOnline, 30000);

    const handleUnload = () => {
      const url = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/tutor_information?id=eq.${user.id}`;
      navigator.sendBeacon(url, JSON.stringify({ is_online: false }));
    };
    window.addEventListener('unload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('unload', handleUnload);
    };
  }, [user]);

  const handleCreditsUpdate = (newCredits: number) => {
    setUser(prev => prev ? { ...prev, credits: newCredits } : prev);
  };
  const [accessToken, setAccessToken] = useState<string>('');
  const [routerKey, setRouterKey] = useState(0);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const fetchUserProfile = async (accessToken: string) => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      toast.error('Failed to fetch user profile.');
      setUser(null);
      setCurrentView('login');
      return;
    }

    const userId = authData.user.id;

    const { data: studentData } = await supabase
      .from('student_information')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (studentData) {
      setUser({
        id: userId,
        first_name: studentData.first_name || '',
        last_name: studentData.last_name || '',
        email: authData.user.email || '',
        credits: studentData.credits || 0,
        role: 'student',
        experience: studentData.experience || 0,
        level: studentData.level || 1,
        total_earnings: studentData.total_earnings || 0,
        streak: studentData.streak || 0,
        sessions_completed: studentData.sessions_completed || 0,
        weak_subjects: studentData.weak_subjects || [],
        preferred_learning_style: studentData.preferred_learning_style || ''
      });
      setCurrentView('dashboard');
      return;
    }

    const { data: tutorData } = await supabase
      .from('tutor_information')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (tutorData) {
      const userId = authData.user.id;
      supabase
        .from('tutor_information')
        .update({ is_online: true })
        .eq('id', userId);

      setUser({
        id: userId,
        first_name: tutorData.first_name || '',
        last_name: tutorData.last_name || '',
        email: authData.user.email || '',
        credits: tutorData.credits_earned || 0,
        role: 'tutor',
        experience: tutorData.total_sessions || 0,
        level: 1,
        total_earnings: tutorData.total_earnings || 0,
        streak: 0,
        sessions_completed: tutorData.total_sessions || 0,
        weak_subjects: [],
        preferred_learning_style: ''
      });

      setCurrentView('dashboard');
      return;
    }

    toast.error('No profile found for this user. Please complete your profile setup.');
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
    role: string;
    documents?: File[];
    subjects?: string[];
    qualification?: string;
  }) => {
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            display_name: `${userData.firstName} ${userData.lastName}`,
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: userData.role
          }
        }
      });

      if (authError) {
        toast.error(`Signup failed: ${authError.message}`);
        return;
      }

      const userId = data?.user?.id;
      if (!userId) {
        toast.error('No user ID returned from Auth signup.');
        return;
      }

      const qualificationRates: Record<string, number> = {
        primary: 10,
        high: 15,
        bachelor: 20,
        master: 25,
        phd: 30
      };

      const { data: profile, error: insertError } = await supabase
        .from(userData.role === 'student' ? 'student_information' : 'tutor_information')
        .insert([
          userData.role === 'student'
            ? {
              id: userId,
              first_name: userData.firstName,
              last_name: userData.lastName,
              email: userData.email,
              credits: 0,
              role: 'student',
              experience: 0,
              level: 1,
              streak: 0,
              sessions_completed: 0,
              weak_subjects: [],
              preferred_learning_style: ''
            }
            : {
              id: userId,
              first_name: userData.firstName,
              last_name: userData.lastName,
              email: userData.email,
              role: 'tutor',
              rating: 0,
              total_sessions: 0,
              subjects: userData.subjects || [],
              qualification: userData.qualification || '',
              is_online: false,
              credits_earned: 0,
              is_verified: true
            }
        ]);

      if (insertError) {
        toast.error(`Failed to create profile: ${insertError.message}`);
        return;
      }

      toast.success('Account created! Please sign in.');
      navigate('/login');

    } catch (error) {
      toast.error('An unexpected error occurred during signup.');
    }
  };

  const handleLogout = async () => {
    if (user?.role === 'tutor') {
      await supabase
        .from('tutor_information')
        .update({ is_online: false })
        .eq('id', user.id);
    }

    await supabase.auth.signOut();
    setUser(null);
    setAccessToken('');
    setCurrentView('login');
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const switchToSignup = () => {
    navigate('/signup');
  };

  const switchToLogin = () => {
    setCurrentView('login');
    navigate('/login');
  };

  useEffect(() => {
    const setOffline = async () => {
      if (user?.role === 'tutor') {
        await supabase
          .from('tutor_information')
          .update({ is_online: false })
          .eq('id', user.id);
      }
    };

    window.addEventListener('beforeunload', setOffline);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') setOffline();
    });

    return () => {
      window.removeEventListener('beforeunload', setOffline);
      window.removeEventListener('visibilitychange', setOffline);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    const updateLoginStreak = async (userId: string) => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("student_information")
          .select("streak, last_login")
          .eq("id", userId)
          .single();

        if (error || !data) return;

        const lastLoginStr = data.last_login ? data.last_login.split("T")[0] : null;
        let newStreak = data.streak || 0;

        if (!lastLoginStr) {
          newStreak = 1;
        } else if (lastLoginStr === todayStr) {
          return;
        } else {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          newStreak = (lastLoginStr === yesterdayStr) ? newStreak + 1 : 1;
        }

        await supabase
          .from("student_information")
          .update({ streak: newStreak, last_login: today.toISOString() })
          .eq("id", userId);

      } catch (err) {
        console.error("Error updating login streak:", err);
      }
    };

    if (user?.id && user.role === "student") {
      updateLoginStreak(user.id);
    }
  }, [user?.id, user?.role]);

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
                <Route path="/leaderboard" element={
                  <Leaderboard
                    user={user!}
                    accessToken={accessToken}
                    onCreditsUpdate={handleCreditsUpdate}
                  />
                } />
                <Route path="/todo-list" element={<TodoList user={user!} />} />
                <Route path="/past-papers" element={<PastYearPapers user={user!} accessToken={accessToken} />} />
                <Route path="/calendar-timetable" element={<CalendarTimetable user={user!} />} />
                <Route path="/peer-learning-groups" element={<PeerLearning user={user!} accessToken={accessToken} />} />
                <Route path="/credits" element={<CreditsManager user={user!} accessToken={accessToken} onCreditsUpdate={handleCreditsUpdate} />} />
                <Route
                  path="/profile-settings"
                  element={
                    <ProfileSettings
                      user={{
                        id: user!.id,
                        email: user!.email,
                        firstName: user!.first_name,
                        lastName: user!.last_name,
                        role: user!.role,
                        level: user!.level,
                        streak: user!.streak,
                        preferredLearningStyle: user!.preferred_learning_style
                      }}
                    />
                  }
                />
                <Route path="/meeting" element={<Meeting user={user!} />} />
                <Route path="/tutor-sessions" element={<TutorSessions user={user!} accessToken={accessToken} />} />
                <Route
                  path="/tutor-credits"
                  element={
                    <TutorCreditsManager
                      user={{
                        id: user!.id,
                        email: user!.email,
                        firstName: user!.first_name,
                        lastName: user!.last_name,
                        role: user!.role,
                        level: user!.level,
                      }}
                    />
                  }
                />
              </Route>
            ) : (
              <Route element={<Navigate to="/login" />} />
            )}

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