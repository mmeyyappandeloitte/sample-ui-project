import React from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './components/LoginPage'
import WeatherDashboard from './components/WeatherDashboard'

function AppRouter() {
  const { user } = useAuth()
  return user ? <WeatherDashboard /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
