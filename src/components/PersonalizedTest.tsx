import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import {
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  BookOpen,
  Lightbulb,
  RotateCcw,
  Zap,
  Award,
  AlertTriangle,
  BarChart3,
  FileText,
  Timer,
  Star
} from "lucide-react";
import { projectId } from '../utils/supabase/info';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  credits: number;
  level: number;
  weak_subjects: string[];
  preferred_learning_style: string;
}

interface Question {
  id: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: string[];
  type: 'multiple-choice' | 'short-answer' | 'essay';
  correctAnswer: string;
  explanation: string;
  points: number;
  timeLimit: number; // in seconds
  basedOnMistake?: boolean;
  mistakePattern?: string;
}

interface TestResult {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  pointsEarned: number;
}

interface LearningProgress {
  subject: string;
  topic: string;
  correctAnswers: number;
  totalAttempts: number;
  averageTime: number;
  recentMistakes: string[];
  difficultyLevel: number; // 1-5
  lastPracticed: string;
}

interface PersonalizedTestProps {
  user: User;
  accessToken: string;
}

export function PersonalizedTest({ user, accessToken }: PersonalizedTestProps) {
  const [testMode, setTestMode] = useState<'setup' | 'taking' | 'completed'>('setup');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [testType, setTestType] = useState<'adaptive' | 'weakness-focused' | 'comprehensive'>('adaptive');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTestTime, setTotalTestTime] = useState(0);
  const [testStartTime, setTestStartTime] = useState(0);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock learning progress data based on user's weak subjects and past performance
  useEffect(() => {
    const mockProgress: LearningProgress[] = [
      {
        subject: 'mathematics',
        topic: 'calculus',
        correctAnswers: 12,
        totalAttempts: 20,
        averageTime: 45,
        recentMistakes: ['integration by parts', 'chain rule application', 'implicit differentiation'],
        difficultyLevel: 3,
        lastPracticed: '2024-01-14T10:30:00Z'
      },
      {
        subject: 'physics',
        topic: 'mechanics',
        correctAnswers: 8,
        totalAttempts: 15,
        averageTime: 60,
        recentMistakes: ['projectile motion', 'circular motion', 'work-energy theorem'],
        difficultyLevel: 2,
        lastPracticed: '2024-01-13T14:20:00Z'
      },
      {
        subject: 'chemistry',
        topic: 'organic chemistry',
        correctAnswers: 15,
        totalAttempts: 18,
        averageTime: 38,
        recentMistakes: ['stereochemistry', 'reaction mechanisms'],
        difficultyLevel: 4,
        lastPracticed: '2024-01-15T09:15:00Z'
      }
    ];
    setLearningProgress(mockProgress);
  }, []);

  const subjects = [
    { value: 'mathematics', label: 'Mathematics', icon: '📐' },
    { value: 'physics', label: 'Physics', icon: '⚛️' },
    { value: 'chemistry', label: 'Chemistry', icon: '🧪' },
    { value: 'biology', label: 'Biology', icon: '🧬' },
    { value: 'computer-science', label: 'Computer Science', icon: '💻' },
    { value: 'english', label: 'English', icon: '📚' }
  ];

  const testTypes = [
    {
      value: 'adaptive',
      label: 'Adaptive Test',
      description: 'Questions adapt to your skill level based on performance',
      icon: Brain,
      color: 'text-blue-600'
    },
    {
      value: 'weakness-focused',
      label: 'Weakness-Focused',
      description: 'Target your weak areas and recent mistakes',
      icon: Target,
      color: 'text-red-600'
    },
    {
      value: 'comprehensive',
      label: 'Comprehensive Review',
      description: 'Balanced mix covering all topics and difficulty levels',
      icon: BookOpen,
      color: 'text-green-600'
    }
  ];

  // Generate personalized questions based on learning progress and mistakes
  const generatePersonalizedQuestions = async (subject: string, type: string) => {
    setIsLoading(true);

    try {
      // Find relevant learning progress for the subject
      const subjectProgress = learningProgress.filter(p => p.subject === subject);

      // Mock question generation based on learning progress
      const mockQuestions: Question[] = [];

      if (type === 'weakness-focused') {
        // Focus on topics with low accuracy or recent mistakes
        const weakTopics = subjectProgress.filter(p => p.correctAnswers / p.totalAttempts < 0.7);

        weakTopics.forEach((progress, index) => {
          progress.recentMistakes.forEach((mistake, mistakeIndex) => {
            mockQuestions.push({
              id: `${subject}_${index}_${mistakeIndex}`,
              subject: subject,
              topic: progress.topic,
              difficulty: progress.difficultyLevel <= 2 ? 'easy' : progress.difficultyLevel <= 3 ? 'medium' : 'hard',
              question: `Based on your recent mistake with "${mistake}", let's practice: What is the correct approach to ${mistake}?`,
              options: [
                `Option A - Standard approach to ${mistake}`,
                `Option B - Alternative method for ${mistake}`,
                `Option C - Common misconception about ${mistake}`,
                `Option D - Advanced technique for ${mistake}`
              ],
              type: 'multiple-choice',
              correctAnswer: 'Option A - Standard approach to ' + mistake,
              explanation: `The correct approach to ${mistake} involves understanding the fundamental principles and applying them step by step.`,
              points: 10,
              timeLimit: 90,
              basedOnMistake: true,
              mistakePattern: mistake
            });
          });
        });
      } else if (type === 'adaptive') {
        // Generate questions that adapt to user's current level
        subjectProgress.forEach((progress, index) => {
          const adaptiveDifficulty = progress.correctAnswers / progress.totalAttempts > 0.8 ? 'hard' :
            progress.correctAnswers / progress.totalAttempts > 0.6 ? 'medium' : 'easy';

          mockQuestions.push({
            id: `${subject}_adaptive_${index}`,
            subject: subject,
            topic: progress.topic,
            difficulty: adaptiveDifficulty,
            question: `${progress.topic.charAt(0).toUpperCase() + progress.topic.slice(1)} question adapted to your skill level: Solve this ${adaptiveDifficulty} problem.`,
            options: [
              'Option A - Correct approach',
              'Option B - Partially correct',
              'Option C - Common error',
              'Option D - Incorrect method'
            ],
            type: 'multiple-choice',
            correctAnswer: 'Option A - Correct approach',
            explanation: `This question was generated based on your current performance level in ${progress.topic}.`,
            points: adaptiveDifficulty === 'hard' ? 15 : adaptiveDifficulty === 'medium' ? 10 : 5,
            timeLimit: adaptiveDifficulty === 'hard' ? 120 : adaptiveDifficulty === 'medium' ? 90 : 60
          });
        });
      } else {
        // Comprehensive test with balanced coverage
        const allTopics = ['algebra', 'calculus', 'geometry', 'statistics'];
        const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

        allTopics.forEach((topic, topicIndex) => {
          difficulties.forEach((difficulty, diffIndex) => {
            mockQuestions.push({
              id: `${subject}_comprehensive_${topicIndex}_${diffIndex}`,
              subject: subject,
              topic: topic,
              difficulty: difficulty,
              question: `${topic.charAt(0).toUpperCase() + topic.slice(1)} ${difficulty} question: Demonstrate your understanding of ${topic} concepts.`,
              options: [
                `Option A - ${difficulty} level correct answer`,
                `Option B - Incorrect but plausible`,
                `Option C - Common student error`,
                `Option D - Completely wrong`
              ],
              type: 'multiple-choice',
              correctAnswer: `Option A - ${difficulty} level correct answer`,
              explanation: `This ${difficulty} question tests your comprehensive understanding of ${topic}.`,
              points: difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5,
              timeLimit: difficulty === 'hard' ? 120 : difficulty === 'medium' ? 90 : 60
            });
          });
        });
      }

      // Limit to 10 questions and shuffle
      const shuffledQuestions = mockQuestions.sort(() => Math.random() - 0.5).slice(0, 10);
      setQuestions(shuffledQuestions);

      const totalTime = shuffledQuestions.reduce((sum, q) => sum + q.timeLimit, 0);
      setTotalTestTime(totalTime);
      setTimeRemaining(totalTime);

    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate personalized test');
    } finally {
      setIsLoading(false);
    }
  };

  const startTest = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }

    await generatePersonalizedQuestions(selectedSubject, testType);
    setTestMode('taking');
    setTestStartTime(Date.now());

    // Start timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          completeTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeTest();
    }
  };

  const completeTest = () => {
    const results: TestResult[] = questions.map(question => {
      const userAnswer = answers[question.id] || '';
      const isCorrect = userAnswer === question.correctAnswer;
      const pointsEarned = isCorrect ? question.points : 0;

      return {
        questionId: question.id,
        userAnswer,
        isCorrect,
        timeSpent: 0, // Would calculate actual time spent
        pointsEarned
      };
    });

    setTestResults(results);
    setTestMode('completed');

    // Update learning progress based on results
    updateLearningProgress(results);

    toast.success('Test completed!');
  };

  const updateLearningProgress = (results: TestResult[]) => {
    // Mock update to learning progress based on test results
    const newMistakes: string[] = [];

    results.forEach((result, index) => {
      const question = questions[index];
      if (!result.isCorrect) {
        newMistakes.push(question.topic);
      }
    });

    // This would normally update the backend
    console.log('New mistakes to track:', newMistakes);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateScore = () => {
    const totalPoints = testResults.reduce((sum, result) => sum + result.pointsEarned, 0);
    const maxPoints = questions.reduce((sum, question) => sum + question.points, 0);
    return { totalPoints, maxPoints, percentage: maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0 };
  };

  const getPerformanceInsights = () => {
    const correctAnswers = testResults.filter(r => r.isCorrect).length;
    const totalQuestions = testResults.length;
    const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const weakTopics = questions
      .filter((q, index) => !testResults[index]?.isCorrect)
      .map(q => q.topic)
      .filter((topic, index, arr) => arr.indexOf(topic) === index);

    return { accuracy, weakTopics };
  };

  if (testMode === 'setup') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-purple-600" />
              <span>Personalized Test Generator</span>
            </CardTitle>
            <CardDescription>
              AI-powered tests based on your learning progress and mistake patterns
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Learning Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Your Learning Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {learningProgress.map((progress) => (
                <div key={`${progress.subject}_${progress.topic}`} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {subjects.find(s => s.value === progress.subject)?.icon}
                      </span>
                      <div>
                        <h4 className="font-medium capitalize">{progress.topic}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{progress.subject}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={progress.correctAnswers / progress.totalAttempts >= 0.8 ? 'border-green-500 text-green-700' :
                        progress.correctAnswers / progress.totalAttempts >= 0.6 ? 'border-yellow-500 text-yellow-700' :
                          'border-red-500 text-red-700'}
                    >
                      {Math.round((progress.correctAnswers / progress.totalAttempts) * 100)}% accuracy
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.correctAnswers}/{progress.totalAttempts} correct</span>
                    </div>
                    <Progress value={(progress.correctAnswers / progress.totalAttempts) * 100} className="h-2" />
                  </div>

                  {progress.recentMistakes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground mb-1">Recent mistakes:</p>
                      <div className="flex flex-wrap gap-1">
                        {progress.recentMistakes.map((mistake) => (
                          <Badge key={mistake} variant="outline" className="text-xs border-red-200 text-red-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {mistake}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Test</CardTitle>
            <CardDescription>Choose subject and test type based on your learning needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subject Selection */}
            <div>
              <Label className="text-base font-medium mb-3 block">Select Subject</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <div
                    key={subject.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${selectedSubject === subject.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    onClick={() => setSelectedSubject(subject.value)}
                  >
                    <div className="text-center">
                      <span className="text-2xl mb-2 block">{subject.icon}</span>
                      <span className="text-sm font-medium">{subject.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Type Selection */}
            <div>
              <Label className="text-base font-medium mb-3 block">Test Type</Label>
              <div className="space-y-3">
                {testTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <div
                      key={type.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${testType === type.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      onClick={() => setTestType(type.value as any)}
                    >
                      <div className="flex items-start space-x-3">
                        <IconComponent className={`h-5 w-5 mt-1 ${type.color}`} />
                        <div className="flex-1">
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={startTest}
              disabled={!selectedSubject || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating Personalized Test...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Personalized Test
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (testMode === 'taking') {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        {/* Test Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="outline">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </Badge>
                <Badge className={
                  currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                }>
                  {currentQuestion.difficulty}
                </Badge>
                {currentQuestion.basedOnMistake && (
                  <Badge variant="outline" className="border-orange-500 text-orange-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Mistake-based
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4" />
                  <span>{currentQuestion.points} pts</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="capitalize">{currentQuestion.topic}</span>
            </CardTitle>
            <CardDescription>
              {currentQuestion.basedOnMistake && currentQuestion.mistakePattern &&
                `This question targets your recent mistake with: ${currentQuestion.mistakePattern}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-lg leading-relaxed">
              {currentQuestion.question}
            </div>

            {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.type === 'short-answer' && (
              <div>
                <Label>Your Answer</Label>
                <Textarea
                  placeholder="Enter your answer here..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                Suggested time: {formatTime(currentQuestion.timeLimit)}
              </div>
              <div className="space-x-2">
                {currentQuestionIndex > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  >
                    Previous
                  </Button>
                )}
                <Button
                  onClick={nextQuestion}
                  disabled={!answers[currentQuestion.id]}
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Complete Test' : 'Next Question'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (testMode === 'completed') {
    const score = calculateScore();
    const insights = getPerformanceInsights();

    return (
      <div className="space-y-6">
        {/* Results Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span>Test Completed!</span>
            </CardTitle>
            <CardDescription>
              Here's your personalized performance analysis and improvement recommendations
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{score.percentage}%</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <div className="text-xs text-muted-foreground mt-1">
                {score.totalPoints}/{score.maxPoints} points
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{Math.round(insights.accuracy)}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
              <div className="text-xs text-muted-foreground mt-1">
                {testResults.filter(r => r.isCorrect).length}/{testResults.length} correct
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {Math.round((totalTestTime - timeRemaining) / 60)}
              </div>
              <div className="text-sm text-muted-foreground">Minutes Used</div>
              <div className="text-xs text-muted-foreground mt-1">
                of {Math.round(totalTestTime / 60)} allocated
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Question-by-Question Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, index) => {
                const result = testResults[index];
                return (
                  <div key={question.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium">Question {index + 1}</span>
                          <Badge variant="outline" className="text-xs">{question.topic}</Badge>
                          <Badge
                            className={`text-xs ${question.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
                                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                              }`}
                          >
                            {question.difficulty}
                          </Badge>
                          {question.basedOnMistake && (
                            <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Mistake-based
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mb-2">{question.question}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {result?.isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {result?.pointsEarned || 0}/{question.points} pts
                        </span>
                      </div>
                    </div>

                    {!result?.isCorrect && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                        <div className="flex items-start space-x-2">
                          <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                            <p className="text-sm text-blue-700">{question.explanation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Improvement Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Personalized Improvement Plan</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.weakTopics.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Areas needing attention:</h4>
                  <div className="flex flex-wrap gap-2">
                    {insights.weakTopics.map((topic) => (
                      <Badge key={topic} variant="outline" className="border-red-500 text-red-700">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-red-700 mt-2">
                    Consider scheduling additional practice sessions for these topics.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Recommended Actions:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Review mistake-based questions more carefully</li>
                    <li>• Practice similar problems in weak areas</li>
                    <li>• Use AI Tutor for detailed explanations</li>
                    <li>• Schedule follow-up test in 1 week</li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Strengths Identified:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {questions
                      .filter((q, i) => testResults[i]?.isCorrect)
                      .map(q => q.topic)
                      .filter((topic, index, arr) => arr.indexOf(topic) === index)
                      .slice(0, 3)
                      .map(topic => (
                        <li key={topic}>• Strong performance in {topic}</li>
                      ))
                    }
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button onClick={() => setTestMode('setup')} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Take Another Test
          </Button>
          <Button onClick={() => toast.info('Test results saved to your progress!')}>
            <Award className="h-4 w-4 mr-2" />
            Save Results
          </Button>
        </div>
      </div>
    );
  }

  return null;
}