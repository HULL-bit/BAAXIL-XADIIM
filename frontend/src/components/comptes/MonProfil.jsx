import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Avatar,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
  CircularProgress,
  MenuItem,
} from '@mui/material'
import { Visibility, VisibilityOff, PhotoCamera, Save } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { getMediaUrl } from '../../services/media'

const COLORS = { vert: '#2DA9E1', or: '#2DA9E1', beige: '#F4FAFF', vertFonce: '#0F4D71' }

function getPhotoUrl(photo, photoUpdatedAt) {
  if (!photo) return null
  const query = photoUpdatedAt ? `v=${photoUpdatedAt}` : ''
  return getMediaUrl(photo, query)
}

export default function MonProfil() {
  const { user, refreshUser, setUserFromProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false })

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telephone: '',
    adresse: '',
    numero_wave: '',
    specialite: '',
    biographie: '',
    groupe_sanguin: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        telephone: user.telephone || '',
        adresse: user.adresse || '',
        numero_wave: user.numero_wave || '',
        specialite: user.specialite || '',
        biographie: user.biographie || '',
        groupe_sanguin: user.groupe_sanguin || '',
      })
      setPhotoPreview(getPhotoUrl(user.photo, user.photo_updated_at))
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Veuillez choisir une image (JPG, PNG).' })
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setMessage({ type: '', text: '' })
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      let updatedUser
      if (photoFile) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''))
        fd.append('photo', photoFile)
        const { data } = await api.patch('/auth/me/', fd)
        updatedUser = data
      } else {
        const { data } = await api.patch('/auth/me/', form)
        updatedUser = data
      }
      setUserFromProfile(updatedUser)
      await refreshUser()
      setPhotoFile(null)
      setMessage({ type: 'success', text: 'Profil enregistré.' })
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data || 'Erreur lors de l\'enregistrement.'
      setMessage({ type: 'error', text: typeof detail === 'object' ? JSON.stringify(detail) : detail })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.new_password_confirm) {
      setMessage({ type: 'error', text: 'Les deux nouveaux mots de passe ne correspondent pas.' })
      return
    }
    if (passwordForm.new_password.length < 8) {
      setMessage({ type: 'error', text: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
      return
    }
    setPasswordLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await api.post('/auth/me/change-password/', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      })
      setMessage({ type: 'success', text: 'Mot de passe modifié.' })
      setPasswordForm({ old_password: '', new_password: '', new_password_confirm: '' })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Ancien mot de passe incorrect ou erreur.'
      setMessage({ type: 'error', text: detail })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (!user) return null

  return (
    <Box>
      <Typography variant="h4" sx={{ color: COLORS.vert, fontWeight: 600 }} gutterBottom>
        Mon profil
      </Typography>
      <Typography variant="body2" sx={{ color: COLORS.vertFonce, mb: 3 }}>
        Modifiez vos informations, photo de profil et mot de passe.
      </Typography>

      {message.text && (
        <Alert severity={message.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Photo + infos */}
      <Card sx={{ mb: 3, borderLeft: `3px solid ${COLORS.or}`, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={photoPreview || getPhotoUrl(user?.photo, user?.photo_updated_at)}
                sx={{ width: 96, height: 96, bgcolor: COLORS.or, color: COLORS.vert, fontSize: '2rem' }}
              >
                {user.first_name?.[0]}{user.last_name?.[0]}
              </Avatar>
              <IconButton
                component="label"
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: COLORS.vert,
                  color: COLORS.beige,
                  '&:hover': { bgcolor: COLORS.vertFonce },
                }}
                size="small"
              >
                <PhotoCamera fontSize="small" />
                <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              </IconButton>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: COLORS.vertFonce }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.vert }}>{user.role_display || user.role}</Typography>
              <Typography variant="caption" sx={{ color: COLORS.vertFonce }}>{user.email}</Typography>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="first_name" label="Prénom" value={form.first_name} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="last_name" label="Nom" value={form.last_name} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="email" label="Email" type="email" value={form.email} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="telephone" label="Téléphone" value={form.telephone} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="numero_wave" label="Numéro Wave" value={form.numero_wave} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth name="specialite" label="Spécialité" value={form.specialite} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                name="groupe_sanguin"
                label="Groupe sanguin"
                value={form.groupe_sanguin || ''}
                onChange={handleChange}
              >
                <MenuItem value="">Non renseigné</MenuItem>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                  <MenuItem key={g} value={g}>{g}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth name="adresse" label="Adresse" value={form.adresse} onChange={handleChange} multiline rows={2} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth name="biographie" label="Biographie" value={form.biographie} onChange={handleChange} multiline rows={3} />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                disabled={loading}
                onClick={handleSaveProfile}
                sx={{
                  bgcolor: COLORS.vert,
                  '&:hover': { bgcolor: COLORS.vertFonce },
                }}
              >
                Enregistrer les modifications
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Changer le mot de passe */}
      <Card sx={{ borderLeft: `3px solid ${COLORS.or}`, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: COLORS.vert, mb: 2 }}>
            Changer le mot de passe
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type={showPassword.old ? 'text' : 'password'}
                label="Ancien mot de passe"
                value={passwordForm.old_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, old_password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => ({ ...s, old: !s.old }))} edge="end">
                        {showPassword.old ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type={showPassword.new ? 'text' : 'password'}
                label="Nouveau mot de passe"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new_password: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => ({ ...s, new: !s.new }))} edge="end">
                        {showPassword.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type={showPassword.confirm ? 'text' : 'password'}
                label="Confirmer le nouveau mot de passe"
                value={passwordForm.new_password_confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, new_password_confirm: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => ({ ...s, confirm: !s.confirm }))} edge="end">
                        {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={handleChangePassword}
                disabled={passwordLoading || !passwordForm.old_password || !passwordForm.new_password || !passwordForm.new_password_confirm}
                startIcon={passwordLoading ? <CircularProgress size={20} color="inherit" /> : null}
                sx={{ borderColor: COLORS.or, color: COLORS.vert, '&:hover': { borderColor: COLORS.vert, bgcolor: `${COLORS.or}20` } }}
              >
                {passwordLoading ? 'Modification…' : 'Modifier le mot de passe'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}
