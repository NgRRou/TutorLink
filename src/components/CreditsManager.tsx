import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import {
  Coins,
  CreditCard,
  Gift,
  Star,
  Zap,
  Crown,
  TrendingUp,
  Clock,
  Calendar,
  Users,
  Trophy
} from "lucide-react";
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  credits: number;
  experience: number;
  level: number;
  total_earnings: number;
  sessions_completed?: number;
  streak?: number;
  weak_subjects?: string[];
  preferred_learning_style?: string;
  last_active?: string;
}

interface CreditsManagerProps {
  user: User;
  accessToken: string;
  onCreditsUpdate: (credits: number) => void;
  onFeatureNavigate?: (feature: string) => void;
}

export function CreditsManager({ user, accessToken, onCreditsUpdate, onFeatureNavigate }: CreditsManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dailyLoginClaimed, setDailyLoginClaimed] = useState(false);
  const [localCredits, setLocalCredits] = useState(user.credits);
  const navigate = useNavigate();

  React.useEffect(() => {
    async function checkClaimed() {
      const { data, error } = await supabase
        .from("student_information")
        .select("last_claimed")
        .eq("id", user.id)
        .single();
      if (!error && data?.last_claimed) {
        const today = new Date().toISOString().split("T")[0];
        const lastClaimed = data.last_claimed.split("T")[0];
        setDailyLoginClaimed(today === lastClaimed);
      } else {
        setDailyLoginClaimed(false);
      }
    }
    if (user?.id) checkClaimed();
  }, [user?.id]);

  const creditPackages = [
    {
      id: 'basic',
      name: 'Basic Pack',
      credits: 20,
      price: 'RM10',
      originalPrice: 'RM12',
      popular: false,
      icon: <Coins className="h-6 w-6" />,
      color: 'from-blue-500 to-blue-600',
      features: [
        '20 AI Tutor questions',
        'Basic progress tracking',
        'Email support'
      ]
    },
    {
      id: 'standard',
      name: 'Standard Pack',
      credits: 50,
      price: 'RM20',
      originalPrice: 'RM25',
      popular: true,
      icon: <Star className="h-6 w-6" />,
      color: 'from-purple-500 to-purple-600',
      features: [
        '50 AI Tutor questions',
        'Advanced progress tracking',
        'Priority support',
        'Study reminders'
      ]
    },
    {
      id: 'premium',
      name: 'Premium Pack',
      credits: 100,
      price: 'RM35',
      originalPrice: 'RM50',
      popular: false,
      icon: <Zap className="h-6 w-6" />,
      color: 'from-orange-500 to-orange-600',
      features: [
        '100 AI Tutor questions',
        'Personalized study plans',
        'Weekly progress reports',
        'Live tutor sessions (2)',
        'Priority matching'
      ]
    },
    {
      id: 'ultimate',
      name: 'Ultimate Pack',
      credits: 200,
      price: 'RM60',
      originalPrice: 'RM100',
      popular: false,
      icon: <Crown className="h-6 w-6" />,
      color: 'from-yellow-500 to-yellow-600',
      features: [
        '200 AI Tutor questions',
        'Unlimited progress tracking',
        'Personal tutor matching',
        'Live tutor sessions (5)',
        'Custom study materials',
        'VIP support'
      ]
    }
  ];

  const purchaseCredits = async (packageId: string) => {
    const packageData = creditPackages.find(pkg => pkg.id === packageId);
    if (!packageData) return;

    setIsLoading(true);

    const newCredits = localCredits + packageData.credits;
    setLocalCredits(newCredits);
    onCreditsUpdate(newCredits);

    const { error } = await supabase
      .from('student_information')
      .update({ credits: newCredits })
      .eq('id', user.id);

    if (error) {
      toast.error('Failed to update credits in your account.');
      setIsLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('student_information')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle();
    if (!fetchError && data && typeof data.credits === 'number') {
      setLocalCredits(data.credits);
      onCreditsUpdate(data.credits);
    }
    toast.success('Purchase successful! Credits have been added to your account.');
    setIsLoading(false);
  };

  const claimDailyLogin = async () => {
    setIsLoading(true);
    const today = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_information")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      const newCredits = (data.credits || 0) + 5;
      const { error: updateError } = await supabase
        .from("student_information")
        .update({
          credits: newCredits,
          last_claimed: today
        })
        .eq("id", user.id);
      if (!updateError) {
        setLocalCredits(newCredits);
        onCreditsUpdate(newCredits);
        setDailyLoginClaimed(true);
        toast.success("+5 credits earned from daily login bonus!");
      } else {
        toast.error("Failed to claim daily bonus.");
      }
    }
    setIsLoading(false);
  };

  const navigateToTutorSessions = () => {
    onFeatureNavigate?.('tutor-sessions');
  };

  const navigateToLeaderboard = () => {
    onFeatureNavigate?.('leaderboard');
  };

  const getNextLevelCredits = () => {
    const baseCredits = user.level * 100;
    const currentLevelCredits = user.experience % 100;
    return baseCredits - currentLevelCredits;
  };

  const getProgressPercent = () => {
    return (user.experience % 100);
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-yellow-600" />
            <span>Credit Overview</span>
          </CardTitle>
          <CardDescription>Track your credits and progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-2">
                <Coins className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-700">{localCredits}</p>
              <p className="text-sm text-yellow-600">Available Credits</p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">{user.level}</p>
              <p className="text-sm text-blue-600">Current Level</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">{user.sessions_completed ?? 0}</p>
              <p className="text-sm text-green-600">Sessions Done</p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Level {user.level} Progress</span>
              <span className="text-sm text-muted-foreground">{getProgressPercent()}/100 XP</span>
            </div>
            <Progress value={getProgressPercent()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {100 - getProgressPercent()} XP to level {user.level + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Credit Packages</span>
          </CardTitle>
          <CardDescription>Choose the perfect package for your learning needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative p-6 rounded-lg border-2 transition-all hover:shadow-lg flex flex-col h-full ${pkg.popular ? 'border-purple-200 bg-purple-50' : 'border-gray-200'
                  }`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-600">
                    Most Popular
                  </Badge>
                )}

                <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${pkg.color} text-white mb-4`}>
                  {pkg.icon}
                </div>

                <h3 className="text-lg font-semibold mb-2">{pkg.name}</h3>

                <div className="mb-4">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold">{pkg.price}</span>
                    <span className="text-sm text-muted-foreground line-through">{pkg.originalPrice}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{pkg.credits} credits</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {pkg.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 flex-shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  <Button
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                    onClick={() => purchaseCredits(pkg.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Purchase'}
                  </Button>
                  <div className="mt-2 text-center">
                    <span className="text-xs text-muted-foreground">
                      {(pkg.credits / 10).toFixed(0)} credits / RM 1
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Earning Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-green-600" />
            <span>Earn Free Credits</span>
          </CardTitle>
          <CardDescription>Multiple ways to earn credits without spending money</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Daily Login Bonus */}
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-700 mb-1">+5 Credits</p>
              <p className="text-sm text-green-600 mb-3">Daily Login Bonus</p>
              <Button
                size="sm"
                variant="outline"
                disabled={dailyLoginClaimed || isLoading}
                onClick={claimDailyLogin}
              >
                {dailyLoginClaimed ? 'Claimed' : isLoading ? 'Claiming...' : 'Claim Now'}
              </Button>
            </div>

            {/* Help Other Students */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-blue-700 mb-1">+10 Credits</p>
              <p className="text-sm text-blue-600 mb-3">Help Other Students</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.info("Kindly log out and sign up as a tutor to help other students!")}
              >
                Help Now
              </Button>
            </div>

            {/* Top 10 Leaderboard */}
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-purple-700 mb-1">+25 Credits</p>
              <p className="text-sm text-purple-600 mb-3">Top 10 Leaderboard</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/leaderboard")}
              >
                View Leaderboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}