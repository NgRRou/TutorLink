import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Settings, Flame, TrendingUp, Coins, BookOpen, LogOut } from 'lucide-react';
import { FeatureNavigation } from './FeatureNavigation';
import { Notifications } from './Notifications';
import { supabase } from '../utils/supabase/client';
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";

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

    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [redeemAmount, setRedeemAmount] = useState(0);
    const [cashRedeemed, setCashRedeemed] = useState(0);

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferEmail, setTransferEmail] = useState("");
    const [transferAmount, setTransferAmount] = useState(0);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [tutorSummary, setTutorSummary] = useState<{
        credits_earned: number;
        cash_redeemed: number;
        total_sessions: number;
        rating: number;
        level: number;
    } | null>(null);

    useEffect(() => {
        async function fetchStats() {
            if (!user?.id) return;

            const { data: progressData, error: progressError } = await supabase
                .from("learning_progress")
                .select("subject, correct_answers, total_questions")
                .eq("user_id", user.id);

            let totalQuestions = 0;
            let totalCorrect = 0;

            if (!progressError && progressData) {
                totalQuestions = progressData.reduce((sum, row) => sum + (row.total_questions || 0), 0);
                totalCorrect = progressData.reduce((sum, row) => sum + (row.correct_answers || 0), 0);

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

    useEffect(() => {
        async function fetchCashRedeemed() {
            if (user.role !== "tutor") return;
            const { data, error } = await supabase
                .from("tutor_information")
                .select("cash_redeemed")
                .eq("id", user.id)
                .maybeSingle();
            if (!error && data) setCashRedeemed(data.cash_redeemed || 0);
        }
        fetchCashRedeemed();
    }, [user.id, user.role]);

    useEffect(() => {
        if (feedbackMessage) {
            const timer = setTimeout(() => setFeedbackMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedbackMessage]);

    useEffect(() => {
        async function fetchTutorSummary() {
            if (user.role !== "tutor") return;
            const { data, error } = await supabase
                .from("tutor_information")
                .select("credits_earned, cash_redeemed, total_sessions, rating, level")
                .eq("id", user.id)
                .maybeSingle();
            if (!error && data) setTutorSummary({
                credits_earned: data.credits_earned || 0,
                cash_redeemed: data.cash_redeemed || 0,
                total_sessions: data.total_sessions || 0,
                rating: typeof data.rating === "number" ? data.rating : 0,
                level: data.level || user.level || 1,
            });
        }
        fetchTutorSummary();
    }, [user.id, user.role, user.level]);

    async function handleCashRedeem() {
        if (redeemAmount <= 0) return toast.error("Enter a valid amount.");
        const { data, error } = await supabase
            .from("tutor_information")
            .select("credits_earned, cash_redeemed")
            .eq("id", user.id)
            .maybeSingle();
        if (error || !data) return toast.error("Could not fetch tutor info.");
        if (data.credits_earned < redeemAmount) return toast.error("Not enough credits.");

        const newCredits = data.credits_earned - redeemAmount;
        const newCash = (data.cash_redeemed || 0) + redeemAmount;

        const { error: updateError } = await supabase
            .from("tutor_information")
            .update({ credits_earned: newCredits, cash_redeemed: newCash })
            .eq("id", user.id);
        if (updateError) return toast.error("Failed to redeem cash.");

        setCashRedeemed(newCash);
        setRedeemAmount(0);
        setShowRedeemModal(false);
        toast.success(`Successfully redeemed RM${redeemAmount}!`);
    }

    async function handleTransferCredit() {
        if (!transferEmail || transferAmount <= 0) return toast.error("Enter valid email and amount.");
        const { data: tutorData, error: tutorError } = await supabase
            .from("tutor_information")
            .select("credits_earned")
            .eq("id", user.id)
            .maybeSingle();
        if (tutorError || !tutorData) return toast.error("Could not fetch tutor info.");
        if (tutorData.credits_earned < transferAmount) return toast.error("Not enough credits.");

        const { data: studentData, error: studentError } = await supabase
            .from("student_information")
            .select("id, credits")
            .eq("email", transferEmail)
            .maybeSingle();
        if (studentError || !studentData) return toast.error("Account not found.");

        const transferredCredits = Math.round(transferAmount * 1.5);

        const { error: tutorUpdateError } = await supabase
            .from("tutor_information")
            .update({ credits_earned: tutorData.credits_earned - transferAmount })
            .eq("id", user.id);
        const { error: studentUpdateError } = await supabase
            .from("student_information")
            .update({ credits: (studentData.credits || 0) + transferAmount })
            .eq("id", studentData.id);

        if (tutorUpdateError || studentUpdateError) return toast.error("Transfer failed.");

        setTransferEmail("");
        setTransferAmount(0);
        setShowTransferModal(false);
        toast.success("Transfer successful to ${transferEmail}!");
    }

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

                    {/* Tutor Summary Card */}
                    {user.role === "tutor" && tutorSummary && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                    <span>Summary</span>
                                </CardTitle>
                                <CardDescription>
                                    Overview of your tutoring progress and achievements
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg font-bold text-blue-700">{tutorSummary.credits_earned}</span>
                                        <span className="text-xs text-gray-500">Credits Earned</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg font-bold text-green-700">RM {tutorSummary.cash_redeemed}</span>
                                        <span className="text-xs text-gray-500">Cash Redeemed</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg font-bold text-purple-700">{tutorSummary.total_sessions}</span>
                                        <span className="text-xs text-gray-500">Total Sessions</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg font-bold text-yellow-600">{tutorSummary.rating?.toFixed(1) ?? '-'}</span>
                                        <span className="text-xs text-gray-500">Rating</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg font-bold text-gray-800">{tutorSummary.level}</span>
                                        <span className="text-xs text-gray-500">Level</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                        {/* Progress Tracking Section */}
                        {user.role === "student" && (
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
                        )}
                    {/* ...rest of profile page... */}
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;

