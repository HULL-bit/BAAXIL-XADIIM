from django.db import models
from apps.accounts.models import CustomUser


class TypeReunion(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    couleur = models.CharField(max_length=7, default='#2D5F3F')
    icone = models.CharField(max_length=50, blank=True)

    class Meta:
        verbose_name = 'Type de Réunion'
        verbose_name_plural = 'Types de Réunions'

    def __str__(self):
        return self.nom


class Reunion(models.Model):
    STATUT_CHOICES = [
        ('planifiee', 'Planifiée'),
        ('en_cours', 'En cours'),
        ('terminee', 'Terminée'),
        ('annulee', 'Annulée'),
        ('reportee', 'Reportée'),
    ]

    titre = models.CharField(max_length=200)
    type_reunion = models.ForeignKey(TypeReunion, on_delete=models.SET_NULL, null=True, blank=True)
    ordre_du_jour = models.TextField()
    date_reunion = models.DateTimeField()
    duree_prevue = models.IntegerField(help_text="Durée en minutes")
    lieu = models.CharField(max_length=200)
    lien_visio = models.URLField(blank=True)
    organisateur = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reunions_organisees')
    participants_requis = models.ManyToManyField(CustomUser, related_name='reunions_requises', blank=True)
    participants_optionnels = models.ManyToManyField(CustomUser, related_name='reunions_optionnelles', blank=True)
    participants_presents = models.ManyToManyField(CustomUser, related_name='reunions_presentes', blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='planifiee')
    documents_preparation = models.FileField(upload_to='reunions/documents/', null=True, blank=True)
    notes_preparation = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Réunion'
        verbose_name_plural = 'Réunions'
        ordering = ['-date_reunion']

    def __str__(self):
        return f"{self.titre} - {self.date_reunion.strftime('%d/%m/%Y %H:%M')}"


class ProcesVerbal(models.Model):
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('en_validation', 'En validation'),
        ('valide', 'Validé'),
        ('publie', 'Publié'),
    ]

    reunion = models.OneToOneField(Reunion, on_delete=models.CASCADE, related_name='pv')
    numero = models.CharField(max_length=50, unique=True)
    date_redaction = models.DateField()
    redige_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='pv_rediges')
    presents = models.TextField()
    absents = models.TextField(blank=True)
    excuses = models.TextField(blank=True)
    ordre_du_jour = models.TextField()
    discussions = models.TextField()
    decisions_prises = models.TextField()
    actions_a_realiser = models.TextField(blank=True)
    prochaine_reunion = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='brouillon')
    fichier_pdf = models.FileField(upload_to='pv/', null=True, blank=True)
    valide_par = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='pv_valides')
    date_validation = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Procès-Verbal'
        verbose_name_plural = 'Procès-Verbaux'
        ordering = ['-date_redaction']

    def __str__(self):
        return f"PV {self.numero} - {self.reunion.titre}"


class Decision(models.Model):
    STATUT_CHOICES = [
        ('proposee', 'Proposée'),
        ('en_discussion', 'En discussion'),
        ('approuvee', 'Approuvée'),
        ('rejetee', 'Rejetée'),
        ('en_attente', 'En attente'),
    ]

    titre = models.CharField(max_length=200)
    description = models.TextField()
    pv = models.ForeignKey(ProcesVerbal, on_delete=models.CASCADE, related_name='decisions', null=True, blank=True)
    reunion = models.ForeignKey(Reunion, on_delete=models.CASCADE, related_name='decisions', null=True, blank=True)
    propose_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='decisions_proposees')
    date_proposition = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='proposee')
    responsable_execution = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='decisions_responsables')
    echeance = models.DateField(null=True, blank=True)
    resultats = models.TextField(blank=True)
    date_execution = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = 'Décision'
        verbose_name_plural = 'Décisions'
        ordering = ['-date_proposition']

    def __str__(self):
        return f"{self.titre} ({self.get_statut_display()})"


class Vote(models.Model):
    TYPE_CHOICES = [
        ('simple', 'Majorité simple'),
        ('absolue', 'Majorité absolue'),
        ('qualifiee', 'Majorité qualifiée'),
        ('unanimite', 'Unanimité'),
    ]

    STATUT_CHOICES = [
        ('ouvert', 'Ouvert'),
        ('ferme', 'Fermé'),
        ('annule', 'Annulé'),
    ]

    titre = models.CharField(max_length=200)
    description = models.TextField()
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE, related_name='votes', null=True, blank=True)
    type_vote = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date_ouverture = models.DateTimeField()
    date_fermeture = models.DateTimeField()
    lance_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='votes_lances')
    votants_autorises = models.ManyToManyField(CustomUser, related_name='votes_autorises', blank=True)
    est_anonyme = models.BooleanField(default=False)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ouvert')
    resultat_pour = models.IntegerField(default=0)
    resultat_contre = models.IntegerField(default=0)
    resultat_abstention = models.IntegerField(default=0)

    class Meta:
        verbose_name = 'Vote'
        verbose_name_plural = 'Votes'
        ordering = ['-date_ouverture']

    def __str__(self):
        return f"{self.titre} ({self.get_statut_display()})"


class ChoixVote(models.Model):
    vote = models.ForeignKey(Vote, on_delete=models.CASCADE, related_name='choix')
    votant = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    choix = models.CharField(max_length=20, choices=[('pour', 'Pour'), ('contre', 'Contre'), ('abstention', 'Abstention')])
    date_vote = models.DateTimeField(auto_now_add=True)
    commentaire = models.TextField(blank=True)

    class Meta:
        unique_together = ['vote', 'votant']
        verbose_name = 'Choix de Vote'
        verbose_name_plural = 'Choix de Votes'

    def __str__(self):
        return f"{self.votant.get_full_name()} - {self.choix}"


class StructureOrganisation(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='sous_structures')
    responsable = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='structures_dirigees')
    membres = models.ManyToManyField(CustomUser, related_name='structures_membres', blank=True)
    ordre = models.IntegerField(default=0)
    couleur = models.CharField(max_length=7, default='#2D5F3F')

    class Meta:
        verbose_name = "Structure d'Organisation"
        verbose_name_plural = "Structures d'Organisation"
        ordering = ['ordre', 'nom']

    def __str__(self):
        return self.nom


class RapportActivite(models.Model):
    PERIODE_CHOICES = [
        ('mensuel', 'Mensuel'),
        ('trimestriel', 'Trimestriel'),
        ('semestriel', 'Semestriel'),
        ('annuel', 'Annuel'),
    ]

    titre = models.CharField(max_length=200)
    periode = models.CharField(max_length=20, choices=PERIODE_CHOICES)
    date_debut = models.DateField()
    date_fin = models.DateField()
    contenu = models.TextField()
    statistiques = models.TextField(blank=True)
    points_forts = models.TextField(blank=True)
    points_amelioration = models.TextField(blank=True)
    recommandations = models.TextField(blank=True)
    redige_par = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    date_redaction = models.DateField()
    fichier_pdf = models.FileField(upload_to='rapports/', null=True, blank=True)

    class Meta:
        verbose_name = "Rapport d'Activité"
        verbose_name_plural = "Rapports d'Activité"
        ordering = ['-date_fin']

    def __str__(self):
        return f"{self.titre} - {self.get_periode_display()}"


class Materiel(models.Model):
    """
    Matériel du daara (sono, micros, bâches, etc.).
    Permet de suivre les quantités et l'état pour avoir des statistiques simples.
    """

    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=100, blank=True, help_text="Ex: Sono, Micro, Bâche…")
    quantite_totale = models.PositiveIntegerField(default=0)
    quantite_disponible = models.PositiveIntegerField(default=0)
    quantite_defectueuse = models.PositiveIntegerField(default=0)
    lieu_stockage = models.CharField(max_length=200, blank=True, help_text="Ex: Daara, dépôt, salle…")
    date_acquisition = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    derniere_mise_a_jour = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Matériel"
        verbose_name_plural = "Matériels"
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.quantite_totale})"


class Regroupement(models.Model):
    """
    Regroupements de la confédération Ahibahil Khadim.
    Exemple : CHEIKH SI, SECTION YI, DIAMAHATOU MOURIDINA SADIKHINA, DIASPORA, ANSAROUDIIN.
    """

    nom = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Regroupement"
        verbose_name_plural = "Regroupements"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Section(models.Model):
    """
    Sections géographiques (Dakar, Touba, Diourbel, etc.) rattachées à un regroupement.
    """

    regroupement = models.ForeignKey(Regroupement, on_delete=models.CASCADE, related_name="sections")
    nom = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    ville = models.CharField(max_length=100, blank=True)
    pays = models.CharField(max_length=100, default="Sénégal")

    class Meta:
        verbose_name = "Section"
        verbose_name_plural = "Sections"
        unique_together = ["regroupement", "nom"]
        ordering = ["nom"]

    def __str__(self):
        return f"{self.nom} ({self.regroupement.nom})"


class SousSection(models.Model):
    """
    Sous-sections Homme / Femme à l'intérieur d'une section.
    """

    SEXE_CHOICES = [
        ("H", "Hommes"),
        ("F", "Femmes"),
    ]

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="sous_sections")
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES)

    class Meta:
        verbose_name = "Sous-section"
        verbose_name_plural = "Sous-sections"
        unique_together = ["section", "sexe"]

    def __str__(self):
        return f"{self.section.nom} - {self.get_sexe_display()}"


class Dahira(models.Model):
    """
    Dahira de base : Taif Thiaroye, Ansaroudine Keur Mbaye Fall, etc.
    """

    sous_section = models.ForeignKey(SousSection, on_delete=models.CASCADE, related_name="dahiras")
    nom = models.CharField(max_length=150)
    adresse = models.CharField(max_length=255, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    actif = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Dahira"
        verbose_name_plural = "Dahiras"
        unique_together = ["sous_section", "nom"]
        ordering = ["nom"]

    def __str__(self):
        return f"{self.nom} ({self.sous_section})"


class Famille(models.Model):
    """
    Famille interne pour la généalogie (parents, enfants, etc.).
    """

    nom = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Famille"
        verbose_name_plural = "Familles"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class LienFamilial(models.Model):
    """
    Lien membre <-> famille avec rôle (père, mère, enfant, autre).
    """

    ROLE_CHOICES = [
        ("pere", "Père"),
        ("mere", "Mère"),
        ("enfant", "Enfant"),
        ("autre", "Autre"),
    ]

    famille = models.ForeignKey(Famille, on_delete=models.CASCADE, related_name="liens")
    membre = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="liens_familiaux")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="autre")

    class Meta:
        verbose_name = "Lien familial"
        verbose_name_plural = "Liens familiaux"
        unique_together = ["famille", "membre"]

    def __str__(self):
        return f"{self.membre.get_full_name()} - {self.get_role_display()} ({self.famille.nom})"
