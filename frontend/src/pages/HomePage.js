import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/browse?search=${encodeURIComponent(query.trim())}`);
    } else {
      navigate('/browse');
    }
  }

  return (
    <div className={styles.hero}>
      <div className={styles.heroContent}>
        <h1 className={styles.headline}>
          Find Your Next Internship — All in One Place
        </h1>
        <p className={styles.subheadline}>
          InternHub aggregates listings from Internshala and Unstop so you
          search once, filter once, and track every application in one dashboard.
        </p>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by role or company (e.g. 'frontend developer')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>

        <div className={styles.pills}>
          {['Frontend Developer', 'Data Science', 'Product Management', 'UI/UX Design', 'DevOps'].map((term) => (
            <button
              key={term}
              className={styles.pill}
              onClick={() => navigate(`/browse?search=${encodeURIComponent(term)}`)}
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🔍</span>
          <h3>Aggregated Search</h3>
          <p>One search across Internshala and Unstop — no more tab switching.</p>
        </div>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>📋</span>
          <h3>Application Tracker</h3>
          <p>Track every application from Saved → Applied → Interview → Offer.</p>
        </div>
        <div className={styles.feature}>
          <span className={styles.featureIcon}>🔗</span>
          <h3>One-Click Apply</h3>
          <p>Apply on the original platform — InternHub never intercepts your application.</p>
        </div>
      </div>
    </div>
  );
}
