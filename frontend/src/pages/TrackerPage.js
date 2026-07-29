import React, { useEffect, useState, useCallback } from 'react';
import { trackerApi, resumeApi } from '../api';
import styles from './TrackerPage.module.css';

const STATUSES = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
const STATUS_COLORS = {
  Saved: '#8b949e',
  Applied: '#58a6ff',
  Interview: '#d29922',
  Offer: '#3fb950',
  Rejected: '#f85149',
};

export default function TrackerPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [stats, setStats] = useState(null);

  const [resumes, setResumes] = useState([]);

  useEffect(() => {
    resumeApi.list().then((r) => setResumes(r.data.data)).catch(() => {});
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        trackerApi.list(filterStatus ? { status: filterStatus } : {}),
        trackerApi.stats(),
      ]);
      setItems(itemsRes.data.data);
      setStats(statsRes.data.data);
    } catch {
      setError('Failed to load tracker. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handleStatusChange(itemId, newStatus) {
    try {
      const res = await trackerApi.update(itemId, { status: newStatus });
      setItems((prev) => prev.map((item) => (item.id === itemId ? res.data.data : item)));
      trackerApi.stats().then((r) => setStats(r.data.data)).catch(() => {});
    } catch {
      alert('Could not update status.');
    }
  }

  async function handleResumeChange(itemId, resumeId) {
    const value = resumeId || null;
    try {
      await trackerApi.update(itemId, { resumeId: value });
      // Patch only resumeId in local state — avoids shape mismatch from update response
      setItems((prev) => prev.map((item) =>
        item.id === itemId ? { ...item, resumeId: value } : item
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not attach resume.');
    }
  }

  async function handleNotesBlur(itemId, notes) {
    try { await trackerApi.update(itemId, { notes }); }
    catch { alert('Could not save notes.'); }
  }

  async function handleDelete(itemId) {
    if (!window.confirm('Remove this internship from your tracker?')) return;
    try {
      await trackerApi.remove(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      trackerApi.stats().then((r) => setStats(r.data.data)).catch(() => {});
    } catch {
      alert('Could not remove item.');
    }
  }

  const grouped = STATUSES.reduce((acc, status) => {
    acc[status] = items.filter((item) => item.status === status);
    return acc;
  }, {});

  const showGrouped = !filterStatus;

  return (
    <div className="page-container">
      {/* Analytics dashboard */}
      {stats && <AnalyticsBar stats={stats} />}

      <div className={styles.header}>
        <h1 className={styles.heading}>My Application Tracker</h1>
      </div>

      {/* Status filter tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${!filterStatus ? styles.activeTab : ''}`}
          onClick={() => setFilterStatus('')}
        >
          All {stats && <span className={styles.tabCount}>{stats.total}</span>}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`${styles.tab} ${filterStatus === s ? styles.activeTab : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s} {stats?.byStatus?.[s] != null && (
              <span className={styles.tabCount}>{stats.byStatus[s] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="error-message">{error}</p>}
      {loading && <p className={styles.loadingText}>Loading…</p>}

      {!loading && items.length === 0 && (
        <div className={styles.empty}>
          <p>No internships {filterStatus ? `with status "${filterStatus}"` : 'saved yet'}.</p>
          <p>Go to <a href="/browse">Browse</a> and save internships to start tracking.</p>
        </div>
      )}

      {!loading && (showGrouped ? (
        <div className={styles.kanban}>
          {STATUSES.map((status) => (
            <div key={status} className={styles.column}>
              <h3 className={styles.columnTitle}>
                <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
                <span className={styles.count}>{grouped[status].length}</span>
              </h3>
              <div className={styles.columnItems}>
                {grouped[status].map((item) => (
                  <TrackerCard
                    key={item.id}
                    item={item}
                    resumes={resumes}
                    onStatusChange={handleStatusChange}
                    onResumeChange={handleResumeChange}
                    onNotesBlur={handleNotesBlur}
                    onDelete={handleDelete}
                  />
                ))}
                {grouped[status].length === 0 && <p className={styles.columnEmpty}>—</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <TrackerCard
              key={item.id}
              item={item}
              resumes={resumes}
              onStatusChange={handleStatusChange}
              onResumeChange={handleResumeChange}
              onNotesBlur={handleNotesBlur}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Analytics bar with SVG chart ─────────────────────────────────────────── */
function AnalyticsBar({ stats }) {
  const total = stats.total || 0;
  if (total === 0) return null;

  const barWidth = 340;
  const barHeight = 28;
  const segments = STATUSES.map((s) => ({
    label: s,
    count: stats.byStatus?.[s] ?? 0,
    color: STATUS_COLORS[s],
  })).filter((s) => s.count > 0);

  let x = 0;
  const rects = segments.map((seg) => {
    const w = (seg.count / total) * barWidth;
    const rect = { x, w, ...seg };
    x += w;
    return rect;
  });

  return (
    <div className={styles.analytics}>
      <div className={styles.analyticsTop}>
        <span className={styles.analyticsTitle}>Application Overview</span>
        <span className={styles.analyticsTotal}>{total} total</span>
      </div>

      {/* Stacked bar chart */}
      <svg width="100%" height={barHeight} viewBox={`0 0 ${barWidth} ${barHeight}`}
        style={{ borderRadius: 6, overflow: 'hidden', display: 'block', marginBottom: '0.6rem' }}>
        {rects.map((r) => (
          <g key={r.label}>
            <rect x={r.x} y={0} width={r.w} height={barHeight} fill={r.color} />
            {r.w > 28 && (
              <text x={r.x + r.w / 2} y={barHeight / 2 + 4} textAnchor="middle"
                fontSize="10" fill="#fff" fontWeight="600">
                {r.count}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        {segments.map((s) => (
          <span key={s.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: s.color }} />
            {s.label}: {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Deadline warning helper ───────────────────────────────────────────────── */
function getDeadlineWarning(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const due = new Date(deadline);
  // Strip time — compare dates only
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart   = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays   = Math.round((dueStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays < 0)  return { label: 'Deadline passed',      level: 'expired' };
  if (diffDays === 0) return { label: 'Deadline is TODAY',    level: 'today'   };
  if (diffDays === 1) return { label: 'Deadline tomorrow',    level: 'urgent'  };
  if (diffDays === 2) return { label: '2 days left',          level: 'urgent'  };
  if (diffDays === 3) return { label: '3 days left',          level: 'warning' };
  return null; // more than 3 days away — no warning
}

/* ─── Tracker Card ──────────────────────────────────────────────────────────── */
function TrackerCard({ item, resumes, onStatusChange, onResumeChange, onNotesBlur, onDelete }) {
  const { internship } = item;
  const [notes, setNotes] = useState(item.notes || '');
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className={`card ${styles.trackerCard}`}>
      {/* ── Header: source badge + delete ── */}
      <div className={styles.cardHeader}>
        <span className={`badge badge-${internship.source?.toLowerCase()}`}>
          {internship.source}
        </span>
        <button className={styles.deleteBtn} onClick={() => onDelete(item.id)} title="Remove">✕</button>
      </div>

      {/* ── Internship info ── */}
      <p className={styles.cardTitle}>{internship.title}</p>
      <p className={styles.cardCompany}>{internship.company}</p>
      {internship.location && <p className={styles.cardMeta}>📍 {internship.location}</p>}
      {internship.stipend && <p className={styles.cardMeta}>💰 {internship.stipend}</p>}

      {/* ── Deadline warning — only shown when status is Saved ── */}
      {item.status === 'Saved' && (() => {
        const warn = getDeadlineWarning(internship.deadline);
        if (!warn) return null;
        return (
          <div className={`${styles.deadlineWarn} ${styles[`deadlineWarn_${warn.level}`]}`}>
            ⏰ {warn.label}
          </div>
        );
      })()}

      {/* ── Status selector ── */}
      <select
        className={styles.statusSelect}
        value={item.status}
        onChange={(e) => onStatusChange(item.id, e.target.value)}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* ── Resume picker ── */}
      {resumes.length > 0 && (
        <select
          className={styles.statusSelect}
          value={item.resumeId || ''}
          onChange={(e) => onResumeChange(item.id, e.target.value)}
          title="Attach a resume to this application"
        >
          <option value="">📄 Attach resume…</option>
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      )}

      {/* ── Notes ── */}
      <textarea
        className={styles.notes}
        placeholder="Add notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => onNotesBlur(item.id, notes)}
        rows={2}
      />

      {/* ── Footer: apply link + history toggle ── */}
      <div className={styles.cardFooter}>
        <a href={internship.applyUrl} target="_blank" rel="noopener noreferrer" className={styles.applyLink}>
          Apply on {internship.source} ↗
        </a>
        {item.history?.length > 0 && (
          <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
            onClick={() => setShowHistory((h) => !h)}>
            {showHistory ? 'Hide history' : `History (${item.history.length})`}
          </button>
        )}
      </div>

      {/* ── Status history ── */}
      {showHistory && item.history?.length > 0 && (
        <div className={styles.history}>
          {item.history.map((h) => (
            <div key={h.id} className={styles.historyItem}>
              <span className={`badge badge-${h.status.toLowerCase()}`}>{h.status}</span>
              <span className={styles.historyDate}>
                {new Date(h.changedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
