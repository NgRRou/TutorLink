import React, { useState, useEffect, useRef } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";
import { supabase } from '../utils/supabase/client';
import {
  Video,
  Calendar,
  Clock,
  Star,
  Heart,
  Users,
  Search,
  Filter,
  BookOpen,
  Zap,
  AlertTriangle,
  MapPin,
  Award,
  CheckCircle,
  Play
} from "lucide-react";
import { TutorDashboard } from './TutorDashboard';
import { InstantHelpWidget } from './InstantHelpWidget';
import { useNavigate } from 'react-router-dom';

async function uploadVerificationDocument(file: File, tutorId: string, supabase: any) {
  const filePath = `${tutorId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('tutor-docs').upload(filePath, file, { upsert: true });
  if (uploadError) {
    throw new Error('Upload failed: ' + uploadError.message);
  }
  const { data: urlData } = supabase.storage.from('tutor-docs').getPublicUrl(filePath);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error('Could not get public URL');
  const { error: updateError } = await supabase
    .from('tutor_information')
    .update({ verified_document: publicUrl })
    .eq('id', tutorId);
  if (updateError) {
    throw new Error('DB update failed: ' + updateError.message);
  }
  return publicUrl;
}

async function fetchSessions(studentId: string) {
  const { data, error } = await supabase
    .from('tutor_sessions')
    .select('*')
    .eq('student_id', studentId)
    .neq('status', 'pending')            // { changed code }
    .order('date', { ascending: false })
    .order('time', { ascending: false });

  if (error) {
    toast.error('Failed to fetch sessions: ' + error.message);
    return [];
  }
  return data;
}

let demoTutorId: string | undefined;
import { supabase as supabaseClient } from '../utils/supabase/client';

interface Tutor {
  id: string;
  name: string;
  avatar?: string;
  rating: number;
  totalSessions: number;
  subjects: string[];
  availability: {
    day: string;
    times: string[];
  }[];
  isFavorite: boolean;
  isOnline: boolean;
  qualifications: string;
  verified_document?: string;
  credits_earned: number; // Use this instead of hourlyRate
}

interface Session {
  id: string;
  tutorId: string;
  tutorName: string;
  subject: string;
  difficulty: string;
  date: string;
  time: string;
  duration: number;
  credits_required: number; // Replace cost with credits_required
  status: 'scheduled' | 'completed' | 'cancelled' | 'ongoing';
  type: 'instant' | 'booked';
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  credits: number;
  role: string;
}

interface TutorSessionsProps {
  user: User;
  accessToken: string;
}

export function TutorSessions({ user, accessToken }: TutorSessionsProps) {
  const navigate = useNavigate();
  // Check if the user is a tutor
  if (user.role === 'tutor') {
    return (
      <TutorDashboard
        user={{
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          credits: user.credits,
          role: user.role,
        }}
        accessToken={accessToken}
      />
    );
  }

  // Thank you dialog state
  const [showThankYou, setShowThankYou] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [lastSession, setLastSession] = useState<Session | null>(null);
  const [selectedTab, setSelectedTab] = useState('browse');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [studentTimetable, setStudentTimetable] = useState<any[]>([]);
  const [conflictCheck, setConflictCheck] = useState<{ [key: string]: boolean }>({});
  // Track selected subject for each tutor
  const [selectedTutorSubjects, setSelectedTutorSubjects] = useState<{ [tutorId: string]: string }>({});
  // Booking confirmation state
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [lastBooked, setLastBooked] = useState<{ tutorId: string; day: string; time: string } | null>(null);
  const openDialogButtonRef = useRef<HTMLButtonElement>(null);
  // State for Instant Help Widget
  const [showInstantHelpWidget, setShowInstantHelpWidget] = useState(false);
  // Now tutors is defined, so demoTutorId can be set
  demoTutorId = tutors[0]?.id;

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics'
  ];

  const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  const mockTimetable = [
    { day: 'Monday', time: '09:00', subject: 'Chemistry Class' },
    { day: 'Monday', time: '14:00', subject: 'Math Study Group' },
    { day: 'Tuesday', time: '10:00', subject: 'Physics Lab' },
    { day: 'Wednesday', time: '15:00', subject: 'English Literature' }
  ];

  const formatTime = (time: string) => time.slice(0, 5); // "14:00:00" -> "14:00"

  // useEffect(() => {
  //   const fetchTutors = async () => {
  //     const { data, error } = await supabase.from('tutor_information').select('*');
  //     if (error || !data || data.length === 0) {
  //       // Fallback to mock tutors if fetch fails
  //       const mockTutors: Tutor[] = [
  //         {
  //           id: 'b1a7e2c0-1f2b-4e3a-9c1d-1234567890ab',
  //           name: 'Sarah Johnson',
  //           rating: 4.9,
  //           totalSessions: 247,
  //           subjects: ['Mathematics', 'Physics'],
  //           hourlyRate: 15,
  //           availability: [
  //             { day: 'Monday', times: ['09:00', '10:00', '14:00', '15:00'] },
  //             { day: 'Tuesday', times: ['09:00', '11:00', '16:00'] },
  //             { day: 'Wednesday', times: ['10:00', '14:00', '15:00', '16:00'] }
  //           ],
  //           isFavorite: true,
  //           isOnline: true,
  //           bio: 'Experienced Mathematics tutor with 5+ years of teaching experience.',
  //           qualifications: ['M.Sc Mathematics', 'Teaching Certificate', 'PhD candidate'],
  //           verified_document: ''
  //         },
  //         {
  //           id: 'c2b8f3d1-2e3c-5f4b-8d2e-2345678901bc',
  //           name: 'Dr. Michael Brown',
  //           rating: 4.8,
  //           totalSessions: 189,
  //           subjects: ['Physics', 'Chemistry'],
  //           hourlyRate: 20,
  //           availability: [
  //             { day: 'Monday', times: ['11:00', '15:00', '16:00'] },
  //             { day: 'Thursday', times: ['09:00', '10:00', '14:00'] },
  //             { day: 'Friday', times: ['13:00', '14:00', '15:00'] }
  //           ],
  //           isFavorite: false,
  //           isOnline: true,
  //           bio: 'PhD in Physics with specialization in quantum mechanics and thermodynamics.',
  //           qualifications: ['PhD Physics', '10+ years experience', 'Research publications'],
  //           verified_document: ''
  //         },
  //         {
  //           id: 'd3c9a4e2-3f4d-6a5c-9e3f-3456789012cd',
  //           name: 'Emma Davis',
  //           rating: 4.7,
  //           totalSessions: 156,
  //           subjects: ['English', 'History'],
  //           hourlyRate: 12,
  //           availability: [
  //             { day: 'Tuesday', times: ['10:00', '11:00', '15:00'] },
  //             { day: 'Wednesday', times: ['09:00', '13:00', '16:00'] },
  //             { day: 'Saturday', times: ['10:00', '11:00', '14:00'] }
  //           ],
  //           isFavorite: true,
  //           isOnline: false,
  //           bio: 'Literature enthusiast with expertise in creative writing and essay composition.',
  //           qualifications: ['B.A English Literature', 'TEFL Certified', '3 years experience'],
  //           verified_document: ''
  //         }
  //       ];
  //       setTutors(mockTutors);
  //     } else {
  //       // Map Supabase data to match Tutor interface
  //       const mappedTutors = data.map(t => ({
  //         id: t.id,
  //         name: t.name || `${t.first_name} ${t.last_name}`,
  //         rating: t.rating || 4.0,
  //         totalSessions: t.total_sessions || 0,
  //         subjects: t.subjects || ['General'],
  //         hourlyRate: t.hourly_rate || 10,
  //         availability: t.availability || [],
  //         isFavorite: t.is_favorite || false,
  //         isOnline: t.is_online || false,
  //         bio: t.bio || '',
  //         qualifications: t.qualifications || [],
  //         verified_document: t.verified_document || ''
  //       }));
  //       setTutors(mappedTutors);
  //     }
  //   };
  //   fetchTutors();

  //   setStudentTimetable(mockTimetable);
  // }, []);

  useEffect(() => {
    const fetchTutors = async () => {
      const { data, error } = await supabase.from('tutor_information').select('*');
      if (error) {
        toast.error('Failed to fetch tutors: ' + error.message);
        return;
      }
      console.log('Fetched tutors:', data);

      // Only keep tutors with non-empty availability
      const mappedTutors = data
        .filter(t => Array.isArray(t.availability) && t.availability.length > 0)
        .map(t => ({
          id: t.id,
          name: t.name || `${t.first_name} ${t.last_name}`,
          rating: t.rating || 4.0,
          totalSessions: t.total_sessions || 0,
          credits_earned: t.credits_earned || 0,
          subjects: t.subjects || ['General'],
          availability: t.availability,
          isFavorite: t.is_favorite || false,
          isOnline: t.is_online || false,
          qualifications: t.qualification || '',
          verified_document: t.verified_document || ''
        }));

      setTutors(mappedTutors);
    };

    fetchTutors();
  }, []);

  useEffect(() => {
    const fetchStudentSessions = async () => {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select(`
          *,
          tutor_information:tutor_id (
            tutor_first_name:first_name,
            tutor_last_name:last_name
          )
        `)
        .eq('student_id', user.id)
        .neq('status', 'pending')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (!error && data) {
        const mappedSessions = data.map((s: any) => ({
          id: s.id?.toString() ?? Date.now().toString(),
          tutorId: s.tutor_id,
          tutorName: s.tutor_information
            ? `${s.tutor_information.tutor_first_name ?? ''} ${s.tutor_information.tutor_last_name ?? ''}`.trim()
            : `${s.tutor_first_name ?? ''} ${s.tutor_last_name ?? ''}`.trim(),
          subject: s.subject,
          difficulty: s.difficulty,
          date: s.date,
          time: s.time,
          duration: s.duration,
          credits_required: s.credits_required,
          status: s.status,
          type: s.type
        }));
        setSessions(mappedSessions);
      } else {
        setSessions([]);
      }
    };

    fetchStudentSessions();

    const params = new URLSearchParams(window.location.search);
    if (params.get("thankyou") === "1") {
      setShowThankYou(true);
      // Find the most recent completed or ongoing session
      fetchStudentSessions().then(() => {
        if (sessions.length > 0) {
          const sorted = sessions.slice().sort((a, b) => Number(b.id) - Number(a.id));
          setLastSession(sorted[0] || null);
        }
      });
    }
  }, [user.id]);

  const checkTimeConflict = (date: string, time: string) => {
    return studentTimetable.some(item =>
      item.date === date && item.time === time
    );
  };

  // Helper to update credits for student and tutor
  async function updateCreditsOnBooking(studentId: string, tutorId: string, cost: number) {
    try {
      // 1️⃣ Update student credits
      const { data: studentData, error: studentFetchError } = await supabase
        .from('student_information')
        .select('credits')
        .eq('id', studentId)
        .single();

      if (studentFetchError || !studentData) {
        toast.error("Failed to fetch student credits: " + studentFetchError?.message);
        return;
      }

      const { error: studentUpdateError } = await supabase
        .from('student_information')
        .update({ credits: studentData.credits - cost })
        .eq('id', studentId);

      if (studentUpdateError) {
        toast.error("Failed to update student credits: " + studentUpdateError.message);
        return;
      }

      // 2️⃣ Fetch current tutor info first
      const { data: tutorData, error: tutorFetchError } = await supabase
        .from('tutor_information')
        .select('credits_earned, total_sessions')
        .eq('id', tutorId)
        .single();

      if (tutorFetchError || !tutorData) {
        toast.error("Failed to fetch tutor info: " + tutorFetchError?.message);
        return;
      }

      // 3️⃣ Update tutor credits and total sessions
      const { data: updatedTutor, error: tutorUpdateError } = await supabase
        .from('tutor_information')
        .update({
          credits_earned: (tutorData.credits_earned || 0) + cost,
          total_sessions: (tutorData.total_sessions || 0) + 1
        })
        .eq('id', tutorId)
        .select('*');

      if (tutorUpdateError) {
        toast.error("Failed to update tutor info: " + tutorUpdateError.message);
        return;
      }

      if (!updatedTutor) {
        console.error('No tutor returned from update', tutorId);
        toast.error("Failed to update tutor info: no row returned");
        return;
      }

      // 4️⃣ Update local state safely
      setTutors(prev =>
        prev.map(t =>
          t.id === tutorId
            ? {
              ...t,
              credits_earned: updatedTutor[0]?.credits_earned ?? 0,
              totalSessions: updatedTutor[0]?.total_sessions ?? 0,
            }
            : t
        )
      );

      toast.success("Credits and session count updated!");
    } catch (err: any) {
      toast.error("Error updating credits/sessions: " + err.message);
    }
  }

  const FAVORITES_KEY = user?.id ? `favoriteTutors_${user.id}` : 'favoriteTutors';

  const saveFavorites = (ids: string[]) => {
    if (user?.id) localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  };

  const loadFavorites = (): string[] => {
    if (user?.id) {
      try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
      } catch {
        return [];
      }
    }
    return [];
  };

  useEffect(() => {
    // Load favorites from localStorage per user
    const favs = loadFavorites();
    setTutors(prev =>
      prev.map(t => ({
        ...t,
        isFavorite: favs.includes(t.id)
      }))
    );
  }, [user?.id, tutors.length]);

  const toggleFavorite = (tutorId: string) => {
    const favs = loadFavorites();
    const newFavs = favs.includes(tutorId)
      ? favs.filter(id => id !== tutorId)
      : [...favs, tutorId];
    saveFavorites(newFavs);
    setTutors(prev =>
      prev.map(tutor =>
        tutor.id === tutorId
          ? { ...tutor, isFavorite: newFavs.includes(tutorId) }
          : tutor
      )
    );
    toast.success('Favorites updated!');
  };

  // Helper to get booked slots for tutors
  const [bookedSlots, setBookedSlots] = useState<{ [tutorId: string]: { [date: string]: string[] } }>({});

  useEffect(() => {
    async function fetchBookedSlots() {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('tutor_id, date, time');
      if (error || !data) return;

      const slotMap: { [tutorId: string]: { [date: string]: string[] } } = {};

      data.forEach((row: any) => {
        const dateKey = row.date.split('T')[0];
        const timeKey = row.time.slice(0, 5);

        if (!slotMap[row.tutor_id]) slotMap[row.tutor_id] = {};
        if (!slotMap[row.tutor_id][dateKey]) slotMap[row.tutor_id][dateKey] = [];
        slotMap[row.tutor_id][dateKey].push(timeKey);
      });

      setBookedSlots(slotMap);
    }
    if (tutors.length > 0) fetchBookedSlots();
  }, [tutors]);

  // Book session and update credits
  const bookSession = async (tutorId: string, date: string, time: string) => {
    const tutor = tutors.find(t => t.id === tutorId);
    if (!tutor) return;

    // Check if slot is already booked by any student
    if (
      bookedSlots[tutorId] &&
      bookedSlots[tutorId][date] &&
      bookedSlots[tutorId][date].includes(time)
    ) {
      toast.error('This slot is already booked. Please choose another time.');
      return;
    }

    const subject = selectedTutorSubjects[tutorId] || tutor.subjects[0];

    if (checkTimeConflict(date, time)) {
      toast.error('Time conflict! You have another commitment at this time.');
      return;
    }

    if (user.credits < tutor.credits_earned) {
      toast.error('Insufficient credits. Please purchase more credits.');
      return;
    }

    const sessionDateObj = new Date(date);

    const newSession: Session = {
      id: Date.now().toString(),
      tutorId: tutor.id,
      tutorName: tutor.name,
      subject,
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : 'Intermediate',
      date: sessionDateObj.toISOString().split('T')[0], // store as string "YYYY-MM-DD"
      time: time,
      duration: 60,
      credits_required: tutor.credits_earned, // Replace cost with credits_required
      status: 'scheduled',
      type: 'booked'
    };

    // Save session to Supabase
    try {
      await supabase.from('tutor_sessions').insert([
        {
          tutor_id: tutor.id,
          tutor_first_name: tutor.name.split(' ')[0],
          tutor_last_name: tutor.name.split(' ').slice(1).join(' '),
          student_id: user.id,
          subject: newSession.subject,
          difficulty: newSession.difficulty,
          date: newSession.date, // <-- correct date string
          time: newSession.time,
          duration: newSession.duration,
          credits_required: newSession.credits_required, // Replace cost with credits_required
          status: newSession.status,
          type: newSession.type
        }
      ]);
      await updateCreditsOnBooking(user.id, tutor.id, tutor.credits_earned);
      toast.success(`Session booked with ${tutor.name} for ${newSession.date} at ${time}!`);
      setLastBooked({ tutorId, day: newSession.date, time });
      setShowBookingConfirm(true);
      // Refresh sessions from Supabase
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('student_id', user.id)
        .neq('status', 'pending')        // { changed code }
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      if (!error && data) {
        const mappedSessions = data.map((s: any) => ({
          id: s.id?.toString() ?? Date.now().toString(),
          tutorId: s.tutor_id,
          tutorName: `${s.tutor_first_name ?? ''} ${s.tutor_last_name ?? ''}`.trim(),
          subject: s.subject,
          difficulty: s.difficulty,
          date: s.date,
          time: s.time,
          duration: s.duration,
          credits_required: s.credits_required, // Replace cost with credits_required
          status: s.status,
          type: s.type
        }));
        setSessions(mappedSessions);
      }
    } catch (err: any) {
      toast.error('Error booking session: ' + (err?.message || err));
      return;
    }
  };

  const startInstantSession = async () => {
    try {
      // Fetch online tutors from Supabase (real tutors)
      const { data: onlineTutors, error: fetchError } = await supabase
        .from('tutor_information')
        .select('*')
        .eq('is_online', true);

      if (fetchError) {
        toast.error('Failed to fetch online tutors: ' + fetchError.message);
        return;
      }

      if (!onlineTutors || onlineTutors.length === 0) {
        toast.error('No tutors available for instant sessions right now.');
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minutes from now

      // Insert into the instant_requests table (no upsert to student_information here)
      const { error: insertError } = await supabase.from('instant_requests').insert([
        {
          student_id: user.id,
          student_first_name: user.first_name,
          student_last_name: user.last_name,
          tutor_id: null, // Initially NULL
          subject: selectedSubject !== 'all' ? selectedSubject : 'General',
          difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : 'Intermediate',
          credits_offered: 10, // Adjust credits as needed
          urgent: true,
          status: 'pending', // Initially pending
          expires_at: expiresAt,
          time_requested: now.toISOString(),
        }
      ]);

      if (insertError) {
        toast.error('Failed to create instant request: ' + insertError.message);
        return;
      }

      toast.success('Instant request created successfully! Waiting for a tutor to accept.');
    } catch (err: any) {
      toast.error('Error creating instant request: ' + (err?.message || err));
    }
  };

  const handleStartSession = async (subject: string, difficulty: string) => {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minutes from now

      // Insert into the instant_requests table (no upsert to student_information here)
      const { error } = await supabase.from('instant_requests').insert([
        {
          student_id: user.id,
          student_first_name: user.first_name,
          student_last_name: user.last_name,
          subject,
          difficulty,
          credits_offered: 10, // Adjust credits as needed
          urgent: true,
          status: 'pending',
          expires_at: expiresAt,
          time_requested: now.toISOString(),
          tutor_id: null
        }
      ]);

      if (error) {
        toast.error('Failed to create instant request: ' + error.message);
        return;
      }

      toast.success('Instant request created successfully!');
      setShowInstantHelpWidget(false);
    } catch (err: any) {
      toast.error('Error creating instant request: ' + (err?.message || err));
    }
  };

  // Filter tutors based on search, subject, and difficulty
  const filteredTutors = tutors.filter(tutor => {
    const matchesSubject =
      selectedSubject === 'all' || tutor.subjects.includes(selectedSubject);
    const matchesDifficulty =
      selectedDifficulty === 'all' || (tutor.qualifications && tutor.qualifications.toLowerCase().includes(selectedDifficulty.toLowerCase()));
    const matchesSearch =
      searchQuery.trim() === '' ||
      tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutor.subjects.some(subject =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesSubject && matchesDifficulty && matchesSearch;
  });

  // Compute favorite tutors from tutors state
  const favoriteTutors = tutors.filter(tutor => tutor.isFavorite);

  async function quickBookFavorite(tutor: Tutor) {
    if (!tutor.isOnline) {
      toast.error("Tutor is currently offline.");
      return;
    }
    // Use the first available slot from the first available day
    const firstAvailableDay = tutor.availability.find(day => day.times.length > 0);
    if (!firstAvailableDay) {
      toast.error("No available slots for this tutor.");
      return;
    }
    const slotDate = getNextDateForWeekdayLocal(firstAvailableDay.day);
    const slotTime = firstAvailableDay.times[0];

    // Check if slot is already booked
    const isBooked =
      bookedSlots[tutor.id]?.[slotDate]?.includes(slotTime) ?? false;
    if (isBooked) {
      toast.error("The next available slot is already booked. Please check tutor's schedule.");
      return;
    }

    // Check for time conflict
    if (checkTimeConflict(slotDate, slotTime)) {
      toast.error("Time conflict with your schedule.");
      return;
    }

    await bookSession(tutor.id, slotDate, slotTime);
  }

  // Add state for instant requests (for tutors)
  const [instantRequests, setInstantRequests] = useState<any[]>([]);
  // Add state for tutor sessions
  const [tutorSessions, setTutorSessions] = useState<any[]>([]);

  // Fetch instant requests for tutors
  useEffect(() => {
    if (user.role !== 'tutor') return;
    const fetchInstantRequests = async () => {
      const { data, error } = await supabase
        .from('instant_requests')
        .select('*')
        .eq('status', 'pending')
        .is('tutor_id', null);
      if (!error && data) setInstantRequests(data);
    };
    fetchInstantRequests();
  }, [user.role]);

  // Fetch tutor sessions for "My Sessions" tab (for tutors)
  useEffect(() => {
    if (user.role !== 'tutor') return;
    const fetchTutorSessions = async () => {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('tutor_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      if (!error && data) setTutorSessions(data);
    };
    fetchTutorSessions();
  }, [user.role, user.id]);

  // Accept instant request handler for tutors
  const handleAcceptInstantRequest = async (request: any) => {
    try {
      // 1. Update instant_requests status and assign tutor_id
      const { error: updateError } = await supabase
        .from('instant_requests')
        .update({
          status: 'accepted',
          tutor_id: user.id
        })
        .eq('id', request.id);

      if (updateError) {
        toast.error('Failed to accept the request: ' + updateError.message);
        return;
      }

      // 2. Insert new row into tutor_sessions
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"
      const { error: insertError } = await supabase
        .from('tutor_sessions')
        .insert([{
          tutor_id: user.id,
          tutor_first_name: user.first_name,
          tutor_last_name: user.last_name,
          student_id: request.student_id,
          subject: request.subject,
          difficulty: request.difficulty,
          date: todayStr,
          time: timeStr,
          duration: 60,
          status: 'ongoing',
          type: 'instant',
          credits_required: request.credits_offered
        }]);

      if (insertError) {
        toast.error('Failed to create session: ' + insertError.message);
        return;
      }

      // 3. Remove from instantRequests and refresh tutorSessions
      setInstantRequests(prev => prev.filter(r => r.id !== request.id));
      // Optionally, fetch again from DB:
      const { data: sessionsData } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('tutor_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      setTutorSessions(sessionsData || []);

      toast.success('Instant request accepted and session created!');
    } catch (err: any) {
      toast.error('Error accepting the request: ' + (err?.message || err));
    }
  };

  // For tutors: show only instant requests and my sessions
  if (user.role === 'tutor') {
    return (
      <div className="space-y-6">
        {/* Instant Requests Tab for Tutors */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Instant Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {instantRequests.length === 0 ? (
              <div className="text-muted-foreground">No pending instant requests.</div>
            ) : (
              <div className="space-y-4">
                {instantRequests.map(request => (
                  <Card key={request.id}>
                    <CardContent className="flex flex-col gap-2">
                      <div>
                        <b>{request.student_first_name} {request.student_last_name}</b> needs help with <b>{request.subject}</b> ({request.difficulty})
                      </div>
                      <div>
                        <Button onClick={() => handleAcceptInstantRequest(request)}>
                          Accept Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tutor's Sessions Tab */}
        <Card>
          <CardHeader>
            <CardTitle>My Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {tutorSessions.length === 0 ? (
              <div className="text-muted-foreground">No sessions yet.</div>
            ) : (
              <div className="space-y-4">
                {tutorSessions.map(session => (
                  <Card key={session.id}>
                    <CardContent>
                      <div>
                        <b>{session.subject}</b> with student {session.student_id}
                      </div>
                      <div>
                        {session.date} {session.time} • {session.status}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instant Help Widget */}
      <InstantHelpWidget
        isOpen={showInstantHelpWidget}
        onOpenChange={setShowInstantHelpWidget}
        user={{
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          credits: user.credits,
          role: user.role,
        }}
        currentUserCredits={user.credits}
        onStartSession={handleStartSession}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tutors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => setShowInstantHelpWidget(true)} className="w-full">
              <Zap className="h-4 w-4 mr-2" />
              {user.role === 'student' ? 'Get Instant Help' : 'Instant Session'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Tutors</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="sessions">My Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Booking Advice */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Booking Tip:</strong> We recommend booking sessions at least 1 day in advance to ensure tutor availability and better preparation time.
            </AlertDescription>
          </Alert>

          {filteredTutors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No tutors found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredTutors.map((tutor) => (
                <Card key={tutor.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{tutor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{tutor.name}</h3>
                            {tutor.isOnline && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Online
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              <span>{tutor.rating}</span>
                            </div>
                            <span>•</span>
                            <span>{tutor.totalSessions} sessions</span>
                            <span>•</span>
                            <span>{tutor.credits_earned} credits/session</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(tutor.id)}
                        className={tutor.isFavorite ? 'text-red-600' : 'text-gray-400'}
                      >
                        <Heart className={`h-4 w-4 ${tutor.isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">

                      <div>
                        <h4 className="text-sm font-medium mb-2">Subjects</h4>
                        <Select
                          value={selectedTutorSubjects[tutor.id] || tutor.subjects[0]}
                          onValueChange={val =>
                            setSelectedTutorSubjects(prev => ({ ...prev, [tutor.id]: val }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {tutor.subjects.map(subject => (
                              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Qualifications</h4>
                        <p className="text-xs text-muted-foreground">{tutor.qualifications}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Available Times</h4>
                        <div className="space-y-2">
                          {tutor.availability.map((day) => (
                            <div key={day.day} className="text-xs">
                              <span className="font-medium">{day.day}:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {day.times.map(time => {
                                  const hasConflict = checkTimeConflict(day.day, time);
                                  const slotDate = getNextDateForWeekdayLocal(day.day); // "YYYY-MM-DD"
                                  const isBooked = bookedSlots[tutor.id]?.[slotDate]?.includes(time) ?? false;

                                  return (
                                    <Button
                                      key={time}
                                      size="sm"
                                      variant={isBooked ? "destructive" : hasConflict ? "destructive" : "outline"}
                                      className={`text-xs h-6 px-2 ${isBooked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      onClick={() => !isBooked && bookSession(tutor.id, slotDate, time)}
                                      disabled={isBooked || hasConflict}
                                      title={
                                        isBooked
                                          ? 'This slot is already booked'
                                          : hasConflict
                                            ? 'Time conflict with your schedule'
                                            : `Book ${time} session`
                                      }
                                    >
                                      {time}
                                      {isBooked && <AlertTriangle className="h-3 w-3 ml-1" />}
                                      {hasConflict && !isBooked && <AlertTriangle className="h-3 w-3 ml-1" />}
                                    </Button>
                                  );
                                })}
                                {/* Booking Confirmation Dialog */}
                                <Dialog open={showBookingConfirm} onOpenChange={setShowBookingConfirm}>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Booking Confirmed!</DialogTitle>
                                      <DialogDescription>
                                        {lastBooked && (
                                          <span>
                                            Your session has been booked for <b>{lastBooked.day}</b> at <b>{lastBooked.time}</b>.<br />
                                            You can view your upcoming sessions in the "Sessions" tab.
                                          </span>
                                        )}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button
                                        onClick={() => {
                                          setShowBookingConfirm(false);
                                          // Restore focus to the button that triggered the dialog
                                          openDialogButtonRef.current?.focus();
                                        }}
                                        className="w-full mt-2"
                                      >
                                        Close
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {favoriteTutors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No favorite tutors yet</p>
                <p className="text-sm text-muted-foreground">Heart tutors you like to add them to favorites</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {favoriteTutors.map((tutor) => (
                <Card key={tutor.id} className="hover:shadow-md transition-shadow border-red-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{tutor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{tutor.name}</h3>
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              Favorite
                            </Badge>
                            {tutor.isOnline && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Online
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              <span>{tutor.rating}</span>
                            </div>
                            <span>•</span>
                            <span>{tutor.totalSessions} sessions</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(tutor.id)}
                        className="text-red-600"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => quickBookFavorite(tutor)}
                      disabled={!tutor.isOnline}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {tutor.isOnline ? "Quick Start (Instant Session)" : "Tutor Offline"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No sessions scheduled</p>
                <p className="text-sm text-muted-foreground">Book a session or start an instant session to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                // Sort: ongoing meetings first, then not started (future, closest first), then finished (past)
                const now = new Date();
                const sorted = [...sessions].sort((a, b) => {
                  const aStart = new Date(`${a.date}T${a.time}`);
                  const aEnd = new Date(aStart);
                  aEnd.setMinutes(aEnd.getMinutes() + (a.duration || 60));
                  const bStart = new Date(`${b.date}T${b.time}`);
                  const bEnd = new Date(bStart);
                  bEnd.setMinutes(bEnd.getMinutes() + (b.duration || 60));

                  // Ongoing
                  const aIsOngoing = a.status === 'ongoing' && now >= aStart && now <= aEnd;
                  const bIsOngoing = b.status === 'ongoing' && now >= bStart && now <= bEnd;
                  if (aIsOngoing && !bIsOngoing) return -1;
                  if (!aIsOngoing && bIsOngoing) return 1;

                  // Not started (future)
                  const aNotStarted = now < aStart;
                  const bNotStarted = now < bStart;
                  if (aNotStarted && bNotStarted) {
                    // Closest to now comes first
                    return aStart.getTime() - bStart.getTime();
                  }
                  if (aNotStarted && !bNotStarted) return -1; // not started before finished
                  if (!aNotStarted && bNotStarted) return 1;

                  // Finished: scheduled/ongoing and now > end
                  const aIsFinished = (a.status === 'ongoing' || a.status === 'scheduled') && now > aEnd;
                  const bIsFinished = (b.status === 'ongoing' || b.status === 'scheduled') && now > bEnd;
                  if (aIsFinished && !bIsFinished) return 1;
                  if (!aIsFinished && bIsFinished) return -1;

                  // fallback: most recent first
                  return bStart.getTime() - aStart.getTime();
                });

                return sorted.map((session) => {
                  // Determine if session is finished or not started based on date/time
                  const sessionStart = new Date(`${session.date}T${session.time}`);
                  const sessionEnd = new Date(sessionStart);
                  sessionEnd.setMinutes(sessionEnd.getMinutes() + (session.duration || 60));
                  const now = new Date();
                  const isFinished = (session.status === 'ongoing' || session.status === 'scheduled') && now > sessionEnd;
                  const notStarted = now < sessionStart;
                  function enterMeeting(id: string) {
                    // Find the session by id
                    const session = sessions.find(s => s.id === id);
                    if (!session) {
                      toast.error('Session not found.');
                      return;
                    }
                    // For demo: redirect to a meeting URL (could be a video call page)
                    // In a real app, this would be a unique meeting link per session
                    window.open(`/meeting/${id}`, '_blank', 'noopener');
                  }

                  return (
                    <Card key={session.id} className="hover:shadow-md transition-shadow border-blue-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{session.tutorName}</h3>
                            <div className="text-sm text-muted-foreground">{session.subject} • {session.difficulty}</div>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge
                              variant={session.status === 'ongoing' && !isFinished && !notStarted ? 'default' : 'outline'}
                              className={
                                session.status === 'ongoing' && !isFinished && !notStarted ? 'bg-green-100 text-green-700' :
                                  session.status === 'scheduled' && !isFinished && !notStarted ? 'bg-blue-100 text-blue-700' :
                                    isFinished ? 'bg-gray-200 text-gray-700' :
                                      notStarted ? 'bg-yellow-100 text-yellow-700' :
                                        session.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                          'bg-red-100 text-red-700'
                              }
                            >
                              {isFinished ? 'Finished' : notStarted ? 'Not Started' : session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </Badge>
                            <div className="text-xs text-gray-400 mt-1">{session.date} {session.time}</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <span>{session.credits_required} credits</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {session.status === 'scheduled' && !isFinished && !notStarted && (
                              <Button
                                onClick={() => enterMeeting(session.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Enter Meeting
                              </Button>
                            )}
                            {session.status === 'ongoing' && !isFinished && !notStarted && (
                              <Button
                                onClick={() => {
                                  // Use client-side navigation to preserve auth/session context
                                  navigate('/meeting');
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Video className="h-4 w-4 mr-2" />
                                Join Meeting
                              </Button>
                            )}
                            {notStarted && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Meeting hasn't started
                              </Badge>
                            )}
                            {isFinished && (
                              <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Finished
                              </Badge>
                            )}
                            {session.status === 'completed' && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Instant Requests Tab for Tutors */}
      {user.role === 'tutor' && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Instant Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {instantRequests.length === 0 ? (
              <div className="text-muted-foreground">No pending instant requests.</div>
            ) : (
              <div className="space-y-4">
                {instantRequests.map(request => (
                  <Card key={request.id}>
                    <CardContent className="flex flex-col gap-2">
                      <div>
                        <b>{request.student_first_name} {request.student_last_name}</b> needs help with <b>{request.subject}</b> ({request.difficulty})
                      </div>
                      <div>
                        <Button onClick={() => handleAcceptInstantRequest(request)}>
                          Accept Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tutor's Sessions Tab */}
      {user.role === 'tutor' && (
        <Card>
          <CardHeader>
            <CardTitle>My Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {tutorSessions.length === 0 ? (
              <div className="text-muted-foreground">No sessions yet.</div>
            ) : (
              <div className="space-y-4">
                {tutorSessions.map(session => (
                  <Card key={session.id}>
                    <CardContent>
                      <div>
                        <b>{session.subject}</b> with student {session.student_id}
                      </div>
                      <div>
                        {session.date} {session.time} • {session.status}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getNextDateForWeekdayLocal(weekday: string) {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date();
  const todayIndex = today.getDay();
  const targetIndex = daysOfWeek.indexOf(weekday);

  let delta = targetIndex - todayIndex;
  if (delta <= 0) delta += 7; // <= to skip today
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + delta);

  // Format as YYYY-MM-DD in LOCAL timezone
  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}