import React, { useEffect, useState } from 'react';
import { profileApi } from '../api';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', preferredRole: '', preferredLocation: '', preferredStipend: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.get().then((res) => {
      const d = res.data.data;
      setProfile(d);
      setForm({
        name: d.name || '',
        preferredRole: d.preferredRole || '',
        preferredLocation: d.preferredLocation || '',
        preferredStipend: d.preferredStipend || '',
      });
    }).catch(() => setError('Could not load profile.')).finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const res = await profileApi.update(form);
      setProfile(res.data.data);
      setSuccess('Profile updated successfully.');
    } catch {
      setError('Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-container" style={{ color: 'var(--color-muted)', paddingTop: '3rem', textAlign: 'center' }}>Loading…</div>;

  return (
    <div className="page-container">
      <h1 className="section-heading">My Profile</h1>

      <div className={styles.grid}>
        {/* ─── Profile form ─── */}
        <section className={`card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Account Details</h2>
          <form onSubmit={handleSave} className={styles.form} noValidate>
            <div className={styles.field}>
              <label>Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={profile?.email || ''} disabled className={styles.disabled} />
            </div>
            <hr className="divider" />
            <h3 className={styles.prefTitle}>Browse Preferences</h3>
            <p className={styles.prefHint}>These are used to personalise your browse results.</p>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Preferred Role</label>
                <input
                  type="text"
                  placeholder="e.g. Frontend Developer"
                  value={form.preferredRole}
                  onChange={(e) => setForm({ ...form, preferredRole: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label>Preferred Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore"
                  value={form.preferredLocation}
                  onChange={(e) => setForm({ ...form, preferredLocation: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label>Minimum Stipend</label>
              <input
                type="text"
                placeholder="e.g. ₹10,000"
                value={form.preferredStipend}
                onChange={(e) => setForm({ ...form, preferredStipend: e.target.value })}
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            {success && <p className={styles.success}>{success}</p>}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
