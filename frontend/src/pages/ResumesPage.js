import React, { useEffect, useRef, useState } from 'react';
import { resumeApi } from '../api';
import styles from './ResumesPage.module.css';

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    resumeApi.list()
      .then((res) => setResumes(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!file) { setUploadError('Please choose a PDF file.'); return; }
    if (!label.trim()) { setUploadError('Please enter a label for this resume.'); return; }

    // Client-side size check — catch oversized files before the request
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 10 MB.');
      return;
    }

    // Client-side type check
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', label.trim());

    setUploading(true);
    try {
      const res = await resumeApi.upload(formData);
      setResumes((prev) => [res.data.data, ...prev]);
      setUploadSuccess(`"${label.trim()}" uploaded successfully.`);
      setLabel('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      // Show server error message (e.g. "Only PDF files are accepted.")
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id, label) {
    if (!window.confirm(`Delete "${label}"? This will also detach it from any tracked internships.`)) return;
    try {
      await resumeApi.remove(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Could not delete resume.');
    }
  }

  return (
    <div className="page-container">
      <div className={`${styles.page}`}>
        <div className={styles.topRow}>
          <h1 className="section-heading" style={{ margin: 0 }}>My Resumes</h1>
        </div>

        {/* ─── Upload form ─── */}
        <div className={`card ${styles.uploadCard}`}>
          <h2 className={styles.uploadTitle}>Upload a New Resume</h2>
          <form onSubmit={handleUpload} className={styles.uploadForm} noValidate>
            <div className={styles.formRow}>
              <input
                type="text"
                placeholder='Label (e.g. "Frontend Resume")'
                value={label}
                onChange={(e) => { setLabel(e.target.value); setUploadError(''); setUploadSuccess(''); }}
                className={styles.labelInput}
                maxLength={80}
              />
              <label className={styles.fileLabel}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className={styles.fileInput}
                  onChange={(e) => {
                    setFile(e.target.files[0] || null);
                    setUploadError('');
                    setUploadSuccess('');
                  }}
                />
                📄 {file ? file.name : 'Choose PDF…'}
              </label>
              <button
                type="submit"
                className="btn-primary"
                disabled={uploading}
                style={{ flexShrink: 0 }}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
            <p className={styles.hint}>PDF only · Max 10 MB · Each resume can be attached to a tracked internship</p>
            {uploadError && <p className={styles.errorMsg}>⚠ {uploadError}</p>}
            {uploadSuccess && <p className={styles.successMsg}>✓ {uploadSuccess}</p>}
          </form>
        </div>

        {/* ─── Resume list ─── */}
        <h2 className={styles.listTitle}>
          {resumes.length > 0 ? `${resumes.length} resume${resumes.length !== 1 ? 's' : ''} uploaded` : 'Uploaded Resumes'}
        </h2>

        {loading && <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Loading…</p>}

        {!loading && resumes.length === 0 && (
          <div className={styles.empty}>
            <p>No resumes uploaded yet.</p>
            <p>Upload your first resume above to attach it to tracked internships.</p>
          </div>
        )}

        {!loading && resumes.length > 0 && (
          <div className={styles.resumeList}>
            {resumes.map((r) => (
              <div key={r.id} className={styles.resumeItem}>
                <div className={styles.resumeLeft}>
                  <span className={styles.resumeIcon}>📄</span>
                  <div className={styles.resumeInfo}>
                    <span className={styles.resumeLabel}>{r.label}</span>
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.resumeFile}
                    >
                      {r.fileName} ↗
                    </a>
                    <span className={styles.resumeDate}>
                      Uploaded {new Date(r.uploadedAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className={styles.resumeRight}>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(r.id, r.label)}
                    title="Delete resume"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
