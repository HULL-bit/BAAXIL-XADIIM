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

  // Rôles de la matrice pilote (audit dahira) — voir apps.accounts.permissions côté
  // backend, qui est la source de vérité. Le frontend ne fait ici que nommer les
  // rôles pour l'UI ; toutes les décisions d'accès réelles utilisent `permissions`
  // (calculé côté backend et renvoyé par /auth/me/), pas une liste de rôles dupliquée.
  const role = user?.role
  const isSuperAdmin = role === 'admin'
  const isMembre = role === 'membre'
  const isNationalLecture = role === 'national_lecture'
  const isSecretariatNational = role === 'secretariat_national'
  const isFinanceNational = role === 'finance_national'
  const isSectionLecture = role === 'section_lecture'
  const isCelluleAdmin = role === 'cellule_admin'
  const isCelluleFinance = role === 'cellule_finance'
  const isCellulePresident = role === 'cellule_president'
  // Un rôle "admin-like" a un tableau de bord/sidebar de gestion (par opposition au
  // simple membre) : tout rôle scopé de la matrice pilote + le Super Admin.
  const isGestionRole = isSuperAdmin || [
    isNationalLecture, isSecretariatNational, isFinanceNational,
    isSectionLecture, isCelluleAdmin, isCelluleFinance, isCellulePresident,
  ].some(Boolean)

  // Résumé des droits calculé côté backend (apps.accounts.permissions.permissions_summary),
  // exposé par /auth/me/, /auth/token/ et PATCH /auth/me/. Fallback défensif si absent.
  const permissions = user?.permissions || {
    is_super_admin: isSuperAdmin,
    scope_level: null,
    can_view_members: false,
    can_manage_members: false,
    can_view_finance: false,
    can_manage_finance: false,
    can_manage_cellules: false,
    can_view_national_synthese: false,
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    setUserFromProfile,
    permissions,
    isAdmin: isSuperAdmin,
    isSuperAdmin,
    isMembre,
    isGestionRole,
    isNationalLecture,
    isSecretariatNational,
    isFinanceNational,
    isSectionLecture,
    isCelluleAdmin,
    isCelluleFinance,
    isCellulePresident,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
