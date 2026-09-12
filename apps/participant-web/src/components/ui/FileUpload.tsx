import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X, XCircle } from 'lucide-react';
import { cn } from './Card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function FileUpload({ 
  onFileSelect, 
  accept, 
  maxSizeMB = 5,
  className,
  isUploading = false,
  uploadProgress = 0
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds maximum size of ${maxSizeMB}MB`);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn("w-full", className)}>
      {!selectedFile ? (
        <div 
          className={cn(
            "relative w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer bg-white/5",
            isDragging ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20 hover:bg-white/10",
            error ? "border-red-500/50" : ""
          )}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={inputRef} 
            className="hidden" 
            accept={accept}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <UploadCloud className={cn("w-10 h-10 mb-4", isDragging ? "text-primary" : "text-gray-500")} />
          <p className="text-sm font-medium text-white mb-1 font-inter">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 font-inter">
            {accept ? `Supports: ${accept}` : "Any file type"} (Max: {maxSizeMB}MB)
          </p>
        </div>
      ) : (
        <div className="w-full border border-white/10 rounded-xl p-4 bg-white/5 relative overflow-hidden">
          {/* Progress Bar Background */}
          {isUploading && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-primary/10 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          )}
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <FileIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-white truncate font-inter">{selectedFile.name}</span>
                <span className="text-xs text-gray-400 font-inter">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isUploading ? (
                <span className="text-xs font-medium text-primary font-inter">{uploadProgress}%</span>
              ) : (
                <button 
                  onClick={clearFile}
                  className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-xs text-red-500 font-inter flex items-center gap-1">
          <XCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
