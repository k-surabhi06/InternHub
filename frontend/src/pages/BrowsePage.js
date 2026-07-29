import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { internshipsApi, trackerApi, savedSearchApi } from '../api';
import { useAuth } from '../context/AuthContext';
import InternshipCard from '../components/InternshipCard';
import styles from './BrowsePage.module.css';

const SOURCES = ['', 'Internshala', 'Unstop'];

const QUICK_SEARCHES = [
  'Data Analyst',
  'Full Stack',
  'AI Engineer',
  'Machine Learning',
  'Frontend Developer',
  'Backend Developer',
  'Python',
  'Data Science',
  'Android',
  'UI UX',
];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'company', label: 'Company A–Z' },
  { value: 'stipend_asc', label: 'Stipend: Low → High' },
  { value: 'stipend_desc', label: 'Stipend: High → Low' },
];
const PAGE_SIZE = 20;

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [internships, setInternships] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());
  const [lastSynced, setLastSynced] = useState(null);
  const [savingSearch, setSavingSearch] = useState(false);
  const [searchSaved, setSearchSaved] = useState(false);

  // Filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [source, setSource] = useState(searchParams.get('source') || '');
  const [remoteOnly, setRemoteOnly] = useState(searchParams.get('workMode') === 'Remote');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const fetchInternships = useCallback(async (params) => {
    setLoading(true);
    setError('');
    try {
      const res = await internshipsApi.list({
        search: params.search,
        location: params.location,
        source: params.source,
        workMode: params.remoteOnly ? 'Remote' : '',
        sort: params.sort,
        page: params.page,
        limit: PAGE_SIZE,
      });
      setInternships(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      setError('Failed to load internships. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    internshipsApi.lastSynced().then((res) => {
      const times = res.data.data;
      const allDates = Object.values(times).filter(Boolean).map((t) => new Date(t));
      if (allDates.length) {
        const latest = new Date(Math.max(...allDates));
        setLastSynced(latest);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    trackerApi.list().then((res) => {
      const ids = new Set(res.data.data.map((item) => item.internshipId));
      setSavedIds(ids);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    const params = { search, location, source, remoteOnly, sort, page };
    const urlParams = {};
    if (search) urlParams.search = search;
    if (location) urlParams.location = location;
    if (source) urlParams.source = source;
    if (remoteOnly) urlParams.workMode = 'Remote';
    if (sort && sort !== 'newest') urlParams.sort = sort;
    if (page > 1) urlParams.page = String(page);
    setSearchParams(urlParams, { replace: true });
    fetchInternships(params);
    setSearchSaved(false);
  }, [search, location, source, remoteOnly, sort, page, fetchInternships, setSearchParams]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
  }

  async function handleSave(internshipId) {
    if (!user) { window.location.href = '/login'; return; }
    try {
      await trackerApi.save(internshipId);
      setSavedIds((prev) => new Set([...prev, internshipId]));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save internship.');
    }
  }

  async function handleSaveSearch() {
    if (!user) { window.location.href = '/login'; return; }
    const label = prompt('Name this saved search:', search || location || source || (remoteOnly ? 'Remote' : '') || 'My Search');
    if (!label) return;
    setSavingSearch(true);
    try {
      await savedSearchApi.create({ label, search, location, source, workMode: remoteOnly ? 'Remote' : '' });
      setSearchSaved(true);
    } catch {
      alert('Could not save search.');
    } finally {
      setSavingSearch(false);
    }
  }

  const hasFilters = search || location || source || remoteOnly;

  return (
    <div className="page-container">
      <div className={styles.topRow}>
        <h1 className={styles.heading}>Browse Internships</h1>
        {lastSynced && (
          <span className={styles.syncBadge} title={lastSynced.toLocaleString()}>
            ↻ Last synced {formatRelativeTime(lastSynced)}
          </span>
        )}
      </div>

      {/* Filters */}
      <form className={styles.filters} onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search role or company…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className={styles.searchInput}
        />
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => { setLocation(e.target.value); setPage(1); }}
          className={styles.filterInput}
        />
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(1); }}
          className={styles.filterInput}
        >
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s || 'All Sources'}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value); setPage(1); }}
          className={styles.filterInput}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <label className={styles.remoteCheckbox}>
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => { setRemoteOnly(e.target.checked); setPage(1); }}
          />
          🏠 Remote only
        </label>
      </form>

      {/* Quick search keywords */}
      <div className={styles.quickSearchRow}>
        {QUICK_SEARCHES.map((kw) => (
          <button
            key={kw}
            type="button"
            className={`${styles.quickChip} ${search === kw ? styles.quickChipActive : ''}`}
            onClick={() => { setSearch(kw); setPage(1); }}
          >
            {kw}
          </button>
        ))}
      </div>

      {/* Actions row */}
      <div className={styles.actionsRow}>
        <p className={styles.resultCount}>
          {!loading && `${pagination.total} internship${pagination.total !== 1 ? 's' : ''} found`}
        </p>
        {hasFilters && user && (
          <button
            className="btn-ghost"
            onClick={handleSaveSearch}
            disabled={savingSearch || searchSaved}
            style={{ fontSize: '0.8rem' }}
          >
            {searchSaved ? '✓ Search saved' : savingSearch ? 'Saving…' : '+ Save this search'}
          </button>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}
      {loading && <p className={styles.loadingText}>Loading…</p>}

      {!loading && internships.length > 0 && (
        <div className={styles.grid}>
          {internships.map((internship) => (
            <InternshipCard
              key={internship.id}
              internship={internship}
              onSave={handleSave}
              saved={savedIds.has(internship.id)}
            />
          ))}
        </div>
      )}

      {!loading && !error && internships.length === 0 && (
        <div className={styles.emptyState}>
          <p>No internships found. Try different filters.</p>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Previous
          </button>
          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}
