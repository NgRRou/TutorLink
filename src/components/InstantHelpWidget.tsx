import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { supabase } from '../utils/supabase/client';

interface InstantHelpWidgetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        credits: number;
        role: string;
    };
    currentUserCredits: number;
    onStartSession: (subject: string, difficulty: string) => void;
}

export function InstantHelpWidget({
    isOpen,
    onOpenChange,
    user,
    currentUserCredits,
    onStartSession
}: InstantHelpWidgetProps) {
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('');

    const handleStartSession = async (subject: string, difficulty: string) => {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

            // Ensure student row exists to satisfy FK
            await supabase
                .from('student_information')
                .upsert([{
                    id: user.id,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    credits: user.credits ?? 0
                }]);

            const { error } = await supabase.from('instant_requests').insert([
                {
                    student_id: user.id,
                    student_first_name: user.firstName,
                    student_last_name: user.lastName,
                    subject,
                    difficulty,
                    credits_offered: 10,
                    urgent: true,
                    status: 'pending',
                    expires_at: expiresAt,
                    time_requested: now.toISOString(),
                    tutor_id: null
                }
            ]);

            if (error) {
                toast.error('Failed to create instant request: ' + error.message);
                return;
            }

            toast.success('Instant request created successfully!');
            onOpenChange(false);
        } catch (err: any) {
            toast.error('Error creating instant request: ' + (err?.message || err));
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Instant Help</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Computer Science'].map((subject) => (
                                <SelectItem key={subject} value={subject}>
                                    {subject}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((difficulty) => (
                                <SelectItem key={difficulty} value={difficulty}>
                                    {difficulty}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => handleStartSession(selectedSubject, selectedDifficulty)}>Start</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
