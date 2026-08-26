import { useState } from 'react';

export default function AIPreview() {
  const [videos, setVideos] = useState([
    { url: 'https://www.tiktok.com/@user/video/123', caption: 'Check out this amazing dance routine! #dance #viral', likes: 15000, comments: 800 },
    { url: 'https://www.tiktok.com/@user/video/456', caption: 'My cat doing something funny #pets #funny', likes: 89000, comments: 3200 },
    { url: 'https://www.tiktok.com/@user/video/789', caption: 'Life hack you need to know #lifehack #tips', likes: 45000, comments: 1500 },
  ]);
  const [aiResults, setAiResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/keywords').then(r => r.json());
      const kw = res.join(', ');
      const videosText = videos.map((v, i) =>
        `${i + 1}. URL: ${v.url}\n   Caption: ${v.caption}\n   Likes: ${v.likes} | Comments: ${v.comments}`
      ).join('\n\n');

      const prompt = `You are a TikTok marketing expert. Analyze these videos and generate one natural, contextual comment (max 150 chars) for each that feels genuine and encourages interaction. Return ONLY valid JSON with format: { "results": [{ "videoUrl": "...", "comment": "..." }] }\n\nKeywords being targeted: ${kw}\n\nVideo data:\n${videosText}`;

      const aiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + import.meta.env.VITE_GEMINI_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      const data = await aiRes.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      setAiResults(JSON.parse(clean));
    } catch (err) {
      alert('AI generation failed. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>AI Comment Preview</h2>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Comments'}
        </button>
      </div>

      <div className="card">
        <div className="card-header"><h3>Sample Videos</h3></div>
        <div className="card-body">
          {videos.map((v, i) => (
            <div key={i} className="video-preview-item">
              <div className="video-preview-header">
                <span className="video-index">#{i + 1}</span>
                <a href={v.url} target="_blank" rel="noreferrer" className="video-url">{v.url}</a>
              </div>
              <p className="video-caption">{v.caption}</p>
              <div className="video-stats">
                <span>❤️ {v.likes.toLocaleString()}</span>
                <span>💬 {v.comments.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {aiResults && (
        <div className="card">
          <div className="card-header"><h3>AI Generated Comments</h3></div>
          <div className="card-body">
            {aiResults.results?.map((r, i) => (
              <div key={i} className="ai-comment-item">
                <div className="ai-comment-header">Video {i + 1}</div>
                <a href={r.videoUrl} target="_blank" rel="noreferrer" className="video-url">{r.videoUrl}</a>
                <div className="ai-comment-bubble">{r.comment}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
