import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle} from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { Calendar as CalendarIcon, Clock, ExternalLink, BookOpen, CheckCircle, Download } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { toast } from "sonner";
import { useGoogleLogin } from "@react-oauth/google";
import { createClient } from '@supabase/supabase-js';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'tutor-session' | 'personal' | 'external' | 'test';
  date: Date;
  startTime: string;
  endTime: string;
  subject?: string;
  tutor?: string;
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

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function CalendarTimetable({ user }: CalendarTimetableProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ google: false, lastSync: null as Date | null });
  const [isLoading, setIsLoading] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    onSuccess: async (tokenResponse) => {
      if (tokenResponse.access_token) {
        setGoogleToken(tokenResponse.access_token);
        toast.success("Google connected!");
        const googleEvents = await fetchUserGoogleEvents(tokenResponse.access_token);
        setEvents(prev => [...prev, ...googleEvents]);
        localStorage.setItem(`googleEvents_${user.id}`, JSON.stringify(googleEvents));
        setSyncStatus({ google: true, lastSync: new Date() });
      }
    },
    onError: () => toast.error("Google login failed"),
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from('tutor_sessions')
        .select('*')
        .or(`student_id.eq.${user.id},tutor_id.eq.${user.id}`);

      if (error) throw error;

      const tutorEvents = await Promise.all(
        sessions.map(async (s: any) => {
          let studentName = 'TBD';

          if (user.role === 'tutor' && s.student_id) {
            const { data: studentInfo } = await supabase
              .from('student_information')
              .select('first_name,last_name')
              .eq('id', s.student_id)
              .single();

            if (studentInfo) {
              studentName = `${studentInfo.first_name} ${studentInfo.last_name}`;
            }
          }

          const displayName =
            user.role === 'tutor'
              ? studentName               
              : `${s.tutor_first_name || ''} ${s.tutor_last_name || ''}`.trim() || 'TBD'; 

          const isNow = s.time?.toLowerCase() === 'now';
          const addHourToTime = (time?: string) => {
            if (!time || time.toLowerCase() === 'now') return 'Now';
            const [hour, minute] = time.split(':').map(Number);
            const newHour = hour + 1;
            return `${newHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          };

          return {
            id: `session-${s.id}`,
            title: `${s.subject} with ${displayName}`,
            type: 'tutor-session' as const,
            date: new Date(s.date),
            startTime: isNow ? 'Now' : s.time,
            endTime: isNow ? "Now" : addHourToTime(s.time),
            subject: s.subject,
            tutor: `${s.tutor_first_name || ''} ${s.tutor_last_name || ''}`.trim() || 'TBD',
            student: studentName,
            status: s.status === 'scheduled' ? 'upcoming' : s.status,
            source: 'app' as const,
          };
        })
      );

      const savedGoogleEvents = localStorage.getItem(`googleEvents_${user.id}`);
      const googleEvents = savedGoogleEvents ? JSON.parse(savedGoogleEvents) : [];

      setEvents([...tutorEvents, ...googleEvents]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tutor sessions");
    }
  };

  const fetchUserGoogleEvents = async (accessToken: string) => {
    const start = new Date().toISOString();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    const endISO = end.toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${endISO}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) throw new Error("Failed to fetch Google events");
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

  const exportToICS = () => {
    const icsContent = events
      .filter(e => e.source === 'app')
      .map(e => {
        const start = new Date(e.date); const [sh, sm] = e.startTime.split(':'); start.setHours(parseInt(sh), parseInt(sm));
        const end = new Date(e.date); const [eh, em] = e.endTime.split(':'); end.setHours(parseInt(eh), parseInt(em));
        return `BEGIN:VEVENT
UID:${e.id}@tutorlink.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${e.title}
LOCATION:TutorLink Virtual Meeting
END:VEVENT`;
      }).join('\n');

    const icsFile = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TutorLink//Calendar//EN
${icsContent}
END:VCALENDAR`;
    const blob = new Blob([icsFile], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tutorlink-calendar.ics';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar exported successfully!');
  };

  const getEventsForDate = (date: Date) =>
    events.filter(e => e.date.toDateString() === date.toDateString());

  const getEventTypeColor = (type: string) =>
    ({ 'tutor-session': 'bg-blue-100 text-blue-800', test: 'bg-red-100 text-red-800', personal: 'bg-green-100 text-green-800' }[type] || 'bg-gray-100 text-gray-800');

  const getSourceIcon = (source: string) =>
    source === 'google' ? <ExternalLink className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />;

  const renderDayView = () => {
    const dayEvents = getEventsForDate(selectedDate);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <Badge variant="outline">{dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}</Badge>
        </div>
        <div className="grid gap-3">
          {dayEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No events scheduled</p>
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
                    <div className="flex items-center space-x-1"><Clock className="h-4 w-4" /><span>{event.startTime === 'Now' ? 'Now' : `${event.startTime} - ${event.endTime}`}</span></div>
                    {event.subject && <div className="flex items-center space-x-1"><BookOpen className="h-4 w-4" /><span>{event.subject}</span></div>}
                  </div>
                  {event.tutor && <p className="text-sm"><span className="font-medium">Tutor:</span> {event.tutor}</p>}
                </div>
                <div className="flex flex-col space-y-2">
                  <Badge variant={event.status === "upcoming" ? "default" : "secondary"} className="text-xs">
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
              className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''} ${isToday ? 'bg-blue-50' : ''}`}
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
                  {dayEvents.slice(0, 3).map(e => (
                    <div key={e.id} className={`p-1 rounded text-xs ${getEventTypeColor(e.type)}`}>{e.title}</div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => (
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
                    {event.date.toLocaleDateString()} • {event.startTime === 'Now' ? 'Now' : `${event.startTime} - ${event.endTime}`}
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
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Calendar & Timetable</h1>
          <p className="text-muted-foreground">Manage your schedule and sync with external calendars</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToICS}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
            <DialogTrigger asChild><Button variant="outline">Sync Calendars</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calendar Sync Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!googleToken ? (
                  <Button onClick={() => login()} className="w-full">Connect Google Calendar</Button>
                ) : (
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ExternalLink className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Google Calendar</p>
                          <p className="text-sm text-muted-foreground">Connected to Google</p>
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
                    <Button onClick={() => login()} disabled={isLoading} className="flex-1">
                      {isLoading ? "Syncing..." : "Sync Now"}
                    </Button>
                  </div>
                )}
              </div>
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
              {currentView === 'month' && renderMonthView()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events
                .filter(e => e.type === 'tutor-session' && e.status === 'upcoming')
                .sort((a,b) => a.date.getTime() - b.date.getTime())[0]?.title || '-'}
            </div>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Synced Calendars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStatus.google ? 1 : 0}
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

