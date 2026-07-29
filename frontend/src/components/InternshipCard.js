import React from 'react';
import styles from './InternshipCard.module.css';

const SOURCE_LABELS = { Internshala: 'Internshala', Unstop: 'Unstop' };
const WORK_MODE_LABELS = { Remote: '🏠 Remote', OnSite: '🏢 On-site', Hybrid: '🔀 Hybrid' };

export default function InternshipCard({ internship, onSave, saved = false }) {
  const { id, title, company, location, stipend, duration, source, applyUrl, workMode } = internship;

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.header}>
        <span className={`badge badge-${source?.toLowerCase()}`}>
          {SOURCE_LABELS[source] || source}
        </span>
        {workMode && (
          <span className={`badge ${styles[`workMode${workMode}`]}`}>
            {WORK_MODE_LABELS[workMode] || workMode}
          </span>
        )}
      </div>

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.company}>{company}</p>

      <div className={styles.meta}>
        {location && <span>📍 {location}</span>}
        {stipend && <span>💰 {stipend}</span>}
        {duration && <span>🗓 {duration}</span>}
      </div>

      <div className={styles.actions}>
        <a href={applyUrl} target="_blank" rel="noopener noreferrer">
          <button className="btn-primary">Apply ↗</button>
        </a>
        {onSave && (
          <button
            className="btn-secondary"
            onClick={() => onSave(id)}
            disabled={saved}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}
