import { useState, useEffect } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Link,
  IconButton,
  InputAdornment,
  Grid,
  Divider,
} from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import logo from '/logo.jpeg'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../styles/theme'
import api from '../../services/api'

const SEXES = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
]

const GROUPES_SANGUINS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function SectionTitle({ children }) {
  return (
    <Grid item xs={12}>
      <Divider sx={{ mt: 2, mb: 1 }}>
        <Typography variant="overline" sx={{ color: colors.vertFonce, fontWeight: 700, letterSpacing: 1 }}>
          {children}
        </Typography>
      </Divider>
    </Grid>
  )
}

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
    sexe: '',
    profession: '',
    categorie: '',
    numero_carte: '',
    numero_cni: '',
    groupe_sanguin: '',
    regroupement: '',
    section: '',
    dahira: '',
    specialite: '',
    biographie: '',
  })
  const [showUsername, setShowUsername] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [regroupements, setRegroupements] = useState([])
  const [sections, setSections] = useState([])
  const [sousSections, setSousSections] = useState([])
  const [dahiras, setDahiras] = useState([])

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
          maxWidth: 720,
          width: '100%',
          borderLeft: `4px solid ${colors.vert}`,
          overflow: 'hidden',
          boxShadow: `0 12px 48px ${colors.vert}40`,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Box component="img" src={logo} alt="Logo" sx={{ height: 72 }} />
            <Typography variant="h5" className="title-script" sx={{ mt: 1, color: colors.vert }}>
              Inscription
            </Typography>
            <Typography variant="body2" sx={{ color: colors.noir, opacity: 0.7 }}>
              Seuls le nom d'utilisateur et le mot de passe sont obligatoires — l'email est facultatif.
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <Grid container spacing={1.5}>
              <SectionTitle>Compte</SectionTitle>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="username"
                  type={showUsername ? 'text' : 'password'}
                  label="Nom d'utilisateur"
                  value={form.username}
                  onChange={handleChange}
                  required
                  error={!!fieldErrors.username}
                  helperText={fieldErrors.username || ''}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label={showUsername ? "Masquer le nom d'utilisateur" : "Afficher le nom d'utilisateur"} onClick={() => setShowUsername((v) => !v)} edge="end">
                          {showUsername ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="email"
                  type="email"
                  label="Email (optionnel)"
                  value={form.email}
                  onChange={handleChange}
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email || ''}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Mot de passe"
                  value={form.password}
                  onChange={handleChange}
                  required
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password || 'Minimum 8 caractères'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((v) => !v)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="password_confirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  label="Confirmation du mot de passe"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  required
                  error={!!fieldErrors.password_confirmation}
                  helperText={fieldErrors.password_confirmation || ''}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label={showPasswordConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPasswordConfirmation((v) => !v)} edge="end">
                          {showPasswordConfirmation ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <SectionTitle>Informations personnelles</SectionTitle>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="first_name" label="Prénom" value={form.first_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="last_name" label="Nom" value={form.last_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="telephone" label="Téléphone" value={form.telephone} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="sexe"
                  select
                  label="Sexe"
                  value={form.sexe}
                  onChange={handleChange}
                  required
                  error={!!fieldErrors.sexe}
                  helperText={fieldErrors.sexe || ''}
                >
                  {SEXES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="categorie"
                  select
                  label="Catégorie"
                  value={form.categorie}
                  onChange={handleChange}
                  required
                  error={!!fieldErrors.categorie}
                  helperText={fieldErrors.categorie || 'Élève, Étudiant ou Professionnel'}
                >
                  <MenuItem value="">— Aucune —</MenuItem>
                  <MenuItem value="eleve">Élève</MenuItem>
                  <MenuItem value="etudiant">Étudiant</MenuItem>
                  <MenuItem value="professionnel">Professionnel</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="profession" label="Profession" value={form.profession} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="groupe_sanguin"
                  select
                  label="Groupe sanguin"
                  value={form.groupe_sanguin || ''}
                  onChange={handleChange}
                >
                  <MenuItem value="">— Non renseigné —</MenuItem>
                  {GROUPES_SANGUINS.map((g) => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="numero_carte" label="Numéro de carte membre" value={form.numero_carte} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="numero_cni" label="Numéro de carte d'identité (CNI)" value={form.numero_cni} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="adresse" label="Adresse" value={form.adresse} onChange={handleChange} multiline />
              </Grid>

              <SectionTitle>Rattachement organisationnel</SectionTitle>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="regroupement"
                  select
                  label="Regroupement"
                  value={form.regroupement}
                  onChange={(e) =>
                    handleChange({ target: { name: 'regroupement', value: e.target.value || '' } }) ||
                    setForm((f) => ({ ...f, section: '', dahira: '' }))
                  }
                >
                  <MenuItem value="">— Aucun —</MenuItem>
                  {regroupements.map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.nom || r.label || `Regroupement ${r.id}`}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="section"
                  select
                  label="Section"
                  value={form.section}
                  onChange={(e) =>
                    handleChange({ target: { name: 'section', value: e.target.value || '' } }) ||
                    setForm((f) => ({ ...f, dahira: '' }))
                  }
                >
                  <MenuItem value="">— Aucune —</MenuItem>
                  {sections
                    .filter((s) => !form.regroupement || String(s.regroupement) === String(form.regroupement))
                    .map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.nom || s.label || `Section ${s.id}`}</MenuItem>
                    ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="dahira"
                  select
                  label="Dahira"
                  value={form.dahira}
                  onChange={handleChange}
                >
                  <MenuItem value="">— Aucun —</MenuItem>
                  {dahiras
                    .filter((d) => {
                      if (!form.section) return true
                      const ssIds = sousSections
                        .filter((ss) => String(ss.section) === String(form.section))
                        .map((ss) => String(ss.id))
                      return ssIds.includes(String(d.sous_section))
                    })
                    .map((d) => (
                      <MenuItem key={d.id} value={d.id}>{d.nom || d.label || `Dahira ${d.id}`}</MenuItem>
                    ))}
                </TextField>
              </Grid>

              <SectionTitle>Optionnel</SectionTitle>
              <Grid item xs={12}>
                <TextField fullWidth name="specialite" label="Spécialité (optionnel)" value={form.specialite} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="biographie" label="Présentation / Biographie (optionnel)" value={form.biographie} onChange={handleChange} multiline minRows={3} />
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                py: 1.5,
                fontWeight: 600,
                background: `linear-gradient(135deg, ${colors.vert} 0%, ${colors.vertFonce} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${colors.vertFonce} 0%, ${colors.vert} 100%)`,
                  transform: 'translateY(-1px)',
                },
              }}
              disabled={loading}
            >
              {loading ? 'Inscription...' : "S'inscrire"}
            </Button>
          </form>
          <Typography variant="body2" sx={{ color: colors.noir, textAlign: 'center', mt: 2 }}>
            Déjà inscrit ?{' '}
            <Link component={RouterLink} to="/login" underline="hover" sx={{ color: colors.vert, fontWeight: 600 }}>
              Se connecter
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ color: colors.noir, textAlign: 'center', mt: 1 }}>
            <Link component={RouterLink} to="/accueil" underline="hover" sx={{ color: colors.vert }}>
              ← Retour à l'accueil
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
