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
  hourlyRate: number;
  availability: {
    day: string;
    times: string[];
  }[];
  isFavorite: boolean;
  isOnline: boolean;
  qualifications: string;
  verified_document?: string;
  credits_earned?: number;
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
  cost: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'ongoing';
  type: 'instant' | 'booked';
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  credits: number;
  role: string;
}

interface TutorSessionsProps {
  user: User;
  accessToken: string;
}

export function TutorSessions({ user, accessToken }: TutorSessionsProps) {

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
  // Booking confirmation state
  const [showBookingConfirm, setShowBookingConfirm] = useState(false);
  const [lastBooked, setLastBooked] = useState<{ tutorId: string; day: string; time: string } | null>(null);
  const openDialogButtonRef = useRef<HTMLButtonElement>(null);
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
          hourlyRate: t.hourly_rate || 10,
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
    const savedSessions = localStorage.getItem('tutorSessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }

    // Only add mock sessions if no saved sessions exist
    if (!savedSessions) {
      const mockSessions: Session[] = [
        {
          id: '1',
          tutorId: '1',
          tutorName: 'Sarah Johnson',
          subject: 'Mathematics',
          difficulty: 'Intermediate',
          date: '2025-01-29',
          time: '14:00',
          duration: 60,
          cost: 15,
          status: 'scheduled',
          type: 'booked'
        },
        {
          id: '2',
          tutorId: '2',
          tutorName: 'Dr. Michael Brown',
          subject: 'Physics',
          difficulty: 'Advanced',
          date: '2025-01-30',
          time: '16:00',
          duration: 60,
          cost: 20,
          status: 'scheduled',
          type: 'booked'
        }
      ];
      setSessions(mockSessions);
      localStorage.setItem('tutorSessions', JSON.stringify(mockSessions));
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("thankyou") === "1") {
      setShowThankYou(true);
      // Find the most recent completed or ongoing session
      const savedSessions = localStorage.getItem('tutorSessions');
      if (savedSessions) {
        const sessionsArr: Session[] = JSON.parse(savedSessions);
        // Find the last session that was completed or ongoing
        const sorted = sessionsArr.slice().sort((a, b) => Number(b.id) - Number(a.id));
        setLastSession(sorted[0] || null);
      }
    }
  }, []);

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

    if (user.credits < tutor.hourlyRate) {
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
      cost: tutor.hourlyRate,
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
          cost: newSession.cost,
          status: newSession.status,
          type: newSession.type
        }
      ]);
      await updateCreditsOnBooking(user.id, tutor.id, tutor.hourlyRate);
      toast.success(`Session booked with ${tutor.name} for ${newSession.date} at ${time}!`);
      setLastBooked({ tutorId, day: newSession.date, time });
      setShowBookingConfirm(true);
      // Refresh sessions from Supabase
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('student_id', user.id)
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
          cost: s.cost,
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
  // Fetch online tutors from Supabase (real tutors)
  const { data: onlineTutors, error } = await supabase
    .from('tutor_information')
    .select('*')
    .eq('is_online', true);

  if (error || !onlineTutors || onlineTutors.length === 0) {
    toast.error('No tutors available for instant sessions right now.');
    return;
  }

  // Randomly pick a tutor
  const randomTutor = onlineTutors[Math.floor(Math.random() * onlineTutors.length)];

  if (user.credits < randomTutor.hourly_rate) {
    toast.error('Insufficient credits for instant session.');
    return;
  }

  const now = new Date();
const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const localTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const newSession: Session = {
    id: Date.now().toString(),
    tutorId: randomTutor.id,
    tutorName: `${randomTutor.first_name} ${randomTutor.last_name}`,
    subject: selectedSubject !== 'all' ? selectedSubject : randomTutor.subjects?.[0] || 'General',
    difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : 'Intermediate',
    date: localDate,
    time: localTime,
    duration: 60,
    cost: randomTutor.hourly_rate,
    status: 'ongoing',
    type: 'instant'
  };

  // Save to sessions state
  const updatedSessions = [...sessions, newSession];
  setSessions(updatedSessions);
  localStorage.setItem('tutorSessions', JSON.stringify(updatedSessions));

  // Save to Supabase tutor_sessions table
  try {
    const { error: insertError } = await supabase.from('tutor_sessions').insert([
      {
        tutor_id: randomTutor.id,
        tutor_first_name: randomTutor.first_name,
        tutor_last_name: randomTutor.last_name,
        student_id: user.id,
        subject: newSession.subject,
        difficulty: newSession.difficulty,
        date: newSession.date,
        time: newSession.time,
        duration: newSession.duration,
        cost: newSession.cost,
        status: newSession.status,
        type: newSession.type
      }
    ]);
    if (insertError) {
      toast.error('Failed to save instant session: ' + insertError.message);
      return;
    }
  } catch (err: any) {
    toast.error('Error saving instant session: ' + (err?.message || err));
    return;
  }

  toast.success(`Instant session started with ${randomTutor.first_name} ${randomTutor.last_name}!`);

  // Dispatch update event
  window.dispatchEvent(new CustomEvent('sessionBookingUpdate'));

  // Enter the meeting after a short delay
  setTimeout(() => {
    enterMeeting(newSession.id);
  }, 2000);
};

  const enterMeeting = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    toast.success(`Entering meeting with ${session.tutorName}...`);

    // Update session status to ongoing
    const updatedSessions = sessions.map(s =>
      s.id === sessionId
        ? { ...s, status: 'ongoing' as const }
        : s
    );
    setSessions(updatedSessions);
    localStorage.setItem('tutorSessions', JSON.stringify(updatedSessions));

    window.dispatchEvent(new CustomEvent('sessionBookingUpdate'));

    // Navigate to Meeting page (assumes React Router)
    window.location.href = `/meeting/${sessionId}`;
  };

  // Sort tutors: favorites first
  const favoriteIds = loadFavorites();
  const sortedTutors = [
    ...tutors.filter(t => t.isFavorite),
    ...tutors.filter(t => !t.isFavorite)
  ];

  const filteredTutors = sortedTutors.filter(tutor => {
    const hasAvailability = tutor.availability && tutor.availability.length > 0;
    const matchesSubject = selectedSubject === 'all' || tutor.subjects.includes(selectedSubject);
    const matchesSearch = searchQuery === '' ||
      tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutor.subjects.some(subject => subject.toLowerCase().includes(searchQuery.toLowerCase()));
    return hasAvailability && matchesSubject && matchesSearch;
  });

  const favoriteTutors = tutors.filter(tutor => tutor.isFavorite);

  // Handle rating submit
  const handleThankYouSubmit = async () => {
    if (!lastSession) {
      toast.error("No session found to submit feedback.");
      return;
    }
    try {
      const res = await fetch("/make-server-0e871cde/session/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: lastSession.id,
          rating,
          feedback,
        }),
      });
      if (res.ok) {
        toast.success("Thank you for your feedback!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit feedback.");
      }
    } catch (err) {
      toast.error("Network error while submitting feedback.");
    }
    setShowThankYou(false);
    // Remove thankyou param from URL
    const params = new URLSearchParams(window.location.search);
    params.delete("thankyou");
    window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
  };

  // Award 20 exp per completed session
  const awardSessionExperience = async (studentId: string, currentExp: number) => {
    const expEarned = 20;
    const { error } = await supabase
      .from('student_information')
      .update({ experience: currentExp + expEarned })
      .eq('id', studentId);
    if (!error) {
      toast.success(`You earned ${expEarned} experience for completing a session!`);
    }
  };

  // Add state for selected subject per tutor
  const [selectedTutorSubjects, setSelectedTutorSubjects] = useState<{ [tutorId: string]: string }>({});

  // Helper to get booked slots for each tutor
  const [bookedSlots, setBookedSlots] = useState<{ [tutorId: string]: { [date: string]: string[] } }>({});

  useEffect(() => {
    async function fetchBookedSlots() {
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('tutor_id, date, time');
      if (error || !data) return;

      const slotMap: { [tutorId: string]: { [date: string]: string[] } } = {};

      data.forEach((row: any) => {
        const dateKey = row.date.split('T')[0]; // Take only YYYY-MM-DD
        const timeKey = row.time.slice(0, 5); // "14:00"

        if (!slotMap[row.tutor_id]) slotMap[row.tutor_id] = {};
        if (!slotMap[row.tutor_id][dateKey]) slotMap[row.tutor_id][dateKey] = [];
        slotMap[row.tutor_id][dateKey].push(timeKey);
      });

      setBookedSlots(slotMap);
    }
    if (tutors.length > 0) fetchBookedSlots();
  }, [tutors]);

  // Fetch sessions from Supabase for "My Sessions" tab
  useEffect(() => {
    async function fetchSupabaseSessions() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq('student_id', user.id)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
      if (error) {
        toast.error('Failed to fetch sessions: ' + error.message);
        return;
      }
      // Map data to Session interface
      const mappedSessions = (data || []).map((s: any) => ({
        id: s.id?.toString() ?? Date.now().toString(),
        tutorId: s.tutor_id,
        tutorName: `${s.tutor_first_name ?? ''} ${s.tutor_last_name ?? ''}`.trim(),
        subject: s.subject,
        difficulty: s.difficulty,
        date: s.date,
        time: s.time,
        duration: s.duration,
        cost: s.cost,
        status: s.status,
        type: s.type
      }));
      setSessions(mappedSessions);
    }
    fetchSupabaseSessions();
  }, [user?.id]);

  // Add this function above your return statement
const quickBookFavorite = async (tutor: Tutor) => {
  if (!tutor.isOnline) {
    toast.error('Tutor is not online for instant session.');
    return;
  }
  if (user.credits < tutor.hourlyRate) {
    toast.error('Insufficient credits for instant session.');
    return;
  }
  const now = new Date();
const localDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const localTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const newSession: Session = {
    id: Date.now().toString(),
    tutorId: tutor.id,
    tutorName: tutor.name,
    subject: tutor.subjects[0],
    difficulty: 'Intermediate',
    date: localDate,
    time: localTime,
    duration: 60,
    cost: tutor.hourlyRate,
    status: 'ongoing',
    type: 'instant'
  };
  try {
    await supabase.from('tutor_sessions').insert([{
      tutor_id: tutor.id,
      tutor_first_name: tutor.name.split(' ')[0],
      tutor_last_name: tutor.name.split(' ').slice(1).join(' '),
      student_id: user.id,
      subject: newSession.subject,
      difficulty: newSession.difficulty,
      date: newSession.date,
      time: newSession.time,
      duration: newSession.duration,
      cost: newSession.cost,
      status: newSession.status,
      type: newSession.type
    }]);
    await updateCreditsOnBooking(user.id, tutor.id, tutor.hourlyRate);
    toast.success(`Instant session started with ${tutor.name}!`);
    setLastBooked({ tutorId: tutor.id, day: newSession.date, time: newSession.time });
    setShowBookingConfirm(true);
    enterMeeting(newSession.id);
  } catch (err: any) {
    toast.error('Error booking instant session: ' + (err?.message || err));
  }
};

  return (
    <div className="space-y-6">
      {/* Thank You Dialog */}
      {showThankYou && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-2 text-center">Thank You!</h2>
            <p className="mb-4 text-center">We hope you enjoyed your session{lastSession ? ` with ${lastSession.tutorName}` : ''}. Please rate your experience:</p>
            <div className="flex justify-center mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  className={`mx-1 text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >★</button>
              ))}
            </div>
            <textarea
              className="w-full border rounded p-2 mb-4"
              rows={3}
              placeholder="Optional feedback..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
            />
            <div className="flex justify-center gap-2">
              <Button onClick={handleThankYouSubmit} className="bg-blue-600 text-white">Submit</Button>
              <Button variant="outline" onClick={() => setShowThankYou(false)}>Skip</Button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-6 w-6 text-blue-600" />
            <span>Tutor Sessions</span>
          </CardTitle>
          <CardDescription>
            Book sessions with qualified tutors or start instant learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{sessions.length}</div>
              <div className="text-sm text-blue-700">Total Sessions</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{favoriteTutors.length}</div>
              <div className="text-sm text-green-700">Favorite Tutors</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{tutors.filter(t => t.isOnline).length}</div>
              <div className="text-sm text-purple-700">Online Now</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{user.credits}</div>
              <div className="text-sm text-orange-700">Your Credits</div>
            </div>
          </div>
        </CardContent>
      </Card>

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

            <Button onClick={startInstantSession} className="w-full">
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
                            <span>{tutor.hourlyRate} credits/hr</span>
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
              {sessions.map((session) => {
                // Determine if session is finished or not started based on date/time
                const sessionStart = new Date(`${session.date}T${session.time}`);
                const sessionEnd = new Date(sessionStart);
                sessionEnd.setMinutes(sessionEnd.getMinutes() + (session.duration || 60));
                const now = new Date();
                const isFinished = (session.status === 'ongoing' || session.status === 'scheduled') && now > sessionEnd;
                const notStarted = now < sessionStart;
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
                            <span>{session.cost} credits</span>
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
                              onClick={() => enterMeeting(session.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Rejoin Meeting
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
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getNextDateForWeekdayLocal(weekday: string) {
  const daysOfWeek = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
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


