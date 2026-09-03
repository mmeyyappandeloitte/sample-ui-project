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

export function useWeather() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null })

  const fetchWeather = useCallback(async (postalCode, country = 'US', tempUnit = 'fahrenheit') => {
    const trimmed = postalCode?.trim() ?? ''
    if (trimmed.length < 3) return

    setState({ status: 'loading', data: null, error: null })

    try {
      // 1️⃣  Postal code → lat/lon + location info via zippopotam.us (60+ countries)
      const geoRes = await fetch(
        `https://api.zippopotam.us/${country.toLowerCase()}/${trimmed}`
      )
      if (!geoRes.ok) {
        throw new Error(
          geoRes.status === 404
            ? `Postal code "${postalCode}" not found in ${country}. Please check and try again.`
            : `Geocoding error (${geoRes.status}). Try again.`
        )
      }
      const geoData = await geoRes.json()
      const place       = geoData.places[0]
      const lat         = parseFloat(place.latitude)
      const lon         = parseFloat(place.longitude)
      const city        = place['place name']
      const region      = place['state']
      const regionAbb   = place['state abbreviation']
      const countryName = geoData['country']

      const isUS       = country === 'US'
      const windUnit   = isUS ? 'mph' : 'kmh'
      const windLabel  = isUS ? 'mph' : 'km/h'
      const tempSymbol = tempUnit === 'fahrenheit' ? '°F' : '°C'

      // 2️⃣  Weather via Open-Meteo (no API key required)
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

      // Compass direction for coordinates
      const latDir = lat >= 0 ? 'N' : 'S'
      const lonDir = lon >= 0 ? 'E' : 'W'

      setState({
        status: 'success',
        error: null,
        data: {
          postalCode: geoData['post code'],
          city,
          region,
          regionAbb,
          country: countryName,
          countryCode: country,
          isUS,
          lat,
          lon,
          latDir,
          lonDir,
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
