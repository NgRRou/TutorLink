import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import {
  Trophy,
  Medal,
  Award,
  Star,
  Crown,
  TrendingUp,
  Coins,
  Users,
  Calendar,
  Target
} from "lucide-react";
import { supabase } from '../utils/supabase/client';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  credits: number;
  level: number;
  experience: number;
  total_earnings: number;
  streak: number;
  role: string;
}

interface LeaderboardProps {
  user: User;
  accessToken: string;
}

interface LeaderboardEntry {
  id: string;
  user_id: string;
  score: number;
  rank: number;
  first_name: string;
  last_name: string;
  level: number;
  streak: number;
  sessions_completed: number;
  credits_earned: number;
  avatar?: string;
  badge?: string;
}

export function Leaderboard({ user, accessToken }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState('weekly');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [rewards, setRewards] = useState<any[]>([]);

  // Fetch leaderboard from Supabase
  useEffect(() => {
    async function fetchLeaderboard() {
      // Join leaderboard with student_information for names, etc.
      const { data, error } = await supabase
        .from('leaderboard')
        .select(`id, user_id, score, rank, student:student_information (first_name, last_name, level, streak, sessions_completed, total_earnings, credits)`)
        .order('rank', { ascending: true })
        .limit(10);
      if (error) {
        toast.error('Failed to load leaderboard');
        return;
      }
      if (data) {
        const entries: LeaderboardEntry[] = data.map((entry: any) => ({
          id: entry.id,
          user_id: entry.user_id,
          score: entry.score,
          rank: entry.rank,
          first_name: entry.student?.first_name || '',
          last_name: entry.student?.last_name || '',
          level: entry.student?.level || 1,
          streak: entry.student?.streak || 0,
          sessions_completed: entry.student?.sessions_completed || 0,
          credits_earned: entry.student?.credits || 0,
          badge: '',
        }));
        setLeaderboardData(entries);
        // Find current user's rank
        const userEntry = entries.find(e => e.user_id === user.id);
        setUserRank(userEntry ? userEntry.rank : 0);
      }
    }
    fetchLeaderboard();
    // Mock rewards (unchanged)
    setRewards([
      { rank: 1, credits: 100, badge: 'Gold Crown', icon: Crown },
      { rank: 2, credits: 75, badge: 'Silver Medal', icon: Medal },
      { rank: 3, credits: 50, badge: 'Bronze Trophy', icon: Trophy },
      { rank: '4-10', credits: 25, badge: 'Top 10 Star', icon: Star }
    ]);
  }, [activeTab, user.id]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-orange-500" />;
      default:
        return <span className="font-medium text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const claimReward = (rank: number) => {
    toast.success(`Congratulations! You've claimed your Top ${rank} reward!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <span>Community Leaderboard</span>
          </CardTitle>
          <CardDescription>
            Compete with fellow learners and earn rewards for your achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">#{userRank}</p>
              <p className="text-sm text-blue-600">Your Rank</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">{user.experience}</p>
              <p className="text-sm text-green-600">Total Points</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">Level {user.level}</p>
              <p className="text-sm text-purple-600">Current Level</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            <span>Weekly Rewards</span>
          </CardTitle>
          <CardDescription>Top performers earn credits and special badges</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rewards.map((reward, index) => {
              const IconComponent = reward.icon;
              return (
                <div key={index} className="text-center p-4 border rounded-lg">
                  <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-2">
                    <IconComponent className="h-6 w-6 text-yellow-600" />
                  </div>
                  <p className="font-medium">Rank {reward.rank}</p>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">{reward.credits} credits</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{reward.badge}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span>Top 10 Leaderboard</span>
          </CardTitle>
          <CardDescription>See how you stack up against other learners</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="alltime">All Time</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="space-y-4 mt-6">
              {leaderboardData.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-all hover:shadow-md ${entry.rank <= 3 ? 'border-yellow-200 bg-yellow-50' : ''
                    }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={entry.rank <= 3 ? getRankColor(entry.rank) : 'bg-gray-100'}>
                      <span className={entry.rank <= 3 ? 'text-white' : 'text-gray-700'}>
                        {getInitials(entry.first_name, entry.last_name)}
                      </span>
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{entry.first_name} {entry.last_name}</p>
                      {entry.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>Level {entry.level}</span>
                      <span>•</span>
                      <span>{entry.streak} day streak</span>
                      <span>•</span>
                      <span>{entry.sessions_completed} sessions</span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.score.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">points</p>
                  </div>

                  {/* Credits Earned */}
                  <div className="flex items-center space-x-1 text-sm">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span>{entry.credits_earned}</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4 mt-6">
              {leaderboardData.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-all hover:shadow-md ${entry.rank <= 3 ? 'border-yellow-200 bg-yellow-50' : ''
                    }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={entry.rank <= 3 ? getRankColor(entry.rank) : 'bg-gray-100'}>
                      <span className={entry.rank <= 3 ? 'text-white' : 'text-gray-700'}>
                        {getInitials(entry.first_name, entry.last_name)}
                      </span>
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{entry.first_name} {entry.last_name}</p>
                      {entry.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>Level {entry.level}</span>
                      <span>•</span>
                      <span>{entry.streak} day streak</span>
                      <span>•</span>
                      <span>{entry.sessions_completed} sessions</span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.score.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">points</p>
                  </div>

                  {/* Credits Earned */}
                  <div className="flex items-center space-x-1 text-sm">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span>{entry.credits_earned}</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="alltime" className="space-y-4 mt-6">
              {leaderboardData.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border transition-all hover:shadow-md ${entry.rank <= 3 ? 'border-yellow-200 bg-yellow-50' : ''
                    }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={entry.rank <= 3 ? getRankColor(entry.rank) : 'bg-gray-100'}>
                      <span className={entry.rank <= 3 ? 'text-white' : 'text-gray-700'}>
                        {getInitials(entry.first_name, entry.last_name)}
                      </span>
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{entry.first_name} {entry.last_name}</p>
                      {entry.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <span>Level {entry.level}</span>
                      <span>•</span>
                      <span>{entry.streak} day streak</span>
                      <span>•</span>
                      <span>{entry.sessions_completed} sessions</span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.score.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">points</p>
                  </div>

                  {/* Credits Earned */}
                  <div className="flex items-center space-x-1 text-sm">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span>{entry.credits_earned}</span>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Achievement Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Next Milestone</CardTitle>
          <CardDescription>Keep learning to reach the next reward tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Progress to Top 10</span>
                <span className="text-sm text-muted-foreground">
                  {Math.max(0, 100 - ((userRank - 10) * 2))}%
                </span>
              </div>
              <Progress value={Math.max(0, 100 - ((userRank - 10) * 2))} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {userRank <= 10 ? 'Congratulations! You\'re in the top 10!' : `${userRank - 10} ranks to go!`}
              </p>
            </div>

            {userRank <= 10 && (
              <Button onClick={() => claimReward(userRank)} className="w-full">
                <Trophy className="h-4 w-4 mr-2" />
                Claim Top 10 Reward
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}