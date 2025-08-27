import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ExternalLink,
  Video,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Download,
  RefreshCw
} from "lucide-react";
import { Calendar } from "./ui/calendar";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  type: 'tutor-session' | 'personal' | 'external' | 'test';
  date: Date;
  startTime: string;
  endTime: string;
  description?: string;
  subject?: string;
  tutor?: string;
  student?: string;
  meetingUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  source: 'app' | 'google' | 'phone';
}

interface CalendarTimetableProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    credits: number;
  };
}

export function CalendarTimetable({ user }: CalendarTimetableProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    google: false,
    phone: false,
    lastSync: null as Date | null
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load events from localStorage and mock external calendar data
  useEffect(() => {
    loadEvents();

    // Listen for storage changes to update calendar when sessions are booked
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tutorSessions') {
        loadEvents();
        toast.info('Calendar updated with new session booking!');
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events from the same tab
    const handleSessionUpdate = () => {
      loadEvents();
    };

    window.addEventListener('sessionBookingUpdate', handleSessionUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sessionBookingUpdate', handleSessionUpdate);
    };
  }, []);

  const loadEvents = () => {
    // Load booked tutor sessions from localStorage (simulating shared data)
    const savedSessions = localStorage.getItem('tutorSessions');
    const tutorSessions = savedSessions ? JSON.parse(savedSessions) : [];

    // Load personal events from localStorage
    const savedPersonalEvents = localStorage.getItem('personalEvents');
    const personalEvents = savedPersonalEvents ? JSON.parse(savedPersonalEvents) : [];

    // Convert tutor sessions to calendar events
    const sessionEvents: CalendarEvent[] = tutorSessions.map((session: any) => ({
      id: `session-${session.id}`,
      title: `${session.subject} with ${session.tutorName}`,
      type: 'tutor-session' as const,
      date: new Date(session.date),
      startTime: session.time,
      endTime: addHourToTime(session.time, session.duration / 60),
      description: `${session.difficulty} level tutoring session`,
      subject: session.subject,
      tutor: session.tutorName,
      meetingUrl: `https://meet.tutorplatform.com/session/${session.id}`,
      status: session.status === 'scheduled' ? 'upcoming' as const :
        session.status === 'ongoing' ? 'ongoing' as const :
          session.status === 'completed' ? 'completed' as const : 'cancelled' as const,
      source: 'app' as const
    }));

    // Load synced Google Calendar events
    const savedGoogleEvents = localStorage.getItem('googleCalendarEvents');
    const googleEvents = savedGoogleEvents ? JSON.parse(savedGoogleEvents) : [];

    // Load synced phone calendar events
    const savedPhoneEvents = localStorage.getItem('phoneCalendarEvents');
    const phoneEvents = savedPhoneEvents ? JSON.parse(savedPhoneEvents) : [];

    // Mock default external calendar events if no synced events
    const defaultExternalEvents: CalendarEvent[] = (!savedGoogleEvents && !savedPhoneEvents) ? [
      {
        id: 'ext-1',
        title: 'Physics Quiz',
        type: 'test',
        date: new Date(2025, 0, 29),
        startTime: '10:00',
        endTime: '11:30',
        description: 'Chapter 5: Thermodynamics',
        subject: 'Physics',
        status: 'upcoming',
        source: 'app'
      },
      {
        id: 'ext-2',
        title: 'Study Group Meeting',
        type: 'personal',
        date: new Date(2025, 0, 30),
        startTime: '16:00',
        endTime: '18:00',
        description: 'Biology exam preparation',
        status: 'upcoming',
        source: 'google'
      },
      {
        id: 'ext-3',
        title: 'Chemistry Lab',
        type: 'personal',
        date: new Date(2025, 0, 31),
        startTime: '09:00',
        endTime: '12:00',
        description: 'Organic chemistry experiments',
        status: 'upcoming',
        source: 'phone'
      }
    ] : [];

    // Combine all events
    const allEvents = [
      ...sessionEvents,
      ...personalEvents,
      ...googleEvents,
      ...phoneEvents,
      ...defaultExternalEvents
    ];

    // Convert date strings to Date objects for events loaded from storage
    const normalizedEvents = allEvents.map(event => ({
      ...event,
      date: typeof event.date === 'string' ? new Date(event.date) : event.date
    }));

    setEvents(normalizedEvents);
  };

  const addHourToTime = (time: string, hours: number = 1): string => {
    const [hour, minute] = time.split(':').map(Number);
    const endHour = hour + hours;
    return `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleSyncCalendars = async () => {
    setIsLoading(true);
    try {
      // Simulate Google Calendar API integration
      await syncWithGoogleCalendar();

      // Simulate phone calendar sync
      await syncWithPhoneCalendar();

      setSyncStatus({
        google: true,
        phone: true,
        lastSync: new Date()
      });

      // Reload events after successful sync
      loadEvents();

      toast.success('Calendars synced successfully!');
      setIsSyncModalOpen(false);
    } catch (error) {
      toast.error('Failed to sync calendars. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const syncWithGoogleCalendar = async () => {
    // In a real implementation, this would:
    // 1. Use Google Calendar API with OAuth 2.0
    // 2. Fetch events from primary calendar
    // 3. Create events in Google Calendar for tutor sessions

    return new Promise(resolve => {
      setTimeout(() => {
        // Mock Google Calendar events
        const googleEvents = [
          {
            id: 'google-1',
            title: 'Google Meet - Team Standup',
            type: 'personal' as const,
            date: new Date(2025, 1, 1),
            startTime: '09:00',
            endTime: '09:30',
            description: 'Daily team standup meeting',
            status: 'upcoming' as const,
            source: 'google' as const
          }
        ];

        // Save to localStorage (simulating successful sync)
        localStorage.setItem('googleCalendarEvents', JSON.stringify(googleEvents));
        resolve(googleEvents);
      }, 1000);
    });
  };

  const syncWithPhoneCalendar = async () => {
    // In a real implementation, this would:
    // 1. Request calendar permissions
    // 2. Use the Calendar API (if available in browser)
    // 3. Or provide export/import functionality

    return new Promise(resolve => {
      setTimeout(() => {
        // Mock phone calendar events
        const phoneEvents = [
          {
            id: 'phone-1',
            title: 'Doctor Appointment',
            type: 'personal' as const,
            date: new Date(2025, 1, 3),
            startTime: '15:00',
            endTime: '16:00',
            description: 'Annual checkup',
            status: 'upcoming' as const,
            source: 'phone' as const
          }
        ];

        // Save to localStorage (simulating successful sync)
        localStorage.setItem('phoneCalendarEvents', JSON.stringify(phoneEvents));
        resolve(phoneEvents);
      }, 1000);
    });
  };

  const handleAddEvent = (eventData: Partial<CalendarEvent>) => {
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: eventData.title || 'New Event',
      type: eventData.type || 'personal',
      date: eventData.date || selectedDate,
      startTime: eventData.startTime || '12:00',
      endTime: eventData.endTime || '13:00',
      description: eventData.description || '',
      status: 'upcoming',
      source: 'app'
    };

    setEvents(prev => [...prev, newEvent]);

    // Save personal events to localStorage
    const personalEvents = localStorage.getItem('personalEvents');
    const currentPersonalEvents = personalEvents ? JSON.parse(personalEvents) : [];
    currentPersonalEvents.push(newEvent);
    localStorage.setItem('personalEvents', JSON.stringify(currentPersonalEvents));

    setIsAddEventOpen(false);
    toast.success('Event added successfully!');
  };

  const exportToICS = () => {
    const icsContent = events
      .filter(event => event.source === 'app')
      .map(event => {
        const startDate = new Date(event.date);
        const [startHour, startMinute] = event.startTime.split(':');
        startDate.setHours(parseInt(startHour), parseInt(startMinute));

        const endDate = new Date(event.date);
        const [endHour, endMinute] = event.endTime.split(':');
        endDate.setHours(parseInt(endHour), parseInt(endMinute));

        return `BEGIN:VEVENT
UID:${event.id}@tutorplatform.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:TutorPlatform Virtual Meeting
END:VEVENT`;
      }).join('\n');

    const icsFile = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TutorPlatform//Calendar//EN
${icsContent}
END:VCALENDAR`;

    const blob = new Blob([icsFile], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tutorplatform-calendar.ics';
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Calendar exported successfully!');
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event =>
      event.date.toDateString() === date.toDateString()
    );
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'tutor-session': return 'bg-blue-100 text-blue-800';
      case 'test': return 'bg-red-100 text-red-800';
      case 'personal': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'google': return <ExternalLink className="h-3 w-3" />;
      case 'phone': return <CalendarDays className="h-3 w-3" />;
      default: return <CalendarIcon className="h-3 w-3" />;
    }
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h3>
          <Badge variant="outline">
            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
          </Badge>
        </div>

        <div className="grid gap-3">
          {dayEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No events scheduled for this day</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsAddEventOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            dayEvents.map(event => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge className={getEventTypeColor(event.type)} variant="secondary">
                          {event.type.replace('-', ' ')}
                        </Badge>
                        {getSourceIcon(event.source)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.subject && (
                          <div className="flex items-center space-x-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{event.subject}</span>
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      )}
                      {event.tutor && (
                        <p className="text-sm">
                          <span className="font-medium">Tutor:</span> {event.tutor}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      {event.meetingUrl && (
                        <Button size="sm" variant="outline">
                          <Video className="h-4 w-4 mr-2" />
                          Join
                        </Button>
                      )}
                      <Badge
                        variant={event.status === 'upcoming' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = day.toDateString() === selectedDate.toDateString();

          return (
            <Card
              key={index}
              className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''
                } ${isToday ? 'bg-blue-50' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`text-lg ${isToday ? 'font-bold text-blue-600' : ''}`}>
                    {day.getDate()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className={`p-1 rounded text-xs ${getEventTypeColor(event.type)}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Timetable</h1>
          <p className="text-muted-foreground">
            Manage your schedule and sync with external calendars
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadEvents}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline" onClick={exportToICS}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Calendars
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calendar Sync Settings</DialogTitle>
                <DialogDescription>
                  Connect your external calendars to see all events in one place
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Google Calendar</p>
                      <p className="text-sm text-muted-foreground">
                        Sync with your Google Calendar events
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {syncStatus.google ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm">
                      {syncStatus.google ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CalendarDays className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Phone Calendar</p>
                      <p className="text-sm text-muted-foreground">
                        Sync with your device's native calendar
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {syncStatus.phone ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm">
                      {syncStatus.phone ? 'Connected' : 'Not connected'}
                    </span>
                  </div>
                </div>

                {syncStatus.lastSync && (
                  <Alert>
                    <RefreshCw className="h-4 w-4" />
                    <AlertDescription>
                      Last synced: {syncStatus.lastSync.toLocaleString()}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSyncCalendars}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start Sync
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
                <DialogDescription>
                  Create a new calendar event
                </DialogDescription>
              </DialogHeader>
              <AddEventForm onSubmit={handleAddEvent} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Calendar View</span>
            </CardTitle>
            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as any)}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
            <div className="lg:col-span-2">
              {currentView === 'day' && renderDayView()}
              {currentView === 'week' && renderWeekView()}
              {currentView === 'month' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {selectedDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long'
                    })} Events
                  </h3>
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {events
                      .filter(event =>
                        event.date.getMonth() === selectedDate.getMonth() &&
                        event.date.getFullYear() === selectedDate.getFullYear()
                      )
                      .map(event => (
                        <Card key={event.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-medium">{event.title}</h4>
                                  <Badge className={getEventTypeColor(event.type)} variant="secondary">
                                    {event.type.replace('-', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {event.date.toLocaleDateString()} • {event.startTime} - {event.endTime}
                                </p>
                              </div>
                              <div className="flex items-center space-x-1">
                                {getSourceIcon(event.source)}
                                <Badge variant="outline" className="text-xs">
                                  {event.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'tutor-session' && e.status === 'upcoming').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tests This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'test').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Synced Calendars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(syncStatus.google ? 1 : 0) + (syncStatus.phone ? 1 : 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AddEventForm({ onSubmit }: { onSubmit: (data: Partial<CalendarEvent>) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'personal' as CalendarEvent['type'],
    startTime: '12:00',
    endTime: '13:00',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      title: '',
      type: 'personal',
      startTime: '12:00',
      endTime: '13:00',
      description: ''
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter event title"
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Event Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as CalendarEvent['type'] }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="test">Test/Exam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Add event description"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        Add Event
      </Button>
    </form>
  );
}