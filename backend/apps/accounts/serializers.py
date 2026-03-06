from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ProfilComplementaire, Badge, AttributionBadge

User = get_user_model()


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
            'groupe_sanguin',
            'role', 'role_display', 'photo',
            'regroupement', 'regroupement_nom', 'section', 'section_nom',
            'sous_section', 'sous_section_label', 'dahira', 'dahira_nom',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        read_only_fields = ['date_inscription', 'cotisations_payees', 'chapitres_lus', 'evenements_participes', 'regroupement_nom', 'section_nom', 'sous_section_label', 'dahira_nom']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

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
            'groupe_sanguin',
            'role', 'numero_wave', 'numero_carte',
            'regroupement', 'section', 'sous_section', 'dahira',
            'specialite', 'biographie',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        # Si on crée un admin via l'API, on lui donne aussi les droits staff
        if user.role == 'admin':
            user.is_staff = True
        user.set_password(password)
        user.save()
        return user


class UserMeSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    categorie = serializers.CharField(required=False, allow_blank=True, allow_null=True, read_only=False)

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
            'groupe_sanguin',
            'role', 'role_display', 'photo',
            'photo_updated_at',
            'regroupement', 'section', 'sous_section', 'dahira',
            'date_inscription', 'est_actif', 'numero_wave', 'numero_carte',
            'specialite', 'biographie',
            'cotisations_payees', 'chapitres_lus', 'evenements_participes',
        ]
        read_only_fields = [
            'id', 'username', 'role', 'role_display', 'photo_updated_at', 'date_inscription',
            'est_actif', 'cotisations_payees', 'chapitres_lus', 'evenements_participes',
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
