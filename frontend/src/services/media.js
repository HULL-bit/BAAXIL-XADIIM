/**
 * Base URL pour les médias (photos, fichiers).
 * En dev : vide → /media/... est relatif et proxyfié par Vite vers le backend.
 * En prod (Render) : origine du backend → les images sont chargées depuis le bon serveur.
 */
export function getMediaBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || ''
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    try {
      return new URL(apiBase).origin
    } catch {
      return ''
    }
  }
  return ''
}

/**
 * Retourne l'URL complète d'un fichier média.
 * @param {string|null|undefined} path - Chemin relatif (ex: photos_membres/xxx.jpg) ou chemin absolu (ex: /media/...)
 * @param {string} [query] - Query string optionnelle (ex: ?v=timestamp pour cache busting)
 */
export function getMediaUrl(path, query = '') {
  if (!path) return null
  const base = getMediaBaseUrl()
  let urlPath = path
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path)
      urlPath = u.pathname
    } catch {
      urlPath = path
    }
  }
  if (!urlPath.startsWith('/')) {
    urlPath = `/media/${urlPath}`
  }
  const q = query ? (query.startsWith('?') ? query : `?${query}`) : ''
  return base ? `${base}${urlPath}${q}` : `${urlPath}${q}`
}
