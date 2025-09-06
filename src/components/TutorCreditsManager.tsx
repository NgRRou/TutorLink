import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Coins, TrendingUp } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from "sonner";

interface TutorCreditsManagerProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    level: number;
  };
}

const TutorCreditsManager: React.FC<TutorCreditsManagerProps> = ({ user }) => {
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [cashRedeemed, setCashRedeemed] = useState(0);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState(0);
  const [tutorSummary, setTutorSummary] = useState<{
    credits_earned: number;
    cash_redeemed: number;
    total_sessions: number;
    rating: number;
    level: number;
  } | null>(null);

  useEffect(() => {
    async function fetchTutorSummary() {
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
      setCashRedeemed(data?.cash_redeemed || 0);
    }
    fetchTutorSummary();
  }, [user.id, user.level]);

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

    // Transfer at 1:1 rate (adjust if needed)
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
    toast.success(`Transfer successful to ${transferEmail}!`);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* Manage Credits & Earnings */}
      <Card className="space-y-6 p-6 bg-white shadow-md rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Coins className="h-6 w-6 text-yellow-500" />
            <span>Manage Credits & Earnings</span>
          </CardTitle>
          <CardDescription className="space-y-2">
            <p>You can redeem your earned credits for cash or transfer credits to your student account.</p>
            <p className="font-semibold text-red-600">Once you proceed a transaction, it cannot be undone.</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-6">
          {/* Redeem Cash */}
          <div className="flex-1 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition flex flex-col">
            <h3 className="font-semibold mb-2 text-gray-800">Redeem to Cash</h3>
            <p className="text-sm text-gray-600 mb-4">
              Convert your earned credits into cash. Current redeemed: <strong>RM {cashRedeemed}</strong>
            </p>
            <input
              type="text"
              value={redeemAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setRedeemAmount(Number(val));
              }}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-gray-400 mb-4"
              placeholder="Enter credits to redeem"
            />
            <div className="mt-auto">
              <Button
                className="w-full bg-gray-800 hover:bg-black text-white"
                onClick={handleCashRedeem}
              >
                Confirm Redeem
              </Button>
            </div>
          </div>

          {/* Transfer Credits */}
          <div className="flex-1 border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition flex flex-col">
            <h3 className="font-semibold mb-2 text-gray-800">Got a Student Account? Transfer Credits Here</h3>
            <p className="text-sm text-gray-600 mb-4">
              Transfer credits back to your student account to continue enjoying student features!
            </p>
            <input
              type="email"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              placeholder="Enter your student email"
            />
            <input
              type="text"
              value={transferAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setTransferAmount(Number(val));
              }}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              placeholder="Credits transfer"
            />
            <div className="mt-auto">
              <Button
                className="w-full bg-gray-800 hover:bg-black text-white"
                onClick={handleTransferCredit}
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorCreditsManager;