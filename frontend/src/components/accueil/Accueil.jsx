import { useState, useEffect } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Link,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Login as LoginIcon,
  ChevronLeft,
  ChevronRight,
  LocationOn,
  Email,
  Phone,
  Campaign,
  Info,
  Groups,
  Place,
  AutoStories,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '@mui/icons-material'
import { Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material'
import logo from '/logo.jpeg'

// Code couleur strict logo Ahibahil Khadim : bleu cercle, blanc, noir texte
const COLORS = {
  bleu: '#2DA9E1',       // bleu principal (cercle logo)
  bleuClair: '#66CCFF',
  bleuFonce: '#0F4D71',
  beige: '#F4FAFF',
  beigeClair: '#F9FCFF',
  noir: '#1A1A1A',      // noir texte logo
  blanc: '#FFFFFF',
  vert: '#2DA9E1',
  vertFonce: '#0F4D71',
}

const CAROUSEL_SLIDES = [
  { img: '/images/ahibahil/assemblee.jpeg', titre: 'Assemblée générale', description: 'Grand rassemblement Ahibahil Khadim sous la tente, en bleu et blanc.' },
  { img: '/images/ahibahil/sections.jpeg', titre: 'Sections & Dahira', description: 'Les sections et dahiras répartis dans les régions et la diaspora.' },
  { img: '/images/ahibahil/mot-president.jpeg', titre: 'Mot du président', description: 'S Baara Mbacke Mouhamed, Conseil exécutif 2024.' },
  { img: '/images/ahibahil/assemblee.jpeg', titre: 'Communauté', description: 'Membres en tenues bleu et blanc, au service du Din.' },
  { img: '/images/ahibahil/sections.jpeg', titre: 'Tradition et spiritualité', description: 'L\'héritage et les valeurs portées par Ahibahil Khadim.' },
]

export default function Accueil() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setCarouselIndex((i) => (i + 1) % CAROUSEL_SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  const navLinks = [
    { id: 'mot-president', label: 'Mot du président' },
    { id: 'actualites', label: 'Actualités' },
    { id: 'sections', label: 'Sections & Dahira' },
    { id: 'galerie', label: 'Galerie' },
    { id: 'mission', label: 'Mission' },
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: COLORS.beige }}>
      {/* Navbar accueil — design travaillé */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          background: `linear-gradient(135deg, ${COLORS.beige} 0%, ${COLORS.beigeClair} 50%, ${COLORS.beige} 100%)`,
          borderBottom: `3px solid ${COLORS.vert}`,
          boxShadow: `0 6px 28px ${COLORS.vert}25, 0 2px 10px rgba(0,0,0,0.08)`,
          backdropFilter: 'saturate(1.1)',
        }}
      >
        <Box
          sx={{
            maxWidth: 1500,
            mx: 'auto',
            px: { xs: 1, sm: 2, md: 4 },
            py: { xs: 1.2, sm: 1.5, md: 2.8 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: { xs: 0.5, sm: 1 },
            flexWrap: 'nowrap',
          }}
        >
          {/* Logo et titre */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.8, sm: 1.5, md: 2 }, flexShrink: 0, minWidth: 0 }}>
            <Box
              component="img"
              src={logo}
              alt="Ahibahil Khadim"
              sx={{
                height: { xs: 40, sm: 50, md: 72 },
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
                flexShrink: 0,
              }}
            />
            <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="h6"
                sx={{
                  color: COLORS.vert,
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 700,
                  fontSize: { sm: '1.1rem', md: '1.5rem' },
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Ahibahil Khadim
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: COLORS.vertFonce, 
                  fontWeight: 600, 
                  display: 'block',
                  fontSize: { sm: '0.7rem', md: '0.75rem' },
                }}
              >
                Wakeur Serigne Mouhamed Mbacke
              </Typography>
            </Box>
          </Box>

          {/* Navigation - Desktop */}
          {!isMobile && (
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                px: { sm: 1, md: 2 },
                py: 0.8,
                borderRadius: 2,
                bgcolor: `${COLORS.vert}08`,
                border: `1px solid ${COLORS.vert}66`,
                flexShrink: 0,
              }}
            >
              {navLinks.map(({ id, label }) => (
                <Link
                  key={id}
                  component="button"
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(id)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  sx={{
                    color: COLORS.vertFonce,
                    fontSize: { sm: '0.8rem', md: '0.9rem' },
                    px: { sm: 1, md: 1.5 },
                    py: 0.9,
                    borderRadius: 1,
                    textDecoration: 'none',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    '&:hover': { color: COLORS.vertFonce, bgcolor: `${COLORS.vert}20` },
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </Link>
              ))}
            </Box>
          )}

          {/* Boutons actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
            {/* Menu hamburger mobile */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileMenuOpen(true)}
                sx={{
                  color: COLORS.vert,
                  p: { xs: 0.5, sm: 1 },
                  '&:hover': { bgcolor: `${COLORS.vert}20` },
                }}
              >
                <MenuIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
              </IconButton>
            )}
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              size={isSmallMobile ? 'small' : 'medium'}
              startIcon={!isSmallMobile && <LoginIcon />}
              sx={{
                borderColor: COLORS.vert,
                color: COLORS.vert,
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.4, sm: 0.6 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                borderRadius: 2,
                minWidth: { xs: 'auto', sm: 'auto' },
                whiteSpace: 'nowrap',
                '&:hover': { borderColor: COLORS.vertFonce, bgcolor: `${COLORS.vert}15` },
              }}
            >
              {isSmallMobile ? 'Connexion' : 'Connexion'}
            </Button>
          </Box>
        </Box>

        {/* Drawer menu mobile */}
        <Drawer
          anchor="right"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: 280, sm: 320 },
              bgcolor: COLORS.beige,
              background: `linear-gradient(135deg, ${COLORS.beige} 0%, ${COLORS.beigeClair} 100%)`,
            },
          }}
        >
          <Box sx={{ p: 2, borderBottom: `2px solid ${COLORS.vert}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ color: COLORS.vert, fontWeight: 700 }}>
                Menu
              </Typography>
              <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: COLORS.vert }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <List sx={{ pt: 2 }}>
            {navLinks.map(({ id, label }) => (
              <ListItem key={id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setTimeout(() => {
                      const el = document.getElementById(id)
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }, 100)
                  }}
                  sx={{
                    color: COLORS.vertFonce,
                    fontWeight: 600,
                    py: 1.5,
                    px: 3,
                    '&:hover': {
                      bgcolor: `${COLORS.vert}20`,
                      color: COLORS.vertFonce,
                    },
                  }}
                >
                  <ListItemText primary={label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
      </Box>

      {/* Carrousel — images légèrement floues, titre en foncé, description par slide */}
      <Box sx={{ pt: { xs: 9, sm: 10, md: 12 }, position: 'relative' }}>
        <Box
          sx={{
            height: { xs: 520, sm: 680, md: 920 },
            minHeight: { xs: 480, sm: 640, md: 860 },
            overflow: 'hidden',
            position: 'relative',
            bgcolor: COLORS.vertFonce,
          }}
        >
          {CAROUSEL_SLIDES.map((slide, i) => (
            <Box
              key={slide.img}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: i === carouselIndex ? 1 : 0,
                transition: 'opacity 0.8s ease-in-out',
                zIndex: i === carouselIndex ? 1 : 0,
              }}
            >
              <Box
                component="img"
                src={slide.img}
                alt={slide.titre}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 25%',
                  filter: 'blur(6px)',
                  transform: 'scale(1.05)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, rgba(26,26,26,0.4) 0%, transparent 30%, transparent 70%, rgba(26,26,26,0.85) 100%)',
                  pointerEvents: 'none',
                }}
              />
            </Box>
          ))}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
              p: 3,
              textAlign: 'center',
              maxWidth: '90%',
            }}
          >
            <Typography
              component="h1"
              className="title-script"
              sx={{
                color: COLORS.beigeClair,
                textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
                fontSize: { xs: '3.4rem', sm: '4.2rem', md: '5.2rem', lg: '6.4rem' },
                mb: 0.75,
                lineHeight: 1.25,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Ahibahil Khadim
            </Typography>
            <Typography
              component="p"
              sx={{
                color: COLORS.blanc,
                fontFamily: '"Cormorant Garamond", serif',
                fontWeight: 900,
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                mb: 1.5,
              }}
            >
              Confédération des sections et dahiras au service du Din
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: COLORS.blanc,
                fontWeight: 800,
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
                fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                mb: 1,
              }}
            >
              {CAROUSEL_SLIDES[carouselIndex].titre}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: COLORS.beige,
                maxWidth: 560,
                mx: 'auto',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
              }}
            >
              {CAROUSEL_SLIDES[carouselIndex].description}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="secondary"
                size={isSmallMobile ? 'small' : 'medium'}
                onClick={() => {
                  const el = document.getElementById('mot-president')
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                sx={{
                  borderRadius: 999,
                  px: 3,
                  fontWeight: 600,
                }}
              >
                Découvrir
              </Button>
              <Button
                variant="outlined"
                size={isSmallMobile ? 'small' : 'medium'}
                onClick={() => {
                  const el = document.getElementById('sections')
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                sx={{
                  borderRadius: 999,
                  px: 3,
                  borderColor: COLORS.vert,
                  color: COLORS.blanc,
                  '&:hover': { borderColor: COLORS.vertFonce, bgcolor: `${COLORS.vert}20` },
                }}
              >
                Voir les sections
              </Button>
            </Box>
          </Box>
          <IconButton
            onClick={() => setCarouselIndex((i) => (i - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length)}
            sx={{
              position: 'absolute',
              left: { xs: 4, sm: 8 },
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              color: COLORS.blanc,
              bgcolor: 'rgba(0,0,0,0.45)',
              p: { xs: 0.5, sm: 1 },
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
          >
            <ChevronLeft sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
          </IconButton>
          <IconButton
            onClick={() => setCarouselIndex((i) => (i + 1) % CAROUSEL_SLIDES.length)}
            sx={{
              position: 'absolute',
              right: { xs: 4, sm: 8 },
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              color: COLORS.blanc,
              bgcolor: 'rgba(0,0,0,0.45)',
              p: { xs: 0.5, sm: 1 },
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
          >
            <ChevronRight sx={{ fontSize: { xs: 20, sm: 24, md: 28 } }} />
          </IconButton>
          <Box sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {CAROUSEL_SLIDES.map((_, i) => (
              <Box
                key={i}
                onClick={() => setCarouselIndex(i)}
                sx={{
                  width: i === carouselIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 1,
                  bgcolor: i === carouselIndex ? COLORS.vert : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6, md: 10 }, px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Mot du président */}
        <Box sx={{ mb: { xs: 6, sm: 8, md: 12 } }} id="mot-president">
          <Typography 
            variant="h4" 
            sx={{ 
              color: COLORS.vert, 
              mb: { xs: 2, sm: 3, md: 4 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            <Info sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} /> Mot du président
          </Typography>
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5, md: 5 },
              minHeight: { xs: 200, sm: 240, md: 280 },
              borderRadius: 3,
              borderLeft: `4px solid ${COLORS.vert}`,
              bgcolor: COLORS.beigeClair,
              backgroundImage: 'url(/images/ahibahil/mot-president.jpeg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                bgcolor: 'rgba(244,234,213,0.88)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: COLORS.vertFonce, 
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                }}
              >
                Au nom d’Allah, le Tout-Puissant
              </Typography>
              <Typography 
                sx={{ 
                  color: COLORS.noir, 
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                  lineHeight: 1.6,
                }}
              >
                Au nom d’Allah, le Tout-Puissant, nous rendons grâce de nous avoir permis d’assister à ces moments bénis. 
                Ces rencontres sont d’une importance capitale, car elles nous offrent l’occasion de faire le point sur l’état 
                d’avancement du Dahira Ahibahil Khadim.
              </Typography>
              <Typography 
                sx={{ 
                  color: COLORS.noir,
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                  lineHeight: 1.6,
                }}
              >
                Avant toute chose, nous réaffirmons notre engagement indéfectible et notre fidélité envers vous, Cheikh Moustapha 
                Mouhamed Mbacké. Nous implorons la miséricorde d’Allah ainsi que les bénédictions de Cheikh Ahmadou Bamba pour nous 
                accompagner dans notre mission.
              </Typography>
              <Typography 
                sx={{ 
                  color: COLORS.noir,
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                  lineHeight: 1.6,
                  mt: 1.5,
                }}
              >
                Je tiens à informer tous les talibés que ceux qui m’accompagnent sont des hommes dévoués, sincères et courageux. 
                Le chemin n’a pas été facile au début, mais aujourd’hui nous avons franchi une étape décisive où chacun peut 
                constater les fruits du travail accompli. Nous remercions encore une fois Allah, et nous exprimons toute notre 
                gratitude à l’ensemble des membres ici présents.
              </Typography>
              <Typography 
                sx={{ 
                  color: COLORS.vertFonce,
                  fontWeight: 600,
                  mt: 2,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }}
              >
                S Baara Mbacke Mouhamed — Conseil exécutif 2024
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Actualités et événements */}
        <Box sx={{ mb: { xs: 6, sm: 8, md: 12 } }} id="actualites">
          <Typography 
            variant="h4" 
            sx={{ 
              color: COLORS.vert, 
              mb: { xs: 2, sm: 3, md: 4 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            <Campaign sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} /> Actualités et événements
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 2, md: 2 }}>
            {[
              { titre: 'Rappels religieux', texte: 'Restez informé des derniers enseignements et rappels religieux partagés par le Dahira.' },
              { titre: 'Conférences & rencontres', texte: 'Rejoignez-nous lors de nos conférences, réunions et grandes rencontres communautaires.' },
              { titre: 'Actions sociales', texte: 'Suivez les actions sociales menées dans les différentes sections et dahiras.' },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ borderLeft: `4px solid ${COLORS.vert}`, borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: COLORS.vert }}>{item.titre}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.texte}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Sections & Dahira */}
        <Box
          sx={{
            mb: { xs: 6, sm: 8, md: 12 },
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            minHeight: { xs: 300, sm: 360, md: 440 },
            backgroundImage: 'url(/images/ahibahil/sections.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: `0 12px 40px ${COLORS.vert}30`,
          }}
          id="sections"
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(15,77,113,0.82)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: { xs: 3, sm: 4, md: 6 },
              textAlign: 'center',
            }}
          >
            <Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: COLORS.blanc, 
                  fontFamily: '"Dancing Script", serif', 
                  fontWeight: 700, 
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.5rem' },
                }}
              >
                Sections & Dahira
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: COLORS.beigeClair, 
                  fontWeight: 600, 
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
                }}
              >
                Une organisation structurée
              </Typography>
              <Typography 
                sx={{ 
                  color: COLORS.beige, 
                  maxWidth: 640, 
                  mx: 'auto',
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                  lineHeight: 1.6,
                  px: { xs: 1, sm: 0 },
                }}
              >
                Les sections Ahibahil Khadim sont composées de plusieurs dahiras, réparties dans les différentes régions du Sénégal 
                et dans la diaspora. Chaque section est organisée en sous-sections hommes et femmes, afin de mieux accompagner 
                l&apos;ensemble des talibés et de coordonner les actions de terrain.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Participation */}
        <Box sx={{ mb: { xs: 6, sm: 8, md: 12 } }} id="participation">
          <Typography
            variant="h4"
            sx={{
              color: COLORS.vert,
              mb: { xs: 2, sm: 3, md: 4 },
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            Participation
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
            <Grid item xs={12} md={7}>
              <Box
                sx={{
                  p: { xs: 2.5, sm: 3, md: 4 },
                  borderRadius: 3,
                  borderLeft: `4px solid ${COLORS.vert}`,
                  bgcolor: COLORS.beigeClair,
                  boxShadow: `0 8px 28px ${COLORS.vert}18`,
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: COLORS.vertFonce, 
                    mb: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                  }}
                >
                  S&apos;engager aux côtés d&apos;Ahibahil Khadim
                </Typography>
                <Typography 
                  sx={{ 
                    color: COLORS.noir, 
                    mb: { xs: 1.5, sm: 1.5 },
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                    lineHeight: 1.6,
                  }}
                >
                  En rejoignant un dahira ou une section, chaque talibé participe à la diffusion des enseignements, à 
                  l&apos;organisation des événements et au soutien des actions sociales. Votre participation renforce notre communauté 
                  et nos valeurs.
                </Typography>
                <Typography 
                  sx={{ 
                    color: COLORS.noir, 
                    mb: { xs: 1.5, sm: 1.5 },
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                    lineHeight: 1.6,
                  }}
                >
                  Que ce soit par la présence aux rencontres, la contribution financière ou le service (xidma), chacun peut apporter 
                  sa pierre à l&apos;édifice et contribuer à la réussite des missions confiées au Dahira.
                </Typography>
                <Typography 
                  sx={{ 
                    color: COLORS.noir,
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                    lineHeight: 1.6,
                  }}
                >
                  La plateforme numérique Ahibahil Khadim s&apos;inscrit dans cette continuité : offrir un outil moderne pour mieux
                  organiser les activités, suivre les cotisations SASSU WEERWI et renforcer les liens entre les membres, où qu&apos;ils se 
                  trouvent.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  height: '100%',
                  border: `2px solid ${COLORS.vert}`,
                  boxShadow: `0 10px 34px ${COLORS.vert}25`,
                }}
              >
                <CardMedia
                  component="img"
                  height="260"
                  image="/images/ahibahil/sections.jpeg"
                  alt="Moments de transmission à la Daara"
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography variant="subtitle1" sx={{ color: COLORS.vertFonce, fontWeight: 600, mb: 1 }}>
                    Une histoire qui continue de s&apos;écrire
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Chaque génération apporte sa contribution : en participant aux activités, en soutenant les projets et en portant les
                    valeurs d&apos;Ahibahil Khadim dans sa vie quotidienne.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Galerie Multimédia (mise en avant) */}
        <Box sx={{ mb: { xs: 6, sm: 8, md: 12 } }} id="realisations">
          <Typography 
            variant="h4" 
            sx={{ 
              color: COLORS.vert, 
              mb: { xs: 2, sm: 3, md: 4 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            <AutoStories sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} /> Galerie Multimédia
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
            {[
              { img: '/images/ahibahil/assemblee.jpeg', titre: 'Assemblée générale', desc: 'Grand rassemblement sous la tente, bleu et blanc.' },
              { img: '/images/ahibahil/sections.jpeg', titre: 'Sections & Dahira', desc: 'Régions du Sénégal et diaspora.' },
              { img: '/images/ahibahil/mot-president.jpeg', titre: 'Mot du président', desc: 'S Baara Mbacke Mouhamed, Conseil exécutif 2024.' },
              { img: '/images/ahibahil/assemblee.jpeg', titre: 'Récitation et dévotion', desc: 'Récitals et événements communautaires.' },
              { img: '/images/ahibahil/sections.jpeg', titre: 'Vie communautaire', desc: 'Membres de tous âges, sérénité et partage.' },
              { img: '/images/ahibahil/mot-president.jpeg', titre: 'Tradition et spiritualité', desc: 'L\'héritage Ahibahil Khadim.' },
            ].map((item, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card sx={{ borderRadius: 2, overflow: 'hidden', borderLeft: `4px solid ${COLORS.vert}`, boxShadow: `0 4px 20px ${COLORS.bleu}15`, minHeight: { xs: 280, sm: 300, md: 320 } }}>
                  <CardMedia
                    component="img"
                    height={{ xs: 200, sm: 220, md: 260 }}
                    image={item.img}
                    alt={item.titre}
                    sx={{ objectFit: 'cover', '&:hover': { transform: 'scale(1.02)' }, transition: 'transform 0.4s ease' }}
                  />
                  <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 2 } }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: COLORS.vert,
                        fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
                        mb: { xs: 0.5, sm: 1 },
                      }}
                    >
                      {item.titre}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.875rem' } }}
                    >
                      {item.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Galerie — encore plus d'images */}
        <Box sx={{ mb: { xs: 6, sm: 8, md: 12 } }} id="galerie">
          <Typography 
            variant="h4" 
            sx={{ 
              color: COLORS.vert, 
              mb: { xs: 2, sm: 3, md: 4 },
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            Galerie
          </Typography>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 2 }}>
            {['/images/ahibahil/assemblee.jpeg', '/images/ahibahil/sections.jpeg', '/images/ahibahil/mot-president.jpeg', '/images/ahibahil/assemblee.jpeg', '/images/ahibahil/sections.jpeg', '/images/ahibahil/mot-president.jpeg'].map((src, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Box
                  component="img"
                  src={src}
                  alt={`Galerie Ahibahil ${i + 1}`}
                  sx={{
                    width: '100%',
                    height: { xs: 140, sm: 180, md: 220 },
                    objectFit: 'cover',
                    borderRadius: 2,
                    border: `2px solid ${COLORS.vert}`,
                    boxShadow: `0 4px 12px ${COLORS.bleu}20`,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': { transform: 'scale(1.03)', boxShadow: `0 8px 24px ${COLORS.bleu}30` },
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Mission, Xidma & Kurel */}
        <Box sx={{ mb: { xs: 6, sm: 8, md: 12 } }} id="mission">
          <Typography 
            variant="h4" 
            sx={{ 
              color: COLORS.vert, 
              mb: { xs: 2, sm: 3, md: 4 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            <Groups sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} /> Mission, Xidma & Kurel
          </Typography>
          <Box
            sx={{
              p: { xs: 2.5, sm: 3.5, md: 5 },
              minHeight: { xs: 200, sm: 240, md: 280 },
              borderRadius: 3,
              borderLeft: `4px solid ${COLORS.vert}`,
              bgcolor: COLORS.beigeClair,
              backgroundImage: 'url(/images/ahibahil/assemblee.jpeg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                borderRadius: 3,
                bgcolor: 'rgba(244,234,213,0.85)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: COLORS.vertFonce, 
                  mb: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
                }}
              >
                Une communauté soudée au service du Dahira
              </Typography>
              <Typography 
                sx={{ 
                  color: COLORS.noir,
                  fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                  lineHeight: 1.6,
                  mb: { xs: 1.5, sm: 2 },
                }}
              >
                Xidma (ligéeyu tool yi) incarne le service désintéressé pour le Dahira et pour la communauté. Kurel anime les 
                évènements d&apos;Ahibahil Khadim et donne vie aux grands rassemblements, aux conférences et aux actions sociales. 
                Ensemble, ces pôles participent à faire rayonner le message de Cheikh Ahmadou Bamba.
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                size={isSmallMobile ? 'small' : 'medium'}
                sx={{ 
                  mt: { xs: 1.5, sm: 2 }, 
                  borderColor: COLORS.vert, 
                  color: COLORS.vert, 
                  fontSize: { xs: '0.8rem', sm: '0.875rem', md: '0.875rem' },
                  px: { xs: 1.5, sm: 2 },
                  '&:hover': { borderColor: COLORS.vertFonce, bgcolor: `${COLORS.vert}20` } 
                }}
              >
                Accéder à mon espace
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Section Localisation */}
        <Box sx={{ mb: { xs: 6, sm: 8, md: 12 } }} id="localisation">
          <Typography 
            variant="h4" 
            sx={{ 
              color: COLORS.vert, 
              mb: { xs: 2, sm: 3, md: 4 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
            }}
          >
            <Place sx={{ fontSize: { xs: 24, sm: 28, md: 32 } }} /> Localisation
          </Typography>
          <Typography 
            sx={{ 
              color: COLORS.noir, 
              mb: { xs: 2, sm: 2.5, md: 3 },
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
            }}
          >
            Mbacké Daru Salam, Sénégal
          </Typography>
          <Box
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              border: `2px solid ${COLORS.vert}`,
              boxShadow: `0 8px 24px ${COLORS.vert}20`,
              height: { xs: 300, sm: 400, md: 520 },
            }}
          >
            <iframe
              title="Carte Mbacké Daru Salam, Sénégal"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-15.95%2C14.75%2C-15.85%2C14.85%2C&layer=mapnik&marker=14.8%2C-15.9"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Box>
          <Link
            href="https://www.openstreetmap.org/?mlat=14.8&mlon=-15.9#map=14/14.8/-15.9"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 1.5, color: COLORS.vert, fontWeight: 600 }}
          >
            <LocationOn fontSize="small" /> Ouvrir dans OpenStreetMap
          </Link>
        </Box>
      </Container>

      {/* Footer Contact */}
      <Box
        component="footer"
        sx={{
          py: 6,
          px: 2,
          background: `linear-gradient(180deg, ${COLORS.vertFonce} 0%, ${COLORS.vert} 100%)`,
          color: COLORS.beige,
        }}
        id="contact"
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
          <Typography 
            variant="h5" 
            sx={{ 
              color: COLORS.blanc, 
              mb: { xs: 2, sm: 3, md: 4 }, 
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}
          >
            Contact
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
                <Place sx={{ color: COLORS.blanc, fontSize: { xs: 20, sm: 24, md: 28 } }} />
                <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' } }}>
                  Mbacké Daru Salam, Sénégal
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
                <Phone sx={{ color: COLORS.blanc, fontSize: { xs: 20, sm: 24, md: 28 } }} />
                <Link 
                  href="tel:+221331234567" 
                  sx={{ 
                    color: COLORS.beige, 
                    textDecoration: 'none',
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1rem' },
                  }}
                >
                  +221 33 123 45 67
                </Link>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
                <Email sx={{ color: COLORS.blanc, fontSize: { xs: 20, sm: 24, md: 28 } }} />
                <Link 
                  href="mailto:contact@ahibahilkhadim.org" 
                  sx={{ 
                    color: COLORS.beige, 
                    textDecoration: 'none',
                    fontSize: { xs: '0.85rem', sm: '0.9rem', md: '1rem' },
                    wordBreak: 'break-word',
                  }}
                >
                  contact@ahibahilkhadim.org
                </Link>
              </Box>
            </Grid>
          </Grid>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: { xs: 3, sm: 3.5, md: 4 }, 
              opacity: 0.9,
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.875rem' },
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            © {new Date().getFullYear()} Ahibahil Khadim — Plateforme de gestion des sections et dahiras
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
