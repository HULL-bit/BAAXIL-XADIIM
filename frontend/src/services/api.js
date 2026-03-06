import axios from 'axios'

const api = axios.create({
  // En dev local, on pointe par défaut sur le backend Django local.
  // En prod, on définira VITE_API_BASE_URL (ex : https://mon-backend/api).
  baseURL:  'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

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
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh =
        (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('refresh')) ||
        localStorage.getItem('refresh')
      if (refresh) {
        try {
          const base =  'http://localhost:8000/api'
          const { data } = await axios.post(base + '/auth/token/refresh/', { refresh })
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
