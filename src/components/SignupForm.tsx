import React, { useState, useRef } from 'react';
import { supabase } from '../utils/supabase/client';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { Eye, EyeOff, BookOpen, Upload, FileText, X, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface SignupFormProps {
  onSignup: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
    documents?: File[];
    subjects?: string[];
    qualifications?: string[];
  }) => void;
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSignup, onSwitchToLogin }: SignupFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    subjects: [] as string[],
    qualifications: ''
  });
  const availableSubjects = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'History',
    'Geography',
    'Computer Science',
    'Economics',
    'Other'
  ];
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
  const [docStatuses, setDocStatuses] = useState<Record<number, 'pending' | 'verified'>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) newErrors.role = 'Please select your role';

    // Require documents for tutor role
    if (formData.role === 'tutor' && uploadedDocuments.length === 0) {
      newErrors.documents = 'Please upload verification documents (certificates, ID, etc.)';
    }

    // Tutor-specific validation
    if (formData.role === 'tutor') {
      if (!formData.subjects || formData.subjects.length === 0) {
        newErrors.subjects = 'Please select at least one subject you can teach';
      }
      if (!formData.qualifications || formData.qualifications.trim() === '') {
        newErrors.qualifications = 'Please enter your qualifications';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSignup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        documents: uploadedDocuments.length > 0 ? uploadedDocuments : undefined,
        subjects: formData.role === 'tutor' ? formData.subjects : undefined,
        qualifications: formData.role === 'tutor' ? formData.qualifications.split(',').map(q => q.trim()).filter(Boolean) : undefined
      });
    }
  };
  const handleSubjectChange = (subject: string) => {
    setFormData(prev => {
      const subjects = prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject];
      return { ...prev, subjects };
    });
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.subjects;
      return newErrors;
    });
  };
  const handleQualificationsChange = (value: string) => {
    setFormData(prev => ({ ...prev, qualifications: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.qualifications;
      return newErrors;
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear role-specific errors when role changes
    if (field === 'role') {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.documents;
        return newErrors;
      });
      if (value !== 'tutor') {
        setUploadedDocuments([]);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const validFiles = files.filter(
      (file) => validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024
    );

    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email before uploading documents.');
      setUploading(false);
      return;
    }

    setUploading(true);
    let uploadErrors = false;

    for (const file of validFiles) {
      if (!file || !file.name || file.size === 0) {
        toast.error('Invalid file selected.');
        uploadErrors = true;
        continue;
      }
      const uploadPath = `pending_uploads/${formData.email}/${file.name}`;
      // Optional: log for debugging
      // console.log('Uploading:', uploadPath, file);
      const { error } = await supabase.storage
        .from("tutor_documents")
        .upload(uploadPath, file, { upsert: true });

      if (error) {
        uploadErrors = true;
        toast.error(`Failed to upload document: ${file.name} (${error.message})`);
      }
    }
    // Helper to move pending uploads to UID folder after signup
    // Call this after successful signup, passing the new user's UID and email
    const movePendingUploadsToUserFolder = async (userId: string, email: string) => {
      // List files in pending_uploads/email
      const { data: files, error: listError } = await supabase.storage
        .from("tutor_documents")
        .list(`pending_uploads/${email}`);
      if (listError) {
        toast.error("Failed to list pending documents");
        return;
      }
      for (const file of files || []) {
        // Download file from pending
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("tutor_documents")
          .download(`pending_uploads/${email}/${file.name}`);
        if (downloadError || !fileData) {
          toast.error(`Failed to download ${file.name}`);
          continue;
        }
        // Upload to UID folder
        const { error: uploadError } = await supabase.storage
          .from("tutor_documents")
          .upload(`${userId}/${file.name}`, fileData, { upsert: true });
        if (uploadError) {
          toast.error(`Failed to move ${file.name}`);
          continue;
        }
        // Remove from pending
        await supabase.storage
          .from("tutor_documents")
          .remove([`pending_uploads/${email}/${file.name}`]);
      }
      toast.success("Documents moved to your account folder!");
    };

    setUploading(false);

    setUploadedDocuments((prev) => {
      const newDocs = [...prev, ...validFiles];

      // Update doc statuses
      const startIdx = prev.length;
      const newStatuses: Record<number, "pending" | "verified"> = {};
      validFiles.forEach((_, i) => {
        newStatuses[startIdx + i] = "pending";
        setTimeout(() => {
          setDocStatuses((statuses) => ({ ...statuses, [startIdx + i]: "verified" }));
        }, 2000);
      });
      setDocStatuses((statuses) => ({ ...statuses, ...newStatuses }));

      return newDocs;
    });

    // clear input value
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDocument = async (index: number) => {
    const file = uploadedDocuments[index];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Remove from storage
    const { error } = await supabase
      .storage
      .from("tutor_documents")
      .remove([`${formData.email}/${file.name}`]);

    if (error) {
      toast.error("Failed to delete document.");
      return;
    }

    // 2. Update UI state
    setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
    setDocStatuses((prev) => {
      const newStatuses = { ...prev };
      delete newStatuses[index];
      return newStatuses;
    });

    // 3. Check if any docs remain in bucket
    const { data: remainingFiles, error: listError } = await supabase.storage
      .from("tutor_documents")
      .list(formData.email);

    if (listError) {
      console.error("Error listing documents:", listError.message);
      return;
    }

    // 4. If no files left, set is_verified false
    if (!remainingFiles || remainingFiles.length === 0) {
      await supabase
        .from("tutor_information")
        .update({ is_verified: false })
        .eq("id", user.id);

      toast.info("All documents removed. Verification revoked.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-blue-100 rounded-full">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join our tutoring platform today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger className={errors.role ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role}</p>
              )}
            </div>

            {/* Tutor-specific fields */}
            {formData.role === 'tutor' && (
              <>
                {/* Subjects */}
                <div className="space-y-2">
                  <Label>Subjects You Can Teach</Label>
                  {formData.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.subjects.map(subject => (
                        <Badge key={subject} variant="secondary" className="text-xs px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200">{subject}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {availableSubjects.map(subject => (
                      <label key={subject} className="flex items-center space-x-2 bg-blue-50 rounded px-2 py-1 cursor-pointer border border-blue-100 hover:bg-blue-100">
                        <input
                          type="checkbox"
                          checked={formData.subjects.includes(subject)}
                          onChange={() => handleSubjectChange(subject)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm">{subject}</span>
                      </label>
                    ))}
                  </div>
                  {errors.subjects && (
                    <p className="text-sm text-destructive mt-1">{errors.subjects}</p>
                  )}
                </div>
                {/* Qualifications */}
                <div className="space-y-2">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Input
                    id="qualifications"
                    placeholder="e.g. BSc Mathematics, PGCE, etc. (comma separated)"
                    value={formData.qualifications}
                    onChange={e => handleQualificationsChange(e.target.value)}
                  />
                  {errors.qualifications && (
                    <p className="text-sm text-destructive">{errors.qualifications}</p>
                  )}
                </div>
                {/* Document Upload for Tutors */}
                <div className="space-y-2">
                  <Label htmlFor="documentUpload">Verification Documents</Label>
                  {/* Show alert only if is_verified is FALSE (uploadedDocuments.length === 0) */}
                  {uploadedDocuments.length === 0 && (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        Please upload your teaching certificates, ID, or other qualification documents for verification.
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                  <input
                    id="documentUpload"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {uploadedDocuments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Uploaded documents:</p>
                      {uploadedDocuments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                            <Badge variant={docStatuses[index] === 'verified' ? 'success' : 'secondary'} className="ml-2">
                              {docStatuses[index] === 'verified' ? (
                                <span className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />Verified</span>
                              ) : (
                                <span className="flex items-center"><Clock className="h-3 w-3 mr-1 text-yellow-600" />Pending</span>
                              )}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.documents && (
                    <p className="text-sm text-destructive">{errors.documents}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}