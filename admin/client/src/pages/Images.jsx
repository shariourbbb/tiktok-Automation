import { useState, useEffect, useRef } from 'react';

export default function Images() {
  const [images, setImages] = useState([]);
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const load = () => fetch('/api/images').then(r => r.json()).then(setImages).catch(() => {});
  useEffect(() => { load(); }, []);

  const upload = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const form = new FormData();
    for (const f of files) form.append('images', f);
    await fetch('/api/images/upload-multiple', { method: 'POST', body: form });
    setUploading(false);
    load();
  };

  const remove = async (name) => {
    if (!confirm('Delete this image?')) return;
    await fetch(`/api/images/${encodeURIComponent(name)}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Image Management</h2>
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : '+ Upload Images'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { upload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {images.length === 0 ? (
        <div className="card"><div className="card-body text-center text-muted"><p>No images uploaded yet</p></div></div>
      ) : (
        <div className="image-grid">
          {images.map(img => (
            <div key={img.name} className="image-card">
              <div className="image-preview">
                <img src={img.url} alt={img.name} />
              </div>
              <div className="image-info">
                <span className="image-name" title={img.name}>{img.name}</span>
                <span className="image-size">{(img.size / 1024).toFixed(1)} KB</span>
              </div>
              <button className="image-delete" onClick={() => remove(img.name)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
