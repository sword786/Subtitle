import React, { useCallback, useState } from 'react';
import { UploadCloud, FileVideo, Video } from 'lucide-react';

interface Props {
  onVideoSelect: (file: File) => void;
}

export function VideoUploader({ onVideoSelect }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('video/')) {
          onVideoSelect(file);
        }
      }
    },
    [onVideoSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onVideoSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`w-full max-w-xl mx-auto mt-6 sm:mt-20 border-2 border-dashed rounded-3xl p-6 sm:p-12 text-center transition-all duration-200 cursor-pointer ${
        isDragging
          ? 'border-blue-500 bg-blue-500/10 scale-105'
          : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
      }`}
      onClick={() => document.getElementById('video-upload')?.click()}
    >
      <input
        type="file"
        id="video-upload"
        accept="video/*"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full bg-blue-500/20 flex items-center justify-center">
          <UploadCloud className="w-10 h-10 text-blue-400" />
        </div>
      </div>
      <h3 className="text-2xl font-semibold mb-2 text-white">Upload your video</h3>
      <p className="text-white/60 mb-8 max-w-sm mx-auto">
        Drag and drop your video file here, or click to browse. Supported formats: MP4, MOV, WEBM.
      </p>
      
      <div className="flex items-center justify-center gap-2 text-sm text-white/40">
        <FileVideo className="w-4 h-4" />
        <span>Powered by Gemini AI Transcript</span>
      </div>
    </div>
  );
}
