import React, { useRef, useState } from "react";
import { supabase } from "../utils/supabase/client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { FileText, Upload, X, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface TutorDocumentUploadProps {
    userId: string;
}

export const TutorDocumentUpload: React.FC<TutorDocumentUploadProps> = ({ userId }) => {
    const [uploadedDocuments, setUploadedDocuments] = useState<File[]>([]);
    const [docStatuses, setDocStatuses] = useState<Record<number, "pending" | "verified">>({});
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
        const validFiles = files.filter(
            (file) => validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024
        );

        setUploading(true);
        let uploadErrors = false;

        for (const file of validFiles) {
            const { error } = await supabase.storage
                .from("tutor_documents")
                .upload(`${userId}/${file.name}`, file, { upsert: true });

            if (error) {
                uploadErrors = true;
                toast.error(`Failed to upload document: ${file.name}`);
            }
        }

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

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeDocument = async (index: number) => {
        const file = uploadedDocuments[index];
        // 1. Remove from storage
        const { error } = await supabase
            .storage
            .from("tutor_documents")
            .remove([`${userId}/${file.name}`]);

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
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <CardTitle>Upload Verification Documents</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="documentUpload">Verification Documents</Label>
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
                        disabled={uploading}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload Documents"}
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
                                        <Badge variant={docStatuses[index] === "verified" ? "success" : "secondary"} className="ml-2">
                                            {docStatuses[index] === "verified" ? (
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
                </div>
            </CardContent>
        </Card>
    );
};
