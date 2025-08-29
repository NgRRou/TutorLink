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
} from "lucide-react";
import { Calendar } from "./ui/calendar";
import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";

interface CalendarEvent {
  id: string;
  title: string;
  type: 'tutor-session' | 'personal' | 'external' | 'test';
  date: Date;
  startTime: string;
  endTime: string;
  subject?: string;
  tutor?: string;
  student?: string;
  meetingUrl?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  source: 'app' | 'google';
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
    lastSync: null as Date | null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // inside CalendarTimetable component:
  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    onSuccess: async (tokenResponse) => {
      if (tokenResponse.access_token) {
        setGoogleToken(tokenResponse.access_token);
        toast.success("Google connected!");

        // Fetch events from Google
        const googleEvents = await fetchUserGoogleEvents(tokenResponse.access_token);
        setEvents(prev => [...prev, ...googleEvents]);
        
        // Optionally save to localStorage
        localStorage.setItem(`googleEvents_${user.id}`, JSON.stringify(googleEvents));

        setSyncStatus({ google: true, lastSync: new Date() });
      }
    },
    onError: () => toast.error("Google login failed"),
  });

  useEffect(() => {
    loadEvents();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tutorSessions') loadEvents();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadEvents = () => {
    const savedSessions = localStorage.getItem('tutorSessions');
    const tutorSessions = savedSessions ? JSON.parse(savedSessions) : [];

    const savedPersonalEvents = localStorage.getItem(`personalEvents_${user.id}`);
    const personalEvents = savedPersonalEvents ? JSON.parse(savedPersonalEvents) : [];

    const savedGoogleEvents = localStorage.getItem('googleCalendarEvents');
    const googleEvents = savedGoogleEvents ? JSON.parse(savedGoogleEvents) : [];

    const defaultExternalEvents: CalendarEvent[] = (!savedGoogleEvents) ? [
      { id: 'ext-1', title: 'Physics Quiz', type: 'test', date: new Date(2025, 0, 29), startTime: '10:00', endTime: '11:30', subject: 'Physics', status: 'upcoming', source: 'app' },
      { id: 'ext-2', title: 'Study Group', type: 'personal', date: new Date(2025, 0, 30), startTime: '16:00', endTime: '18:00', status: 'upcoming', source: 'google' },
      { id: 'ext-3', title: 'Chemistry Lab', type: 'personal', date: new Date(2025, 0, 31), startTime: '09:00', endTime: '12:00', status: 'upcoming', source: 'google' }
    ] : [];

    const allEvents = [
      ...tutorSessions.map((s: any) => ({
        id: `session-${s.id}`,
        title: `${s.subject} with ${s.tutorName}`,
        type: 'tutor-session' as const,
        date: new Date(s.date),
        startTime: s.time,
        endTime: addHourToTime(s.time, s.duration / 60),
        subject: s.subject,
        tutor: s.tutorName,
        meetingUrl: `https://meet.tutorplatform.com/session/${s.id}`,
        status: s.status === 'scheduled' ? 'upcoming' : s.status === 'ongoing' ? 'ongoing' : s.status === 'completed' ? 'completed' : 'cancelled',
        source: 'app' as const
      })),
      ...personalEvents,
      ...googleEvents,
      ...defaultExternalEvents
    ].map(e => ({ ...e, date: typeof e.date === 'string' ? new Date(e.date) : e.date }));

    setEvents(allEvents);
  };

  const fetchUserGoogleEvents = async (accessToken: string) => {
    const start = new Date().toISOString();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    const endISO = end.toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${endISO}&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch events");
    const data = await response.json();

    return data.items.map((e: any) => ({
      id: e.id,
      title: e.summary || "Untitled Event",
      type: "personal" as const,
      date: new Date(e.start.dateTime || e.start.date),
      startTime: e.start.dateTime ? new Date(e.start.dateTime).toTimeString().slice(0, 5) : "00:00",
      endTime: e.end.dateTime ? new Date(e.end.dateTime).toTimeString().slice(0, 5) : "23:59",
      status: "upcoming" as const,
      source: "google" as const,
    }));
  };

  const addHourToTime = (time: string, hours: number = 1) => {
    const [hour, minute] = time.split(':').map(Number);
    const endHour = hour + hours;
    return `${Math.floor(endHour).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleSyncCalendars = async () => {
    if (!googleToken) {
      toast.error("Please sign in with Google first.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`,
        {
          headers: { Authorization: `Bearer ${googleToken}` },
        }
      );
      const data = await res.json();
      const googleEvents =
        data.items?.map((event: any) => ({
          id: event.id,
          title: event.summary || "Untitled Event",
          type: "personal",
          date: new Date(event.start.dateTime || event.start.date),
          startTime: event.start.dateTime
            ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "00:00",
          endTime: event.end.dateTime
            ? new Date(event.end.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "00:00",
          status: "upcoming",
          source: "google",
        })) ?? [];

      localStorage.setItem("googleCalendarEvents", JSON.stringify(googleEvents));
      setSyncStatus({ google: true, lastSync: new Date() });
      loadEvents();

      toast.success("Google Calendar synced!");
      setIsSyncModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = (eventData: Partial<CalendarEvent>) => {
    const newEvent: CalendarEvent = {
      id: Math.random().toString(36).substr(2, 9),
      title: eventData.title || 'New Event',
      type: eventData.type || 'personal',
      date: eventData.date || selectedDate,
      startTime: eventData.startTime || '12:00',
      endTime: eventData.endTime || '13:00',
      status: 'upcoming',
      source: 'app'
    };
    setEvents(prev => [...prev, newEvent]);
    const personalEventsKey = `personalEvents_${user.id}`;
    const personalEvents = localStorage.getItem(personalEventsKey);
    const currentPersonalEvents = personalEvents ? JSON.parse(personalEvents) : [];
    currentPersonalEvents.push(newEvent);
    localStorage.setItem(personalEventsKey, JSON.stringify(currentPersonalEvents));
    
    setIsAddEventOpen(false);
    toast.success('Event added successfully!');
  };

  const handleDeleteEvent = (id: string) => {
  setEvents(prev => prev.filter(e => e.id !== id));

  // Remove from personal events
  const personalEventsKey = `personalEvents_${user.id}`;
  const personalEvents = localStorage.getItem(personalEventsKey);
  const currentPersonalEvents = personalEvents ? JSON.parse(personalEvents) : [];
  const updatedPersonalEvents = currentPersonalEvents.filter((e: CalendarEvent) => e.id !== id);
  localStorage.setItem(personalEventsKey, JSON.stringify(updatedPersonalEvents));

  // ✅ Also remove from tutorSessions if it's a tutor-session
  const tutorSessions = localStorage.getItem('tutorSessions');
    if (tutorSessions) {
      const currentTutorSessions = JSON.parse(tutorSessions);
      const updatedTutorSessions = currentTutorSessions.filter((s: any) => `session-${s.id}` !== id);
      localStorage.setItem('tutorSessions', JSON.stringify(updatedTutorSessions));
    }

    toast.success("Event deleted successfully!");
  };

  const exportToICS = () => {
    const icsContent = events
      .filter(e => e.source === 'app')
      .map(e => {
        const start = new Date(e.date); const [sh, sm] = e.startTime.split(':'); start.setHours(parseInt(sh), parseInt(sm));
        const end = new Date(e.date); const [eh, em] = e.endTime.split(':'); end.setHours(parseInt(eh), parseInt(em));
        return `BEGIN:VEVENT
UID:${e.id}@tutorplatform.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${e.title}}
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

  const getEventsForDate = (date: Date) => events.filter(e => e.date.toDateString() === date.toDateString());
  const getEventTypeColor = (type: string) => ({ 'tutor-session': 'bg-blue-100 text-blue-800', test: 'bg-red-100 text-red-800', personal: 'bg-green-100 text-green-800' }[type] || 'bg-gray-100 text-gray-800');
  const getSourceIcon = (source: string) => source === 'google' ? <ExternalLink className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />;

  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
          <Badge variant="outline">{dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}</Badge>
        </div>
        <div className="grid gap-3">
          {dayEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No events scheduled</p>
                <Button variant="outline" size="sm" onClick={() => setIsAddEventOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Event</Button>
              </CardContent>
            </Card>
          ) : dayEvents.map(event => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge className={getEventTypeColor(event.type)} variant="secondary">{event.type.replace('-', ' ')}</Badge>
                    {getSourceIcon(event.source)}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                    <div className="flex items-center space-x-1"><Clock className="h-4 w-4" /><span>{event.startTime} - {event.endTime}</span></div>
                    {event.subject && <div className="flex items-center space-x-1"><BookOpen className="h-4 w-4" /><span>{event.subject}</span></div>}
                  </div>
                  {event.tutor && <p className="text-sm"><span className="font-medium">Tutor:</span> {event.tutor}</p>}
                </div>
                <div className="flex flex-col space-y-2">
                  {event.meetingUrl && (
                    <Button size="sm" variant="outline">
                      <Video className="h-4 w-4 mr-2" /> Join
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    Delete
                  </Button>
                  <Badge
                    variant={event.status === "upcoming" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {event.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(selectedDate); startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => { const day = new Date(startOfWeek); day.setDate(startOfWeek.getDate() + i); return day; });
    return <div className="grid grid-cols-7 gap-2">{weekDays.map((day, index) => {
      const dayEvents = getEventsForDate(day);
      const isToday = day.toDateString() === new Date().toDateString();
      const isSelected = day.toDateString() === selectedDate.toDateString();
      return <Card key={index} className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''} ${isToday ? 'bg-blue-50' : ''}`} onClick={() => setSelectedDate(day)}>
        <CardHeader className="pb-2"><div className="flex items-center justify-between"><span className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span><span className={`text-lg ${isToday ? 'font-bold text-blue-600' : ''}`}>{day.getDate()}</span></div></CardHeader>
        <CardContent className="pt-0"><div className="space-y-1">{dayEvents.slice(0, 3).map(e => <div key={e.id} className={`p-1 rounded text-xs ${getEventTypeColor(e.type)}`}>{e.title}</div>)}{dayEvents.length > 3 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>}</div></CardContent>
      </Card>
    })}</div>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div><h1 className="text-3xl font-bold">Calendar & Timetable</h1><p className="text-muted-foreground">Manage your schedule and sync with external calendars</p></div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToICS}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
            <DialogTrigger asChild><Button variant="outline">Sync Calendars</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Calendar Sync Settings</DialogTitle><DialogDescription>Connect your external calendars</DialogDescription></DialogHeader>
                <div className="space-y-4">
                  {!googleToken ? (
                    <Button onClick={() => login()} className="w-full">
                      Connect Google Calendar
                    </Button>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <ExternalLink className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Google Calendar</p>
                            <p className="text-sm text-muted-foreground">
                              Connected to Google
                            </p>
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>

                      {syncStatus.lastSync && (
                        <Alert>
                          <AlertDescription>
                            Last synced: {syncStatus.lastSync.toLocaleString()}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={() => login()}  // triggers Google OAuth login
                        disabled={isLoading}
                        className="flex-1"
                      >
                        {isLoading ? "Syncing..." : "Sync Now"}
                      </Button>
                    </div>
                  )}
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
                    {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })} Events
                  </h3>
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {events
                      .filter(event =>
                        event.date.getMonth() === selectedDate.getMonth() &&
                        event.date.getFullYear() === selectedDate.getFullYear()
                      )
                      .map(event => (
                        <Card key={event.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 flex justify-between items-center">
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
                              <Badge variant="outline" className="text-xs">{event.status}</Badge>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'tutor-session' && e.status === 'upcoming').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tests This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter(e => e.type === 'test').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Synced Calendars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(syncStatus.google ? 1 : 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add Event Form
function AddEventForm({ onSubmit }: { onSubmit: (data: Partial<CalendarEvent>) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'personal' as CalendarEvent['type'],
    startTime: '12:00',
    endTime: '13:00',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ title: '', type: 'personal', startTime: '12:00', endTime: '13:00'});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input id="title" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Enter event title" required />
      </div>

      <div>
        <Label htmlFor="type">Event Type</Label>
        <Select value={formData.type} onValueChange={value => setFormData(prev => ({ ...prev, type: value as CalendarEvent['type'] }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="test">Test/Exam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input id="startTime" type="time" value={formData.startTime} onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))} />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input id="endTime" type="time" value={formData.endTime} onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))} />
        </div>
      </div>

      <Button type="submit" className="w-full">Add Event</Button>
    </form>
  );
}
