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
    <div className=p-6 border-2 border-dashed border-white/30 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300>
      <div className=text-center>
        <div className=text-4xl mb-4>📁</div>
        <h4 className=text-lg font-semibold text-white mb-4>파일을 선택하세요</h4>
        <input
          type=file
          onChange={handleFileUpload}
          disabled={uploading}
          className=mb-4 block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 file:cursor-pointer cursor-pointer
          accept=image/*,.pdf,.doc,.docx
        />
        
        {uploading && (
          <div className=flex items-center justify-center gap-2 text-white>
            <div className=animate-spin rounded-full h-5 w-5 border-b-2 border-white></div>
            <span>업로드 중...</span>
          </div>
        )}
        
        {uploadResult && (
          <div className=mt-6 p-4 rounded-lg bg-white/10 border border-white/20>
            {uploadResult.error ? (
              <p className=text-red-400>{uploadResult.error}</p>
            ) : (
              <div className=text-white>
                <div className=text-green-400 text-2xl mb-2>✅</div>
                <p className=font-semibold mb-2>업로드 성공!</p>
                <p className=text-sm text-gray-300>파일: {uploadResult.originalName}</p>
                <p className=text-sm text-gray-300>크기: {uploadResult.size} bytes</p>
                <a 
                  href={uploadResult.url} 
                  target=_blank 
                  rel=noopener noreferrer
                  className=inline-block mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200
                >
                  📂 파일 보기
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
