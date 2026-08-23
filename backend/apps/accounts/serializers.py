from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ProfilComplementaire, Badge, AttributionBadge, HistoriqueConnexion, JournalAction

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Représentation légère pour les sélecteurs de membres (formulaires, filtres) :
    évite de transférer le profil complet (photo, bio, etc.) de centaines de membres
    juste pour peupler une liste déroulante."""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'sexe', 'role']


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    regroupement_nom = serializers.CharField(source='regroupement.nom', read_only=True)
    section_nom = serializers.CharField(source='section.nom', read_only=True)
    sous_section_label = serializers.SerializerMethodField()
    dahira_nom = serializers.CharField(source='dahira.nom', read_only=True)

    def get_sous_section_label(self, obj):
        if not obj.sous_section_id:
            return None
        return str(obj.sous_section) if obj.sous_section else None

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        # Si None ou chaîne vide, utiliser le défaut
        if value is None or (isinstance(value, str) and not value.strip()):
            return 'professionnel'
        
        # Normaliser la valeur
        value_normalized = str(value).strip().lower()
        
        # Gérer les variations d'orthographe
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        
        # Vérifier que c'est une valeur valide et la retourner telle quelle
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            return value_normalized
        
        # Si invalide, utiliser le défaut
        return 'professionnel'

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'groupe_sanguin', 'annee_naissance',
            'role', 'role_display', 'photo',
            'regroupement', 'regroupement_nom', 'section', 'section_nom',
            'sous_section', 'sous_section_label', 'dahira', 'dahira_nom',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte', 'numero_cni',
            'montant_cotisation',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
            'niveau_acces',
            'membres_lecture', 'membres_ajout', 'membres_modification', 'membres_suppression',
            'finance_lecture', 'finance_ajout', 'finance_modification', 'finance_suppression', 'finance_validation',
            'synthese_nationale',
        ]
        read_only_fields = ['date_inscription', 'cotisations_payees', 'chapitres_lus', 'evenements_participes', 'regroupement_nom', 'section_nom', 'sous_section_label', 'dahira_nom']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    # L'email n'est pas obligatoire pour s'inscrire (beaucoup de membres n'en ont pas) ;
    # explicite ici pour ne pas dépendre du comportement implicite du modèle.
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        # Si None ou chaîne vide, utiliser le défaut
        if value is None or (isinstance(value, str) and not value.strip()):
            return 'professionnel'
        
        # Normaliser la valeur
        value_normalized = str(value).strip().lower()
        
        # Gérer les variations d'orthographe
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        
        # Vérifier que c'est une valeur valide et la retourner telle quelle
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            return value_normalized
        
        # Si invalide, utiliser le défaut
        return 'professionnel'

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'groupe_sanguin', 'annee_naissance',
            'role', 'numero_wave', 'numero_carte', 'numero_cni', 'montant_cotisation',
            'regroupement', 'section', 'sous_section', 'dahira',
            'specialite', 'biographie',
        ]

    def create(self, validated_data):
        from .permissions import apply_role_preset

        password = validated_data.pop('password')
        user = User(**validated_data)
        # Si on crée un admin via l'API, on lui donne aussi les droits staff
        if user.role == 'admin':
            user.is_staff = True
        else:
            # Le rôle choisi pré-remplit les droits individuels (préréglage hérité
            # par tout le monde ayant ce rôle) — ajustable ensuite par personne.
            apply_role_preset(user, user.role)
        user.set_password(password)
        user.save()
        return user


class UserMeSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    categorie = serializers.CharField(required=False, allow_blank=True, allow_null=True, read_only=False)
    
    # Add organization name fields for frontend
    regroupement_nom = serializers.CharField(source='regroupement.nom', read_only=True)
    section_nom = serializers.CharField(source='section.nom', read_only=True)
    sous_section_label = serializers.SerializerMethodField()
    dahira_nom = serializers.CharField(source='dahira.nom', read_only=True)
    
    def get_sous_section_label(self, obj):
        if not obj.sous_section_id:
            return None
        return str(obj.sous_section) if obj.sous_section else None

    def validate_categorie(self, value):
        """Normaliser et valider la catégorie"""
        if value is None or (isinstance(value, str) and not value.strip()):
            return 'professionnel'
        value_normalized = str(value).strip().lower()
        if value_normalized == 'professionel':
            value_normalized = 'professionnel'
        valid_categories = ['eleve', 'etudiant', 'professionnel']
        if value_normalized in valid_categories:
            return value_normalized
        return 'professionnel'
    
    def to_representation(self, instance):
        """Override pour gérer les cas où categorie pourrait ne pas exister dans la DB"""
        try:
            data = super().to_representation(instance)
        except Exception as e:
            # Si erreur lors de la sérialisation (ex: champ categorie n'existe pas), 
            # construire les données manuellement
            data = {}
            for field_name in self.Meta.fields:
                if field_name == 'categorie':
                    data['categorie'] = 'professionnel'
                elif field_name == 'role_display':
                    data['role_display'] = instance.get_role_display() if hasattr(instance, 'get_role_display') else ''
                else:
                    try:
                        data[field_name] = getattr(instance, field_name, None)
                    except:
                        pass
            return data
        
        # S'assurer que categorie a toujours une valeur valide
        categorie_value = data.get('categorie')
        if not categorie_value or categorie_value not in ['eleve', 'etudiant', 'professionnel']:
            data['categorie'] = 'professionnel'
        return data

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'telephone', 'adresse', 'sexe', 'profession', 'categorie',
            'groupe_sanguin', 'annee_naissance',
            'role', 'role_display', 'photo',
            'photo_updated_at',
            'regroupement', 'regroupement_nom',
            'section', 'section_nom',
            'sous_section', 'sous_section_label',
            'dahira', 'dahira_nom',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte', 'numero_cni',
            'montant_cotisation',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        read_only_fields = [
            'id', 'username', 'role', 'role_display', 'photo_updated_at', 'date_inscription',
            'est_actif', 'cotisations_payees', 'chapitres_lus', 'evenements_participes',
            'montant_cotisation',
        ]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'nom', 'description', 'categorie', 'icone', 'points']


class AttributionBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = AttributionBadge
        fields = ['id', 'badge', 'date_obtention', 'raison']


class HistoriqueConnexionSerializer(serializers.ModelSerializer):
    user_nom = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = HistoriqueConnexion
        fields = [
            'id', 'user', 'user_nom', 'username', 'date_connexion', 'adresse_ip',
            'user_agent', 'navigateur', 'systeme_exploitation', 'appareil',
            'localisation', 'succes',
        ]


class JournalActionSerializer(serializers.ModelSerializer):
    acteur_nom = serializers.CharField(source='acteur.get_full_name', read_only=True, default='')
    acteur_username = serializers.CharField(source='acteur.username', read_only=True, default='')
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = JournalAction
        fields = [
            'id', 'acteur', 'acteur_nom', 'acteur_username', 'action', 'action_display',
            'description', 'cible_type', 'cible_id', 'adresse_ip', 'user_agent', 'date_action',
        ]
