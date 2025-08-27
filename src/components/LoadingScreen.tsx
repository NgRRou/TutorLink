import React from 'react';
import { BookOpen } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 rounded-full animate-pulse">
            <BookOpen className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <h2 className="mb-2">TutorPlatform</h2>
        <p className="text-muted-foreground">Loading your account...</p>
      </div>
    </div>
  );
}