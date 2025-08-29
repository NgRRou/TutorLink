
import React, { useState, useEffect } from 'react';
import { useState as useReactState } from 'react';
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


// Helper: Upload file to Supabase Storage and update tutor_information
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
  bio: string;
  qualifications: string[];
  verified_document?: string; // URL or path to verification document
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
  // Minimal UI for uploading verification document (for demo)
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // File upload handler must be inside the component to access state
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !demoTutorId) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadVerificationDocument(file, demoTutorId, supabaseClient);
      setUploadedUrl(url);
      toast.success('Document uploaded and saved!');
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

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

  // Now tutors is defined, so demoTutorId can be set
  demoTutorId = tutors[0]?.id;

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics'
  ];

  const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  // All logic and state is now inside the TutorSessions function
  // Return the main JSX
  // ...existing code inside TutorSessions function...
  // ...existing code...
  // ...existing code...

  // Detect thankyou query param and load last session
  useEffect(() => {
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
    const savedSessions = localStorage.getItem('tutorSessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }

    const mockTutors: Tutor[] = [
      {
        id: 'b1a7e2c0-1f2b-4e3a-9c1d-1234567890ab',
        name: 'Sarah Johnson',
        rating: 4.9,
        totalSessions: 247,
        subjects: ['Mathematics', 'Physics'],
        hourlyRate: 15,
        availability: [
          { day: 'Monday', times: ['09:00', '10:00', '14:00', '15:00'] },
          { day: 'Tuesday', times: ['09:00', '11:00', '16:00'] },
          { day: 'Wednesday', times: ['10:00', '14:00', '15:00', '16:00'] }
        ],
        isFavorite: true,
        isOnline: true,
        bio: 'Experienced Mathematics tutor with 5+ years of teaching experience.',
        qualifications: ['M.Sc Mathematics', 'Teaching Certificate', 'PhD candidate'],
        verified_document: '' // placeholder for document URL
      },
      {
        id: 'c2b8f3d1-2e3c-5f4b-8d2e-2345678901bc',
        name: 'Dr. Michael Brown',
        rating: 4.8,
        totalSessions: 189,
        subjects: ['Physics', 'Chemistry'],
        hourlyRate: 20,
        availability: [
          { day: 'Monday', times: ['11:00', '15:00', '16:00'] },
          { day: 'Thursday', times: ['09:00', '10:00', '14:00'] },
          { day: 'Friday', times: ['13:00', '14:00', '15:00'] }
        ],
        isFavorite: false,
        isOnline: true,
        bio: 'PhD in Physics with specialization in quantum mechanics and thermodynamics.',
        qualifications: ['PhD Physics', '10+ years experience', 'Research publications'],
        verified_document: ''
      },
      {
        id: 'd3c9a4e2-3f4d-6a5c-9e3f-3456789012cd',
        name: 'Emma Davis',
        rating: 4.7,
        totalSessions: 156,
        subjects: ['English', 'History'],
        hourlyRate: 12,
        availability: [
          { day: 'Tuesday', times: ['10:00', '11:00', '15:00'] },
          { day: 'Wednesday', times: ['09:00', '13:00', '16:00'] },
          { day: 'Saturday', times: ['10:00', '11:00', '14:00'] }
        ],
        isFavorite: true,
        isOnline: false,
        bio: 'Literature enthusiast with expertise in creative writing and essay composition.',
        qualifications: ['B.A English Literature', 'TEFL Certified', '3 years experience'],
        verified_document: ''
      }
    ];

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

    // Mock student timetable (for conflict checking)
    const mockTimetable = [
      { day: 'Monday', time: '09:00', subject: 'Chemistry Class' },
      { day: 'Monday', time: '14:00', subject: 'Math Study Group' },
      { day: 'Tuesday', time: '10:00', subject: 'Physics Lab' },
      { day: 'Wednesday', time: '15:00', subject: 'English Literature' }
    ];

    setTutors(mockTutors);
    setStudentTimetable(mockTimetable);
  }, []);

  const checkTimeConflict = (day: string, time: string) => {
    return studentTimetable.some(item =>
      item.day === day && item.time === time
    );
  };

  const toggleFavorite = (tutorId: string) => {
    setTutors(prev =>
      prev.map(tutor =>
        tutor.id === tutorId
          ? { ...tutor, isFavorite: !tutor.isFavorite }
          : tutor
      )
    );
    toast.success('Favorites updated!');
  };

  const bookSession = async (tutorId: string, day: string, time: string) => {
    const tutor = tutors.find(t => t.id === tutorId);
    if (!tutor) return;

    if (checkTimeConflict(day, time)) {
      toast.error('Time conflict! You have another commitment at this time.');
      return;
    }

    if (user.credits < tutor.hourlyRate) {
      toast.error('Insufficient credits. Please purchase more credits.');
      return;
    }

    // Calculate date for booking (simplified)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const newSession: Session = {
      id: Date.now().toString(),
      tutorId: tutor.id,
      tutorName: tutor.name,
      subject: selectedSubject !== 'all' ? selectedSubject : tutor.subjects[0],
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : 'Intermediate',
      date: tomorrow.toISOString().split('T')[0],
      time: time,
      duration: 60,
      cost: tutor.hourlyRate,
      status: 'scheduled',
      type: 'booked'
    };

    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    localStorage.setItem('tutorSessions', JSON.stringify(updatedSessions));

    // Save to Supabase tutor_sessions table
    // Only attempt to save if IDs are valid UUIDs (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(tutor.id) && uuidRegex.test(user.id)) {
      try {
        const { error } = await supabase.from('tutor_sessions').insert([
          {
            tutor_id: tutor.id,
            tutor_name: tutor.name,
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
        if (error) {
          toast.error('Failed to save session to database: ' + error.message);
        }
      } catch (err: any) {
        toast.error('Error saving session to database: ' + (err?.message || err));
      }
    } else {
      toast.error('Session not saved to database: tutor_id or student_id is not a valid UUID.');
    }

    // Dispatch custom event to notify calendar component
    window.dispatchEvent(new CustomEvent('sessionBookingUpdate'));

    setLastBooked({ tutorId, day, time });
    setShowBookingConfirm(true);
    toast.success(`Session booked with ${tutor.name} for ${day} at ${time}!`);
  };

  const startInstantSession = () => {
    // Check if user is a student wanting to earn credits by helping others
    if (user.role === 'student') {
      // Show option to either get help or help others
      const shouldHelpOthers = confirm(
        'Would you like to:\n\n' +
        '• Click "OK" to HELP other students and earn free credits\n' +
        '• Click "Cancel" to GET HELP from a tutor (costs credits)\n\n' +
        'Helping others is a great way to reinforce your own learning!'
      );

      if (shouldHelpOthers) {
        // Student wants to help others - assign them to help a random student
        const studentsNeedingHelp = [
          { name: 'Alex Chen', subject: 'Mathematics', difficulty: 'Intermediate', topic: 'Calculus derivatives' },
          { name: 'Emma Wilson', subject: 'Physics', difficulty: 'Beginner', topic: 'Newton\'s laws' },
          { name: 'David Kim', subject: 'Chemistry', difficulty: 'Advanced', topic: 'Organic reactions' },
          { name: 'Lisa Martinez', subject: 'Biology', difficulty: 'Intermediate', topic: 'Cell division' }
        ];

        const randomStudent = studentsNeedingHelp[Math.floor(Math.random() * studentsNeedingHelp.length)];

        const now = new Date();
        const newSession: Session = {
          id: Date.now().toString(),
          tutorId: '1', // Current user acts as tutor
          tutorName: `${user.first_name} ${user.last_name}`,
          subject: randomStudent.subject,
          difficulty: randomStudent.difficulty,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().substring(0, 5),
          duration: 60,
          cost: -5, // Negative cost means they earn credits
          status: 'ongoing',
          type: 'instant'
        };

        const updatedSessions = [...sessions, newSession];
        setSessions(updatedSessions);
        localStorage.setItem('tutorSessions', JSON.stringify(updatedSessions));

        window.dispatchEvent(new CustomEvent('sessionBookingUpdate'));

        toast.success(`🎉 You've been matched with ${randomStudent.name} who needs help with ${randomStudent.topic}! You'll earn 5 credits for helping. Good luck!`);

        setTimeout(() => {
          enterMeeting(newSession.id);
        }, 3000);
        return;
      }
    }

    // Regular instant session - get help from a tutor
    const availableTutors = tutors.filter(t => t.isOnline);
    if (availableTutors.length === 0) {
      toast.error('No tutors available for instant sessions right now.');
      return;
    }

    const randomTutor = availableTutors[Math.floor(Math.random() * availableTutors.length)];

    if (user.credits < randomTutor.hourlyRate) {
      toast.error('Insufficient credits for instant session.');
      return;
    }

    const now = new Date();
    const newSession: Session = {
      id: Date.now().toString(),
      tutorId: randomTutor.id,
      tutorName: randomTutor.name,
      subject: selectedSubject !== 'all' ? selectedSubject : randomTutor.subjects[0],
      difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : 'Intermediate',
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().substring(0, 5),
      duration: 60,
      cost: randomTutor.hourlyRate,
      status: 'ongoing',
      type: 'instant'
    };

    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    localStorage.setItem('tutorSessions', JSON.stringify(updatedSessions));

    window.dispatchEvent(new CustomEvent('sessionBookingUpdate'));

    toast.success(`Instant session started with ${randomTutor.name}!`);

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

  const filteredTutors = tutors.filter(tutor => {
    const matchesSubject = selectedSubject === 'all' || tutor.subjects.includes(selectedSubject);
    const matchesSearch = searchQuery === '' ||
      tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutor.subjects.some(subject => subject.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSubject && matchesSearch;
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
      {/* Demo: Upload Verification Document */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Upload Verification Document (Demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} disabled={uploading} />
          {uploading && <div className="text-blue-600 mt-2">Uploading...</div>}
          {uploadError && <div className="text-red-600 mt-2">{uploadError}</div>}
          {uploadedUrl && <div className="text-green-600 mt-2">Uploaded: <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">View Document</a></div>}
        </CardContent>
      </Card>
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
              {user.role === 'student' ? 'Get Help or Help Others' : 'Instant Session'}
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
                      <p className="text-sm text-muted-foreground">{tutor.bio}</p>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Subjects</h4>
                        <div className="flex flex-wrap gap-1">
                          {tutor.subjects.map(subject => (
                            <Badge key={subject} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Qualifications</h4>
                        <div className="flex flex-wrap gap-1">
                          {tutor.qualifications.map((qual, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {qual}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">Available Times</h4>
                        <div className="space-y-2">
                          {tutor.availability.slice(0, 2).map((day) => (
                            <div key={day.day} className="text-xs">
                              <span className="font-medium">{day.day}:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {day.times.map(time => {
                                  const hasConflict = checkTimeConflict(day.day, time);
                                  const isBooked = lastBooked && lastBooked.tutorId === tutor.id && lastBooked.day === day.day && lastBooked.time === time;
                                  return (
                                    <Button
                                      key={time}
                                      size="sm"
                                      variant={hasConflict ? "destructive" : isBooked ? "secondary" : "outline"}
                                      className={`text-xs h-6 px-2 ${isBooked ? 'border-green-500 text-green-700 bg-green-50' : ''}`}
                                      onClick={() => bookSession(tutor.id, day.day, time)}
                                      disabled={hasConflict}
                                      title={hasConflict ? 'Time conflict with your schedule' : `Book ${time} session`}
                                    >
                                      {time}
                                      {isBooked && <CheckCircle className="h-3 w-3 ml-1 text-green-500" />}
                                      {hasConflict && <AlertTriangle className="h-3 w-3 ml-1" />}
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
                                      <Button onClick={() => setShowBookingConfirm(false)} className="w-full mt-2">Close</Button>
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
                    <Button className="w-full" onClick={() => toast.info('Quick booking feature coming soon!')}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Quick Book
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

