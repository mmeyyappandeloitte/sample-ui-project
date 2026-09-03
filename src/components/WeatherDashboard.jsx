import React, { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWeather } from '../hooks/useWeather'
import styles from './WeatherDashboard.module.css'

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// Countries supported by zippopotam.us postal-code geocoding API
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'CA', name: 'Canada' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MT', name: 'Malta' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MC', name: 'Monaco' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'SM', name: 'San Marino' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UA', name: 'Ukraine' },
]

// Example postal codes shown as placeholder hint per country
const POSTAL_EXAMPLES = {
  US: '10001', GB: 'SW1A 2AA', CA: 'K1A 0A6', JP: '100-0001',
  AU: '2000',  DE: '10115',   FR: '75001',  IT: '00100',
  ES: '28001', NL: '1011',    BR: '01310',  MX: '06600',
  IN: '110001',SE: '11120',   NO: '0001',   CH: '8001',
}

function postalPlaceholder(code) {
  return POSTAL_EXAMPLES[code] ? `e.g. ${POSTAL_EXAMPLES[code]}` : 'postal code'
}

function formatDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  return DAY_NAMES[d.getDay()]
}

function UVBadge({ value }) {
  const n = Number(value)
  if (isNaN(n)) return <span className={styles.uvBadge} style={{background:'#334155'}}>N/A</span>
  let bg = '#4ade80', label = 'Low'
  if (n >= 11)      { bg = '#c084fc'; label = 'Extreme' }
  else if (n >= 8)  { bg = '#f87171'; label = 'Very High' }
  else if (n >= 6)  { bg = '#fb923c'; label = 'High' }
  else if (n >= 3)  { bg = '#fbbf24'; label = 'Moderate' }
  return (
    <span className={styles.uvBadge} style={{background: bg, color: '#0f172a'}}>
      UV {n} · {label}
    </span>
  )
}

export default function WeatherDashboard() {
  const { user, logout } = useAuth()
  const { status, data, error, fetchWeather } = useWeather()
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry]       = useState('US')
  const [tempUnit, setTempUnit]     = useState('fahrenheit')
  const inputRef = useRef(null)

  function handleCountryChange(e) {
    const newCode = e.target.value
    setCountry(newCode)
    setPostalCode('')
    // Auto-switch temperature unit: US defaults to °F, everything else to °C
    setTempUnit(newCode === 'US' ? 'fahrenheit' : 'celsius')
    inputRef.current?.focus()
  }

  function handleSubmit(e) {
    e.preventDefault()
    fetchWeather(postalCode, country, tempUnit)
  }

  function handleReset() {
    setPostalCode('')
    inputRef.current?.focus()
  }

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <span>🌦️</span>
          <span className={styles.headerTitle}>WeatherZip</span>
        </div>
        <div className={styles.headerUser}>
          <span className={styles.headerGreeting}>Hi, {user.name}!</span>
          <button className={styles.logoutBtn} onClick={logout}>Sign Out</button>
        </div>
      </header>

      {/* ── Search ─────────────────────────────── */}
      <section className={styles.searchSection}>
        <h2 className={styles.searchHeading}>Get Weather by Postal Code</h2>
        <p className={styles.searchSub}>
          Select a country and enter a postal code for real-time conditions and a 5-day forecast
        </p>

        {/* Country + Temperature unit controls */}
        <div className={styles.controlRow}>
          <div className={styles.selectWrap}>
            <span className={styles.selectIcon}>🌍</span>
            <select
              className={`${styles.customSelect} ${styles.countrySelect}`}
              value={country}
              onChange={handleCountryChange}
              aria-label="Country"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.selectWrap}>
            <span className={styles.selectIcon}>🌡️</span>
            <select
              className={`${styles.customSelect} ${styles.tempUnitSelect}`}
              value={tempUnit}
              onChange={e => setTempUnit(e.target.value)}
              aria-label="Temperature unit"
            >
              <option value="fahrenheit">°F  Fahrenheit</option>
              <option value="celsius">°C  Celsius</option>
            </select>
          </div>
        </div>

        {/* Postal code input + search button */}
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <div className={styles.searchInputWrap}>
            <span className={styles.searchIcon}>📍</span>
            <input
              ref={inputRef}
              type="text"
              placeholder={`Postal code (${postalPlaceholder(country)})`}
              value={postalCode}
              onChange={e =>
                setPostalCode(
                  e.target.value
                    .replace(/[^A-Z0-9 -]/gi, '')
                    .slice(0, 10)
                    .toUpperCase()
                )
              }
              className={styles.searchInput}
              aria-label="Postal code"
              autoComplete="postal-code"
            />
            {postalCode && (
              <button type="button" className={styles.clearBtn} onClick={handleReset} aria-label="Clear">
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className={styles.searchBtn}
            disabled={postalCode.trim().length < 3 || status === 'loading'}
          >
            {status === 'loading' ? (
              <><span className={styles.spinner} /> Fetching…</>
            ) : (
              'Get Weather'
            )}
          </button>
        </form>
      </section>

      {/* ── Error ──────────────────────────────── */}
      {status === 'error' && (
        <div className={styles.errorBanner} role="alert">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────── */}
      {status === 'loading' && (
        <div className={styles.results}>
          <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
          <div className={`${styles.skeleton} ${styles.skeletonForecast}`} />
        </div>
      )}

      {/* ── Results ────────────────────────────── */}
      {status === 'success' && data && (
        <div className={styles.results}>
          {/* Location header */}
          <div className={styles.locationRow}>
            <div>
              <h2 className={styles.locationName}>
                {data.city}
                {data.isUS && data.regionAbb ? `, ${data.regionAbb}` : `, ${data.country}`}
              </h2>
              <p className={styles.locationMeta}>
                {data.isUS ? 'ZIP' : 'Postal'} {data.postalCode}
                {data.region ? ` · ${data.region}` : ''}
                {!data.isUS ? ` · ${data.country}` : ''}
                {' · '}
                {Math.abs(data.lat).toFixed(4)}°{data.latDir}{' '}
                {Math.abs(data.lon).toFixed(4)}°{data.lonDir}
              </p>
            </div>
            <p className={styles.fetchedAt}>Updated {data.fetchedAt}</p>
          </div>

          {/* Current conditions card */}
          <div className={styles.currentCard}>
            <div className={styles.currentMain}>
              <div className={styles.currentEmoji}>{data.current.emoji}</div>
              <div>
                <div className={styles.currentTemp}>{data.current.temp}{data.tempSymbol}</div>
                <div className={styles.currentLabel}>{data.current.label}</div>
                <div className={styles.currentFeels}>Feels like {data.current.feelsLike}{data.tempSymbol}</div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <Stat icon="💧" label="Humidity"   value={`${data.current.humidity}%`} />
              <Stat icon="💨" label="Wind"       value={`${data.current.windSpeed} ${data.windLabel} ${data.current.windDir}`} />
              <Stat icon="🌡️" label="Pressure"   value={`${data.current.pressure} hPa`} />
              <Stat icon="👁️" label="Visibility" value={`${data.current.visibility} km`} />
              <Stat icon="🌧️" label="Precip"     value={`${data.current.precip} mm`} />
              <div className={styles.statItem}>
                <span className={styles.statIcon}>☀️</span>
                <span className={styles.statLabel}>UV Index</span>
                <UVBadge value={data.current.uvIndex} />
              </div>
            </div>
          </div>

          {/* 5-Day Forecast */}
          <h3 className={styles.forecastTitle}>5-Day Forecast</h3>
          <div className={styles.forecastGrid}>
            {data.forecast.map((day, i) => (
              <div key={i} className={`${styles.forecastCard} ${i === 0 ? styles.forecastToday : ''}`}>
                <div className={styles.forecastDay}>{formatDay(day.date)}</div>
                <div className={styles.forecastEmoji}>{day.emoji}</div>
                <div className={styles.forecastLabel}>{day.label}</div>
                <div className={styles.forecastTemps}>
                  <span className={styles.forecastHigh}>{day.high}°</span>
                  <span className={styles.forecastLow}>{day.low}°</span>
                </div>
                <div className={styles.forecastPrecip}>🌧️ {day.precip} mm</div>
                <div className={styles.forecastSun}>
                  🌅 {day.sunrise}<br />🌇 {day.sunset}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────── */}
      {status === 'idle' && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🗺️</div>
          <p>Select a country and enter a postal code above to see current conditions and a 5-day forecast.</p>
        </div>
      )}

      <footer className={styles.footer}>
        Weather data by <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> ·
        Geocoding by <a href="https://www.zippopotam.us" target="_blank" rel="noreferrer">Zippopotam.us</a> · 50+ countries supported
      </footer>
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statIcon}>{icon}</span>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}
