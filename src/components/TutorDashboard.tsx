import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { toast } from "sonner";
import {
    Video,
    Calendar,
    Clock,
    Star,
    Users,
    Zap,
    UserCheck,
    MessageCircle,
    DollarSign,
    Timer,
    User,
    Play,
    TrendingUp,
    Award,
    CheckCircle
} from "lucide-react";
import { supabase } from '../utils/supabase/client';

interface Session {
    id: string;
    tutorId: string;
    tutorName: string;
    studentName?: string;
    subject: string;
    difficulty: string;
    date: string;
    time: string;
    duration: number;
    cost: number;
    status: 'scheduled' | 'completed' | 'cancelled' | 'ongoing' | 'pending';
    type: 'instant' | 'booked';
    topic?: string;
}

interface InstantRequest {
    id: string;
    studentName: string;
    subject: string;
    difficulty: string;
    timeRequested: string;
    creditsOffered: number;
    urgent: boolean;
    status?: string;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    credits: number;
    role: string;
}

interface TutorDashboardProps {
    user: User;
    accessToken: string;
    onCreditsUpdate?: (credits: number) => void;
}

export function TutorDashboard({ user, accessToken, onCreditsUpdate }: TutorDashboardProps) {
    const [selectedTab, setSelectedTab] = useState('overview');
    const [sessions, setSessions] = useState<Session[]>([]);
    const [instantRequests, setInstantRequests] = useState<InstantRequest[]>([]);
    const [pendingInstantRequests, setPendingInstantRequests] = useState(0);
    const [currentUserCredits, setCurrentUserCredits] = useState(user.credits);
    const [tutorInfo, setTutorInfo] = useState<{ total_sessions: number, credits_earned: number, rating: number } | null>(null);

    useEffect(() => {
        // Fetch sessions and instant requests from the server
        async function fetchDashboardData() {
            // Fetch tutor sessions with student info
            const { data: sessionData, error: sessionError } = await supabase
                .from('tutor_sessions')
                .select(`
                    *,
                    student:student_id (
                        first_name,
                        last_name
                    )
                `)
                .eq('tutor_id', user.id)
                .order('date', { ascending: false });

            if (!sessionError && sessionData) {
                setSessions(
                    sessionData.map((s: any) => ({
                        id: s.id,
                        tutorId: s.tutor_id,
                        tutorName: `${s.tutor_first_name ?? ''} ${s.tutor_last_name ?? ''}`.trim(),
                        studentName: s.student ? `${s.student.first_name} ${s.student.last_name}` : s.student_id,
                        subject: s.subject,
                        difficulty: s.difficulty,
                        date: s.date,
                        time: s.time,
                        duration: s.duration,
                        cost: s.credits_required,
                        status: s.status,
                        type: s.type,
                    }))
                );
            } else {
                setSessions([]);
            }

            // Fetch instant requests for tutors: only show pending requests not yet accepted
            const { data: instantData, error: instantError } = await supabase
                .from('instant_requests')
                .select('*')
                .eq('status', 'pending')
                .is('tutor_id', null);

            if (!instantError && instantData) {
                setInstantRequests(
                    instantData.map((req: any) => ({
                        id: req.id,
                        studentName: `${req.student_first_name} ${req.student_last_name}`,
                        subject: req.subject,
                        difficulty: req.difficulty,
                        timeRequested: req.time_requested,
                        creditsOffered: req.credits_offered,
                        urgent: req.urgent,
                    }))
                );
                setPendingInstantRequests(instantData.length);
            } else {
                setInstantRequests([]);
                setPendingInstantRequests(0);
            }
        }

        fetchDashboardData();
    }, [accessToken, user.id]);

    useEffect(() => {
        async function fetchTutorInfo() {
            const { data, error } = await supabase
                .from('tutor_information')
                .select('total_sessions, credits_earned, rating')
                .eq('id', user.id)
                .maybeSingle();
            if (!error && data) {
                setTutorInfo({
                    total_sessions: data.total_sessions ?? 0,
                    credits_earned: data.credits_earned ?? 0,
                    rating: data.rating ?? 0,
                });
            }
        }
        fetchTutorInfo();
    }, [user.id]);

    const handleAcceptRequest = async (id: string) => {
        try {
            // Update the instant_requests table with tutor_id and status
            const { error } = await supabase
                .from('instant_requests')
                .update({
                    status: 'accepted',
                    tutor_id: user.id, // Set the tutor's ID (must exist in tutor_information)
                })
                .eq('id', id);

            if (error) {
                toast.error('Failed to accept the request: ' + error.message);
                return;
            }

            toast.success('Request accepted successfully! Session created.');
        } catch (err: any) {
            toast.error('Error accepting the request: ' + (err?.message || err));
        }
    };

    const handleDeclineRequest = async (requestId: string) => {
        // Logic to decline an instant request
        toast.success('Request declined.');
    };

    const handleStartSession = (sessionId: string) => {
        // Logic to start a session (navigate to meeting page, etc.)
    };

    // In the render, if you ever use instantRequests, make sure to only show pending:
    const visibleInstantRequests = instantRequests.filter(r => r.status === undefined || r.status === 'pending');

    // Calculate stats
    const completedSessions = tutorInfo?.total_sessions ?? 0;
    const totalEarnings = tutorInfo?.credits_earned ?? 0;
    const upcomingSessions = sessions.filter(s => s.status === 'scheduled').length;
    const pendingRequestsCount = instantRequests.length;
    const averageRating = tutorInfo?.rating ?? 0;

    const stats = [
        { label: 'Total Sessions', value: completedSessions, color: 'blue', icon: Video },
        { label: 'Completed', value: completedSessions, color: 'green', icon: CheckCircle },
        { label: 'Pending Requests', value: pendingRequestsCount, color: 'purple', icon: Clock },
        { label: 'Total Credits Earned', value: `${totalEarnings}`, color: 'orange', icon: DollarSign }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Video className="h-6 w-6 text-blue-600" />
                        <span>Tutor Dashboard</span>
                    </CardTitle>
                    <CardDescription>
                        Manage your tutoring sessions and help students learn
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {stats.map((stat, index) => {
                            const IconComponent = stat.icon;
                            return (
                                <div key={index} className={`text-center p-4 bg-${stat.color}-50 rounded-lg border`}>
                                    <div className="flex items-center justify-center mb-2">
                                        <IconComponent className={`h-6 w-6 text-${stat.color}-600`} />
                                    </div>
                                    <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                                    <div className={`text-sm text-${stat.color}-700`}>{stat.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="booked-sessions">My Sessions</TabsTrigger>
                    <TabsTrigger value="instant-requests">
                        Instant Requests
                        {pendingInstantRequests > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {pendingInstantRequests}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Upcoming Sessions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Calendar className="h-5 w-5" />
                                    <span>Upcoming Sessions</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {sessions.filter(s => s.status === 'scheduled').length === 0 ? (
                                    <div className="text-center py-4">
                                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-muted-foreground">No upcoming sessions</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sessions.filter(s => s.status === 'scheduled').slice(0, 3).map((session) => (
                                            <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <div className="font-medium">{session.studentName}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {session.subject} • {session.date} at {session.time}
                                                    </div>
                                                </div>
                                                <Badge variant="outline">{session.cost} credits</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        {/* ...other overview cards if needed... */}
                    </div>
                </TabsContent>

                {/* My Sessions Tab */}
                <TabsContent value="booked-sessions" className="space-y-4">
                    {sessions.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-8">
                                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-muted-foreground">No sessions scheduled</p>
                                <p className="text-sm text-muted-foreground">Accept instant requests or wait for bookings</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sessions.map((session) => (
                                <Card key={session.id} className="hover:shadow-md transition-shadow border-blue-200">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {/* Always show student first and last name */}
                                                <h3 className="font-semibold text-lg">
                                                    {session.studentName}
                                                </h3>
                                                <div className="text-sm text-muted-foreground">{session.subject} • {session.difficulty}</div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <Badge
                                                    variant={session.status === 'ongoing' ? 'default' : 'outline'}
                                                    className={
                                                        session.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                                                            session.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                                session.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                                                                    session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                        'bg-gray-200 text-gray-700'
                                                    }
                                                >
                                                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                                </Badge>
                                                <div className="text-xs text-gray-400 mt-1">{session.date} {session.time}</div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-sm text-muted-foreground">{session.cost} credits</span>
                                            </div>
                                            <div>
                                                {session.status === 'ongoing' && (
                                                    <Button
                                                        onClick={() => {/* logic to join session */ }}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <Play className="h-4 w-4 mr-2" />
                                                        Join Session
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Instant Requests Tab */}
                <TabsContent value="instant-requests" className="space-y-4">
                    {visibleInstantRequests.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-8">
                                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-muted-foreground">No instant requests available</p>
                                <p className="text-sm text-muted-foreground">Check back later for new requests.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {visibleInstantRequests.map((request) => (
                                <Card key={request.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-medium">{request.studentName}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {request.subject} • {request.difficulty}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {request.timeRequested}
                                                </div>
                                            </div>
                                            <Badge variant={request.urgent ? "destructive" : "outline"}>
                                                {request.creditsOffered} credits
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleAcceptRequest(request.id)}
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeclineRequest(request.id)}
                                            >
                                                Decline
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}