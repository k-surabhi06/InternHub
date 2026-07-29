import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/');
    setMenuOpen(false);
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          InternHub
        </Link>

        <div className={styles.rightGroup}>
          <button
            className={styles.themeToggle}
            onClick={toggle}
            aria-label="Toggle dark mode"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀︎' : '☾'}
          </button>

          <button
            className={styles.menuToggle}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        <div className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          <NavLink
            to="/browse"
            className={({ isActive }) => `${styles.link} ${isActive ? styles.activeLink : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/tracker"
                className={({ isActive }) => `${styles.link} ${isActive ? styles.activeLink : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Tracker
              </NavLink>
              <NavLink
                to="/saved-searches"
                className={({ isActive }) => `${styles.link} ${isActive ? styles.activeLink : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Saved Searches
              </NavLink>
              <NavLink
                to="/resumes"
                className={({ isActive }) => `${styles.link} ${isActive ? styles.activeLink : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Resumes
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `${styles.link} ${isActive ? styles.activeLink : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </NavLink>
              <button className={`btn-ghost ${styles.logoutBtn}`} onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.link} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>
                <button className="btn-primary" style={{ padding: '0.4rem 1rem' }}>Register</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
