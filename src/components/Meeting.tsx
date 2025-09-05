import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
  MessageCircle,
  Share,
  Monitor,
  PaintBucket,
  FileText,
  Upload,
  Download,
  Settings,
  MoreVertical,
  Maximize,
  Minimize,
  Clock,
  Calendar,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  Save,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  MousePointer,
  Square,
  Circle,
  Type,
  Minus,
  ArrowRight,
  Palette,
  Eraser
} from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  credits: number;
  level: number;
}

interface Participant {
  id: string;
  name: string;
  role: 'tutor' | 'student';
  email: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  type: 'text' | 'file' | 'system';
}

interface WhiteboardElement {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text' | 'arrow';
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  timestamp: string;
  userId: string;
}

interface MeetingProps {
  user: User;
  meetingId?: string;
  sessionInfo?: {
    subject: string;
    tutor: string;
    student: string;
    duration: number;
    cost: number;
  };
}

export function Meeting({ user, meetingId = 'demo-meeting', sessionInfo }: MeetingProps) {
  // Helper to update tutor rating in Supabase
  async function submitTutorRating(tutorEmail: string, rating: number) {
    // Find tutor by name (fallback if email not available)
    const { data: tutor, error: fetchError } = await supabase
      .from('tutor_information')
      .select('id, rating, totalSessions, name, email')
      .eq('name', sessionInfo?.tutor || 'Sarah Chen')
      .single();

    if (fetchError || !tutor) {
      alert('Could not find tutor to rate.');
      return;
    }

    // Calculate new average rating
    const prevRating = tutor.rating || 0;
    const prevCount = tutor.totalSessions || 0;
    const newCount = prevCount + 1;
    const newRating = ((prevRating * prevCount) + rating) / newCount;

    // Update tutor rating and session count
    const { error: updateError } = await supabase
      .from('tutor_information')
      .update({ rating: newRating, totalSessions: newCount })
      .eq('id', tutor.id);

    if (updateError) {
      alert('Failed to submit rating.');
    }
  }
  // Rating state for thank you dialog
  const [rating, setRating] = useState<number | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  // Ask for camera/mic permissions on mount
  useEffect(() => {
    async function requestPermissions() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        alert('Please allow camera and microphone access in your browser to join the meeting.');
      }
    }
    requestPermissions();
  }, []);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: '1',
      name: `${user.first_name} ${user.last_name}`,
      role: user.role as 'tutor' | 'student',
      email: user.email,
      isVideoOn: true,
      isAudioOn: true,
      isScreenSharing: false,
      joinedAt: new Date().toISOString()
    },
    // Add mock student if user is tutor
    ...(user.role === 'tutor'
      ? [{
        id: '2',
        name: sessionInfo?.student || 'Mock Student',
        role: 'student' as 'student',
        email: 'student@example.com',
        isVideoOn: true,
        isAudioOn: true,
        isScreenSharing: false,
        joinedAt: new Date().toISOString()
      }]
      : [])
  ]);

  const [showChat, setShowChat] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      senderId: '2',
      senderName: 'Sarah Chen',
      message: 'Welcome to our tutoring session! Ready to start?',
      timestamp: new Date().toISOString(),
      type: 'text'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'rectangle' | 'circle' | 'text' | 'arrow' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  const [isWhiteboardVisible, setIsWhiteboardVisible] = useState(true);

  // Meeting timer
  useEffect(() => {
    const timer = setInterval(() => {
      setMeetingDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    setParticipants(prev => prev.map(p =>
      p.id === '1' ? { ...p, isVideoOn: !isVideoOn } : p
    ));
    toast.info(isVideoOn ? 'Camera turned off' : 'Camera turned on');
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
    setParticipants(prev => prev.map(p =>
      p.id === '1' ? { ...p, isAudioOn: !isAudioOn } : p
    ));
    toast.info(isAudioOn ? 'Microphone muted' : 'Microphone unmuted');
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Request screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        setIsScreenSharing(true);
        setParticipants(prev => prev.map(p =>
          p.id === '1' ? { ...p, isScreenSharing: true } : p
        ));
        toast.success('Screen sharing started');

        // Handle stream end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setIsScreenSharing(false);
          setParticipants(prev => prev.map(p =>
            p.id === '1' ? { ...p, isScreenSharing: false } : p
          ));
          toast.info('Screen sharing stopped');
        });
      } else {
        setIsScreenSharing(false);
        setParticipants(prev => prev.map(p =>
          p.id === '1' ? { ...p, isScreenSharing: false } : p
        ));
        toast.info('Screen sharing stopped');
      }
    } catch (error) {
      toast.error('Failed to start screen sharing');
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: '1',
      senderName: `${user.first_name} ${user.last_name}`,
      message: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const [showEarnedCredits, setShowEarnedCredits] = useState(false);
  const [earnedCredits, setEarnedCredits] = useState<number | null>(null);

  const navigate = useNavigate();

  const leaveMeeting = async () => {
    if (user.role === 'tutor') {
      let credits = sessionInfo?.cost;
      if (!credits) {
        const { data } = await supabase
          .from('tutor_sessions')
          .select('credits_required')
          .eq('tutor_id', user.id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        credits = data?.credits_required || 0;
      }
      setEarnedCredits(credits || 0);
      setShowEarnedCredits(true);
      setTimeout(() => {
        setShowEarnedCredits(false);
        navigate('/tutor-sessions');
      }, 2500);
      return;
    }
    toast.success('Thank you for joining! Please rate your tutor.');
    navigate('/tutor-sessions?thankyou=1');
  };

  // Whiteboard functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (currentTool === 'pen') {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'pen') {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    setWhiteboardElements([]);
    toast.success('Whiteboard cleared');
  };

  const saveWhiteboard = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `whiteboard-${meetingId}-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
      toast.success('Whiteboard saved');
    }
  };

  return (
    <div
      className="bg-gray-900 flex flex-col"
      style={{
        minHeight: '80vh',
        height: '85vh',
        maxHeight: '100vh',
        overflow: 'hidden'
      }}
    >
      {/* Show earned credits widget for tutor */}
      {showEarnedCredits && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-100 bg-opacity-50">
          <Card className="w-[380px] flex flex-col items-center p-6 border border-green-200 shadow-2xl">
            <div className="flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-green-700">Session Complete!</h2>
            <p className="mb-4 text-base text-gray-700 text-center">
              You earned{" "}
              <span className="font-bold text-green-600">{earnedCredits}</span> credits
              for this session.
            </p>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              disabled
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Credits Earned
            </Button>
            <div className="mt-3 text-gray-400 text-xs text-center">
              Redirecting to your dashboard...
            </div>
          </Card>
        </div>
      )}


      {/* Show thank you/rating if redirected from meeting */}
      {window.location.search.includes('thankyou=1') && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Thank you for joining!</h2>
            <p className="mb-4">We hope you enjoyed your session. Please rate your tutor:</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  style={{ fontSize: '2rem', color: rating && star <= rating ? '#f59e42' : '#ddd', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={async () => {
                    setRating(star);
                    await submitTutorRating(sessionInfo?.tutor || 'Sarah Chen', star);
                    setRatingSubmitted(true);
                  }}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>
            {ratingSubmitted && (
              <div className="mb-4 text-green-600 font-medium">Thank you! Your rating has been submitted.</div>
            )}
            <button className="bg-indigo-600 text-white px-6 py-2 rounded" onClick={() => window.location.href = '/tutor-sessions'}>
              Close
            </button>
          </div>
        </div>
      )}
      {/* Meeting Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-green-400" />
              <h2 className="text-white font-medium">
                {sessionInfo?.subject || 'Mathematics'} Session
              </h2>
            </div>
            <Badge variant="secondary" className="bg-green-900 text-green-100">
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(meetingDuration)}
            </Badge>
            <Badge variant="outline" className="border-gray-600 text-gray-300">
              {participants.length} participants
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <PaintBucket className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={leaveMeeting}
            >
              <PhoneOff className="h-4 w-4 mr-1" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0" style={{ minHeight: 0 }}>
        {/* Main Video Area */}
        <div className="flex-1 relative min-h-0" style={{ minHeight: 0 }}>
          {isScreenSharing ? (
            // Screen sharing view
            <div className="h-full bg-gray-800 flex items-center justify-center">
              <div className="text-center text-white">
                <Monitor className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                <h3 className="text-xl font-medium mb-2">Screen Sharing Active</h3>
                <p className="text-gray-400">Your screen is being shared with participants</p>
              </div>
            </div>
          ) : (
            // Video grid
            <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {participants.map((participant) => (
                <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                  {participant.isVideoOn ? (
                    <div className="h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Avatar className="w-24 h-24">
                        <AvatarFallback className="text-2xl">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <div className="h-full bg-gray-700 flex items-center justify-center">
                      <VideoOff className="h-12 w-12 text-gray-500" />
                    </div>
                  )}

                  {/* Participant info overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black bg-opacity-50 rounded px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-white text-sm font-medium">
                          {participant.name}
                        </span>
                        <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                          {participant.role}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        {participant.isAudioOn ? (
                          <Mic className="h-4 w-4 text-green-400" />
                        ) : (
                          <MicOff className="h-4 w-4 text-red-400" />
                        )}
                        {participant.isScreenSharing && (
                          <Monitor className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Whiteboard Overlay */}
          {showWhiteboard && (
            <div className="absolute inset-4 bg-white rounded-lg shadow-2xl border flex flex-col min-h-0">
              <div className="h-full flex flex-col">
                {/* Whiteboard Toolbar */}
                <div className="bg-gray-50 border-b p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="font-medium text-gray-900">Digital Whiteboard</h3>
                    <div className="flex items-center space-x-2">
                      {[
                        { tool: 'pen', icon: MousePointer, label: 'Pen' },
                        { tool: 'rectangle', icon: Square, label: 'Rectangle' },
                        { tool: 'circle', icon: Circle, label: 'Circle' },
                        { tool: 'text', icon: Type, label: 'Text' },
                        { tool: 'arrow', icon: ArrowRight, label: 'Arrow' },
                        { tool: 'eraser', icon: Eraser, label: 'Eraser' }
                      ].map(({ tool, icon: Icon, label }) => (
                        <Button
                          key={tool}
                          variant={currentTool === tool ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentTool(tool as any)}
                          title={label}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Palette className="h-4 w-4 text-gray-600" />
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className="w-8 h-8 rounded border-none cursor-pointer"
                      />
                    </div>

                    <Select value={strokeWidth.toString()} onValueChange={(value) => setStrokeWidth(parseInt(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1px</SelectItem>
                        <SelectItem value="2">2px</SelectItem>
                        <SelectItem value="4">4px</SelectItem>
                        <SelectItem value="8">8px</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" onClick={clearWhiteboard}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={saveWhiteboard}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsWhiteboardVisible(!isWhiteboardVisible)}
                      >
                        {isWhiteboardVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowWhiteboard(false)}
                      >
                        <Minimize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative min-h-0">
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-full cursor-crosshair"
                    style={{
                      display: isWhiteboardVisible ? 'block' : 'none',
                      maxHeight: '100%',
                      maxWidth: '100%'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  {!isWhiteboardVisible && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <EyeOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Whiteboard hidden</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Meeting Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="bg-gray-800 rounded-full px-6 py-3 flex items-center space-x-4 border border-gray-700">
              <Button
                variant={isAudioOn ? "ghost" : "destructive"}
                size="sm"
                onClick={toggleAudio}
                className={isAudioOn ? "text-white hover:bg-gray-700" : ""}
              >
                {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>

              <Button
                variant={isVideoOn ? "ghost" : "destructive"}
                size="sm"
                onClick={toggleVideo}
                className={isVideoOn ? "text-white hover:bg-gray-700" : ""}
              >
                {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>

              <Button
                variant={isScreenSharing ? "default" : "ghost"}
                size="sm"
                onClick={toggleScreenShare}
                className={!isScreenSharing ? "text-white hover:bg-gray-700" : ""}
              >
                <Monitor className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6 bg-gray-600" />

              <Button
                variant="destructive"
                size="sm"
                onClick={leaveMeeting}
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col min-h-0" style={{ minHeight: 0 }}>
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{message.senderName}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-200">{message.message}</div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button size="sm" onClick={sendMessage}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Info Footer */}
      <div className="bg-gray-800 border-t border-gray-700 p-3 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-gray-300">
          <div className="flex items-center space-x-4">
            <span>Meeting ID: {meetingId}</span>
            {sessionInfo && (
              <>
                <span>•</span>
                <span>Subject: {sessionInfo.subject}</span>
                <span>•</span>
                <span>Cost: {sessionInfo.cost} credits</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span>Recording: Off</span>
          </div>
        </div>
      </div>
    </div>
  );
}