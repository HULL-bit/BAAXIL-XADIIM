import { Chip } from '@mui/material'
import { CheckCircle, HourglassEmpty, Warning, Cancel } from '@mui/icons-material'

const STATUT_CONFIG = {
  payee: { label: 'Payée', color: 'success', icon: <CheckCircle fontSize="small" /> },
  en_attente: { label: 'En attente', color: 'warning', icon: <HourglassEmpty fontSize="small" /> },
  retard: { label: 'En retard', color: 'error', icon: <Warning fontSize="small" /> },
  annulee: { label: 'Annulée', color: 'default', icon: <Cancel fontSize="small" /> },
}

export default function StatutCotisationChip({ statut, size = 'small' }) {
  const s = STATUT_CONFIG[statut] || { label: statut, color: 'default', icon: null }
  return <Chip label={s.label} color={s.color} size={size} icon={s.icon || undefined} sx={{ fontWeight: 600 }} />
}

export { STATUT_CONFIG }
