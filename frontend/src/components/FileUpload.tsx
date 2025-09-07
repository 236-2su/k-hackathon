import React, { useState } from 'react';

interface UploadResponse {
  filename: string;
  originalName: string;
  url: string;
  size: string;
  error?: string;
}

export const FileUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();
      setUploadResult(result);
    } catch (error) {
      setUploadResult({
        filename: '',
        originalName: '',
        url: '',
        size: '',
        error: 'Upload failed: ' + (error as Error).message
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className=p-4 border-2 border-dashed border-gray-300 rounded-lg>
      <input
        type=file
        onChange={handleFileUpload}
        disabled={uploading}
        className=mb-4
        accept=image/*,.pdf,.doc,.docx
      />
      
      {uploading && <p>Uploading...</p>}
      
      {uploadResult && (
        <div className=mt-4>
          {uploadResult.error ? (
            <p className=text-red-500>{uploadResult.error}</p>
          ) : (
            <div className=text-green-500>
              <p>✅ Upload successful!</p>
              <p>File: {uploadResult.originalName}</p>
              <p>Size: {uploadResult.size} bytes</p>
              <a 
                href={uploadResult.url} 
                target=_blank 
                rel=noopener noreferrer
                className=text-blue-500 underline
              >
                View File
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
