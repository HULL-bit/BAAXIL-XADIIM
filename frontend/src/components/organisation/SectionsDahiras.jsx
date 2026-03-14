import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { ExpandMore, AccountTree, Place, Groups } from '@mui/icons-material'
import api from '../../services/api'

const COLORS = { vert: '#2DA9E1', vertFonce: '#0F4D71' }

export default function SectionsDahiras() {
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [dahiras, setDahiras] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/organisation/regroupements/').then(({ data }) => data.results || data),
      api.get('/organisation/sections/').then(({ data }) => data.results || data),
      api.get('/organisation/dahiras/').then(({ data }) => data.results || data),
    ])
      .then(([reg, sec, dah]) => {
        setRegroupements(Array.isArray(reg) ? reg : [])
        setSections(Array.isArray(sec) ? sec : [])
        setDahiras(Array.isArray(dah) ? dah : [])
      })
      .catch(() => {
        setRegroupements([])
        setSections([])
        setDahiras([])
      })
      .finally(() => setLoading(false))
  }, [])

  const sectionsByRegroupement = (regId) => sections.filter((s) => s.regroupement === regId)
  const dahirasBySection = (sectionId) =>
    dahiras.filter((d) => {
      const ssId = d.sous_section
      const section = sections.find((s) => {
        const secId = typeof ssId === 'object' ? ssId.section : null
        return s.id === (secId || s.id) && s.id === sectionId
      })
      return section
    })

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
        <CircularProgress sx={{ color: COLORS.vert }} />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountTree /> Structure Ahibahil Khadim — Sections & Dahira
      </Typography>
      <Typography variant="body1" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Regroupements → Sections → Dahiras. Chaque section couvre une zone géographique (Dakar, Touba, diaspora…).
      </Typography>

      {regroupements.length === 0 ? (
        <Paper sx={{ p: 3, borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2 }}>
          <Typography color="text.secondary">
            Aucun regroupement configuré. Utilisez l’administration Django pour créer les regroupements, sections, sous-sections et dahiras.
          </Typography>
        </Paper>
      ) : (
        regroupements.map((reg) => {
          const secList = sectionsByRegroupement(reg.id)
          return (
            <Accordion
              key={reg.id}
              defaultExpanded={regroupements.length <= 2}
              sx={{
                mb: 1,
                borderRadius: 2,
                borderLeft: `4px solid ${COLORS.vert}`,
                '&:before': { display: 'none' },
                boxShadow: `0 2px 12px ${COLORS.vert}15`,
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: COLORS.vert }} />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Groups sx={{ color: COLORS.vert }} />
                  <Typography fontWeight={600} sx={{ color: COLORS.vertFonce }}>
                    {reg.nom}
                  </Typography>
                  {reg.code && <Chip size="small" label={reg.code} sx={{ bgcolor: `${COLORS.vert}18`, color: COLORS.vertFonce }} />}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {secList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Aucune section.</Typography>
                ) : (
                  secList.map((sec) => {
                    const dahList = dahirasBySection(sec.id)
                    return (
                      <Box key={sec.id} sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" sx={{ color: COLORS.vertFonce, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                          <Place fontSize="small" /> {sec.nom}
                          {sec.code && <Chip size="small" label={sec.code} sx={{ fontSize: '0.7rem' }} />}
                        </Typography>
                        <List dense disablePadding sx={{ pl: 2 }}>
                          {dahList.length === 0 ? (
                            <ListItem><ListItemText primary="Aucun dahira" primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} /></ListItem>
                          ) : (
                            dahList.map((d) => (
                              <ListItem key={d.id} sx={{ py: 0.25 }}>
                                <ListItemText
                                  primary={d.nom}
                                  secondary={d.ville || d.adresse}
                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                  secondaryTypographyProps={{ variant: 'caption' }}
                                />
                                {!d.actif && <Chip size="small" label="Inactif" color="default" sx={{ ml: 1 }} />}
                              </ListItem>
                            ))
                          )}
                        </List>
                      </Box>
                    )
                  })
                )}
              </AccordionDetails>
            </Accordion>
          )
        })
      )}
    </Box>
  )
}
