import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
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
  onCreditsUpdate?: (credits: number) => void; // <-- add this prop
}

interface LeaderboardEntry {
  id: string;
  user_id: string;
  experience: number;
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

export function Leaderboard({ user, accessToken, onCreditsUpdate }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState('monthly');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [userExperience, setUserExperience] = useState<number>(0);
  const [rewards, setRewards] = useState<any[]>([]);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useEffect(() => {
    async function fetchLeaderboardAndUser() {
      // Fetch leaderboard rows (top 10 by experience)
      const { data: leaderboardRows, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('id, student_id, experience, rank')
        .order('experience', { ascending: false })
        .limit(10);

      if (leaderboardError) {
        console.error('Supabase leaderboard error:', leaderboardError);
        toast.error('Failed to load leaderboard');
        return;
      }

      let entries: LeaderboardEntry[] = [];
      let userLeaderboardRow: any = null;
      if (leaderboardRows && leaderboardRows.length > 0) {
        // Get all student_ids
        const studentIds = leaderboardRows.map((row: any) => row.student_id);

        // Fetch all student_information in one query
        const { data: students, error: studentsError } = await supabase
          .from('student_information')
          .select('id, first_name, last_name, level, streak, sessions_completed, credits')
          .in('id', studentIds);

        if (studentsError) {
          console.error('Supabase student_information error:', studentsError);
          toast.error('Failed to load student info');
          return;
        }

        // Map student_id to student info
        const studentMap: Record<string, any> = {};
        students.forEach((student: any) => {
          studentMap[student.id] = student;
        });

        entries = leaderboardRows.map((row: any, idx: number) => {
          if (row.student_id === user.id) userLeaderboardRow = row;
          const student = studentMap[row.student_id] || {};
          return {
            id: row.id,
            user_id: row.student_id,
            experience: row.experience,
            rank: idx + 1,
            first_name: student.first_name || '',
            last_name: student.last_name || '',
            level: student.level || 1,
            streak: student.streak || 0,
            sessions_completed: student.sessions_completed || 0,
            credits_earned: student.credits || 0,
            badge: '',
          };
        });
        setLeaderboardData(entries);

        // Find current user's rank
        const userEntry = entries.find(e => e.user_id === user.id);
        setUserRank(userEntry ? userEntry.rank : 0);
      }

      // Fetch user's actual rank
      const { data: allRanks, error: allRanksError } = await supabase
        .from('leaderboard')
        .select('student_id')
        .order('experience', { ascending: false });

      if (!allRanksError && allRanks) {
        const actualRank = allRanks.findIndex((row: any) => row.student_id === user.id) + 1;
        setUserRank(actualRank > 0 ? actualRank : 0);
      }

      // Fetch user credits and experience from student_information
      const { data: student, error: studentError } = await supabase
        .from('student_information')
        .select('credits, experience')
        .eq('id', user.id)
        .maybeSingle();
      if (!studentError && student) {
        setUserCredits(student.credits);
        setUserExperience(student.experience);
      }
      // Always fetch reward_claimed from leaderboard table for current user
      const { data: claimedRow, error: claimedError } = await supabase
        .from('leaderboard')
        .select('reward_claimed')
        .eq('student_id', user.id)
        .maybeSingle();
      setRewardClaimed(claimedRow?.reward_claimed === true);
    }
    fetchLeaderboardAndUser();
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
        return (
          <span className="inline-flex items-center space-x-1">
            <Star className="h-5 w-5 text-blue-400" />
            <span className="font-medium text-muted-foreground">#{rank}</span>
          </span>
        );
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

  function getInitials(firstName: string, lastName: string) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }

  // Remove tabs, only show monthly leaderboard
  const claimReward = async (rank: number) => {
    if (rewardClaimed) {
      toast.info('You already claimed this reward.');
      return;
    }
    let creditsToAdd = 0;
    if (rank === 1) creditsToAdd = 100;
    else if (rank === 2) creditsToAdd = 75;
    else if (rank === 3) creditsToAdd = 50;
    else if (rank >= 4 && rank <= 10) creditsToAdd = 25;
    else {
      toast.error('No reward for this rank.');
      return;
    }
    // Add credits to student_information
    const { error: updateCreditsError } = await supabase
      .from('student_information')
      .update({ credits: userCredits + creditsToAdd })
      .eq('id', user.id);

    // Set reward_claimed to true in leaderboard table
    const { data: leaderboardRow } = await supabase
      .from('leaderboard')
      .select('id')
      .eq('student_id', user.id)
      .maybeSingle();

    if (leaderboardRow) {
      const { error: updateLeaderboardError } = await supabase
        .from('leaderboard')
        .update({ reward_claimed: true })
        .eq('id', leaderboardRow.id);
      if (updateLeaderboardError) {
        toast.error('Failed to update leaderboard reward status.');
        return;
      }
    }

    if (updateCreditsError) {
      toast.error('Failed to claim reward.');
      return;
    }
    setUserCredits(userCredits + creditsToAdd);
    if (onCreditsUpdate) onCreditsUpdate(userCredits + creditsToAdd);
    setRewardClaimed(true); // <-- update local state
    toast.success(`Congratulations! You've claimed your Top ${rank} reward and earned ${creditsToAdd} credits!`);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
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
              <p className="text-2xl font-bold text-green-700">{userExperience}</p>
              <p className="text-sm text-green-600">Total Experience</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">{userCredits}</p>
              <p className="text-sm text-purple-600">Credits Earned</p>
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
          {/* Only show monthly leaderboard */}
          <div className="space-y-4 mt-6">
            {leaderboardData.map((entry, index) => (
              <div key={entry.id} className={`flex items-center space-x-4 p-4 rounded-lg border transition-all hover:shadow-md ${entry.rank <= 3 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
                {/* Rank */}
                <div className="flex-shrink-0 w-12 text-center flex flex-col items-center">
                  {getRankIcon(entry.rank)}
                  <span className="text-xs font-semibold text-muted-foreground mt-1">#{entry.rank}</span>
                </div>

                {/* Avatar (initials only) */}
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

                {/* Experience */}
                <div className="text-right">
                  <p className="font-bold text-lg">{entry.experience.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">exp</p>
                </div>
              </div>
            ))}
          </div>
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
                  {userRank <= 10 ? '100%' : `${Math.min(100, Math.max(0, 100 - ((userRank - 10) * 2)))}%`}
                </span>
              </div>
              <Progress value={userRank <= 10 ? 100 : Math.min(100, Math.max(0, 100 - ((userRank - 10) * 2)))} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {userRank <= 10 ? 'Congratulations! You\'re in the top 10!' : `${userRank - 10} ranks to go!`}
              </p>
            </div>

            {userRank <= 10 && (
              <Button
                onClick={() => claimReward(userRank)}
                className="w-full"
                disabled={rewardClaimed}
              >
                <Trophy className="h-4 w-4 mr-2" />
                {rewardClaimed ? 'You already claimed this reward' : 'Claim Top 10 Reward'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}