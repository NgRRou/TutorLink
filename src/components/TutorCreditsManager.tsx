import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { Coins } from 'lucide-react';
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

  const [studentToConfirm, setStudentToConfirm] = useState<{ id: string; first_name: string; last_name: string; credits: number } | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    async function fetchTutorSummary() {
      const { data } = await supabase
        .from("tutor_information")
        .select("cash_redeemed")
        .eq("id", user.id)
        .maybeSingle();
      setCashRedeemed(data?.cash_redeemed || 0);
    }
    fetchTutorSummary();
  }, [user.id]);

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

  async function handleCheckTransfer() {
    if (!transferEmail || transferAmount <= 0) return toast.error("Enter valid email and amount.");

    const { data: tutorData } = await supabase
      .from("tutor_information")
      .select("credits_earned")
      .eq("id", user.id)
      .maybeSingle();
    if (!tutorData || tutorData.credits_earned < transferAmount) return toast.error("Not enough credits.");

    const { data: studentData } = await supabase
      .from("student_information")
      .select("id, first_name, last_name, credits")
      .eq("email", transferEmail)
      .maybeSingle();
    if (!studentData) return toast.error("Account not found.");

    setStudentToConfirm(studentData);
    setShowDialog(true);
  }

  async function confirmTransfer() {
  if (!studentToConfirm) return;

  const studentCreditsToAdd = transferAmount * 2;

  // 1. Get current tutor credits
  const { data: tutorData, error: tutorError } = await supabase
    .from("tutor_information")
    .select("credits_earned")
    .eq("id", user.id)
    .maybeSingle();

  if (tutorError || !tutorData) return toast.error("Could not fetch tutor info.");
  if (tutorData.credits_earned < transferAmount) return toast.error("Not enough credits.");

  // 2. Update tutor credits
  const { error: tutorUpdateError } = await supabase
    .from("tutor_information")
    .update({ credits_earned: tutorData.credits_earned - transferAmount })
    .eq("id", user.id);

  // 3. Update student credits
  const { error: studentUpdateError } = await supabase
    .from("student_information")
    .update({ credits: (studentToConfirm.credits || 0) + studentCreditsToAdd })
    .eq("id", studentToConfirm.id);

  if (tutorUpdateError || studentUpdateError) {
    toast.error("Transfer failed.");
  } else {
    toast.success(
      `Successfully transferred ${studentCreditsToAdd} student credits to ${studentToConfirm.first_name} ${studentToConfirm.last_name}.`
    );
  }

  setShowDialog(false);
  setStudentToConfirm(null);
  setTransferEmail("");
  setTransferAmount(0);
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

            <div className="h-11 mb-4" />

            <input
              type="text"
              value={redeemAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setRedeemAmount(Number(val));
              }}
              className="border px-3 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-gray-400 mb-4 h-11"
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
              Transfer credits back to your student account to continue enjoying student features with rate higher than redeem to cash! 
              <span className="block">
                Transfer rate: <strong>1 tutor credit → 2 student credits</strong>
              </span>
            </p>
            <input
              type="email"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              className="border px-3 py-2 h-11 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              placeholder="Enter your student email"
            />

            <input
              type="text"
              value={transferAmount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setTransferAmount(Number(val));
              }}
              className="border px-3 py-2 h-11 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              placeholder="Credits transfer"
            />
            <div className="mt-auto">
              <Button
                className="w-full bg-gray-800 hover:bg-black text-white"
                onClick={handleCheckTransfer}
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Transfer</DialogTitle>
            <DialogDescription>
              You are about to transfer <strong>{transferAmount}</strong> tutor credits to{" "}
              <strong>{studentToConfirm?.first_name} {studentToConfirm?.last_name}</strong>.  
              He / She will receive <strong>{transferAmount * 2}</strong> student credits.  
              <br /><br />
              Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-gray-800 text-white" onClick={confirmTransfer}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TutorCreditsManager;
