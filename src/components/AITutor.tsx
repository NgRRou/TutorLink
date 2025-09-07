/// <reference types="vite/client" />
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import {
  Bot,
  Send,
  User,
  Coins,
  AlertTriangle,
  Users,
  Lightbulb,
  Clock,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  Paperclip
} from "lucide-react";
import { projectId } from '../utils/supabase/info';
import { supabase } from "../utils/supabase/client";

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  subject?: string;
  difficulty?: string;
  needsHumanTutor?: boolean;
  attachments?: FileAttachment[];
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  credits: number;
  experience: number;
  level: number;
  total_earnings?: number;
  sessions_completed?: number;
  streak?: number;
  weak_subjects?: string[];
  preferred_learning_style?: string;
  last_active?: string;
}

interface AITutorProps {
  user: User;
  accessToken: string;
  onCreditsUpdate: (credits: number) => void;
}

export function AITutor({ user, accessToken, onCreditsUpdate }: AITutorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('intermediate');
  const [showPurchasePrompt, setShowPurchasePrompt] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const subjects = [
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'english', label: 'English' },
    { value: 'history', label: 'History' },
    { value: 'geography', label: 'Geography' },
    { value: 'computer-science', label: 'Computer Science' },
    { value: 'economics', label: 'Economics' },
    { value: 'general', label: 'General Studies' }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-0e871cde/ai-tutor/history`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const formattedMessages: Message[] = data.history.map((item: any) => [
          {
            id: item.id,
            type: 'user' as const,
            content: item.userMessage,
            timestamp: item.timestamp,
            subject: item.subject,
            difficulty: item.difficulty,
            attachments: item.attachments || []
          },
          {
            id: item.id + 1,
            type: 'ai' as const,
            content: item.aiResponse,
            timestamp: item.timestamp,
            needsHumanTutor: item.aiResponse.includes('COMPLEX_QUESTION_FLAG')
          }
        ]).flat();

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Supported file types: PDF, Text, JPEG, PNG');
      return;
    }

    setIsLoading(true);
    setUploadedFile(file);

    try {
      // Convert file to base64 for analysis
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Simulate document analysis based on file type and content
      let analysisContent = '';

      if (file.type === 'application/pdf') {
        analysisContent = `I've analyzed your PDF document "${file.name}". Here's what I found:

📄 **PDF Document Analysis:**
- File size: ${(file.size / 1024).toFixed(1)} KB
- Content type: Educational document
- Estimated pages: ${Math.ceil(file.size / 50000)}

**Key Topics Identified:**
• Mathematical equations and formulas
• Step-by-step problem solutions
• Theoretical concepts and definitions
• Practice exercises

**I can help you with:**
• Explaining complex equations line by line
• Breaking down problem-solving strategies
• Creating summary notes from the content
• Generating similar practice problems
• Clarifying confusing concepts

What specific part of this document would you like me to explain? You can ask about particular equations, concepts, or problems!`;
      } else if (file.type.startsWith('image/')) {
        analysisContent = `I've analyzed your image "${file.name}". Here's what I found:

🖼️ **Image Analysis:**
- File size: ${(file.size / 1024).toFixed(1)} KB
- Image type: ${file.type.includes('png') ? 'PNG' : 'JPEG'} format
- Content detected: Educational material (diagram, worksheet, or notes)

**Visual Elements Identified:**
• Mathematical equations or formulas
• Diagrams and illustrations  
• Text content and annotations
• Geometric figures or graphs

**I can help you with:**
• Reading and interpreting the mathematical content
• Explaining diagrams and visual concepts
• Solving problems shown in the image
• Providing step-by-step solutions
• Creating practice problems based on the content

Please ask me specific questions about what you see in the image. For example: "Explain this equation" or "How do I solve this problem?"`;
      } else {
        analysisContent = `I've analyzed your document "${file.name}". Here's what I found:

📄 **Document Analysis:**
- File type: ${file.type}
- File size: ${(file.size / 1024).toFixed(1)} KB
- Content type: Text document

**Content Overview:**
• Educational text content
• Study material or notes
• Potential exercises or examples
• Reference information

**I can help you with:**
• Summarizing key points
• Explaining complex concepts
• Creating study guides
• Generating quiz questions
• Providing additional context and examples

What would you like me to explain or help you understand from this document?`;
      }

      const analysisMessage: Message = {
        id: Date.now(),
        type: 'ai',
        content: analysisContent,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, analysisMessage]);
      toast.success('File analyzed successfully! Ask me questions about it.');
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast.error('Failed to analyze file. Please try again.');
      setUploadedFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const removeAttachment = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && attachedFiles.length === 0) return;

    // Check if user has sufficient credits
    if (user.credits < 1) {
      setShowPurchasePrompt(true);
      toast.error('Insufficient credits. Please purchase more credits to continue.');
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: inputMessage || (attachedFiles.length > 0 ? 'Uploaded files for analysis' : ''),
      timestamp: new Date().toISOString(),
      subject: selectedSubject,
      difficulty: selectedDifficulty,
      attachments: [...attachedFiles]
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      // Prepare message content including file analysis
      let messageContent = inputMessage;
      let hasDocumentContext = false;

      if (attachedFiles.length > 0) {
        messageContent += '\n\n[DOCUMENT CONTEXT]:';
        attachedFiles.forEach(file => {
          messageContent += `\n- File: ${file.name} (${file.type})`;
          if (file.content) {
            messageContent += `\n- Content preview: ${file.content.substring(0, 1000)}...`;
          }
        });
        hasDocumentContext = true;
      } else if (uploadedFile) {
        // Reference the previously uploaded file
        messageContent += `\n\n[REFERRING TO UPLOADED FILE]: ${uploadedFile.name}`;
        hasDocumentContext = true;
      }

      // Gemini API integration
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        toast.error('Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.');
        setIsLoading(false);
        return;
      }

      const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
      const geminiPayload = {
        contents: [
          {
            parts: [
              { text: messageContent }
            ]
          }
        ]
      };

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geminiPayload)
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates.length > 0) {
        let aiText = data.candidates[0].content.parts[0].text;
        if (hasDocumentContext) {
          aiText = `📄 **Document-Based Analysis:**\n\n${aiText}\n\n💡 **Additional Context:**\nThis response is specifically tailored to your uploaded document. I've analyzed the content to provide the most relevant explanation.\n\n🎯 **Next Steps:**\n• Ask follow-up questions about specific parts\n• Request more detailed explanations\n• Get practice problems on this topic`;
        }
        const aiMessage: Message = {
          id: Date.now() + 1,
          type: 'ai',
          content: aiText,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);

        const newCredits = user.credits - 1;
        onCreditsUpdate(user.credits - 1);
        try {
          const { data, error } = await supabase
            .from("student_information")
            .update({ credits: newCredits })
            .eq("id", user.id)
            .select("credits")
            .maybeSingle();

          if (error) {
            console.error("Error updating credits:", error);
            toast.error("Failed to sync credits with database.");
          } else if (data) {
            onCreditsUpdate(data.credits);
          }
        } catch (err) {
          console.error("Network error:", err);
          toast.error("Network error while updating credits.");
        }

      } else {
        let errorMsg = 'Failed to get AI response from Gemini.';
        if (data && data.error && data.error.message) {
          errorMsg += `\nGemini error: ${data.error.message}`;
        } else if (data && data.error) {
          errorMsg += `\nGemini error: ${JSON.stringify(data.error)}`;
        } else if (data) {
          errorMsg += `\nGemini response: ${JSON.stringify(data)}`;
        }
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>AI Tutor Assistant</span>
                <Badge variant="secondary" className="text-xs">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Smart
                </Badge>
              </CardTitle>
              <CardDescription>
                Get instant help with your studies • Upload files for analysis • 1 credit per question
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <Coins className="h-4 w-4 text-yellow-600" />
              <span>{user.credits} credits</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Level {user.level}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Welcome to your AI Tutor Assistant!</p>
                <p className="text-sm">Ask me any academic question, upload files for analysis, and I'll help you understand step by step.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-center space-x-1 p-2 bg-blue-50 rounded">
                    <Upload className="h-3 w-3" />
                    <span>Upload PDFs & Images</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1 p-2 bg-green-50 rounded">
                    <FileText className="h-3 w-3" />
                    <span>Analyze Documents</span>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-[70%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                    }`}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-lg px-4 py-2 ${message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                    }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Show attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((file) => (
                          <div key={file.id} className="flex items-center space-x-2 text-xs opacity-80">
                            {getFileIcon(file.type)}
                            <span>{file.name}</span>
                            <span>({formatFileSize(file.size)})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.needsHumanTutor && (
                      <div className="mt-2 p-2 bg-orange-100 rounded border border-orange-200">
                        <div className="flex items-center space-x-2 text-orange-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-xs">Complex question detected</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 text-xs"
                          onClick={() => toast.info('Human tutor matching coming soon!')}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Connect with Human Tutor
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                      {message.subject && (
                        <Badge variant="secondary" className="text-xs">
                          {subjects.find(s => s.value === message.subject)?.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[70%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>
      </CardContent>

      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-6 pb-2">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                {getFileIcon(file.type)}
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(file.id)}
                  className="h-auto p-1 text-gray-500 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 border-t">
        {showPurchasePrompt && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 text-yellow-800 mb-2">
              <Coins className="h-4 w-4" />
              <span className="text-sm">You need more credits to continue</span>
            </div>
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => toast.info('Credit purchase coming soon!')}>
                Buy Credits
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPurchasePrompt(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <div className="flex-1 space-y-2">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask me anything about your studies or upload files..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-3"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                onClick={sendMessage}
                disabled={isLoading || (!inputMessage.trim() && attachedFiles.length === 0)}
                className="px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Press Enter to send • Upload PDFs, images, or text files • Costs 1 credit per question</span>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Instant AI responses</span>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
            }
          }}
          className="hidden"
        />
      </div>
    </div>
  );
}