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

// Fallback geocoder: Nominatim (OpenStreetMap) — free, no key, broad global coverage
async function geocodeWithNominatim(postalCode, countryCode) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?postalcode=${encodeURIComponent(postalCode)}` +
    `&country=${countryCode}` +
    `&format=json&limit=1&addressdetails=1`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'WeatherZip-App/1.0' },
  })

  if (!res.ok) {
    throw new Error(`Postal code "${postalCode}" not found. Please check and try again.`)
  }

  const data = await res.json()
  if (!data.length) {
    throw new Error(
      `Postal code "${postalCode}" not found in ${countryCode}. ` +
      `Please check the postal code and try again.`
    )
  }

  const nom  = data[0]
  const addr = nom.address ?? {}

  // Best available city name from most-specific to least
  const city =
    addr.city        ||
    addr.town        ||
    addr.village     ||
    addr.suburb      ||
    addr.state_district ||
    addr.county      ||
    nom.display_name.split(', ')[1] ||
    postalCode

  const region    = addr.state ?? ''
  // ISO3166-2-lvl4 is e.g. "IN-TN" → take the suffix "TN" as the abbreviation
  const regionAbb = addr['ISO3166-2-lvl4']?.split('-').pop() ?? ''
  const countryName = addr.country ?? countryCode

  return {
    postalCode: addr.postcode ?? postalCode,
    lat:        parseFloat(nom.lat),
    lon:        parseFloat(nom.lon),
    city,
    region,
    regionAbb,
    countryName,
  }
}

export function useWeather() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  const fetchWeather = useCallback(async (postalCode, country = 'US', tempUnit = 'fahrenheit') => {
    const trimmed = postalCode?.trim() ?? ''
    if (trimmed.length < 3) return

    setState({ status: 'loading', data: null, error: null })

    try {
      // ── Step 1: Geocode postal code → lat/lon ──────────────────────────────
      // Primary: zippopotam.us (fast, structured)
      // Fallback: Nominatim / OpenStreetMap (broader coverage, e.g. Indian PIN codes)
      let geo

      const zipRes = await fetch(
        `https://api.zippopotam.us/${country.toLowerCase()}/${trimmed}`
      )

      if (zipRes.ok) {
        const zipData = await zipRes.json()

        if (zipData.places?.length) {
          // zippopotam.us has the record
          const place = zipData.places[0]
          geo = {
            postalCode: zipData['post code'],
            lat:        parseFloat(place.latitude),
            lon:        parseFloat(place.longitude),
            city:       place['place name'],
            region:     place['state'],
            regionAbb:  place['state abbreviation'],
            countryName: zipData['country'],
          }
        } else {
          // API returned {} — postal code not in zippopotam.us database; try Nominatim
          geo = await geocodeWithNominatim(trimmed, country)
        }
      } else if (zipRes.status === 404) {
        // Hard 404 — also try Nominatim before giving up
        geo = await geocodeWithNominatim(trimmed, country)
      } else {
        throw new Error(`Geocoding error (${zipRes.status}). Try again.`)
      }

      const { lat, lon, city, region, regionAbb, countryName } = geo
      const isUS      = country === 'US'
      const windUnit  = isUS ? 'mph' : 'kmh'
      const windLabel = isUS ? 'mph' : 'km/h'
      const tempSymbol = tempUnit === 'fahrenheit' ? '°F' : '°C'

      // ── Step 2: Fetch weather from Open-Meteo (no API key required) ─────────
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
      const wx = await wxRes.json()
      const c  = wx.current
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
