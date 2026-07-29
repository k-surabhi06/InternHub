import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { internshipsApi, trackerApi } from '../api';
import { useAuth } from '../context/AuthContext';
import styles from './InternshipDetailPage.module.css';

export default function InternshipDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [internship, setInternship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    internshipsApi
      .get(id)
      .then((res) => setInternship(res.data.data))
      .catch(() => setError('Internship not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!user) { navigate('/login'); return; }
    try {
      await trackerApi.save(id);
      setSaved(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save internship.');
    }
  }

  if (loading) return <div className={styles.state}>Loading…</div>;
  if (error || !internship) return <div className={styles.state}>{error || 'Not found.'}</div>;

  return (
    <div className="page-container">
      <button className={`btn-secondary ${styles.back}`} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className={`card ${styles.detail}`}>
        <div className={styles.sourceRow}>
          <span className={`badge badge-${internship.source?.toLowerCase()}`}>
            {internship.source}
          </span>
          {!internship.isActive && (
            <span className={`badge ${styles.inactive}`}>Closed / Inactive</span>
          )}
        </div>

        <h1 className={styles.title}>{internship.title}</h1>
        <p className={styles.company}>{internship.company}</p>

        <div className={styles.meta}>
          {internship.location && <div><strong>Location:</strong> {internship.location}</div>}
          {internship.stipend && <div><strong>Stipend:</strong> {internship.stipend}</div>}
          {internship.duration && <div><strong>Duration:</strong> {internship.duration}</div>}
          {internship.postedDate && (
            <div>
              <strong>Posted:</strong>{' '}
              {new Date(internship.postedDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        {internship.description && (
          <div className={styles.description}>
            <h3>About this internship</h3>
            <p>{internship.description}</p>
          </div>
        )}

        <div className={styles.actions}>
          <a href={internship.applyUrl} target="_blank" rel="noopener noreferrer">
            <button className="btn-primary" style={{ fontSize: '1rem', padding: '0.65rem 1.75rem' }}>
              Apply on {internship.source} ↗
            </button>
          </a>
          <button
            className="btn-secondary"
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? 'Saved to Tracker ✓' : 'Save to Tracker'}
          </button>
        </div>
      </div>
    </div>
  );
}
