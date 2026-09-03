import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// Demo credentials — replace with real auth in production
const DEMO_USERS = [
  { username: 'demo', password: 'demo123', name: 'Demo User' },
  { username: 'admin', password: 'admin123', name: 'Admin' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('wz_user')
    return stored ? JSON.parse(stored) : null
  })

  function login(username, password) {
    const found = DEMO_USERS.find(
      u => u.username === username && u.password === password
    )
    if (!found) return { success: false, error: 'Invalid username or password.' }
    const { password: _, ...safe } = found
    setUser(safe)
    sessionStorage.setItem('wz_user', JSON.stringify(safe))
    return { success: true }
  }

  function logout() {
    setUser(null)
    sessionStorage.removeItem('wz_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
