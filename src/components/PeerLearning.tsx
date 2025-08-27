import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import {
  Users,
  BookOpen,
  MessageCircle,
  Share2,
  Upload,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  Paperclip,
  Star,
  Heart,
  Eye,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Award,
  TrendingUp,
  Lightbulb,
  Globe
} from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  credits: number;
  level: number;
}

interface Community {
  id: string;
  name: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  memberCount: number;
  description: string;
  isJoined: boolean;
  recentActivity: string;
  moderators: string[];
  tags: string[];
}

interface SharedResource {
  id: string;
  title: string;
  description: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  subject: string;
  difficulty: string;
  downloads: number;
  likes: number;
  isLiked: boolean;
  tags: string[];
  communityId: string;
}

interface StudyGroup {
  id: string;
  group_name: string;
  subject: string;
  difficulty: string;
  memberCount: number;
  maxMembers: number;
  description: string;
  isJoined: boolean;
}

interface PeerLearningProps {
  user: User;
  accessToken: string;
}

export function PeerLearning({ user, accessToken }: PeerLearningProps) {
  const [activeTab, setActiveTab] = useState('communities');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock data for communities
  const [communities] = useState<Community[]>([
    {
      id: '1',
      name: 'Advanced Mathematics Study Circle',
      subject: 'mathematics',
      difficulty: 'advanced',
      memberCount: 156,
      isJoined: true,
      recentActivity: '5 new resources shared today',
      moderators: ['Dr. Sarah Chen', 'Prof. Michael Johnson'],
      tags: ['calculus', 'linear-algebra', 'proofs'],
      description: 'A group for advanced math learners.'
    },
    {
      id: '2',
      name: 'Physics Problem Solvers',
      subject: 'physics',
      difficulty: 'intermediate',
      memberCount: 89,
      isJoined: false,
      recentActivity: '12 active discussions',
      moderators: ['Dr. Emma Wilson'],
      tags: ['mechanics', 'thermodynamics', 'problems'],
      description: 'Collaborative problem solving for mechanics, thermodynamics, and electromagnetism'
    },
    {
      id: '3',
      name: 'Chemistry Lab Partners',
      subject: 'chemistry',
      difficulty: 'beginner',
      memberCount: 67,
      isJoined: true,
      recentActivity: '3 new lab reports uploaded',
      moderators: ['Prof. David Kim'],
      tags: ['lab-reports', 'experiments', 'organic'],
      description: 'Share lab reports, discuss experiments, and learn together'
    },
    {
      id: '4',
      name: 'Computer Science Algorithms',
      subject: 'computer-science',
      difficulty: 'expert',
      memberCount: 234,
      isJoined: false,
      recentActivity: '8 coding challenges posted',
      moderators: ['Alex Rodriguez', 'Lisa Zhang'],
      tags: ['algorithms', 'data-structures', 'coding'],
      description: 'Advanced algorithms, data structures, and competitive programming'
    }
  ]);

  // Mock data for shared resources
  const [resources] = useState<SharedResource[]>([
    {
      id: '1',
      title: 'Calculus Integration Techniques Cheat Sheet',
      description: 'Comprehensive guide covering all major integration methods with examples',
      fileType: 'application/pdf',
      fileName: 'calculus_integration_guide.pdf',
      fileSize: 2458672,
      uploadedBy: 'Sarah Chen',
      uploadedAt: '2024-01-15T10:30:00Z',
      subject: 'mathematics',
      difficulty: 'advanced',
      downloads: 342,
      likes: 89,
      isLiked: false,
      tags: ['calculus', 'integration', 'techniques'],
      communityId: '1'
    },
    {
      id: '2',
      title: 'Physics Formula Reference Card',
      description: 'Quick reference for mechanics, waves, and thermodynamics formulas',
      fileType: 'image/png',
      fileName: 'physics_formulas.png',
      fileSize: 1256789,
      uploadedBy: 'Michael Johnson',
      uploadedAt: '2024-01-14T15:45:00Z',
      subject: 'physics',
      difficulty: 'intermediate',
      downloads: 156,
      likes: 34,
      isLiked: false,
      tags: ['formulas', 'reference', 'mechanics'],
      communityId: '2'
    },
    {
      id: '3',
      title: 'Organic Chemistry Lab Report Template',
      description: 'Template for organic chemistry lab reports',
      fileType: 'application/msword',
      fileName: 'lab_report_template.docx',
      fileSize: 45673,
      uploadedBy: 'Emma Wilson',
      uploadedAt: '2024-01-13T09:20:00Z',
      subject: 'chemistry',
      difficulty: 'beginner',
      downloads: 45,
      likes: 23,
      isLiked: false,
      tags: ['lab-report', 'template', 'organic'],
      communityId: '3'
    }
  ]);

  // Mock data for study groups
  const [studyGroups] = useState<StudyGroup[]>([
    {
      id: '1',
      group_name: 'Weekend Calculus Warriors',
      subject: 'mathematics',
      difficulty: 'advanced',
      memberCount: 8,
      maxMembers: 12,
      description: 'Intensive weekend sessions focusing on calculus problem solving',
      isJoined: true
    },
    {
      id: '2',
      group_name: 'Physics Study Buddies',
      subject: 'physics',
      difficulty: 'intermediate',
      memberCount: 6,
      maxMembers: 10,
      description: 'Weekly discussion sessions for physics concepts and problem solving',
      isJoined: false
    }
  ]);

  const subjects = [
    { value: 'all', label: 'All Subjects' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'computer-science', label: 'Computer Science' },
    { value: 'english', label: 'English' },
    { value: 'history', label: 'History' }
  ];

  const difficulties = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (fileType.includes('video')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-blue-100 text-blue-700';
      case 'advanced': return 'bg-orange-100 text-orange-700';
      case 'expert': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'mathematics': return '📐';
      case 'physics': return '⚛️';
      case 'chemistry': return '🧪';
      case 'biology': return '🧬';
      case 'computer-science': return '💻';
      case 'english': return '📚';
      case 'history': return '🏛️';
      default: return '📖';
    }
  };

  const handleJoinCommunity = (communityId: string) => {
    toast.success('Joined community successfully!');
  };

  const handleLikeResource = (resourceId: string) => {
    toast.success('Resource liked!');
  };

  const handleDownloadResource = (resource: SharedResource) => {
    toast.success(`Downloaded ${resource.fileName}`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      toast.success('File uploaded successfully!');
      setIsUploadDialogOpen(false);
    }
  };

  const filteredCommunities = communities.filter(community => {
    const matchesSubject = selectedSubject === 'all' || community.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || community.difficulty === selectedDifficulty;
    const matchesSearch = searchQuery === '' ||
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesDifficulty && matchesSearch;
  });

  const filteredResources = resources.filter(resource => {
    const matchesSubject = selectedSubject === 'all' || resource.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || resource.difficulty === selectedDifficulty;
    const matchesSearch = searchQuery === '' ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesDifficulty && matchesSearch;
  });

  const filteredStudyGroups = studyGroups.filter(group => {
    const matchesSubject = selectedSubject === 'all' || group.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || group.difficulty === selectedDifficulty;
    const matchesSearch = searchQuery === '' ||
      group.group_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesDifficulty && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-purple-600" />
            <span>Peer Learning Communities</span>
          </CardTitle>
          <CardDescription>
            Join subject-based communities, share resources, and collaborate with fellow students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search communities, resources, or study groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.value} value={subject.value}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map(difficulty => (
                  <SelectItem key={difficulty.value} value={difficulty.value}>
                    {difficulty.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="communities">Communities</TabsTrigger>
              <TabsTrigger value="resources">Shared Resources</TabsTrigger>
              <TabsTrigger value="study-groups">Study Groups</TabsTrigger>
            </TabsList>

            {/* Communities Tab */}
            <TabsContent value="communities" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredCommunities.length} communities found
                </p>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Community
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Community</DialogTitle>
                      <DialogDescription>
                        Start a new learning community for your subject
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Community Name</Label>
                        <Input placeholder="e.g., Advanced Physics Study Group" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Describe what this community is about..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Subject</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.slice(1).map(subject => (
                                <SelectItem key={subject.value} value={subject.value}>
                                  {subject.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Difficulty Level</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              {difficulties.slice(1).map(difficulty => (
                                <SelectItem key={difficulty.value} value={difficulty.value}>
                                  {difficulty.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button className="flex-1" onClick={() => {
                          toast.success('Community created successfully!');
                          setIsCreateDialogOpen(false);
                        }}>
                          Create Community
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCommunities.map((community) => (
                  <Card key={community.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{getSubjectIcon(community.subject)}</span>
                          <div>
                            <CardTitle className="text-lg">{community.name}</CardTitle>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getDifficultyColor(community.difficulty)}>
                                {community.difficulty}
                              </Badge>
                              <Badge variant="outline">
                                <Users className="h-3 w-3 mr-1" />
                                {community.memberCount}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {community.isJoined && (
                          <Badge variant="secondary">Joined</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {community.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {community.recentActivity}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {community.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-xs text-muted-foreground">
                          Moderated by {community.moderators[0]}
                          {community.moderators.length > 1 && ` +${community.moderators.length - 1} more`}
                        </div>
                        {!community.isJoined ? (
                          <Button size="sm" onClick={() => handleJoinCommunity(community.id)}>
                            Join
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredResources.length} resources found
                </p>
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Share Resource
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Share Learning Resource</DialogTitle>
                      <DialogDescription>
                        Upload and share study materials with the community
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Resource Title</Label>
                        <Input placeholder="e.g., Calculus Study Guide" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Describe what this resource covers..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Subject</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.slice(1).map(subject => (
                                <SelectItem key={subject.value} value={subject.value}>
                                  {subject.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Difficulty Level</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              {difficulties.slice(1).map(difficulty => (
                                <SelectItem key={difficulty.value} value={difficulty.value}>
                                  {difficulty.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Upload File</Label>
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">Click to upload or drag and drop files</p>
                          <p className="text-xs text-gray-500 mt-1">PDF, DOC, Images up to 10MB</p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button className="flex-1" onClick={() => {
                          toast.success('Resource shared successfully!');
                          setIsUploadDialogOpen(false);
                        }}>
                          Share Resource
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setIsUploadDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {filteredResources.map((resource) => (
                  <Card key={resource.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 bg-blue-50 rounded">
                            {getFileIcon(resource.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm mb-1">{resource.title}</h4>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {resource.description}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>By {resource.uploadedBy}</span>
                              <span>{formatFileSize(resource.fileSize)}</span>
                              <span>{new Date(resource.uploadedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge className={getDifficultyColor(resource.difficulty)}>
                                {resource.difficulty}
                              </Badge>
                              <Badge variant="outline">
                                <span className="mr-1">{getSubjectIcon(resource.subject)}</span>
                                {subjects.find(s => s.value === resource.subject)?.label}
                              </Badge>
                              {resource.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <div className="text-xs text-muted-foreground text-center">
                            <div className="flex items-center space-x-1">
                              <Download className="h-3 w-3" />
                              <span>{resource.downloads}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLikeResource(resource.id)}
                            className={`p-1 ${resource.isLiked ? 'text-red-600' : 'text-gray-400'}`}
                          >
                            <Heart className={`h-4 w-4 ${resource.isLiked ? 'fill-current' : ''}`} />
                            <span className="ml-1 text-xs">{resource.likes}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadResource(resource)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Study Groups Tab */}
            <TabsContent value="study-groups" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredStudyGroups.length} study groups found
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Study Group
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudyGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center space-x-2">
                            <span className="text-xl">{getSubjectIcon(group.subject)}</span>
                            <span>{group.group_name}</span>
                          </CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getDifficultyColor(group.difficulty)}>
                              {group.difficulty}
                            </Badge>
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              {group.memberCount}/{group.maxMembers}
                            </Badge>
                          </div>
                        </div>
                        {group.isJoined && (
                          <Badge variant="secondary">Joined</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {group.description}
                      </p>
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-xs text-muted-foreground">
                          {group.maxMembers - group.memberCount} spots remaining
                        </div>
                        {!group.isJoined ? (
                          <Button size="sm">
                            Join Group
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Chat
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">3</div>
            <div className="text-sm text-muted-foreground">Joined Communities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">12</div>
            <div className="text-sm text-muted-foreground">Shared Resources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">156</div>
            <div className="text-sm text-muted-foreground">Total Downloads</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">1</div>
            <div className="text-sm text-muted-foreground">Active Study Groups</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}