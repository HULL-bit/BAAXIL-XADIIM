import axios from 'axios'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'https://baaxil-xadiim.onrender.com').replace(/\/$/, '')
const API_BASE = `${API_ORIGIN}/api`

// Simple cache for GET requests (improves mobile performance)
const responseCache = new Map()
const CACHE_DURATION = 30000 // 30 seconds

// Helper to get cached data if still valid
function getCachedData(cacheKey) {
  const cached = responseCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data
  }
  responseCache.delete(cacheKey)
  return null
}

// Helper to clear cache for specific URL pattern (useful after mutations)
export function clearCache(pattern) {
  if (!pattern) {
    responseCache.clear()
    return
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key)
    }
  }
}

const api = axios.create({
  // En prod, on pointe par défaut sur le backend Render.
  // Pour surcharger (ex: dev local), définir VITE_API_URL.
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Add timeout for mobile connections
const MOBILE_TIMEOUT = 15000 // 15 seconds

api.interceptors.request.use((config) => {
  // On priorise les tokens en sessionStorage (connexion valable tant que l'onglet est ouvert),
  // tout en restant compatible avec d'éventuels anciens tokens en localStorage.
  const token =
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('access')) ||
    localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  
  // Pour FormData (ex: photo de profil), ne pas fixer Content-Type pour que axios envoie multipart/form-data avec boundary
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  
  // Check cache for GET requests
  if (config.method === 'get' && !config.skipCache) {
    const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`
    const cachedData = getCachedData(cacheKey)
    if (cachedData) {
      // Return cached data immediately
      return Promise.resolve({
        data: cachedData,
        config: config,
        status: 200,
        statusText: 'OK',
        headers: {},
        fromCache: true,
      })
    }
  }
  
  // Add timeout for better mobile UX
  config.timeout = config.timeout || MOBILE_TIMEOUT
  return config
})

api.interceptors.response.use(
  (res) => {
    // Cache GET requests for better mobile performance
    if (res.config.method === 'get' && !res.config.skipCache) {
      const cacheKey = `${res.config.url}${JSON.stringify(res.config.params || {})}`
      responseCache.set(cacheKey, {
        data: res.data,
        timestamp: Date.now(),
      })
    }
    return res
  },
  async (err) => {
    const original = err.config
    // Retry logic for failed requests (helps with unstable mobile connections)
    if (!original._retry && err.code !== 'ECONNABORTED') {
      original._retry = true
      const refresh =
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('refresh')) ||
        localStorage.getItem('refresh')
      if (refresh) {
        try {
          const { data } = await axios.post(API_BASE + '/auth/token/refresh/', { refresh })
          // Après refresh, on stocke en priorité dans sessionStorage
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('access', data.access)
            if (data.refresh) sessionStorage.setItem('refresh', data.refresh)
          }
          // On nettoie d'éventuels anciens tokens persistant en localStorage
          localStorage.removeItem('access')
          if (data.refresh) localStorage.removeItem('refresh')
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch (_e) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('access')
            sessionStorage.removeItem('refresh')
          }
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
