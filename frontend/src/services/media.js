/**
 * Base URL pour les médias (photos, fichiers).
 * En dev : vide → /media/... est relatif et proxyfié par Vite vers le backend.
 * En prod (Render) : origine du backend → les images sont chargées depuis le bon serveur.
 */
export function getMediaBaseUrl() {
  // Même variable que services/api.js (VITE_API_URL) — un nom différent ici
  // laissait cette fonction toujours vide en production, donc toute URL
  // relative retombait sur l'origine du frontend au lieu du backend.
  const apiBase = import.meta.env.VITE_API_URL || 'https://baaxil-xadiim.onrender.com'
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
 * @param {string|null|undefined} path - Chemin relatif (ex: photos_membres/xxx.jpg) ou URL absolue déjà complète
 *   (backend Django, ou stockage externe S3/R2 avec une éventuelle signature dans la query string)
 * @param {string} [query] - Query string optionnelle (ex: ?v=timestamp pour cache busting) — ignorée pour une
 *   URL absolue déjà signée : y ajouter un paramètre invaliderait la signature (SignatureDoesNotMatch).
 */
export function getMediaUrl(path, query = '') {
  if (!path) return null
  // Une URL absolue est déjà complète (backend Django ou stockage externe S3/R2) :
  // ne jamais en réécrire l'origine ni en tronquer la query string (signature R2/S3).
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const base = getMediaBaseUrl()
  const urlPath = path.startsWith('/') ? path : `/media/${path}`
  const q = query ? (query.startsWith('?') ? query : `?${query}`) : ''
  return base ? `${base}${urlPath}${q}` : `${urlPath}${q}`
}
