import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { toast } from "sonner";
import { Star, Send, ThumbsUp, Award, MessageCircle } from "lucide-react";

interface RatingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    session: {
        id: string;
        tutorName: string;
        studentName?: string;
        subject: string;
        topic?: string;
        duration: number;
        date: string;
        time: string;
    };
    userRole: 'student' | 'tutor';
    onSubmitRating: (rating: number, feedback: string) => void;
}

export function RatingDialog({ isOpen, onClose, session, userRole, onSubmitRating }: RatingDialogProps) {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isRatingStudent = userRole === 'tutor';
    const ratingTarget = isRatingStudent ? (session.studentName || 'Student') : session.tutorName;
    const ratingTargetRole = isRatingStudent ? 'student' : 'tutor';

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Please select a rating before submitting');
            return;
        }

        setIsSubmitting(true);

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            onSubmitRating(rating, feedback);

            toast.success(
                `Thank you for rating ${ratingTarget}! Your feedback helps improve the tutoring experience.`
            );

            // Reset form
            setRating(0);
            setHoveredRating(0);
            setFeedback('');
            onClose();
        } catch (error) {
            toast.error('Failed to submit rating. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStarClick = (starRating: number) => {
        setRating(starRating);
    };

    const handleStarHover = (starRating: number) => {
        setHoveredRating(starRating);
    };

    const handleStarLeave = () => {
        setHoveredRating(0);
    };

    const getRatingText = (ratingValue: number) => {
        switch (ratingValue) {
            case 1: return 'Poor';
            case 2: return 'Fair';
            case 3: return 'Good';
            case 4: return 'Very Good';
            case 5: return 'Excellent';
            default: return 'Select a rating';
        }
    };

    const getRatingColor = (ratingValue: number) => {
        if (ratingValue <= 2) return 'text-red-500';
        if (ratingValue === 3) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getPlaceholderText = () => {
        if (isRatingStudent) {
            return "Share your thoughts about this student's participation, preparation, and engagement during the session...";
        }
        return "Share your thoughts about the tutor's teaching style, clarity, and helpfulness...";
    };

    const getSuggestionTags = () => {
        if (isRatingStudent) {
            return [
                'Well prepared',
                'Engaged and focused',
                'Asked good questions',
                'Followed instructions well',
                'Made good progress'
            ];
        }
        return [
            'Great explanation',
            'Patient and helpful',
            'Well organized',
            'Easy to understand',
            'Encouraging'
        ];
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        <span>Rate Your Session</span>
                    </DialogTitle>
                    <DialogDescription>
                        Help us improve the tutoring experience by sharing your feedback
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Session Summary */}
                    <Card className="bg-gray-50">
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3 mb-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback>
                                        {ratingTarget.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{ratingTarget}</div>
                                    <Badge variant="outline" className="text-xs">
                                        {ratingTargetRole}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground">Subject</div>
                                    <div className="font-medium">{session.subject}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Duration</div>
                                    <div className="font-medium">{session.duration} mins</div>
                                </div>
                                {session.topic && (
                                    <div className="col-span-2">
                                        <div className="text-muted-foreground">Topic</div>
                                        <div className="font-medium">{session.topic}</div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rating Stars */}
                    <div className="text-center space-y-3">
                        <div className="text-lg font-medium">
                            How would you rate {ratingTarget}?
                        </div>

                        <div className="flex items-center justify-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => handleStarClick(star)}
                                    onMouseEnter={() => handleStarHover(star)}
                                    onMouseLeave={handleStarLeave}
                                    className="p-1 transition-transform hover:scale-110"
                                    disabled={isSubmitting}
                                >
                                    <Star
                                        className={`h-8 w-8 transition-colors ${star <= (hoveredRating || rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>

                        <div className={`text-sm font-medium ${getRatingColor(hoveredRating || rating)}`}>
                            {getRatingText(hoveredRating || rating)}
                        </div>
                    </div>

                    {/* Feedback Text Area */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <MessageCircle className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">
                                Additional feedback (optional)
                            </span>
                        </div>

                        <Textarea
                            placeholder={getPlaceholderText()}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={3}
                            disabled={isSubmitting}
                            className="resize-none"
                        />
                    </div>

                    {/* Quick Feedback Tags */}
                    {rating > 0 && (
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700">
                                Quick feedback:
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {getSuggestionTags().map((tag) => (
                                    <Button
                                        key={tag}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                            if (feedback.includes(tag)) {
                                                setFeedback(feedback.replace(tag, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, ''));
                                            } else {
                                                setFeedback(feedback ? `${feedback}, ${tag}` : tag);
                                            }
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        <ThumbsUp className="h-3 w-3 mr-1" />
                                        {tag}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Skip for Now
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={rating === 0 || isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                'Submitting...'
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Submit Rating
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
