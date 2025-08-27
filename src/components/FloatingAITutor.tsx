import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { AITutor } from "./AITutor";
import { Bot, MessageCircle, X, Zap } from "lucide-react";

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

interface FloatingAITutorProps {
  user: User;
  accessToken: string;
  onCreditsUpdate: (credits: number) => void;
  unreadCount?: number;
}

export function FloatingAITutor({ user, accessToken, onCreditsUpdate, unreadCount }: FloatingAITutorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsOpen(!isOpen);
      setIsAnimating(false);
    }, 150);
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Pulse animation ring */}
          <div className="absolute -inset-1 bg-blue-600 rounded-full opacity-20 animate-pulse"></div>

          <Button
            size="lg"
            className="relative rounded-full h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl border-2 border-white transition-all duration-300 hover:scale-110"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Bot className="h-7 w-7 text-white" />
          </Button>

          {/* Unread count badge */}
          {unreadCount && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center text-xs p-0 border-2 border-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              Ask AI Tutor
              <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span>AI Tutor Assistant</span>
              <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                <Zap className="h-3 w-3 mr-1" />
                {user.credits} credits
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Get instant help with your studies. Upload files, ask questions, and receive personalized explanations.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            <AITutor
              user={user}
              accessToken={accessToken}
              onCreditsUpdate={onCreditsUpdate}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}