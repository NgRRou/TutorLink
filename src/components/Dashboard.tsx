
import React, { useState, useEffect } from 'react';


// --- INTERFACES ---
interface User {
  id: string;
  first_name: string;
  last_name: string;
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

import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import { Separator } from "./ui/separator";
import { FeatureNavigation } from "./FeatureNavigation";
import { FloatingAITutor } from "./FloatingAITutor";
import { AITutor } from "./AITutor";
import { CreditsManager } from "./CreditsManager";
import { Leaderboard } from "./Leaderboard";
import { PersonalizedTest } from "./PersonalizedTest";
import { TodoList } from "./TodoList";
import { PastYearPapers } from "./PastYearPapers";
import { TutorSessions } from "./TutorSessions";
import { Notifications } from "./Notifications";
import { Meeting } from "./Meeting";
import { CalendarTimetable } from "./CalendarTimetable";
import { PeerLearning } from "./PeerLearning";
import { useTodos } from "../hooks/useTodos";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  Star,
  Video,
  MessageCircle,
  LogOut,
  Bell,
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






interface DashboardProps {
  onLogout: () => void;
  accessToken: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, accessToken }) => {
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string } | null>(null);
  const [currentFeature, setCurrentFeature] = useState('overview');

  // Use the shared todos hook
  const { getTodaysTodos, toggleTodo } = useTodos(user?.email ?? '');
  const todaysTodos = getTodaysTodos();

  // Fetch user profile and progress from Supabase KV store
  useEffect(() => {
    const fetchProfileAndProgress = async () => {
      if (!accessToken) return;
      try {
        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0e871cde/profile`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser({
              id: data.user.id,
              first_name: data.user.first_name,
              last_name: data.user.last_name,
              email: data.user.email,
              role: data.user.role,
              credits: data.user.credits,
              experience: data.user.experience,
              level: data.user.level,
              total_earnings: data.user.total_earnings,
              sessions_completed: data.user.sessions_completed,
              streak: data.user.streak,
              weak_subjects: data.user.weak_subjects,
              preferred_learning_style: data.user.preferred_learning_style,
              last_active: data.user.last_active,
            });
            if (data.user.progress) {
              setProgress(data.user.progress);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile/progress:', err);
      }
    };
    fetchProfileAndProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Fetch daily quote when access token is available
  useEffect(() => {
    if (accessToken) {
      fetchDailyQuote();
    }
  }, [accessToken]);

  const fetchDailyQuote = async () => {
    // Don't try to fetch quote if we don't have an access token yet
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
        // Set a fallback quote if server is unavailable
        setDailyQuote({
          text: "The expert in anything was once a beginner.",
          author: "Helen Hayes"
        });
      }
    } catch (error) {
      console.error('Error fetching daily quote:', error);
      // Set a fallback quote on network error
      setDailyQuote({
        text: "Learning never exhausts the mind.",
        author: "Leonardo da Vinci"
      });
    }
  };

  const handleCreditsUpdate = (newCredits: number) => {
    setUser(prev => (prev ? { ...prev, credits: newCredits } : prev));
  };

  const handleTodoToggle = (todoId: string) => {
    toggleTodo(todoId);
  };

  // Mock data for demonstration
  const upcomingSessions = [
    {
      id: 1,
      subject: "Mathematics",
      tutor: "Sarah Johnson",
      student: "Alex Chen",
      time: "2:00 PM - 3:00 PM",
      date: "Today",
      type: "video",
      cost: 10
    },
    {
      id: 2,
      subject: "Physics",
      tutor: "Dr. Michael Brown",
      student: "Emma Davis",
      time: "4:00 PM - 5:00 PM",
      date: "Tomorrow",
      type: "video",
      cost: 15
    }
  ];

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

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = (firstName && firstName.length > 0) ? firstName.charAt(0) : '';
    const last = (lastName && lastName.length > 0) ? lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const getRoleDisplay = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
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
        return <TutorSessions user={user} accessToken={accessToken} />;
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Coins className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="text-2xl font-bold">{user?.credits ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="text-2xl font-bold">{user?.level ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Sessions</p>
                <p className="text-2xl font-bold">{user?.sessions_completed ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Streak</p>
                <p className="text-2xl font-bold">{user?.streak ?? '-'} days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Sessions */}
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
              {upcomingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{session.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {user?.role === 'tutor' ? `with ${session.student}` : `with ${session.tutor}`}
                    </p>
                    <p className="text-sm text-muted-foreground">{session.date} • {session.time}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {session.cost} credits
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Scheduled
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              No actions available in overview
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
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
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Activity history is view-only
            </div>
          </CardContent>
        </Card>

        {/* Today's Tasks - Now synced with TodoList */}
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
                todaysTodos.map((todo) => (
                  <div key={todo.id} className="flex items-center space-x-3 p-2 border rounded">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => handleTodoToggle(todo.id)}
                    />
                    <span className={`text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {todo.title}
                    </span>
                    {todo.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">
                        High
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setCurrentFeature('todo-list')}
            >
              View All Tasks
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with these popular features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              className="h-20 flex-col"
              onClick={() => setCurrentFeature('ai-tutor')}
            >
              <Bot className="h-6 w-6 mb-2" />
              Ask AI Tutor
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => setCurrentFeature('tutor-sessions')}
            >
              <Calendar className="h-6 w-6 mb-2" />
              Schedule Session
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => setCurrentFeature('personalized-test')}
            >
              <FileText className="h-6 w-6 mb-2" />
              Take Test
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col"
              onClick={() => setCurrentFeature('credits')}
            >
              <Zap className="h-6 w-6 mb-2" />
              Buy Credits
            </Button>
          </div>
        </CardContent>
      </Card>
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1>TutorPlatform</h1>

              {/* Feature Navigation */}
              <FeatureNavigation
                onFeatureSelect={setCurrentFeature}
                currentFeature={currentFeature}
                userCredits={user.credits}
                userRole={user.role}
              />
            </div>

            <div className="flex items-center space-x-4">
              <Notifications />

              <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 rounded-full">
                <Coins className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">{user.credits}</span>
              </div>

              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm">{user.first_name} {user.last_name}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {getRoleDisplay(user.role)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Level {user.level}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFeature('profile')}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h2>Welcome back, {user.first_name}!</h2>
            <p className="text-sm">{user.first_name} {user.last_name}</p>
            <p className="text-muted-foreground">Ready to learn something new today?</p>
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
  );
};