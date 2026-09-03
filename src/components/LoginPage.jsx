import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    // Simulate slight network delay for realism
    await new Promise(r => setTimeout(r, 600))
    const result = login(form.username.trim(), form.password)
    setLoading(false)
    if (!result.success) setError(result.error)
  }

  return (
    <div className={styles.page}>
      {/* Animated background blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.card}>
        {/* Logo / brand */}
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🌦️</span>
          <h1 className={styles.brandName}>WeatherZip</h1>
          <p className={styles.brandTagline}>Real-time weather by ZIP code</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>Username</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>👤</span>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="e.g. demo"
                value={form.username}
                onChange={handleChange}
                className={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>🔒</span>
              <input
                id="password"
                name="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className={styles.input}
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPwd(s => !s)}
                tabIndex={-1}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.error} role="alert">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <><span className={styles.spinner} /> Signing in…</>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <p className={styles.hint}>
          Demo credentials: <code>demo / demo123</code>
        </p>
      </div>
    </div>
  )
}
