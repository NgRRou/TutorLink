import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  BookOpen,
  Star,
  Eye,
  Clock,
  Users
} from "lucide-react";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  credits: number;
}

interface PastPaper {
  id: string;
  title: string;
  subject: string;
  year: number;
  examType: string;
  difficulty: string;
  questions: number;
  duration: string;
  downloads: number;
  rating: number;
  size: string;
  format: string;
  hasSolutions: boolean;
  previewUrl?: string;
  downloadUrl?: string;
}

interface PastYearPapersProps {
  user: User;
  accessToken: string;
}

export function PastYearPapers({ user, accessToken }: PastYearPapersProps) {
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<PastPaper[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedExamType, setSelectedExamType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics', 'Accounting'
  ];

  const examTypes = ['Final Exam', 'Mid Term', 'Quiz', 'Mock Exam', 'Practice Test'];
  const years = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

  // Mock data for demonstration
  useEffect(() => {
    const mockPapers: PastPaper[] = [
      {
        id: '1',
        title: 'Advanced Calculus Final Examination',
        subject: 'Mathematics',
        year: 2024,
        examType: 'Final Exam',
        difficulty: 'Hard',
        questions: 15,
        duration: '3 hours',
        downloads: 1247,
        rating: 4.8,
        size: '2.4 MB',
        format: 'PDF',
        hasSolutions: true
      },
      {
        id: '2',
        title: 'Organic Chemistry Mid Term',
        subject: 'Chemistry',
        year: 2024,
        examType: 'Mid Term',
        difficulty: 'Medium',
        questions: 25,
        duration: '2 hours',
        downloads: 892,
        rating: 4.6,
        size: '1.8 MB',
        format: 'PDF',
        hasSolutions: true
      },
      {
        id: '3',
        title: 'Quantum Physics Practice Paper',
        subject: 'Physics',
        year: 2023,
        examType: 'Practice Test',
        difficulty: 'Hard',
        questions: 20,
        duration: '2.5 hours',
        downloads: 2103,
        rating: 4.9,
        size: '3.2 MB',
        format: 'PDF',
        hasSolutions: true
      },
      {
        id: '4',
        title: 'Cell Biology Final Exam',
        subject: 'Biology',
        year: 2024,
        examType: 'Final Exam',
        difficulty: 'Medium',
        questions: 30,
        duration: '2 hours',
        downloads: 756,
        rating: 4.4,
        size: '1.5 MB',
        format: 'PDF',
        hasSolutions: false
      },
      {
        id: '5',
        title: 'English Literature Analysis',
        subject: 'English',
        year: 2023,
        examType: 'Final Exam',
        difficulty: 'Medium',
        questions: 8,
        duration: '3 hours',
        downloads: 634,
        rating: 4.3,
        size: '0.9 MB',
        format: 'PDF',
        hasSolutions: true
      },
      {
        id: '6',
        title: 'World History Mock Exam',
        subject: 'History',
        year: 2023,
        examType: 'Mock Exam',
        difficulty: 'Easy',
        questions: 40,
        duration: '1.5 hours',
        downloads: 445,
        rating: 4.1,
        size: '1.2 MB',
        format: 'PDF',
        hasSolutions: true
      }
    ];

    setPapers(mockPapers);
    setFilteredPapers(mockPapers);
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let filtered = papers;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by subject
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(paper => paper.subject === selectedSubject);
    }

    // Filter by year
    if (selectedYear !== 'all') {
      filtered = filtered.filter(paper => paper.year === parseInt(selectedYear));
    }

    // Filter by exam type
    if (selectedExamType !== 'all') {
      filtered = filtered.filter(paper => paper.examType === selectedExamType);
    }

    // Sort results
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => b.year - a.year);
        break;
      case 'popular':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    setFilteredPapers(filtered);
  }, [searchQuery, selectedSubject, selectedYear, selectedExamType, sortBy, papers]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDownload = (paper: PastPaper) => {
    // Simulate download
    toast.success(`Downloading ${paper.title}...`);
    console.log('Downloading paper:', paper.id);
  };

  const handlePreview = (paper: PastPaper) => {
    toast.info('Preview feature coming soon!');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedYear('all');
    setSelectedExamType('all');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-orange-600" />
            <span>Past Year Papers</span>
          </CardTitle>
          <CardDescription>
            Access a comprehensive collection of exam papers and practice questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{papers.length}</div>
              <div className="text-sm text-blue-700">Total Papers</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{subjects.length}</div>
              <div className="text-sm text-green-700">Subjects</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{years.length}</div>
              <div className="text-sm text-purple-700">Years Available</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {papers.reduce((sum, paper) => sum + paper.downloads, 0)}
              </div>
              <div className="text-sm text-orange-700">Total Downloads</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search papers by title or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedExamType} onValueChange={setSelectedExamType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {examTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>

            {/* Active Filters */}
            <div className="flex flex-wrap gap-2">
              {selectedSubject !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Subject: {selectedSubject}
                  <button
                    onClick={() => setSelectedSubject('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedYear !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Year: {selectedYear}
                  <button
                    onClick={() => setSelectedYear('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedExamType !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Type: {selectedExamType}
                  <button
                    onClick={() => setSelectedExamType('all')}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Papers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Exam Papers ({filteredPapers.length})</span>
            <Badge variant="outline" className="text-xs">
              {filteredPapers.length} of {papers.length} papers
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPapers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No papers found matching your criteria</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPapers.map((paper) => (
                <div key={paper.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-lg">{paper.title}</h3>
                        {paper.hasSolutions && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Solutions Included
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {paper.subject}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {paper.year}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {paper.examType}
                        </Badge>
                        <Badge className={`text-xs ${getDifficultyColor(paper.difficulty)}`}>
                          {paper.difficulty}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{paper.questions} questions</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{paper.duration}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{paper.downloads} downloads</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{paper.rating}/5</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handlePreview(paper)}
                        variant="outline"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(paper)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Format: {paper.format} • Size: {paper.size}</span>
                      <span>★ {paper.rating}/5 ({paper.downloads} downloads)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Papers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-600" />
            <span>Most Popular Papers</span>
          </CardTitle>
          <CardDescription>Trending papers this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {papers
              .sort((a, b) => b.downloads - a.downloads)
              .slice(0, 3)
              .map((paper, index) => (
                <div key={paper.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="text-xs bg-yellow-100 text-yellow-700">
                      #{index + 1} Most Popular
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs">{paper.rating}</span>
                    </div>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{paper.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {paper.subject} • {paper.year}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {paper.downloads} downloads
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(paper)}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}