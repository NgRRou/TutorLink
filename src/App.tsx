import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Meeting } from './components/Meeting';
import { LoginForm } from "./components/LoginForm";
import { SignupForm } from "./components/SignupForm";
import { Dashboard } from "./components/Dashboard";
import { LoadingScreen } from "./components/LoadingScreen";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { supabase } from "./utils/supabase/client";
import { projectId, publicAnonKey } from './utils/supabase/info';
import { TutorSessions } from "./components/TutorSessions";
import { GoogleOAuthProvider } from "@react-oauth/google";
import rateLimit from 'express-rate-limit';
import express from 'express';

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

type AuthView = 'login' | 'signup' | 'dashboard' | 'loading';


function AppRoutes() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AuthView>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [routerKey, setRouterKey] = useState(0);

  // Always check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        await fetchUserProfile(session.access_token);
      }
    };
    checkExistingSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        await fetchUserProfile(session.access_token);
      } else {
        setCurrentView('login');
      }
    } catch (error) {
      console.error('Session check error:', error);
      setCurrentView('login');
    }
  };

  const checkServerHealth = async (accessToken: string) => {
    if (!accessToken) return false;
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0e871cde/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Server health check passed:', data);
        return true;
      } else {
        console.log('Server health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.log('Server health check error:', error);
      return false;
    }
  };

  const fetchUserProfile = async (accessToken: string) => {
    console.log('Attempting to fetch user profile...');
    const serverHealthy = await checkServerHealth(accessToken);
    console.log('Server health status:', serverHealthy);
    if (!serverHealthy) {
      console.log('Server unhealthy, skipping to fallback profile');
      toast.warning('Server temporarily unavailable, using offline mode...');
      await createFallbackProfile(accessToken);
      return;
    }
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0e871cde/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Profile fetch response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Profile data received:', data);
        const userProfile = {
          id: data.user.id || '',
          first_name: data.user.first_name || 'User',
          last_name: data.user.last_name || '',
          email: data.user.email || '',
          credits: data.user.credits ?? 0,
          role: data.user.role || 'student',
          experience: data.user.experience ?? 0,
          level: data.user.level ?? 1,
          total_earnings: data.user.total_earnings ?? 0,
          streak: data.user.streak ?? 0,
          sessions_completed: data.user.sessions_completed ?? 0,
          weak_subjects: data.user.weak_subjects ?? [],
          preferred_learning_style: data.user.preferred_learning_style ?? ''
        };
        console.log('Profile loaded successfully:', userProfile);
        setUser(userProfile);
        setCurrentView('dashboard');
        toast.success('Profile loaded successfully');
      } else {
        const errorData = await response.json();
        console.error('Profile fetch error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        toast.warning('Server profile unavailable, using temporary profile...');
        await createFallbackProfile(accessToken);
      }
    } catch (error) {
      console.error('Profile fetch network error:', error);
      toast.warning('Network error, creating temporary profile...');
      await createFallbackProfile(accessToken);
    }
  };

  const createFallbackProfile = async (accessToken: string) => {
    console.log('Creating fallback profile...');
    try {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);
      if (error) {
        console.error('Error getting user for fallback:', error);
        throw error;
      }
      if (user) {
        console.log('User data for fallback profile:', {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata
        });
        const fallbackProfile = {
          id: user.id || '',
          first_name: user.user_metadata?.first_name || 'User',
          last_name: user.user_metadata?.last_name || '',
          email: user.email || '',
          credits: 100,
          role: user.user_metadata?.role || 'student',
          experience: 0,
          level: 1,
          total_earnings: 0,
          streak: 0,
          sessions_completed: 0,
          weak_subjects: [],
          preferred_learning_style: ''
        };
        console.log('Fallback profile created:', fallbackProfile);
        setUser(fallbackProfile);
        setCurrentView('dashboard');
        toast.success('Welcome! Using temporary profile while server reconnects.');
      } else {
        console.error('No user data available for fallback');
        toast.error('Authentication failed. Please try logging in again.');
        await supabase.auth.signOut();
        setCurrentView('login');
      }
    } catch (fallbackError) {
      console.error('Fallback profile creation error:', fallbackError);
      toast.error('Unable to access your account. Please try logging in again.');
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
      setCurrentView('login');
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const handleLogin = async (email: string, password: string) => {
    setIsLoggingIn(true);
    console.log('Login attempt:', { email, password });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('Login response:', { data, error });
      if (error) {
        toast.error(`Login failed: ${error.message}`);
        setIsLoggingIn(false);
        return;
      }
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
        await fetchUserProfile(data.session.access_token);
        const { data: userData } = await supabase.auth.getUser(data.session.access_token);
        if (userData?.user?.user_metadata?.role === 'tutor') {
          await supabase.from('tutor_information').update({ is_verified: true }).eq('id', userData.user.id);
        }
        toast.success('Welcome back! Successfully logged in.');
        setRouterKey(prev => prev + 1);
        setIsLoggingIn(false);
      } else {
        toast.error('Login failed: No access token returned.');
        setIsLoggingIn(false);
      }
    } catch (error) {
      console.error('Login error:', error);
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
    qualifications?: string[];
    subjects?: string[];
  }) => {
    try {
      if (userData.role === 'student') {
        // Student signup: create user in Auth, then insert into student_information
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
          console.error('Signup error:', authError);
          return;
        }
        const userId = data?.user?.id;
        if (!userId) {
          toast.error('No user id returned from Auth signup. Cannot insert into student_information.');
          return;
        }
        // Insert into student_information using Auth user id
        const { error: insertError } = await supabase.from('student_information').insert([
          { id: userId, first_name: userData.firstName, last_name: userData.lastName, email: userData.email, credits: 0, role: 'student', experience: 0, level: 1, total_earnings: 0, streak: 0, weak_subjects: [], preferred_learning_style: '' }
        ]);
        if (insertError) {
          toast.error(`Failed to insert into student_information: ${insertError.message}`);
          return;
        }
        toast.success('Student account created! Please sign in.');
        setCurrentView('login');
        navigate('/login');
      } else if (userData.role === 'tutor') {
        // Tutor signup: create user in Auth, then insert into tutor_information
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
        // Insert into tutor_information table
        const { error: insertError } = await supabase.from('tutor_information').insert([
          {
            id: tutorId,
            first_name: userData.firstName,
            last_name: userData.lastName,
            email: userData.email,
            password: userData.password,
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
        if (insertError) {
          toast.error(`Failed to insert into tutor_information: ${insertError.message}`);
          return;
        }
        toast.success('Tutor account created! Please sign in.');
        setCurrentView('login');
        navigate('/login');
      }
    } catch (error) {
      console.error('Signup error:', error);
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
      console.error('Logout error:', error);
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
        <Routes>
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
          <Route path="/dashboard" element={accessToken ? <Dashboard onLogout={handleLogout} accessToken={accessToken} /> : <Navigate to="/login" />} />
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
          <Route path="/*" element={<Navigate to={accessToken ? '/dashboard' : '/login'} />} />
        </Routes>
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