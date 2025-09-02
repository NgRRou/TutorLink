import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Settings, Flame, TrendingUp, Coins, BookOpen, LogOut } from 'lucide-react';
import { FeatureNavigation } from './FeatureNavigation';
import { Notifications } from './Notifications';
import { supabase } from '../utils/supabase/client'; // adjust path if needed

function getInitials(firstName: string, lastName: string) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}
function getRoleDisplay(role: string) {
    if (role === 'student') return 'Student';
    if (role === 'tutor') return 'Tutor';
    return role;
}

interface ProfileSettingsProps {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        level: number;
        streak: number;
        preferredLearningStyle?: string;
    };
    currentFeature?: string;
    onFeatureSelect?: (feature: string) => void;
    onLogout?: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, currentFeature = 'profile', onFeatureSelect = () => { }, onLogout = () => { } }) => {
    const [subjectMastery, setSubjectMastery] = useState<{ subject: string; level: number }[]>([]);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [accuracy, setAccuracy] = useState(0);
    const [loginStreak, setLoginStreak] = useState(0);
    const [testsCompleted, setTestsCompleted] = useState(0);

    useEffect(() => {
        async function fetchStats() {
            if (!user?.id) return;

            // Fetch learning progress
            const { data: progressData, error: progressError } = await supabase
                .from("learning_progress")
                .select("subject, correct_answers, total_questions")
                .eq("user_id", user.id);

            let totalQuestions = 0;
            let totalCorrect = 0;

            if (!progressError && progressData) {
                totalQuestions = progressData.reduce((sum, row) => sum + (row.total_questions || 0), 0);
                totalCorrect = progressData.reduce((sum, row) => sum + (row.correct_answers || 0), 0);

                // Mastery logic (as before)
                const allSubjects = [
                    "mathematics",
                    "physics",
                    "chemistry",
                    "biology",
                    "computer-science",
                    "english"
                ];
                const mastery = allSubjects.map(subject => {
                    const row = progressData.find((r: any) => r.subject === subject);
                    return {
                        subject,
                        level: row && row.total_questions > 0
                            ? Math.round((row.correct_answers / row.total_questions) * 100)
                            : 0
                    };
                });
                setSubjectMastery(mastery);
            }

            setQuestionsAnswered(totalQuestions);
            setCorrectAnswers(totalCorrect);
            setAccuracy(totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0);
            setTestsCompleted(Math.floor(totalQuestions / 10));

            // Fetch login streak from student_information (or users)
            const { data: studentInfo, error: infoError } = await supabase
                .from("student_information")
                .select("streak")
                .eq("user_id", user.id)
                .single();

            if (!infoError && studentInfo && typeof studentInfo.streak === "number") {
                setLoginStreak(studentInfo.streak);
            } else if (user.streak) {
                setLoginStreak(user.streak);
            }
        }
        fetchStats();
    }, [user?.id]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="space-y-6 mt-8">
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
                                    <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-lg font-medium">{user.firstName} {user.lastName}</h3>
                                    <p className="text-muted-foreground">{user.email}</p>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <Badge variant="secondary">{getRoleDisplay(user.role)}</Badge>
                                        <Badge variant="outline">Level {user.level}</Badge>
                                        {user.streak > 0 && (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                                                <Flame className="h-3 w-3 mr-1" />
                                                {user.streak} day streak
                                            </Badge>
                                        )}
                                    </div>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Overall Performance */}
                                <div className="space-y-4">
                                    <h4 className="font-medium">Overall Performance</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Questions Answered</span>
                                            <span className="text-sm font-medium">{questionsAnswered}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Accuracy Rate</span>
                                            <span className="text-sm font-medium">{accuracy}%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Study Hours</span>
                                            <span className="text-sm font-medium">42.3h</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Tests Completed</span>
                                            <span className="text-sm font-medium">{testsCompleted}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Login Streak</span>
                                            <span className="text-sm font-medium flex items-center">
                                                <Flame className="h-3 w-3 mr-1 text-orange-600" />
                                                {loginStreak} days
                                            </span>
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
                                                {user.preferredLearningStyle || 'Visual'}
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

                            <Separator className="my-6" />

                            {/* Subject Mastery */}
                            <div className="space-y-4">
                                <h4 className="font-medium">Subject Mastery Levels</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {subjectMastery.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">No mastery data yet.</div>
                                    ) : (
                                        subjectMastery.map((item) => {
                                            // Pick a color based on subject
                                            const colorMap: Record<string, string> = {
                                                mathematics: "bg-blue-600",
                                                physics: "bg-green-600",
                                                chemistry: "bg-purple-600",
                                                biology: "bg-red-600",
                                                "computer-science": "bg-yellow-600",
                                                english: "bg-pink-600"
                                            };
                                            return (
                                                <div key={item.subject} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm capitalize">{item.subject}</span>
                                                        <span className="text-sm font-medium">{item.level}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${colorMap[item.subject] || "bg-blue-600"}`}
                                                            style={{ width: `${item.level}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })
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
                                        <span className="text-muted-foreground">2 hours ago</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Last Test Taken</span>
                                        <span className="text-muted-foreground">1 day ago</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Last Login Streak Update</span>
                                        <span className="text-muted-foreground">Today</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Credits Earned This Week</span>
                                        <span className="text-muted-foreground">45 credits</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;

