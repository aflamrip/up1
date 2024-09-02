// pages/index.js
import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [videoFile, setVideoFile] = useState(null);
  const [embedCode, setEmbedCode] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    setVideoFile(file);
  };

  const uploadVideo = async () => {
    const formData = new FormData();
    formData.append('video', videoFile);

    const { data } = await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setEmbedCode(data.embedCode);
  };

  return (
    <div>
      <h1>Upload Video for HLS Encoding</h1>
      <input type="file" onChange={handleFileUpload} />
      <button onClick={uploadVideo}>Upload Video</button>
      {embedCode && (
        <div>
          <h2>Embed Code:</h2>
          <textarea value={embedCode} readOnly />
        </div>
      )}
    </div>
  );
}