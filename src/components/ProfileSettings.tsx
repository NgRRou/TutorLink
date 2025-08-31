import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Settings, Flame, TrendingUp, Coins, BookOpen, LogOut } from 'lucide-react';
import { FeatureNavigation } from './FeatureNavigation';
import { Notifications } from './Notifications';

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
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Fixed Header - exactly matches main Layout */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <BookOpen className="h-8 w-8 text-blue-600" />
                            <h1>TutorPlatform</h1>
                            <FeatureNavigation
                                onFeatureSelect={onFeatureSelect}
                                currentFeature={currentFeature}
                                userCredits={user?.level * 10}
                                userRole={user?.role || "student"}
                            />
                        </div>
                        <div className="flex items-center space-x-4">
                            <Notifications />
                            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 rounded-full">
                                <Coins className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-700">{user?.level * 10}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                                </Avatar>
                                <div className="hidden md:block">
                                    <p className="text-sm">{user?.firstName} {user?.lastName}</p>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {getRoleDisplay(user?.role)}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            Level {user?.level}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onLogout}>
                                <LogOut className="h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </header>
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
                                            <span className="text-sm font-medium">1,247</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Accuracy Rate</span>
                                            <span className="text-sm font-medium">78.5%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Study Hours</span>
                                            <span className="text-sm font-medium">42.3h</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Tests Completed</span>
                                            <span className="text-sm font-medium">23</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm">Login Streak</span>
                                            <span className="text-sm font-medium flex items-center">
                                                <Flame className="h-3 w-3 mr-1 text-orange-600" />
                                                {user.streak} days
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
                                    {[
                                        { subject: 'Mathematics', level: 85, color: 'bg-blue-600' },
                                        { subject: 'Physics', level: 72, color: 'bg-green-600' },
                                        { subject: 'Chemistry', level: 91, color: 'bg-purple-600' },
                                        { subject: 'Biology', level: 68, color: 'bg-red-600' }
                                    ].map((item) => (
                                        <div key={item.subject} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">{item.subject}</span>
                                                <span className="text-sm font-medium">{item.level}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${item.color}`}
                                                    style={{ width: `${item.level}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
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

