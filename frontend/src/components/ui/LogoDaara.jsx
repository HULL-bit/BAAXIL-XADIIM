/**
 * Logo Ahibahil Khadim — SVG simplifié aux couleurs du logo (bleu #2DA9E1, or #F1C40F)
 */
const VERT = '#2DA9E1'
const OR = '#F1C40F'

export default function LogoDaara({ size = 44, collapsed = false }) {
  const h = collapsed ? 40 : size
  const w = collapsed ? 40 : size * 1.05
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={w}
      height={h}
      fill="none"
      aria-label="Ahibahil Khadim"
    >
      {/* Bordure or */}
      <circle cx="50" cy="50" r="42" stroke={OR} strokeWidth="4" fill="none" />
      {/* Croissant vert : grand cercle moins petit cercle décalé (evenodd) */}
      <path
        fillRule="evenodd"
        fill={VERT}
        d="M50 8 a42 42 0 1 1 0 84 a42 42 0 1 1 0-84 z M65 42 a28 28 0 1 0 0 56 a28 28 0 1 0 0-56 z"
      />
      {/* Étoile centrale or */}
      <path
        d="M50 34 L53 44 L64 44 L56 50 L59 60 L50 54 L41 60 L44 50 L36 44 L47 44 Z"
        fill={OR}
      />
    </svg>
  )
}
