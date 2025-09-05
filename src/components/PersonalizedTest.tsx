import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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
  Star,
  Settings
} from "lucide-react";
import { projectId } from '../utils/supabase/info';
import { supabase } from '../utils/supabase/client';

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
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: string[];
  type: 'multiple-choice' | 'short-answer' | 'essay';
  correctAnswer: string;
  explanation: string;
  points: number;
  timeLimit: number; 
  basedOnMistake?: boolean;
  mistakePattern?: string;
  rowId?: string;
  raw?: any;
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
  correctAnswers: number;
  totalAttempts: number;
  averageTime: number;
  recentMistakes: string[];
  difficultyLevel: number;
  lastPracticed: string;
}

interface PersonalizedTestProps {
  user: User;
  accessToken: string;
}

export function PersonalizedTest({ user, accessToken }: PersonalizedTestProps) {
  const [testMode, setTestMode] = useState<'setup' | 'taking' | 'completed' | 'revision'>('setup');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTestTime, setTotalTestTime] = useState(0);
  const [testStartTime, setTestStartTime] = useState(0);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchProgress() {
      if (!user?.id) return;
      setIsLoading(true);

      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', user.id);

      let normalized: LearningProgress[] = [];

      if (!error && data) {
        normalized = data.map((row: any) => ({
          subject: row.subject,
          correctAnswers: row.correct_answers || 0,
          totalAttempts: row.total_questions || 0,
          averageTime: row.average_time || 0,
          recentMistakes: row.mistakes || [],
          difficultyLevel: row.difficulty_level || 0,
          lastPracticed: row.last_updated || ""
        }));
      }

      const aggregated: Record<string, LearningProgress> = {};
      normalized.forEach(p => {
        if (!aggregated[p.subject]) {
          aggregated[p.subject] = { ...p };
        } else {
          aggregated[p.subject].correctAnswers += p.correctAnswers;
          aggregated[p.subject].totalAttempts += p.totalAttempts;
          aggregated[p.subject].recentMistakes = [
            ...aggregated[p.subject].recentMistakes,
            ...p.recentMistakes
          ];
          if (p.lastPracticed > aggregated[p.subject].lastPracticed) {
            aggregated[p.subject].lastPracticed = p.lastPracticed;
          }
        }
      });

      const merged = subjects.map(s => aggregated[s.value] || {
        subject: s.value,
        correctAnswers: 0,
        totalAttempts: 0,
        averageTime: 0,
        recentMistakes: [],
        difficultyLevel: 0,
        lastPracticed: ""
      });

      setLearningProgress(merged);
      setIsLoading(false);
    }
    fetchProgress();
  }, [user?.id]);

  const subjects = [
    { value: 'mathematics', label: 'Mathematics', icon: '📐' },
    { value: 'physics', label: 'Physics', icon: '⚛️' },
    { value: 'chemistry', label: 'Chemistry', icon: '🧪' },
    { value: 'biology', label: 'Biology', icon: '🧬' },
    { value: 'computer-science', label: 'Computer Science', icon: '💻' },
    { value: 'english', label: 'English', icon: '📚' }
  ];

  const generateQuestionsFromGemini = async (subject: string, difficulty: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': import.meta.env.VITE_GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate 10 multiple-choice questions for the subject "${subject}" at "${difficulty}" difficulty. Each question should be a JSON object with: question, options (array of 4), correctAnswer, explanation. Return ONLY a JSON array, no extra text or formatting.`
            }]
          }]
        })
      });

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("No text returned from Gemini.");

      const match = rawText.match(/\[.*\]/s);
      if (!match) throw new Error("No JSON array found in Gemini response.");

      let parsed: any[];
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        console.warn("Strict JSON parse failed, trying JSON5...");
        const JSON5: any = (await import('json5')).default;
        parsed = JSON5.parse(match[0]);
      }

      const questions: Question[] = parsed.map((q: any, idx: number) => {
        let correct = q.correctAnswer.trim();

        if (/^[A-D]$/i.test(correct) && Array.isArray(q.options)) {
          const letterIndex = correct.toUpperCase().charCodeAt(0) - 65; 
          correct = q.options[letterIndex];
        }

        return {
          id: `q_${idx}`,
          subject,
          difficulty: difficulty.toLowerCase() as any,
          question: q.question,
          options: q.options,
          type: 'multiple-choice',
          correctAnswer: correct,
          explanation: q.explanation,
          points: difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5,
          timeLimit: difficulty === 'hard' ? 120 : difficulty === 'medium' ? 90 : 60
        };
      });

      setQuestions(questions);

      const totalTime = questions.reduce((sum, q) => sum + q.timeLimit, 0);
      setTotalTestTime(totalTime);
      setTimeRemaining(totalTime);

    } catch (error) {
      console.error("Error generating questions from Gemini:", error);
      toast.error('Failed to generate questions. Check console for details.');
      setQuestions([]);
      setTestMode('setup');
    } finally {
      setIsLoading(false);
    }
  };

  const startTest = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }

    setCurrentQuestionIndex(0);
    setAnswers({});
    setTestResults([]);
    setQuestions([]);
    setTimeRemaining(0);
    setTotalTestTime(0);
    await generateQuestionsFromGemini(selectedSubject, difficulty);
    setTestMode('taking');
    setTestStartTime(Date.now());

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
      if (testMode === "revision") {
        completeRevision();
      } else {
        completeTest();
      }
    }
  };

  const completeTest = async () => {
    const results: TestResult[] = questions.map(question => {
      const userAnswer = answers[question.id] || '';
      const isCorrect = userAnswer === question.correctAnswer;
      const pointsEarned = isCorrect ? question.points : 0;
      return {
        questionId: question.id,
        userAnswer,
        isCorrect,
        timeSpent: 0, 
        pointsEarned
      };
    });

    setTestResults(results);
    setTestMode('completed');

    updateLearningProgress(results);

    const totalExp = results.reduce((sum, r) => sum + r.pointsEarned, 0);
    const creditsEarned = results.filter(r => r.isCorrect).length;
    if (user?.id) {
      const { data: student, error: fetchError } = await supabase
        .from('student_information')
        .select('experience, credits')
        .eq('id', user.id)
        .maybeSingle();
      if (!fetchError && student) {
        const { error } = await supabase
          .from('student_information')
          .update({
            experience: (student.experience || 0) + totalExp,
            credits: (student.credits || 0) + creditsEarned
          })
          .eq('id', user.id);
        await supabase
          .from('leaderboard')
          .update({
            experience: (student.experience || 0) + totalExp
          })
          .eq('student_id', user.id);
        if (!error) {
          toast.success(`You earned ${totalExp} experience and ${creditsEarned} credits!`);
        }
      }
    }

    toast.success('Test completed!');
  };

  const completeRevision = async () => {
    if (!user?.id) return;

    const results: TestResult[] = questions.map(q => {
      const userAnswer = answers[q.id] || '';
      const isCorrect = userAnswer.trim() === q.correctAnswer.trim();
      return { questionId: q.id, userAnswer, isCorrect, timeSpent: 0, pointsEarned: isCorrect ? q.points : 0 };
    });

    setTestResults(results);
    setTestMode('completed');

    for (const q of questions) {
      if (!q.rowId) continue; 
      const result = results.find(r => r.questionId === q.id);
      if (!result?.isCorrect) continue; 

      const { data: row, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('id', q.rowId)
        .maybeSingle();

      if (error || !row) continue;

      const parsedMistakes = (row.mistakes || []).map((m: any) =>
        typeof m === 'string' ? JSON.parse(m) : m
      );

      const updatedMistakes = parsedMistakes.filter(pm =>
        !(pm.question === q.question && pm.correctAnswer === q.correctAnswer)
      );

      await supabase
        .from('learning_progress')
        .update({
          mistakes: updatedMistakes.map(m => JSON.stringify(m)),
          correct_answers: (row.correct_answers || 0) + 1, 
          last_updated: new Date().toISOString()
        })
        .eq('id', q.rowId);
    }

    toast.success('Revision completed! Correct answers updated.');
  };

  const updateLearningProgress = async (results: TestResult[]) => {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const mistakes = results
      .map((r, idx) => {
        if (!r.isCorrect && questions[idx]) {
          return JSON.stringify({
            question: questions[idx].question,
            options: questions[idx].options,
            correctAnswer: questions[idx].correctAnswer,
            explanation: questions[idx].explanation
          });
        }
        return null;
      })
      .filter((q): q is string => !!q);

    const { data: existing, error: fetchError } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('subject', selectedSubject)
      .eq('difficulty', difficulty)
      .maybeSingle();

    if (fetchError) return;

    let updatedRecord;
    if (existing) {
      updatedRecord = {
        user_id: user.id,
        subject: selectedSubject,
        difficulty,
        mistakes: [...existing.mistakes, ...mistakes],
        last_updated: new Date().toISOString(),
        correct_answers: existing.correct_answers + correct,
        total_questions: existing.total_questions + total
      };
    } else {
      updatedRecord = {
        user_id: user.id,
        subject: selectedSubject,
        difficulty,
        mistakes,
        last_updated: new Date().toISOString(),
        correct_answers: correct,
        total_questions: total
      };
    }
    
    const { error } = await supabase
      .from('learning_progress')
      .upsert(updatedRecord, { onConflict: 'user_id,subject,difficulty' });

    if (error) console.error('Error updating learning progress:', error);
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
      .map(q => q.subject)
      .filter((subject, index, arr) => arr.indexOf(subject) === index);

    return { accuracy, weakTopics };
  };

  const startRevisionFromMistakes = async () => {
    if (!user?.id || !selectedSubject) {
      toast.error('Select a subject first.');
      return;
    }

    setIsLoading(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTestResults([]);
    setQuestions([]);
    setTimeRemaining(0);
    setTotalTestTime(0);

    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('id, subject, difficulty, mistakes, correct_answers')
        .eq('user_id', user.id)
        .eq('subject', selectedSubject);

      if (error || !data) {
        toast.error('Failed to fetch mistakes.');
        setIsLoading(false);
        return;
      }

      const allMistakes: Question[] = [];
      const rowMap: Record<string, any> = {}; 
      data.forEach((row: any) => {
        rowMap[row.id] = row;
        if (!Array.isArray(row.mistakes)) return;

        row.mistakes.forEach((m: any) => {
          let parsed = typeof m === 'string' ? JSON.parse(m) : m;
          if (!parsed?.question || !parsed?.correctAnswer) return;

          allMistakes.push({
            id: `mistake_${allMistakes.length}`,
            subject: row.subject,
            difficulty: row.difficulty,   
            question: parsed.question,
            options: parsed.options,
            type: Array.isArray(parsed.options) && parsed.options.length > 0 ? "multiple-choice" : "short-answer",
            correctAnswer: parsed.correctAnswer,
            explanation: parsed.explanation,
            points: 10,
            timeLimit: 60,
            basedOnMistake: true,
            mistakePattern: parsed.question,
            rowId: row.id,               
            raw: parsed                  
          });
        });
      });

      if (allMistakes.length === 0) {
        toast('No mistakes found for this subject.');
        setIsLoading(false);
        return;
      }

      const selectedMistakes: Question[] = [];
      const maxQuestions = 10;
      const copy = [...allMistakes];

      while (selectedMistakes.length < maxQuestions && copy.length > 0) {
        const idx = Math.floor(Math.random() * copy.length);
        selectedMistakes.push(copy.splice(idx, 1)[0]);
      }

      setQuestions(selectedMistakes);
      setTestMode('revision');
      setTotalTestTime(selectedMistakes.length * 60);
      setTimeRemaining(selectedMistakes.length * 60);
    } catch (err) {
      console.error('Error fetching revision mistakes:', err);
      toast.error('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  if (testMode === 'setup') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card  className="w-96 p-4">
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
                <div key={progress.subject} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">
                        {subjects.find(s => s.value === progress.subject)?.icon}
                      </span>
                      <div>
                        <h4 className="font-medium capitalize">{progress.subject}</h4>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        progress.totalAttempts === 0
                          ? "border-gray-300 text-gray-500"
                          : progress.correctAnswers / progress.totalAttempts >= 0.8
                          ? "border-green-500 text-green-700"
                          : progress.correctAnswers / progress.totalAttempts >= 0.6
                          ? "border-yellow-500 text-yellow-700"
                          : "border-red-500 text-red-700"
                      }
                    >
                      {progress.totalAttempts === 0
                        ? "Haven't tested yet"
                        : `${Math.round((progress.correctAnswers / progress.totalAttempts) * 100)}% accuracy`}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.correctAnswers}/{progress.totalAttempts} correct</span>
                    </div>
                    <Progress value={(progress.correctAnswers / progress.totalAttempts) * 100} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Test</CardTitle>
            <CardDescription>Choose subject and difficulty based on your learning needs</CardDescription>
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

            {/* Difficulty Selection */}
            <div>
              <Label className="text-base font-medium mb-3 block">Select Difficulty</Label>
              <div className="flex gap-3">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <Button
                    key={diff}
                    variant={difficulty === diff ? "default" : "outline"}
                    onClick={() => setDifficulty(diff as 'easy' | 'medium' | 'hard')}
                    className="flex-1"
                  >
                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                  </Button>
                ))}
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
            <Button
              onClick={startRevisionFromMistakes}
              disabled={isLoading}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Revise Mistakes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (testMode === 'taking') {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

    if (!currentQuestion) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-lg text-muted-foreground">Loading question...</div>
        </div>
      );
    }

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
              <span className="capitalize">{currentQuestion.subject}</span>
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

            {currentQuestion.type === 'multiple-choice' && currentQuestion.options?.length ? (
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(val) => handleAnswerChange(currentQuestion.id, val)}
              >
                {currentQuestion.options.map((opt, i) => (
                  <div key={i} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                    <RadioGroupItem value={opt} id={`rev-opt-${i}`} />
                    <Label htmlFor={`rev-opt-${i}`} className="flex-1 cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="p-3 bg-yellow-50 border rounded">
                <p className="text-sm text-yellow-700">
                  Options weren’t saved for this mistake. {currentQuestion.correctAnswer
                    ? <>Correct answer: <strong>{currentQuestion.correctAnswer}</strong></>
                    : "No correct answer stored."}
                </p>
              </div>
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
        <Card className="w-96 p-4">
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-1">
                {testResults.filter(r => r.isCorrect).length}
              </div>
              <div className="text-sm text-muted-foreground">Experience & Credits Earned</div>
              <div className="text-xs text-muted-foreground mt-1">
                {testResults.filter(r => r.isCorrect).length} experience, {testResults.filter(r => r.isCorrect).length} credits
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        {(testMode === 'completed') && (
          <Card>
            <CardHeader>
              <CardTitle>Question-by-Question Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions?.map((question, index) => {
                  const result = testResults[index];
                  if (!question || !result) return null;
                  return (
                    <div key={question.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium">Question {index + 1}</span>
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

                      {result?.isCorrect && question.basedOnMistake && (
                        <div className="mt-2">
                          <Badge className="bg-green-100 text-green-700">
                            Correct ✓ Removed from Revision Pool
                          </Badge>
                        </div>
                      )}

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
        )}

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
                      .map((q, i) => (testResults[i]?.isCorrect ? q : null))
                      .filter((q): q is Question => !!q)
                      .map(q => q.subject)
                      .filter((subject, index, arr) => arr.indexOf(subject) === index)
                      .slice(0, 3)
                      .map(subject => (
                        <li key={subject}>• Strong performance in {subject}</li>
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
        </div>
      </div>
    );
  }

  if (testMode === 'revision') {
    if (questions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <AlertTriangle className="h-8 w-8 text-orange-500 mb-2" />
          <div className="text-lg text-muted-foreground">No mistakes to revise!</div>
          <Button onClick={() => setTestMode('setup')} variant="outline" className="mt-4">
            Back to Test Setup
          </Button>
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        {/* Revision Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="outline">
                  Revision {currentQuestionIndex + 1} of {questions.length}
                </Badge>
                <Badge variant="outline" className="border-orange-500 text-orange-700">
                  Mistake-based
                </Badge>
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

        {/* Revision Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Revision</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-lg leading-relaxed">
              {currentQuestion.question}
            </div>
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
                  onClick={async () => {
                    const userAnswer = answers[currentQuestion.id] || "";
                    const correctAnswer = currentQuestion.correctAnswer || "";

                    const isCorrect = userAnswer === correctAnswer;

                    setTestResults(prev => {
                      const updated = [...prev];
                      updated[currentQuestionIndex] = {
                        questionId: currentQuestion.id,
                        userAnswer,
                        isCorrect,
                        timeSpent: 0,
                        pointsEarned: isCorrect ? currentQuestion.points : 0
                      };
                      return updated;
                    });

                    if (isCorrect && user?.id) {

                      const { data: existingRows, error } = await supabase
                        .from("learning_progress")
                        .select("mistakes")
                        .eq("user_id", user.id)
                        .eq("subject", currentQuestion.subject)
                        .eq("difficulty", currentQuestion.difficulty.toLowerCase())

                      if (!error && existingRows?.length) {
                        const existing = existingRows[0];

                        const currentMistakeObj = {
                          question: currentQuestion.question,
                          options: currentQuestion.options,
                          correctAnswer: currentQuestion.correctAnswer,
                          explanation: currentQuestion.explanation
                        };

                        const updatedMistakes = (existing.mistakes || []).filter((m: any) => {
                          let parsed: any = m;
                          if (typeof m === "string") {
                            try {
                              parsed = JSON.parse(m);
                            } catch {
                              return true; 
                            }
                          }

                          const isSame =
                            parsed.question === currentMistakeObj.question &&
                            parsed.correctAnswer === currentMistakeObj.correctAnswer;
                          if (isSame) {
                            console.log("Removing mistake:", parsed);
                          }
                          return !isSame;
                        });

                        await supabase
                          .from("learning_progress")
                          .update({ mistakes: updatedMistakes, last_updated: new Date().toISOString() })
                          .eq("user_id", user.id)
                          .eq("subject", currentQuestion.subject)
                          .eq("difficulty", currentQuestion.difficulty.toLowerCase());
                      }
                    }

                    if (currentQuestionIndex < questions.length - 1) {
                      setCurrentQuestionIndex(prev => prev + 1);
                    } else {
                      setTestMode("completed");
                      toast.success("Revision completed!")
                    }
                  }}
                  disabled={!answers[currentQuestion.id]}
                >
                  {currentQuestionIndex === questions.length - 1 ? "Finish Revision" : "Next"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}