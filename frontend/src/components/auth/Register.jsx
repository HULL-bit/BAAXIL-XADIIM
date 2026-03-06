import { useState, useEffect } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, MenuItem, Link } from '@mui/material'
import logo from '/logo.jpeg'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
    telephone: '',
    adresse: '',
    role: 'membre',
    sexe: '',
    profession: '',
    categorie: '',
    numero_wave: '',
    numero_carte: '',
    regroupement: '',
    section: '',
    sous_section: '',
    dahira: '',
    specialite: '',
    biographie: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [sousSections, setSousSections] = useState([])
  const [dahiras, setDahiras] = useState([])

  const ROLES = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'membre', label: 'Membre' },
    { value: 'jewrine_conservatoire', label: 'Jewrine Conservatoire' },
    { value: 'jewrine_finance', label: 'Jewrine Finance' },
    { value: 'jewrine_culturelle', label: 'Jewrine Culturelle' },
    { value: 'jewrine_sociale', label: 'Jewrine Sociale' },
    { value: 'jewrine_communication', label: 'Jewrine Communication' },
    { value: 'jewrine_organisation', label: 'Jewrine Organisation' },
  ]

  const SEXES = [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' },
  ]

  const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

  useEffect(() => {
    // Charger la structure Ahibahil Khadim pour permettre le rattachement dès l'inscription
    Promise.all([
      api.get('/organisation/regroupements/').then(({ data }) => data.results || data || []),
      api.get('/organisation/sections/').then(({ data }) => data.results || data || []),
      api.get('/organisation/sous-sections/').then(({ data }) => data.results || data || []),
      api.get('/organisation/dahiras/').then(({ data }) => data.results || data || []),
    ])
      .then(([reg, sec, ss, dah]) => {
        setRegroupements(Array.isArray(reg) ? reg : [])
        setSections(Array.isArray(sec) ? sec : [])
        setSousSections(Array.isArray(ss) ? ss : [])
        setDahiras(Array.isArray(dah) ? dah : [])
      })
      .catch(() => {
        setRegroupements([])
        setSections([])
        setSousSections([])
        setDahiras([])
      })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setFieldErrors((fe) => ({ ...fe, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errors = {}
    if (!form.username) errors.username = "Nom d'utilisateur requis."
    if (!form.email) errors.email = 'Email requis.'
    if (!form.password) errors.password = 'Mot de passe requis.'
    if (form.password && form.password.length < 8) errors.password = 'Le mot de passe doit contenir au moins 8 caractères.'
    if (!form.password_confirmation) errors.password_confirmation = 'Confirmation requise.'
    if (form.password && form.password_confirmation && form.password !== form.password_confirmation) {
      errors.password_confirmation = 'Les deux mots de passe ne correspondent pas.'
    }
    if (!form.sexe) errors.sexe = 'Sexe requis.'
    if (!form.categorie) errors.categorie = 'Catégorie requise.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Veuillez corriger les champs en rouge.')
      return
    }
    setLoading(true)
    try {
      const { password_confirmation, ...rawPayload } = form
      const toId = (v) => (v === '' || v === undefined || v === null ? null : Number(v) || v)
      const payload = {
        ...rawPayload,
        regroupement: toId(rawPayload.regroupement),
        section: toId(rawPayload.section),
        sous_section: toId(rawPayload.sous_section),
        dahira: toId(rawPayload.dahira),
      }
      await register(payload)
      navigate('/login')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const apiFieldErrors = {}
        Object.entries(data).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            apiFieldErrors[key] = String(value[0])
          } else if (typeof value === 'string') {
            apiFieldErrors[key] = value
          }
        })
        setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }))
        setError('Veuillez corriger les champs en rouge.')
      } else {
        const msg = data ? (typeof data === 'object' ? JSON.stringify(data) : data) : "Erreur d'inscription"
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box className="bg-auth bg-pattern" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card
        className="glass-card"
        sx={{
          maxWidth: 500,
          width: '100%',
          borderLeft: '4px solid #2DA9E1',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(45, 169, 225, 0.25)',
          transition: 'transform 0.35s ease, box-shadow 0.35s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 56px rgba(15, 77, 113, 0.35)',
          },
        }}
      >
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: 72 }} />
            <Typography
              variant="h5"
              className="title-script"
              sx={{ mt: 1, color: '#2DA9E1' }}
            >
              Inscription
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              name="username"
              label="Nom d'utilisateur"
              value={form.username}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.username}
              helperText={fieldErrors.username || ''}
            />
            <TextField
              fullWidth
              name="email"
              type="email"
              label="Email"
              value={form.email}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email || ''}
            />
            <TextField
              fullWidth
              name="password"
              type="password"
              label="Mot de passe"
              value={form.password}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password || 'Minimum 8 caractères'}
            />
            <TextField
              fullWidth
              name="password_confirmation"
              type="password"
              label="Confirmation du mot de passe"
              value={form.password_confirmation}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.password_confirmation}
              helperText={fieldErrors.password_confirmation || ''}
            />
            <TextField fullWidth name="first_name" label="Prénom" value={form.first_name} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField fullWidth name="last_name" label="Nom" value={form.last_name} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField fullWidth name="telephone" label="Téléphone" value={form.telephone} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField fullWidth name="adresse" label="Adresse" value={form.adresse} onChange={handleChange} margin="dense" multiline sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField
              fullWidth
              name="numero_carte"
              label="Numéro de carte membre"
              value={form.numero_carte}
              onChange={handleChange}
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              name="numero_wave"
              label="Numéro Wave"
              value={form.numero_wave}
              onChange={handleChange}
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              name="groupe_sanguin"
              select
              label="Groupe sanguin"
              value={form.groupe_sanguin || ''}
              onChange={handleChange}
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">— Non renseigné —</MenuItem>
              {GROUPES_SANGUINS.map((g) => (
                <MenuItem key={g} value={g}>{g}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              name="sexe"
              select
              label="Sexe"
              value={form.sexe}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.sexe}
              helperText={fieldErrors.sexe || ''}
            >
              {SEXES.map((s) => (
                <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              name="profession"
              label="Profession"
              value={form.profession}
              onChange={handleChange}
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              name="categorie"
              select
              label="Catégorie"
              value={form.categorie}
              onChange={handleChange}
              margin="dense"
              required
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              error={!!fieldErrors.categorie}
              helperText={fieldErrors.categorie || 'Élève, Étudiant ou Professionnel'}
            >
              <MenuItem value="">— Aucune —</MenuItem>
              <MenuItem value="eleve">Élève</MenuItem>
              <MenuItem value="etudiant">Étudiant</MenuItem>
              <MenuItem value="professionnel">Professionnel</MenuItem>
            </TextField>
            <TextField
              fullWidth
              name="regroupement"
              select
              label="Regroupement"
              value={form.regroupement}
              onChange={(e) =>
                handleChange({
                  target: { name: 'regroupement', value: e.target.value || '' },
                }) || setForm((f) => ({ ...f, section: '', sous_section: '', dahira: '' }))
              }
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">— Aucun —</MenuItem>
              {regroupements.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.nom || r.label || `Regroupement ${r.id}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              name="section"
              select
              label="Section"
              value={form.section}
              onChange={(e) =>
                handleChange({
                  target: { name: 'section', value: e.target.value || '' },
                }) || setForm((f) => ({ ...f, sous_section: '', dahira: '' }))
              }
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">— Aucune —</MenuItem>
              {sections
                .filter((s) => !form.regroupement || String(s.regroupement) === String(form.regroupement))
                .map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nom || s.label || `Section ${s.id}`}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              fullWidth
              name="sous_section"
              select
              label="Sous-section"
              value={form.sous_section}
              onChange={(e) =>
                handleChange({
                  target: { name: 'sous_section', value: e.target.value || '' },
                }) || setForm((f) => ({ ...f, dahira: '' }))
              }
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">— Aucune —</MenuItem>
              {sousSections
                .filter((ss) => !form.section || String(ss.section) === String(form.section))
                .map((ss) => (
                  <MenuItem key={ss.id} value={ss.id}>
                    {ss.label || ss.nom || `Sous-section ${ss.id}`}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              fullWidth
              name="dahira"
              select
              label="Dahira"
              value={form.dahira}
              onChange={handleChange}
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">— Aucun —</MenuItem>
              {dahiras
                .filter((d) => !form.sous_section || String(d.sous_section) === String(form.sous_section))
                .map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.nom || d.label || `Dahira ${d.id}`}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              fullWidth
              name="specialite"
              label="Spécialité (optionnel)"
              value={form.specialite}
              onChange={handleChange}
              margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              name="biographie"
              label="Présentation / Biographie (optionnel)"
              value={form.biographie}
              onChange={handleChange}
              margin="dense"
              multiline
              minRows={3}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField fullWidth name="role" select label="Rôle" value={form.role} onChange={handleChange} margin="dense" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 2,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2DA9E1 0%, #0F4D71 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0F4D71 0%, #2DA9E1 100%)',
                  transform: 'translateY(-1px)',
                },
              }}
              disabled={loading}
            >
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>
          </form>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center', mt: 2 }}>
            Déjà inscrit ?{' '}
            <Link
              component={RouterLink}
              to="/login"
              underline="hover"
              sx={{ color: '#2DA9E1', fontWeight: 600 }}
            >
              Se connecter
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ color: '#1A1A1A', textAlign: 'center', mt: 1 }}>
            <Link
              component={RouterLink}
              to="/accueil"
              underline="hover"
              sx={{ color: '#2DA9E1' }}
            >
              ← Retour à l'accueil
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
