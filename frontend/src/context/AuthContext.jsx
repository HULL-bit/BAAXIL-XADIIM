import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On stocke désormais les tokens uniquement en sessionStorage
    // pour éviter une reconnexion automatique après fermeture du navigateur.
    const token = sessionStorage.getItem('access')
    if (token) {
      api.get('/auth/me/')
        .then(({ data }) => setUser(data))
        .catch(() => {
          sessionStorage.removeItem('access')
          sessionStorage.removeItem('refresh')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const { data } = await api.post('/auth/token/', { username, password })
    sessionStorage.setItem('access', data.access)
    sessionStorage.setItem('refresh', data.refresh)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register/', payload)
    return data
  }

  const logout = () => {
    sessionStorage.removeItem('access')
    sessionStorage.removeItem('refresh')
    setUser(null)
  }

  const refreshUser = async () => {
    const { data } = await api.get('/auth/me/')
    setUser(data)
    return data
  }

  /** Met à jour l'utilisateur dans le contexte (ex. après PATCH profil) pour que Header/Sidebar reflètent tout de suite les changements */
  const setUserFromProfile = (userData) => {
    if (userData) setUser(userData)
  }

  const isAdmin = user?.role === 'admin'
  const isMembre = user?.role === 'membre'
  const isJewrine =
    !!user?.role &&
    (user.role === 'jewrin' ||
      user.role.toLowerCase().startsWith('jewrine_'))

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    setUserFromProfile,
    isAdmin,
    isJewrine,
    isMembre,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
