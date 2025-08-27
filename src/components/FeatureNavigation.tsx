import React from 'react';
import { Button } from "./ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { 
  Menu,
  Bot,
  Coins,
  Calendar,
  Users,
  FileText,
  Trophy,
  Target,
  CheckSquare,
  PaintBucket,
  Share2,
  Upload,
  BookOpen,
  User,
  MessageSquare,
  Video,
  BarChart3,
  Award,
  Zap
} from "lucide-react";

interface FeatureNavigationProps {
  onFeatureSelect: (feature: string) => void;
  currentFeature: string;
  userCredits: number;
  userRole: string; // Add user role
}

export function FeatureNavigation({ onFeatureSelect, currentFeature, userCredits, userRole }: FeatureNavigationProps) {
  const studentFeatures = [
    {
      category: "Learning",
      items: [
        { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
        { id: 'ai-tutor', label: 'AI Tutor Assistant', icon: Bot, badge: 'Smart' },
        { id: 'personalized-test', label: 'Personalized Tests', icon: FileText },
        { id: 'past-papers', label: 'Past Year Papers', icon: BookOpen },
      ]
    },
    {
      category: "Tutoring",
      items: [
        { id: 'tutor-sessions', label: 'Tutor Sessions', icon: Video },
        { id: 'file-sharing', label: 'File Sharing', icon: Upload },
      ]
    },
    {
      category: "Community",
      items: [
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, badge: 'Rewards' },
        { id: 'peer-groups', label: 'Peer Learning Groups', icon: Users },
        { id: 'credits', label: 'Credits & Packages', icon: Coins },
      ]
    },
    {
      category: "Organization",
      items: [
        { id: 'calendar', label: 'Calendar & Timetable', icon: Calendar },
        { id: 'todo-list', label: 'To-Do List', icon: CheckSquare },
        { id: 'profile', label: 'Profile Settings', icon: User },
      ]
    }
  ];

  const tutorFeatures = [
    {
      category: "Teaching",
      items: [
        { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
        { id: 'tutor-sessions', label: 'Tutor Sessions', icon: Video },
      ]
    },
    {
      category: "Organization",
      items: [
        { id: 'calendar', label: 'Calendar & Timetable', icon: Calendar },
        { id: 'profile', label: 'Profile Settings', icon: User },
      ]
    }
  ];

  const features = userRole === 'tutor' ? tutorFeatures : studentFeatures;

  const getCurrentFeatureLabel = () => {
    for (const category of features) {
      const feature = category.items.find(item => item.id === currentFeature);
      if (feature) return feature.label;
    }
    return 'Dashboard';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700">
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">{getCurrentFeatureLabel()}</span>
          <span className="sm:hidden">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Platform Features</span>
          <div className="flex items-center space-x-1 text-xs">
            <Coins className="h-3 w-3 text-yellow-600" />
            <span>{userCredits}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {features.map((category) => (
          <div key={category.category}>
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
              {category.category}
            </DropdownMenuLabel>
            {category.items.map((item) => {
              const IconComponent = item.icon;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onFeatureSelect(item.id)}
                  className={`flex items-center space-x-2 ${
                    currentFeature === item.id ? 'bg-accent' : ''
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}