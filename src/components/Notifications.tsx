import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Bell, 
  Clock, 
  CheckSquare, 
  Users, 
  Calendar,
  BookOpen,
  X,
  AlertCircle
} from "lucide-react";

interface Notification {
  id: string;
  type: 'session' | 'todo' | 'assignment' | 'system';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actionable?: boolean;
}

interface NotificationsProps {
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
}

export function Notifications({ onMarkAsRead, onClearAll }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'session',
      title: 'Upcoming Session',
      message: 'Mathematics session with Sarah Johnson starts in 30 minutes',
      time: '5 minutes ago',
      isRead: false,
      actionable: true
    },
    {
      id: '2',
      type: 'todo',
      title: 'Task Reminder',
      message: 'You have 3 incomplete tasks for today. Complete Math homework is due soon.',
      time: '15 minutes ago',
      isRead: false,
      actionable: true
    },
    {
      id: '3',
      type: 'session',
      title: 'Session Confirmed',
      message: 'Your Physics session tomorrow at 4:00 PM has been confirmed',
      time: '1 hour ago',
      isRead: false,
      actionable: false
    },
    {
      id: '4',
      type: 'assignment',
      title: 'Test Available',
      message: 'New personalized Chemistry test based on your recent performance',
      time: '2 hours ago',
      isRead: true,
      actionable: true
    },
    {
      id: '5',
      type: 'system',
      title: 'Achievement Unlocked',
      message: 'Congratulations! You\'ve earned 25 XP for completing 5 days study streak',
      time: '1 day ago',
      isRead: true,
      actionable: false
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'session': return <Users className="h-4 w-4 text-blue-600" />;
      case 'todo': return <CheckSquare className="h-4 w-4 text-green-600" />;
      case 'assignment': return <BookOpen className="h-4 w-4 text-purple-600" />;
      case 'system': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseColor = isRead ? 'bg-gray-50' : 'bg-blue-50';
    switch (type) {
      case 'session': return isRead ? 'bg-gray-50' : 'bg-blue-50';
      case 'todo': return isRead ? 'bg-gray-50' : 'bg-green-50';
      case 'assignment': return isRead ? 'bg-gray-50' : 'bg-purple-50';
      case 'system': return isRead ? 'bg-gray-50' : 'bg-orange-50';
      default: return baseColor;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
    onMarkAsRead?.(id);
  };

  const clearAll = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
    onClearAll?.();
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAll}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <CardDescription>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        getNotificationColor(notification.type, notification.isRead)
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`text-sm ${notification.isRead ? 'text-muted-foreground' : 'font-medium'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {notification.time}
                                </span>
                                {notification.actionable && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="text-xs h-auto py-1 px-2"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    Take Action
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeNotification(notification.id)}
                              className="h-auto p-1 ml-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full absolute left-1 top-4"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}