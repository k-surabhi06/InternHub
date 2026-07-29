import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savedSearchApi } from '../api';
import styles from './SavedSearchesPage.module.css';

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    savedSearchApi.list()
      .then((res) => setSearches(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    try {
      await savedSearchApi.remove(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert('Could not delete saved search.');
    }
  }

  function buildBrowseUrl(s) {
    const params = new URLSearchParams();
    if (s.search) params.set('search', s.search);
    if (s.location) params.set('location', s.location);
    if (s.source) params.set('source', s.source);
    if (s.workMode) params.set('workMode', s.workMode);
    return `/browse${params.toString() ? `?${params.toString()}` : ''}`;
  }

  return (
    <div className="page-container">
      <div className={styles.topRow}>
        <h1 className="section-heading" style={{ margin: 0 }}>Saved Searches</h1>
        <button className="btn-secondary" onClick={() => navigate('/browse')}>
          + New Search
        </button>
      </div>

      {loading && <p style={{ color: 'var(--color-muted)', textAlign: 'center', paddingTop: '2rem' }}>Loading…</p>}

      {!loading && searches.length === 0 && (
        <div className={styles.empty}>
          <p>No saved searches yet.</p>
          <p>Browse internships and click <strong>"+ Save this search"</strong> to save a filter combo.</p>
          <button className="btn-primary" onClick={() => navigate('/browse')} style={{ marginTop: '1rem' }}>
            Browse Internships
          </button>
        </div>
      )}

      {!loading && searches.length > 0 && (
        <div className={styles.list}>
          {searches.map((s) => (
            <div key={s.id} className={`card ${styles.item}`}>
              <div className={styles.itemTop}>
                <span className={styles.label}>{s.label}</span>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(s.id)}
                  title="Delete saved search"
                >
                  ✕
                </button>
              </div>
              <div className={styles.tags}>
                {s.search && <span className="tag">🔍 {s.search}</span>}
                {s.location && <span className="tag">📍 {s.location}</span>}
                {s.source && <span className="tag">{s.source}</span>}
                {s.workMode === 'Remote' && <span className="tag">🏠 Remote only</span>}
                {!s.search && !s.location && !s.source && !s.workMode && <span className="tag">All internships</span>}
              </div>
              <div className={styles.itemFooter}>
                <span className={styles.date}>
                  Saved {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button
                  className="btn-primary"
                  onClick={() => navigate(buildBrowseUrl(s))}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
                >
                  Run Search →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
