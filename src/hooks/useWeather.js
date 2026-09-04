import { useState, useCallback } from 'react'

// WMO Weather Interpretation Codes → human label + emoji
const WMO_CODES = {
  0:  { label: 'Clear Sky',           emoji: '☀️' },
  1:  { label: 'Mainly Clear',        emoji: '🌤️' },
  2:  { label: 'Partly Cloudy',       emoji: '⛅' },
  3:  { label: 'Overcast',            emoji: '☁️' },
  45: { label: 'Fog',                 emoji: '🌫️' },
  48: { label: 'Icy Fog',             emoji: '🌫️' },
  51: { label: 'Light Drizzle',       emoji: '🌦️' },
  53: { label: 'Moderate Drizzle',    emoji: '🌦️' },
  55: { label: 'Dense Drizzle',       emoji: '🌧️' },
  61: { label: 'Slight Rain',         emoji: '🌧️' },
  63: { label: 'Moderate Rain',       emoji: '🌧️' },
  65: { label: 'Heavy Rain',          emoji: '🌧️' },
  71: { label: 'Slight Snow',         emoji: '🌨️' },
  73: { label: 'Moderate Snow',       emoji: '❄️' },
  75: { label: 'Heavy Snow',          emoji: '❄️' },
  77: { label: 'Snow Grains',         emoji: '🌨️' },
  80: { label: 'Slight Showers',      emoji: '🌦️' },
  81: { label: 'Moderate Showers',    emoji: '🌧️' },
  82: { label: 'Violent Showers',     emoji: '⛈️' },
  85: { label: 'Slight Snow Showers', emoji: '🌨️' },
  86: { label: 'Heavy Snow Showers',  emoji: '❄️' },
  95: { label: 'Thunderstorm',        emoji: '⛈️' },
  96: { label: 'Thunderstorm + Hail', emoji: '⛈️' },
  99: { label: 'Thunderstorm + Hail', emoji: '⛈️' },
}

function wmoInfo(code) {
  return WMO_CODES[code] ?? { label: 'Unknown', emoji: '🌡️' }
}

function windDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(deg / 45) % 8]
}

// ── Geocoding helpers ────────────────────────────────────────────────────────

// Photon (komoot.io) — OpenStreetMap-based, CORS-enabled, free, no API key.
// Returns lat/lon + best available location name. Used as the universal fallback.
async function geocodeWithPhoton(postalCode, countryCode) {
  const url =
    `https://photon.komoot.io/api/` +
    `?q=${encodeURIComponent(postalCode)}` +
    `&countrycode=${countryCode.toLowerCase()}` +
    `&limit=1`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Postal code "${postalCode}" not found. Please try again.`)
  }

  const data = await res.json()
  if (!data.features?.length) {
    throw new Error(
      `Postal code "${postalCode}" was not found for ${countryCode}. ` +
      `Please verify the postal code and try again.`
    )
  }

  const feat  = data.features[0]
  const props = feat.properties
  // GeoJSON coordinates are [longitude, latitude]
  const lon = feat.geometry.coordinates[0]
  const lat = feat.geometry.coordinates[1]

  const city =
    props.city     ||
    props.town     ||
    props.village  ||
    props.district ||
    props.county   ||
    postalCode

  return {
    postalCode,
    lat,
    lon,
    city,
    region:      props.state    ?? '',
    regionAbb:   '',
    countryName: props.country  ?? countryCode,
  }
}

// India-enhanced geocoding: api.postalpincode.in gives the District name (better
// city name than Photon's county field) + Photon gives lat/lon.
async function geocodeIndia(postalCode) {
  // Run both requests in parallel for speed
  const [indRes, photonRes] = await Promise.all([
    fetch(`https://api.postalpincode.in/pincode/${postalCode}`),
    fetch(
      `https://photon.komoot.io/api/` +
      `?q=${encodeURIComponent(postalCode)}&countrycode=in&limit=1`
    ),
  ])

  // Validate Photon first — we need lat/lon
  if (!photonRes.ok) {
    throw new Error(`Postal code "${postalCode}" not found in India. Please verify and try again.`)
  }
  const photonData = await photonRes.json()
  if (!photonData.features?.length) {
    throw new Error(`Postal code "${postalCode}" not found in India. Please verify and try again.`)
  }
  const feat = photonData.features[0]
  const lon  = feat.geometry.coordinates[0]
  const lat  = feat.geometry.coordinates[1]

  // Try to enrich city name from India Postal API
  let city = feat.properties.county || postalCode
  let region = feat.properties.state || 'India'

  if (indRes.ok) {
    try {
      const indData = await indRes.json()
      if (indData[0]?.Status === 'Success' && indData[0].PostOffice?.length) {
        const po = indData[0].PostOffice[0]
        city   = po.District || city    // e.g. "Pudukkottai"
        region = po.State    || region  // e.g. "Tamil Nadu"
      }
    } catch (_) {
      // India postal API parse failed — fall back to Photon values already set
    }
  }

  return {
    postalCode,
    lat,
    lon,
    city,
    region,
    regionAbb:   '',
    countryName: 'India',
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────

export function useWeather() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  const fetchWeather = useCallback(async (postalCode, country = 'US', tempUnit = 'fahrenheit') => {
    const trimmed = postalCode?.trim() ?? ''
    if (trimmed.length < 3) return

    setState({ status: 'loading', data: null, error: null })

    try {
      // ── Step 1: Geocode postal code → lat/lon + location info ──────────────
      //   Primary:   zippopotam.us      (fast, structured, good for most countries)
      //   India:     postalpincode.in + Photon (best coverage + city names for IN)
      //   Fallback:  Photon / komoot.io (CORS-enabled, global OSM coverage)
      let geo

      if (country === 'IN') {
        // India has very poor zippopotam.us coverage — go straight to the better path
        geo = await geocodeIndia(trimmed)
      } else {
        const zipRes = await fetch(
          `https://api.zippopotam.us/${country.toLowerCase()}/${trimmed}`
        )

        if (zipRes.ok) {
          const zipData = await zipRes.json()
          if (zipData.places?.length) {
            // zippopotam.us has the record
            const place = zipData.places[0]
            geo = {
              postalCode:  zipData['post code'],
              lat:         parseFloat(place.latitude),
              lon:         parseFloat(place.longitude),
              city:        place['place name'],
              region:      place['state'],
              regionAbb:   place['state abbreviation'],
              countryName: zipData['country'],
            }
          } else {
            // Empty {} — postal code not in zippopotam.us database
            geo = await geocodeWithPhoton(trimmed, country)
          }
        } else if (zipRes.status === 404) {
          // Hard 404 — try Photon before giving up
          geo = await geocodeWithPhoton(trimmed, country)
        } else {
          throw new Error(`Geocoding error (${zipRes.status}). Try again.`)
        }
      }

      const { lat, lon, city, region, regionAbb, countryName } = geo
      const isUS       = country === 'US'
      const windUnit   = isUS ? 'mph' : 'kmh'
      const windLabel  = isUS ? 'mph' : 'km/h'
      const tempSymbol = tempUnit === 'fahrenheit' ? '°F' : '°C'

      // ── Step 2: Fetch weather from Open-Meteo (free, no API key) ──────────
      const params = new URLSearchParams({
        latitude:  lat,
        longitude: lon,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'weather_code',
          'wind_speed_10m',
          'wind_direction_10m',
          'surface_pressure',
          'visibility',
          'precipitation',
          'uv_index',
        ].join(','),
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'sunrise',
          'sunset',
        ].join(','),
        temperature_unit: tempUnit,
        wind_speed_unit:  windUnit,
        timezone:         'auto',
        forecast_days:    5,
      })

      const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      if (!wxRes.ok) throw new Error(`Weather API error (${wxRes.status}).`)
      const wx    = await wxRes.json()
      const c     = wx.current
      const cInfo = wmoInfo(c.weather_code)

      const forecast = wx.daily.time.map((date, i) => ({
        date,
        ...wmoInfo(wx.daily.weather_code[i]),
        high:    Math.round(wx.daily.temperature_2m_max[i]),
        low:     Math.round(wx.daily.temperature_2m_min[i]),
        precip:  wx.daily.precipitation_sum[i].toFixed(1),
        sunrise: wx.daily.sunrise[i].slice(11),
        sunset:  wx.daily.sunset[i].slice(11),
      }))

      setState({
        status: 'success',
        error: null,
        data: {
          postalCode: geo.postalCode,
          city,
          region,
          regionAbb,
          country: countryName,
          countryCode: country,
          isUS,
          lat,
          lon,
          latDir:  lat >= 0 ? 'N' : 'S',
          lonDir:  lon >= 0 ? 'E' : 'W',
          tempSymbol,
          windLabel,
          current: {
            temp:       Math.round(c.temperature_2m),
            feelsLike:  Math.round(c.apparent_temperature),
            humidity:   c.relative_humidity_2m,
            windSpeed:  Math.round(c.wind_speed_10m),
            windDir:    windDir(c.wind_direction_10m),
            pressure:   Math.round(c.surface_pressure),
            visibility: c.visibility != null ? (c.visibility / 1000).toFixed(1) : 'N/A',
            precip:     c.precipitation,
            uvIndex:    c.uv_index != null ? Math.round(c.uv_index) : 'N/A',
            ...cInfo,
          },
          forecast,
          fetchedAt: new Date().toLocaleTimeString(),
        },
      })
    } catch (err) {
      setState({ status: 'error', data: null, error: err.message })
    }
  }, [])

  return { ...state, fetchWeather }
}
