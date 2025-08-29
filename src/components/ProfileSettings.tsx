
import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface ProfileSettingsProps {
    user: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: string;
    };
    onVerified?: () => void; // Optional callback to notify parent (dashboard)
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onVerified }) => {
    const [existingFiles, setExistingFiles] = useState<{ name: string; url: string }[]>([]);
    const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [recentlyUploaded, setRecentlyUploaded] = useState<string[]>([]);
    const [isVerified, setIsVerified] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    // Fetch the is_verified status from Supabase (by id)
    const fetchVerifiedStatus = async () => {
        console.log('Fetching verification status for id:', user.id);
        const { data, error } = await supabase
            .from('tutor_information')
            .select('is_verified')
            .eq('id', user.id)
            .single();
        if (error || !data) {
            console.log('No verification status found or error:', error);
            return { is_verified: false };
        }
        console.log('Verification status found:', data);
        return { is_verified: !!data.is_verified };
    };

    // Add a timestamp to force refresh after upload
    const [refreshTime, setRefreshTime] = useState(Date.now());
    useEffect(() => {
        const fetchExistingFiles = async () => {
            const { data, error } = await supabase.storage.from('tutor_documents').list(`tutor_docs/${user.email}`);
            if (error || !data) {
                setExistingFiles([]);
                setIsVerified(false);
                setErrors(prev => ({ ...prev, fetch: error ? error.message : 'No files found.' }));
                console.error('Supabase fetch error:', error);
                return;
            }
            const files = await Promise.all(
                data
                    .filter((item: any) => !item.name.endsWith('/'))
                    .map(async (item: any) => {
                        const { data: urlData } = supabase.storage.from('tutor_documents').getPublicUrl(`tutor_docs/${user.email}/${item.name}`);
                        return {
                            name: item.name,
                            url: urlData?.publicUrl || ''
                        };
                    })
            );
            setExistingFiles(files);
            // Fetch the is_verified status from the DB
            const { is_verified } = await fetchVerifiedStatus();
            setIsVerified(is_verified);
        };
        fetchExistingFiles();
    }, [user.id, refreshTime]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const validFiles = files.filter(file => {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB max
        });
        setUploadedDocuments(prev => [...prev, ...validFiles]);
        if (validFiles.length !== files.length) {
            setErrors(prev => ({
                ...prev,
                documents: 'Some files were rejected. Only PDF, JPEG, PNG files under 10MB are allowed.'
            }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.documents;
                return newErrors;
            });
        }
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeDocument = (index: number) => {
        setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleUploadAll = async () => {
        setUploading(true);
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.upload;
            return newErrors;
        });
        let uploadedIndexes: number[] = [];
        let uploadedNames: string[] = [];
        let anyUploadSuccess = false;
        for (let i = 0; i < uploadedDocuments.length; i++) {
            const file = uploadedDocuments[i];
            try {
                const filePath = `tutor_docs/${user.email}/${Date.now()}_${file.name}`;
                const { error } = await supabase.storage.from('tutor_documents').upload(filePath, file);
                if (error) {
                    setErrors(prev => ({ ...prev, upload: `Failed to upload ${file.name}: ${error.message}` }));
                    console.error('Supabase upload error:', error);
                    continue;
                }
                uploadedIndexes.push(i);
                uploadedNames.push(file.name);
                anyUploadSuccess = true;
            } catch (err: any) {
                setErrors(prev => ({ ...prev, upload: `Failed to upload ${file.name}` }));
                console.error('Supabase upload error:', err);
            }
        }
        setUploading(false);
        // Remove only successfully uploaded files from selection
        setUploadedDocuments(prev => prev.filter((_, i) => !uploadedIndexes.includes(i)));
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Always re-fetch files and count after upload
        setRefreshTime(Date.now());
        // Set recently uploaded file names for display
        setRecentlyUploaded(uploadedNames);

        // Mark as verified in Supabase if at least one document uploaded successfully
        if (anyUploadSuccess) {
            console.log("Attempting to update tutor_information for email:", user.email);

            try {
                // First, check if the record exists by id
                const { data: existingData, error: checkError } = await supabase
                    .from('tutor_information')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.error("Check failed:", checkError);
                    setErrors(prev => ({ ...prev, verification: 'Failed to check existing record. Please try again.' }));
                    return;
                }

                console.log("Existing data check result:", { existingData, checkError });

                let updateResult;
                if (existingData) {
                    console.log("Updating existing record...");
                    // Update existing record by id
                    updateResult = await supabase
                        .from('tutor_information')
                        .update({
                            is_verified: true,
                            first_name: user.first_name,
                            last_name: user.last_name
                        })
                        .eq('id', user.id)
                        .select();
                } else {
                    console.log("Creating new record...");
                    // Insert new record (with id)
                    updateResult = await supabase
                        .from('tutor_information')
                        .insert({
                            id: user.id,
                            email: user.email,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            is_verified: true
                        })
                        .select();
                }

                console.log("Update/Insert result:", updateResult);

                if (updateResult.error) {
                    console.error("Update/Insert failed:", updateResult.error);
                    setErrors(prev => ({ ...prev, verification: 'Failed to update verification status. Please try again.' }));
                } else {
                    console.log("Update/Insert success, new row data:", updateResult.data);
                    // Set verification status to true immediately
                    setIsVerified(true);

                    // Call the callback to notify parent component
                    if (typeof onVerified === 'function') {
                        console.log('Calling onVerified callback');
                        onVerified();
                    }

                    // Show success message
                    toast.success('Documents uploaded successfully! You are now verified.');

                    // Clear any verification errors
                    setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.verification;
                        return newErrors;
                    });

                    // Force refresh the verification status from database
                    setTimeout(async () => {
                        const { is_verified } = await fetchVerifiedStatus();
                        console.log('Refreshed verification status:', is_verified);
                        setIsVerified(is_verified);
                    }, 1000);
                }
            } catch (verificationError) {
                console.error("Verification update error:", verificationError);
                setErrors(prev => ({ ...prev, verification: 'Failed to update verification status. Please try again.' }));
            }
        }


    };

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="w-full max-w-lg">
                {/* Verification Status Section */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Verification Status</h3>
                            <p className="text-sm text-muted-foreground">
                                {isVerified
                                    ? "Your account has been verified. You can now start tutoring sessions."
                                    : "Upload verification documents to get verified and start tutoring."
                                }
                            </p>
                        </div>
                        {isVerified && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span className="text-green-700 font-semibold">Verified</span>
                            </div>
                        )}
                    </div>
                </div>

                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                        {isVerified
                            ? "Your documents have been verified. You can upload additional documents if needed."
                            : "Upload your teaching certificates, ID, or other qualification documents for verification."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Label>Verification Documents</Label>
                        <Alert>
                            <FileText className="h-4 w-4" />
                            <AlertDescription>
                                Please upload your teaching certificates, ID, or other qualification documents for verification. You can upload multiple files (PDF, JPEG, PNG, JPG, max 10MB each).
                            </AlertDescription>
                        </Alert>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                            disabled={uploading}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Select Files'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        {/* Show selected files before upload */}
                        {uploadedDocuments.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Selected files:</p>
                                {uploadedDocuments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                        <div className="flex items-center space-x-2">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <div>
                                                <p className="text-sm font-medium">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                            </div>
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
                                <Button
                                    type="button"
                                    className="w-full"
                                    onClick={handleUploadAll}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : 'Upload Selected Files'}
                                </Button>
                            </div>
                        )}
                        {errors.documents && (
                            <p className="text-sm text-destructive">{errors.documents}</p>
                        )}
                        {errors.upload && <p className="text-red-500 text-xs mt-1">{errors.upload}</p>}
                        {errors.fetch && <p className="text-red-500 text-xs mt-1">{errors.fetch}</p>}
                        {errors.verification && <p className="text-red-500 text-xs mt-1">{errors.verification}</p>}
                        {/* Show all previously uploaded files, no total count */}
                        <div className="space-y-2 mt-6">
                            <p className="text-sm text-muted-foreground">Uploaded documents:</p>
                            {/* Show recently uploaded files as 'Uploaded document: file_name' */}
                            {recentlyUploaded.length > 0 && recentlyUploaded.map((name, idx) => (
                                <div key={"recent-" + idx} className="flex items-center space-x-2 mt-2">
                                    <FileText className="h-4 w-4 text-green-600" />
                                    <span className="text-green-700">Uploaded document: {name}</span>
                                </div>
                            ))}
                            {/* Show all previously uploaded files */}
                            {existingFiles.length > 0 && existingFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center space-x-2 mt-2">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                                        {file.name}
                                    </a>
                                </div>
                            ))}
                            {/* Only show 'No documents uploaded yet.' if not verified and no files */}
                            {recentlyUploaded.length === 0 && existingFiles.length === 0 && (
                                <span className="text-xs text-muted-foreground">No documents uploaded yet.</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfileSettings;

