# WeatherZip 🌦️

A React weather application that shows real-time weather conditions and a 5-day forecast for any postal code worldwide. Supports 50+ countries with a country dropdown, configurable temperature unit (°F / °C), and automatic unit switching.

---

## 🌐 URLs

| Environment | URL |
|---|---|
| **Local development** | http://localhost:5173 |
| **Deployed application** | *(add your deployed URL here after deployment)* |
| **GitHub repository** | https://github.com/mmeyyappandeloitte/sample-ui-project |

---

## 📁 Project Files

| File | Description |
|---|---|
| `src/App.jsx` | Root component — renders `LoginPage` or `WeatherDashboard` based on auth state |
| `src/main.jsx` | React entry point — mounts the app to the DOM via `ReactDOM.createRoot` |
| `src/index.css` | Global base styles and CSS reset applied to all pages |
| `src/context/AuthContext.jsx` | Authentication context — stores the logged-in user and exposes `login` / `logout` |
| `src/components/LoginPage.jsx` | Login screen with username + password form |
| `src/components/LoginPage.module.css` | Scoped CSS for the Login page |
| `src/components/WeatherDashboard.jsx` | Main dashboard — country dropdown, temperature unit selector, postal code input, current conditions, and 5-day forecast |
| `src/components/WeatherDashboard.module.css` | Scoped CSS for the Weather Dashboard |
| `src/hooks/useWeather.js` | Custom hook — geocodes postal codes via Zippopotam.us and fetches weather from Open-Meteo; handles temperature unit and wind-speed unit switching |
| `package.json` | Project dependencies and npm scripts (`dev`, `build`, `preview`) |
| `vite.config.js` | Vite bundler configuration |
| `README.md` | This file |

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔌 APIs Used

| API | Purpose | URL |
|---|---|---|
| **Open-Meteo** | Free weather data — current conditions and 5-day forecast, no API key required | https://open-meteo.com |
| **Zippopotam.us** | Postal code → latitude/longitude geocoding for 50+ countries, no API key required | https://www.zippopotam.us |

---

## 🌍 Supported Countries

United States · Andorra · Argentina · Australia · Austria · Belgium · Brazil · Bulgaria · Canada · Croatia · Czech Republic · Denmark · Estonia · Finland · France · Germany · United Kingdom · Hungary · Iceland · Ireland · Israel · Italy · Japan · Latvia · Liechtenstein · Lithuania · Luxembourg · Malaysia · Malta · Mexico · Monaco · Netherlands · New Zealand · Norway · Philippines · Poland · Portugal · Romania · Russia · San Marino · Singapore · Slovakia · Slovenia · South Africa · South Korea · Spain · Sweden · Switzerland · Thailand · Turkey · Ukraine

---

## ✨ Features

- **Worldwide postal codes** — any country in the dropdown works; input accepts letters, numbers, and hyphens
- **Country dropdown** — 50+ countries; switching auto-resets the postal field and the temperature unit
- **Temperature unit toggle** — °F defaults for United States, °C for all other countries; can be overridden anytime
- **Wind speed units** — mph for the US, km/h for all other countries (automatic)
- **Current conditions** — temperature, feels-like, humidity, wind speed/direction, pressure, visibility, precipitation, and UV index
- **5-day forecast** — daily high/low, weather description, precipitation, sunrise, and sunset
