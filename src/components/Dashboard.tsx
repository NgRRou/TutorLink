import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from "../utils/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { FloatingAITutor } from "./FloatingAITutor";
import { AITutor } from "./AITutor";
import { CreditsManager } from "./CreditsManager";
import { Leaderboard } from "./Leaderboard";
import { PersonalizedTest } from "./PersonalizedTest";
import { TodoList } from "./TodoList";
import { PastYearPapers } from "./PastYearPapers";
import { TutorSessions } from "./TutorSessions";
import { CalendarTimetable } from "./CalendarTimetable";
import { PeerLearning } from "./PeerLearning";
import { useTodosContext, TodosProvider } from "../hooks/TodosContext";
import { toast } from "sonner";
import {
  Calendar,
  Users,
  Star,
  Video,
  MessageCircle,
  Settings,
  Bot,
  Coins,
  TrendingUp,
  Award,
  Target,
  Lightbulb,
  Zap,
  FileText,
  Upload,
  Share2,
  PaintBucket,
  User
} from "lucide-react";
import { projectId } from '../utils/supabase/info';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  credits: number;
  role: string;
  experience: number;
  level: number;
  total_earnings: number;
  sessions_completed?: number;
  streak: number;
  weak_subjects: string[];
  preferred_learning_style: string;
  last_active?: string;
  favorite_tutors?: string[];
  availability?: { day: string; times: string[] }[];
  rating?: number;
}

interface Progress {
  totalStudyTime: number;
  completedQuizzes: number;
  correctAnswers: number;
  totalQuestions: number;
  subjectProgress: Record<string, any>;
  dailyGoals: {
    studyTime: number;
    questions: number;
    completed: boolean;
  };
  weeklyStats: Record<string, any>;
  monthlyStats: Record<string, any>;
}
function mapToUserInterface(data: any): User {
  return {
    id: data.id,
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    email: data.email ?? "",
    credits: data.credits ?? data.credits_earned ?? 0,
    role: data.role ?? "student",
    experience: data.experience ?? 0,
    level: data.level ?? 1,
    total_earnings: data.total_earnings ?? 0,
    sessions_completed: data.sessions_completed ?? data.total_sessions ?? 0,
    streak: data.streak ?? 0,
    weak_subjects: data.weak_subjects ?? [],
    preferred_learning_style: data.preferred_learning_style ?? "visual",
    last_active: data.last_active ?? null,
    favorite_tutors: data.favorite_tutors ?? [],
    availability: data.availability ?? [],
    rating: typeof data.rating === "number" ? data.rating : undefined,
  };
}

interface DashboardProps {
  onLogout: () => void;
  accessToken: string;
}

interface Session {
  id: string;
  subject: string;
  date: string;
  time: string;
  cost: number;
  student?: string;
  tutor_first_name?: string;
  tutor_last_name?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, accessToken }) => {
  const [user, setUser] = useState<User | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const now = new Date();

  const upcoming = upcomingSessions.filter(session => {
    const sessionDateTime = new Date(`${session.date}T${session.time}`);
    return sessionDateTime.getTime() > Date.now();
  });

  upcoming.sort((a, b) => {
    const aDate = new Date(`${a.date}T${a.time}`);
    const bDate = new Date(`${b.date}T${b.time}`);
    return aDate.getTime() - bDate.getTime();
  });

  const navigate = useNavigate();
  const location = useLocation();

  const pathToFeature: Record<string, string> = {
    '/dashboard': 'overview',
    '/ai-tutor-assistant': 'ai-tutor',
    '/credits': 'credits',
    '/leaderboard': 'leaderboard',
    '/personalized-test': 'personalized-test',
    '/todo-list': 'todo-list',
    '/tutor-sessions': 'tutor-sessions',
    '/calendar-timetable': 'calendar',
    '/past-papers': 'past-papers',
    '/profile-settings': 'profile'
  };
  const currentFeature = pathToFeature[location.pathname] || 'overview';

  useEffect(() => {
    if (!user) return;

    if (user.experience >= 300) {
      const newLevel = (user.level || 1) + 1;
      const newExp = user.experience - 300;

      const tableName = user.role === 'tutor' ? 'tutor_information' : 'student_information';

      supabase
        .from(tableName)
        .update({ level: newLevel, experience: newExp })
        .eq('id', user.id)
        .then(({ error }) => {
          if (!error) {
            setUser(prev => prev ? { ...prev, level: newLevel, experience: newExp } : prev);
          }
        });
    }
  }, [user?.experience]);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const timesOfDay = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string } | null>(null);
  const [availability, setAvailability] = useState<{ day: string; times: string[] }[]>([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { todos, toggleTodo, getTodaysTodos } = useTodosContext();
  const todaysTodos = getTodaysTodos();

  const priorityOrder: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  const statusOrder: Record<string, number> = {
    Overdue: 0,
    Today: 1,
  };

  const filteredTodos = todaysTodos
    .filter(todo => ['Today', 'Overdue'].includes(todo.status ?? ''))
    .sort((a, b) => {
      const aStatus = a.status ?? '';
      const bStatus = b.status ?? '';

      if (statusOrder[aStatus] !== statusOrder[bStatus]) {
        return (statusOrder[aStatus] ?? 99) - (statusOrder[bStatus] ?? 99);
      }

      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const setTutorOnline = async (userId: string, online: boolean) => {
    const { error } = await supabase
      .from('tutor_information')
      .update({ is_online: online })
      .eq('id', userId);

    if (error) console.error('Failed to update tutor online status:', error);
  };

  const fetchUserProfile = async () => {
    setLoadingProfile(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoadingProfile(false);
      return;
    }

    const userId = user.id;

    // Fix: select credits_earned for tutors
    const { data: tutor, error: tutorError } = await supabase
      .from("tutor_information")
      .select("id, first_name, last_name, email, credits_earned, role, level, rating, total_sessions, availability")
      .eq("id", userId)
      .maybeSingle();

    if (tutor) {
      setUser(mapToUserInterface(tutor));
      setLoadingProfile(false);
      return;
    }

    // Fetch student profile if role is student
    const { data: student, error: studentError } = await supabase
      .from("student_information")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (student) {
      setUser(mapToUserInterface(student));
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(false);
  };

  useEffect(() => {
    fetchUserProfile();
  }, [accessToken]);

  const fetchSessions = async () => {
    if (!user) return;

    try {
      const filterField = user.role === 'student' ? 'student_id' : 'tutor_id';

      const { data, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .eq(filterField, user.id);

      if (error) {
        console.error('Error fetching sessions:', error);
        setUpcomingSessions([]);
        return;
      }

      // For tutors, fetch student names
      if (user.role === 'tutor' && data && data.length > 0) {
        const sessionsWithStudentNames = await Promise.all(
          data.map(async (session: any) => {
            let studentName = 'TBD';
            if (session.student_id) {
              const { data: studentInfo } = await supabase
                .from('student_information')
                .select('first_name,last_name')
                .eq('id', session.student_id)
                .single();
              if (studentInfo) {
                studentName = `${studentInfo.first_name} ${studentInfo.last_name}`;
              }
            }
            return {
              ...session,
              student: studentName,
            };
          })
        );
        setUpcomingSessions(sessionsWithStudentNames);
        return;
      }

      setUpcomingSessions(data || []);
    } catch (err) {
      console.error('Unexpected error fetching sessions:', err);
      setUpcomingSessions([]);
    }
  };

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  useEffect(() => {
    if (user?.role === 'tutor' && user.availability) {
      setAvailability(user.availability);
    }
  }, [user]);

  useEffect(() => {
    if (accessToken) {
      fetchDailyQuote();
    }
  }, [accessToken]);

  const fetchDailyQuote = async () => {
    if (!accessToken) {
      console.log('Skipping quote fetch - no access token available yet');
      return;
    }

    try {
      console.log('Fetching daily quote...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0e871cde/motivation/quote`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Daily quote fetched successfully');
        setDailyQuote(data.quote);
      } else {
        console.log('Quote fetch failed with status:', response.status);
        setDailyQuote({
          text: "The expert in anything was once a beginner.",
          author: "Helen Hayes"
        });
      }
    } catch (error) {
      console.error('Error fetching daily quote:', error);
      setDailyQuote({
        text: "Learning never exhausts the mind.",
        author: "Leonardo da Vinci"
      });
    }
  };

  const handleCreditsUpdate = (newCredits: number) => {
    if (!user) return;

    setUser(prev => (prev ? { ...prev, credits: newCredits } : prev));

    const tableName = user.role === 'tutor' ? 'tutor_information' : 'student_information';

    supabase
      .from(tableName)
      .select('credits')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && typeof data.credits === 'number') {
          setUser(prev => (prev ? { ...prev, credits: data.credits } : prev));
        }
      });
  };

  const handleTodoToggle = (todoId: string) => {
    toggleTodo(todoId);
  };

  const handleAddAvailability = async () => {
    if (!selectedDay || selectedTimes.length === 0 || !user) return;

    const newSlot = { day: selectedDay, times: selectedTimes };
    const updatedAvailability = [...availability, newSlot];

    setAvailability(updatedAvailability);

    const { error } = await supabase
      .from('tutor_information')
      .update({ availability: updatedAvailability })
      .eq('id', user.id);

    if (error) {
      toast.error('Error saving availability.');
    } else {
      toast.success('Availability saved!');
    }

    setSelectedDay('');
    setSelectedTimes([]);
  };

  const handleDeleteSlot = async (idx: number) => {
    if (!user) return;
    const updatedAvailability = availability.filter((_, i) => i !== idx);
    setAvailability(updatedAvailability);

    const { error } = await supabase
      .from('tutor_information')
      .update({ availability: updatedAvailability })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to delete slot.');
    } else {
      toast.success('Slot deleted successfully!');
    }
  };

  const recentActivity = [
    {
      id: 1,
      action: "AI Tutor session completed",
      subject: "Chemistry bonding",
      time: "2 hours ago",
      xp: 5
    },
    {
      id: 2,
      action: "Human tutor session",
      subject: "Calculus derivatives",
      time: "1 day ago",
      xp: 20
    },
    {
      id: 3,
      action: "Quiz completed",
      subject: "Biology basics",
      time: "2 days ago",
      xp: 15
    }
  ];

  function getInitials(firstName: string, lastName: string) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }

  const getRoleDisplay = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const handleFeatureJump = (feature: string) => {
    const featureRoutes: Record<string, string> = {
      'ai-tutor': '/ai-tutor-assistant',
      'credits': '/credits',
      'leaderboard': '/leaderboard',
      'personalized-test': '/personalized-test',
      'todo-list': '/todo-list',
      'tutor-sessions': '/tutor-sessions',
      'calendar': '/calendar-timetable',
      'past-papers': '/past-papers',
      'profile': '/profile-settings',
      'overview': '/dashboard',
    };
    if (featureRoutes[feature]) {
      navigate(featureRoutes[feature]);
    }
  };

  const renderFeatureContent = () => {
    if (!user) return <div>Loading...</div>;
    switch (currentFeature) {
      case 'ai-tutor':
        return (
          <Card className="h-[600px]">
            <AITutor
              user={user}
              accessToken={accessToken}
              onCreditsUpdate={handleCreditsUpdate}
            />
          </Card>
        );
      case 'credits':
        return (
          <CreditsManager
            user={user}
            accessToken={accessToken}
            onCreditsUpdate={handleCreditsUpdate}
          />
        );
      case 'leaderboard':
        return <Leaderboard user={user} accessToken={accessToken} />;
      case 'personalized-test':
        return <PersonalizedTest user={user} accessToken={accessToken} />;
      case 'todo-list':
        return <TodoList user={user} />;
      case 'tutor-sessions':
        return <TutorSessions user={{ ...user, first_name: user.first_name ?? '', last_name: user.last_name ?? '' }} accessToken={accessToken} />;
      case 'become-tutor':
        return renderBecomeTutorContent();
      case 'digital-whiteboard':
        return renderDigitalWhiteboardContent();
      case 'screen-sharing':
        return renderScreenSharingContent();
      case 'file-sharing':
        return renderFileSharingContent();
      case 'peer-groups':
        return <PeerLearning user={user} accessToken={accessToken} />;
      case 'calendar':
      case 'timetable':
        return <CalendarTimetable user={user} />;
      case 'past-papers':
        return <PastYearPapers user={user} accessToken={accessToken} />;
      case 'profile':
        return renderProfileContent();
      default:
        return renderOverviewContent();
    }
  };

  // Helper to calculate tutor level based on sessions_completed
  function getTutorLevel(sessions_completed: number): number {
    if (sessions_completed >= 30) return 3;
    if (sessions_completed >= 15) return 2;
    if (sessions_completed >= 5) return 1;
    return 0;
  }

  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Daily Quote */}
      {dailyQuote && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Lightbulb className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <blockquote className="text-lg italic text-gray-700 mb-2">
                  "{dailyQuote.text}"
                </blockquote>
                <cite className="text-sm text-gray-500">— {dailyQuote.author}</cite>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Credits */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Coins className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'tutor' ? 'Credits Earned' : 'Credits'}
                </p>
                <p className="text-2xl font-bold">{user ? user.credits : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* For tutor: Number of Tutor Sessions */}
        {user?.role === 'tutor' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Tutor Sessions</p>
                  <p className="text-2xl font-bold">{user.sessions_completed ?? '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* For tutor: Ratings */}
        {user?.role === 'tutor' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Ratings</p>
                  <p className="text-2xl font-bold">
                    {typeof user.rating === 'number' ? user.rating.toFixed(1) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* For tutor: Level */}
        {user?.role === 'tutor' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-2xl font-bold">
                    {typeof user.level === 'number'
                      ? user.level
                      : getTutorLevel(user.sessions_completed ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* For student: Experience, Level, Streak */}
        {user?.role !== 'tutor' && (
          <>
            {/* Experience */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Experience</p>
                    <p className="text-2xl font-bold">{user ? user.experience : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Level */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Level</p>
                    <p className="text-2xl font-bold">{user ? user.level : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Streak */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Streak</p>
                    <p className="text-2xl font-bold">{user ? user.streak : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Sessions */}
        {user?.role !== 'tutor' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="h-5 w-5 mr-2" />
                Upcoming Sessions
              </CardTitle>
              <CardDescription>Your scheduled tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcoming.length === 0 ? (
                  <div className="text-center text-muted-foreground">No upcoming sessions scheduled.</div>
                ) :
                  upcoming.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{session.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {user?.role === 'tutor'
                            ? `with ${session.student}`
                            : `with ${session.tutor_first_name} ${session.tutor_last_name}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.date} • {session.time}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Scheduled
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <Button variant="outline" onClick={() => handleFeatureJump('tutor-sessions')}>
                  View All Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity - only for student */}
        {user?.role !== 'tutor' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>Your learning progress and achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.subject}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                        <Badge variant="outline" className="text-xs">
                          +{activity.xp} XP
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Tasks - only for student */}
        {user?.role !== 'tutor' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Today's Tasks
              </CardTitle>
              <CardDescription>Your most important tasks for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysTodos.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No tasks due today</p>
                    <p className="text-xs">Add tasks with due dates to see them here</p>
                  </div>
                ) : (
                  filteredTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between space-x-3 p-2 border rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={todo.is_completed}
                          onCheckedChange={() => handleTodoToggle(todo.id)}
                        />
                        <span className={`text-sm ${todo.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                          {todo.title}
                        </span>
                      </div>
                      <Badge
                        className={`text-xs ${todo.status === 'Overdue'
                          ? 'bg-red-100 text-red-700'
                          : todo.status === 'Today'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {todo.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/todo-list')}
              >
                View All Tasks
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming Sessions for Tutor */}
      {user?.role === 'tutor' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <CardDescription>Your scheduled tutoring sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Flex container for sessions */}
            <div className="flex flex-wrap gap-4">
              {upcoming.length === 0 ? (
                <div className="text-center text-muted-foreground w-full">
                  No upcoming sessions scheduled.
                </div>
              ) : (
                upcoming.map((session) => (
                  <div
                    key={session.id}
                    className="flex-1 flex flex-col justify-between p-4 border rounded-lg bg-white shadow w-full sm:w-[48%] md:w-[30%]"
                  >
                    <div>
                      <p className="font-medium">{session.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        with {session.student}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.date} • {session.time}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Scheduled</div>
                  </div>
                ))
              )}
            </div>

            {/* View All Sessions Button */}
            {upcoming.length > 0 && (
              <div className="w-full text-center mt-4">
                <Button variant="outline" onClick={() => handleFeatureJump('tutor-sessions')}>
                  View All Sessions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inline Availability - always visible for tutors */}
      {user?.role === 'tutor' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Set Your Availability</CardTitle>
            <CardDescription>Manage your tutoring schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Slot */}
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap gap-2">
                {timesOfDay.map(time => (
                  <Button
                    key={time}
                    size="sm"
                    variant={selectedTimes.includes(time) ? 'default' : 'outline'}
                    onClick={() =>
                      setSelectedTimes(prev =>
                        prev.includes(time)
                          ? prev.filter(t => t !== time)
                          : [...prev, time]
                      )
                    }
                  >
                    {time}
                  </Button>
                ))}
              </div>

              <Button onClick={handleAddAvailability}>Add Slot</Button>
            </div>

            {/* Display Current Availability */}
            <div>
              <h4 className="font-medium mb-2">Your Availability</h4>
              {availability.length === 0 ? (
                <p className="text-sm text-muted-foreground">No slots added yet.</p>
              ) : (
                <div className="space-y-2">
                  {availability.map((slot, idx) => (
                    <div key={idx} className="flex items-center justify-between border p-2 rounded">
                      <div>
                        <b>{slot.day}:</b> {slot.times.join(", ")}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSlot(idx)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {user?.role !== 'tutor' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with these popular features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                className="h-20 flex-col"
                onClick={() => navigate('/ai-tutor-assistant')}
              >
                <Bot className="h-6 w-6 mb-2" />
                Ask AI Tutor
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => navigate('/tutor-sessions')}
              >
                <Calendar className="h-6 w-6 mb-2" />
                Schedule Session
              </Button>
              <Button
                className="h-20 flex-col"
                onClick={() => navigate('/personalized-test')}
              >
                <FileText className="h-6 w-6 mb-2" />
                Take Test
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => navigate('/credits')}
              >
                <Zap className="h-6 w-6 mb-2" />
                Buy Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions for Tutor */}
      {user?.role === 'tutor' && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your earnings and credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                className="h-20 flex-col"
                onClick={() => navigate('/tutor-sessions')}
              >
                <Video className="h-6 w-6 mb-2" />
                Tutor Sessions
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => navigate('/tutor-credits')}
              >
                <Coins className="h-6 w-6 mb-2" />
                Cash Redeem
              </Button>
              <Button
                className="h-20 flex-col"
                onClick={() => navigate('/tutor-credits')}
              >
                <Coins className="h-6 w-6 mb-2" />
                Transfer Credit
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col"
                onClick={() => navigate('/calendar-timetable')}
              >
                <Coins className="h-6 w-6 mb-2" />
                Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Placeholder implementations for other features
  const renderBecomeTutorContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Award className="h-6 w-6 text-purple-600" />
          <span>Become a Tutor</span>
        </CardTitle>
        <CardDescription>Apply to become a tutor and earn credits by helping others</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Tutor application system coming soon!</p>
          <p className="text-sm">Share your knowledge and earn rewards</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderDigitalWhiteboardContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PaintBucket className="h-6 w-6 text-green-600" />
          <span>Digital Whiteboard</span>
        </CardTitle>
        <CardDescription>Interactive whiteboard for collaborative learning</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <PaintBucket className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Digital whiteboard feature coming soon!</p>
          <p className="text-sm">Draw, solve problems, and collaborate in real-time</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderScreenSharingContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Share2 className="h-6 w-6 text-blue-600" />
          <span>Screen Sharing</span>
        </CardTitle>
        <CardDescription>Share your screen during tutoring sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Screen sharing feature coming soon!</p>
          <p className="text-sm">Share your screen for better collaboration</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderFileSharingContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-6 w-6 text-orange-600" />
          <span>File Sharing</span>
        </CardTitle>
        <CardDescription>Upload and share study materials</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>File sharing feature coming soon!</p>
          <p className="text-sm">Upload documents, PDFs, and images to share with tutors</p>
        </div>
      </CardContent>
    </Card>
  );

  const renderProfileContent = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-gray-600" />
            <span>Profile Settings</span>
          </CardTitle>
          <CardDescription>Manage your account and learning preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback>{getInitials(user?.first_name ?? '', user?.last_name ?? '')}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{user?.first_name ?? ''} {user?.last_name ?? ''}</h3>
              <p className="text-muted-foreground">{user?.email ?? ''}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary">{getRoleDisplay(user?.role ?? '')}</Badge>
                <Badge variant="outline">Level {user?.level ?? '-'}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">Last active: {user?.last_active ? new Date(user.last_active).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracking Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Progress Tracking</span>
          </CardTitle>
          <CardDescription>Detailed analysis of your learning journey</CardDescription>
        </CardHeader>
        <CardContent>
          {progress ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Performance */}
              <div className="space-y-4">
                <h4 className="font-medium">Overall Performance</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Questions Answered</span>
                    <span className="text-sm font-medium">{progress.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accuracy Rate</span>
                    <span className="text-sm font-medium">{progress.totalQuestions > 0 ? ((progress.correctAnswers / progress.totalQuestions) * 100).toFixed(1) : '0'}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Study Hours</span>
                    <span className="text-sm font-medium">{(progress.totalStudyTime / 60).toFixed(1)}h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tests Completed</span>
                    <span className="text-sm font-medium">{progress.completedQuizzes}</span>
                  </div>
                </div>
              </div>

              {/* Learning Style */}
              <div className="space-y-4">
                <h4 className="font-medium">Learning Preferences</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Preferred Style</span>
                    <Badge variant="outline" className="capitalize">
                      {user?.preferred_learning_style || 'Visual'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Best Study Time</span>
                    <span className="text-sm font-medium">Evening</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Session Length</span>
                    <span className="text-sm font-medium">45 min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Difficulty Preference</span>
                    <span className="text-sm font-medium">Intermediate</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>Loading progress...</div>
          )}

          <Separator className="my-6" />

          {/* Subject Mastery */}
          <div className="space-y-4">
            <h4 className="font-medium">Subject Mastery Levels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progress && progress.subjectProgress && Object.keys(progress.subjectProgress).length > 0 ? (
                Object.entries(progress.subjectProgress).map(([subject, subjData]: any) => (
                  <div key={subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{subject}</span>
                      <span className="text-sm font-medium">{subjData.level ? `${subjData.level}%` : 'N/A'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-blue-600`}
                        style={{ width: `${subjData.level || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No subject mastery data yet.</div>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Recent Activity */}
          <div className="space-y-4">
            <h4 className="font-medium">Recent Learning Activity</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Last AI Tutor Session</span>
                <span className="text-muted-foreground">{user?.last_active ? new Date(user.last_active).toLocaleString() : 'N/A'}</span>
              </div>
              {/* Add more activity fields as needed */}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account preferences and privacy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Profile editing features coming soon!</p>
            <p className="text-sm">Email preferences, password changes, and privacy settings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-lg text-gray-600">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Main Content */}
        <main className="px-4 py-6">
          {/* User Info Header */}
          <div className="mb-8 flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>
                {/* Robust initials fallback: use first_name/last_name, fallback to email chars, then 'U' */}
                {getInitials(
                  user.first_name && user.first_name.trim() ? user.first_name : (user.email ? user.email[0] : 'U'),
                  user.last_name && user.last_name.trim() ? user.last_name : (user.email ? user.email[1] || user.email[0] : 'U')
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2>
                {(() => {
                  const hasFirst = user.first_name && user.first_name.trim();
                  const hasLast = user.last_name && user.last_name.trim();
                  if (hasFirst && hasLast) {
                    return `Welcome back, ${user.last_name} ${user.first_name}!`;
                  } else if (hasFirst) {
                    return `Welcome back, ${user.first_name}!`;
                  } else if (hasLast) {
                    return `Welcome back, ${user.last_name}!`;
                  } else {
                    return 'Welcome back, User!';
                  }
                })()}
              </h2>
              <p className="text-muted-foreground mt-1">Ready to learn something new today?</p>
            </div>
          </div>
          {renderFeatureContent()}
        </main>

        {/* Floating AI Tutor */}
        <FloatingAITutor
          user={user}
          accessToken={accessToken}
          onCreditsUpdate={handleCreditsUpdate}
        />
      </div>
    </div>
  );
};