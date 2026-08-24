from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from apps.accounts.permissions import IsSuperAdminCommunication, is_super_admin

from .models import Message, CategorieForum, SujetForum, ReponseForum, Notification, Canal, MessageCanal
from .serializers import (
    MessageSerializer, CategorieForumSerializer, SujetForumSerializer, ReponseForumSerializer,
    NotificationSerializer, CanalSerializer, MessageCanalSerializer,
)


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.none()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy pour faire un soft delete au lieu d'une suppression physique."""
        instance = self.get_object()
        user = request.user
        
        # Vérifier que l'utilisateur est soit l'expéditeur soit le destinataire
        if instance.expediteur != user and instance.destinataire != user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        # Marquer comme archivé selon le rôle de l'utilisateur
        if instance.expediteur == user:
            instance.est_archive_expediteur = True
            instance.save(update_fields=['est_archive_expediteur'])
        elif instance.destinataire == user:
            instance.est_archive_destinataire = True
            instance.save(update_fields=['est_archive_destinataire'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        user = self.request.user
        # Filtrer par contact si fourni dans les query params
        contact_id = self.request.query_params.get('contact_id')
        base = Message.objects.select_related('expediteur', 'destinataire')
        if contact_id:
            try:
                contact_id_int = int(contact_id)
                return base.filter(
                    Q(expediteur=user, destinataire_id=contact_id_int, est_archive_expediteur=False) |
                    Q(expediteur_id=contact_id_int, destinataire=user, est_archive_destinataire=False)
                ).order_by('date_envoi')
            except (ValueError, TypeError):
                pass
        return base.filter(
            Q(expediteur=user, est_archive_expediteur=False) |
            Q(destinataire=user, est_archive_destinataire=False)
        ).order_by('-date_envoi')
    
    def get_object(self):
        """Surcharger get_object pour permettre l'accès aux messages même lors de la suppression."""
        user = self.request.user
        pk = self.kwargs.get('pk')
        try:
            # Pour la suppression, permettre l'accès même si le message est archivé par l'autre utilisateur
            # mais toujours vérifier que l'utilisateur est soit l'expéditeur soit le destinataire
            return Message.objects.filter(
                Q(pk=pk) & (Q(expediteur=user) | Q(destinataire=user))
            ).get()
        except Message.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Message non trouvé.')

    @action(detail=False, methods=['get'])
    def destinataires(self, request):
        """Liste de tous les membres de la daara que l'utilisateur connecté peut choisir comme destinataires."""
        from apps.accounts.models import CustomUser
        user = request.user
        # Utiliser seulement is_active car est_actif peut ne pas être défini pour tous les utilisateurs
        qs = CustomUser.objects.filter(is_active=True).exclude(id=user.id).order_by('first_name', 'last_name')
        result = []
        for u in qs:
            photo = None
            photo_updated_at = None
            try:
                if u.photo:
                    photo = str(u.photo)
                    photo_updated_at = u.photo_updated_at.isoformat() if u.photo_updated_at else None
            except Exception:
                photo = None
                photo_updated_at = None
            
            result.append({
                'id': u.id,
                'first_name': u.first_name or '',
                'last_name': u.last_name or '',
                'email': u.email or '',
                'photo': photo,
                'photo_updated_at': photo_updated_at,
                'full_name': u.get_full_name() or f'{u.first_name or ""} {u.last_name or ""}'.strip() or u.email or f'Utilisateur #{u.id}'
            })
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Liste de tous les membres de la daara comme contacts (avec qui l'utilisateur a échangé ou non)."""
        from apps.accounts.models import CustomUser
        from django.db.models import Q, Count

        user = request.user
        
        try:
            # Récupérer tous les utilisateurs avec qui on a échangé
            messages_sent = Message.objects.filter(expediteur=user).values_list('destinataire_id', flat=True).distinct()
            messages_received = Message.objects.filter(destinataire=user).values_list('expediteur_id', flat=True).distinct()
            contact_ids = set(list(messages_sent) + list(messages_received))
        except Exception:
            contact_ids = set()
        
        # Récupérer TOUS les membres actifs de la daara pour permettre de communiquer avec n'importe qui
        # Utiliser seulement is_active car est_actif peut ne pas être défini pour tous les utilisateurs
        try:
            all_users = list(CustomUser.objects.filter(is_active=True).exclude(id=user.id).order_by('first_name', 'last_name'))
        except Exception as e:
            # En cas d'erreur, retourner une liste vide plutôt que de planter
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de la récupération des utilisateurs: {e}")
            return Response([])
        
        # Deux requêtes groupées au lieu de deux requêtes PAR CONTACT (~900 membres
        # aujourd'hui = jusqu'à ~1800 allers-retours réseau) : on récupère tous les
        # messages pertinents une seule fois, triés par date décroissante, puis on ne
        # garde que la première occurrence (= la plus récente) par contact.
        relevant_messages = Message.objects.filter(
            Q(expediteur=user, est_archive_expediteur=False) |
            Q(destinataire=user, est_archive_destinataire=False)
        ).order_by('-date_envoi')
        last_message_par_contact = {}
        for m in relevant_messages:
            contact_id = m.destinataire_id if m.expediteur_id == user.id else m.expediteur_id
            if contact_id not in last_message_par_contact:
                last_message_par_contact[contact_id] = m

        unread_par_contact = dict(
            Message.objects.filter(expediteur_id__in=[u.id for u in all_users], destinataire=user, est_lu=False, est_archive_destinataire=False)
            .values('expediteur_id')
            .annotate(nb=Count('id'))
            .values_list('expediteur_id', 'nb')
        )

        conversations = []
        for contact in all_users:
            last_message = last_message_par_contact.get(contact.id)
            unread_count = unread_par_contact.get(contact.id, 0)

            contact_name = contact.get_full_name() or f'{contact.first_name or ""} {contact.last_name or ""}'.strip() or contact.email or f'Utilisateur #{contact.id}'
            
            # Gérer la photo de manière sécurisée - retourner le nom du fichier pour que le frontend construise l'URL
            contact_photo = None
            contact_photo_updated_at = None
            try:
                if contact.photo:
                    # Retourner le chemin relatif du fichier (ex: photos_membres/xxx.jpg)
                    contact_photo = str(contact.photo)
                    contact_photo_updated_at = contact.photo_updated_at.isoformat() if contact.photo_updated_at else None
            except Exception as e:
                contact_photo = None
                contact_photo_updated_at = None
            
            # Sérialiser le dernier message si disponible
            last_message_data = None
            if last_message:
                try:
                    last_message_data = MessageSerializer(last_message).data
                except Exception as e:
                    last_message_data = None
            
            conversations.append({
                'contact_id': contact.id,
                'contact_name': contact_name,
                'contact_email': contact.email or '',
                'contact_photo': contact_photo,
                'contact_photo_updated_at': contact_photo_updated_at,
                'last_message': last_message_data,
                'unread_count': unread_count,
                'has_conversation': contact.id in contact_ids,
            })
        
        # Trier par dernier message (conversations avec messages en premier)
        # Les conversations avec messages récents apparaissent en premier
        try:
            def sort_key(x):
                if x['last_message'] and x['last_message'].get('date_envoi'):
                    return (x['last_message']['date_envoi'], x['has_conversation'])
                elif x['has_conversation']:
                    return ('', True)
                else:
                    return ('', False)
            
            conversations.sort(key=sort_key, reverse=True)
        except Exception as e:
            # En cas d'erreur de tri, retourner quand même les conversations non triées
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Erreur lors du tri des conversations: {e}")
        
        return Response(conversations)

    def create(self, request, *args, **kwargs):
        # Gérer les destinataires depuis request.data (peut être une liste ou une valeur multiple depuis FormData)
        destinataires = request.data.get('destinataires')
        if not destinataires:
            return Response(
                {'detail': 'Destinataires requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si c'est une liste depuis JSON, utiliser directement
        # Si c'est depuis FormData, getlist() retourne une liste
        if not isinstance(destinataires, list):
            # Si c'est une valeur unique depuis FormData
            if hasattr(request.data, 'getlist'):
                destinataires = request.data.getlist('destinataires')
            else:
                destinataires = [destinataires]
        
        # Normaliser: convertir en liste d'entiers uniques
        destinataires_ids = []
        for uid in destinataires:
            try:
                uid_int = int(uid)
                if uid_int not in destinataires_ids:
                    destinataires_ids.append(uid_int)
            except (ValueError, TypeError):
                continue
        
        if len(destinataires_ids) == 0:
            return Response(
                {'detail': 'Au moins un destinataire valide requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expediteur = request.user
        sujet = request.data.get('sujet', '')
        contenu = request.data.get('contenu', '')
        fichier_joint = request.FILES.get('fichier_joint')
        
        from apps.accounts.models import CustomUser
        import os
        from django.core.files.base import ContentFile
        
        # Si un fichier est fourni, lire son contenu une seule fois
        contenu_fichier = None
        nom_original = None
        if fichier_joint:
            fichier_joint.seek(0)
            contenu_fichier = fichier_joint.read()
            nom_original = fichier_joint.name
        
        created = []
        # Créer un message pour chaque destinataire unique
        for uid_int in destinataires_ids:
            # Ne pas permettre d'envoyer un message à soi-même
            if uid_int == expediteur.id:
                continue
            
            user = CustomUser.objects.filter(id=uid_int, is_active=True).first()
            if not user:
                continue
            
            # Si un fichier est fourni, créer une copie pour chaque message
            fichier_copie = None
            if contenu_fichier and nom_original:
                # Créer un nouveau fichier avec un nom unique
                nom_base, extension = os.path.splitext(nom_original)
                nouveau_nom = f"{nom_base}_{uid_int}{extension}"
                fichier_copie = ContentFile(contenu_fichier, name=nouveau_nom)
            
            # Créer un seul message pour ce destinataire
            msg = Message.objects.create(
                expediteur=expediteur,
                destinataire=user,
                sujet=sujet,
                contenu=contenu,
                fichier_joint=fichier_copie,
            )
            created.append(MessageSerializer(msg).data)
        
        if not created:
            return Response(
                {'detail': 'Aucun destinataire valide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si un seul message a été créé, retourner directement l'objet
        # Sinon, retourner un résumé avec le nombre de messages créés
        if len(created) == 1:
            return Response(created[0], status=status.HTTP_201_CREATED)
        else:
            return Response({
                'detail': f'{len(created)} messages envoyés.',
                'count': len(created),
                'messages': created
            }, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(expediteur=self.request.user)

    @action(detail=True, methods=['post'])
    def marquer_lu(self, request, pk=None):
        """Marquer un message comme lu par le destinataire."""
        msg = self.get_object()
        if msg.destinataire != request.user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        if not msg.est_lu:
            from django.utils import timezone
            msg.est_lu = True
            msg.date_lecture = timezone.now()
            msg.save(update_fields=['est_lu', 'date_lecture'])
        return Response(MessageSerializer(msg).data)

    @action(detail=False, methods=['post'], url_path='marquer_conversation_lue')
    def marquer_conversation_lue(self, request):
        """Marquer tous les messages non lus d'une conversation (contact_id) comme lus en une requête."""
        contact_id = request.data.get('contact_id')
        if contact_id is None:
            return Response({'detail': 'contact_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            contact_id = int(contact_id)
        except (TypeError, ValueError):
            return Response({'detail': 'contact_id invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone
        now = timezone.now()
        updated = Message.objects.filter(
            expediteur_id=contact_id,
            destinataire=request.user,
            est_lu=False,
        ).update(est_lu=True, date_lecture=now)
        return Response({'detail': f'{updated} message(s) marqué(s) comme lu(s).', 'count': updated})
    
    @action(detail=True, methods=['post'], url_path='supprimer')
    def supprimer(self, request, pk=None):
        """Supprimer un message (soft delete). L'expéditeur peut supprimer de son côté, le destinataire du sien."""
        msg = self.get_object()
        user = request.user
        
        # Vérifier que l'utilisateur est soit l'expéditeur soit le destinataire
        if msg.expediteur != user and msg.destinataire != user:
            return Response({'detail': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        # Marquer comme archivé selon le rôle de l'utilisateur
        if msg.expediteur == user:
            msg.est_archive_expediteur = True
            msg.save(update_fields=['est_archive_expediteur'])
        elif msg.destinataire == user:
            msg.est_archive_destinataire = True
            msg.save(update_fields=['est_archive_destinataire'])
        
        return Response(MessageSerializer(msg).data)


class CategorieForumViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CategorieForum.objects.filter(est_active=True)
    serializer_class = CategorieForumSerializer
    permission_classes = [IsAuthenticated]


class SujetForumViewSet(viewsets.ModelViewSet):
    queryset = SujetForum.objects.all().order_by('-est_epingle', '-date_modification')
    serializer_class = SujetForumSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['categorie', 'est_epingle']

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class ReponseForumViewSet(viewsets.ModelViewSet):
    queryset = ReponseForum.objects.all().order_by('date_creation')
    serializer_class = ReponseForumSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['sujet', 'auteur']

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Chaque utilisateur (y compris admin) ne voit que ses propres notifications = 1 message reçu par membre
        return Notification.objects.filter(utilisateur=self.request.user).select_related('utilisateur').order_by('-date_creation')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdminCommunication()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        Créer une notification :
        - si l'utilisateur est admin / staff : possibilité de cibler
          - tous les membres actifs (aucun destinataire précisé),
          - une sélection précise via une liste d'IDs 'destinataires',
          - ou tous les membres d'un canal via 'canal' (id du Canal).
        - sinon, fallback vers le comportement standard (NotificationSerializer).
        """
        if not (request.user.is_staff or getattr(request.user, 'role', None) == 'admin'):
            return super().create(request, *args, **kwargs)

        from apps.accounts.models import CustomUser

        type_notification = request.data.get('type_notification', 'info')
        titre = request.data.get('titre', '')
        message = request.data.get('message', '')
        lien = request.data.get('lien', '')
        if not titre or not message:
            return Response(
                {'detail': 'Titre et message requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        canal_id = request.data.get('canal')
        if canal_id:
            destinataires_qs = CustomUser.objects.filter(is_active=True, canaux__id=canal_id)
        else:
            # Destinataires (liste d'IDs). Si absent/vide -> tous les utilisateurs actifs.
            brut = request.data.get('destinataires')
            ids = []
            if brut:
                if isinstance(brut, (list, tuple)):
                    ids = brut
                else:
                    # Peut venir sous forme de string unique ou CSV
                    if isinstance(brut, str):
                        ids = [p for p in brut.replace(' ', '').split(',') if p]
                    else:
                        ids = [brut]
            try:
                ids = [int(x) for x in ids if str(x).isdigit()]
            except (TypeError, ValueError):
                ids = []

            if ids:
                destinataires_qs = CustomUser.objects.filter(is_active=True, id__in=ids)
            else:
                destinataires_qs = CustomUser.objects.filter(is_active=True)

        destinataires = list(destinataires_qs.values_list('id', flat=True))
        if not destinataires:
            return Response(
                {'detail': 'Aucun membre à notifier.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        batch = [
            Notification(
                utilisateur_id=uid,
                type_notification=type_notification,
                titre=titre,
                message=message,
                lien=lien or '',
            )
            for uid in destinataires
        ]
        Notification.objects.bulk_create(batch)
        nb_membres = len(batch)
        return Response(
            {'detail': f'1 message envoyé à {nb_membres} membre(s).', 'count': nb_membres},
            status=status.HTTP_201_CREATED
        )

    def perform_create(self, serializer):
        utilisateur_id = self.request.data.get('utilisateur')
        if utilisateur_id and (self.request.user.is_staff or self.request.user.role == 'admin'):
            from apps.accounts.models import CustomUser
            user = CustomUser.objects.filter(id=utilisateur_id).first()
            serializer.save(utilisateur=user or self.request.user)
        else:
            serializer.save(utilisateur=self.request.user)

    @action(detail=True, methods=['post'])
    def marquer_lue(self, request, pk=None):
        notif = self.get_object()
        from django.utils import timezone
        notif.est_lue = True
        notif.date_lecture = timezone.now()
        notif.save()
        return Response(NotificationSerializer(notif).data)


class CanalViewSet(viewsets.ModelViewSet):
    """
    Canaux de communication façon groupe (texte + appel vocal/vidéo Jitsi).
    Un canal n'est visible que par ses membres ; sa création et la gestion de
    ses membres restent réservées au Super Admin (même périmètre que les
    autres écritures du module communication, cf. IsSuperAdminCommunication).
    """
    queryset = Canal.objects.none()
    serializer_class = CanalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Canal.objects.filter(actif=True).select_related('createur').prefetch_related('membres')
        if is_super_admin(user):
            return qs.order_by('-date_creation')
        return qs.filter(membres=user).order_by('-date_creation')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'ajouter_membres', 'retirer_membre']:
            return [IsSuperAdminCommunication()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        canal = serializer.save(createur=self.request.user)
        canal.membres.add(self.request.user)

    def perform_destroy(self, instance):
        # Soft delete : un canal désactivé disparaît des listes sans effacer
        # l'historique des messages échangés dedans.
        instance.actif = False
        instance.save(update_fields=['actif'])

    @action(detail=True, methods=['post'])
    def ajouter_membres(self, request, pk=None):
        canal = self.get_object()
        from apps.accounts.models import CustomUser
        ids = request.data.get('membre_ids') or []
        membres = CustomUser.objects.filter(id__in=ids)
        canal.membres.add(*membres)
        return Response(CanalSerializer(canal).data)

    @action(detail=True, methods=['post'])
    def retirer_membre(self, request, pk=None):
        canal = self.get_object()
        membre_id = request.data.get('membre_id')
        canal.membres.remove(membre_id)
        return Response(CanalSerializer(canal).data)

    @action(detail=True, methods=['get'])
    def rejoindre(self, request, pk=None):
        """Révèle le salon Jitsi du canal — get_queryset() garantit déjà que
        seul un membre (ou le Super Admin) peut atteindre ce canal."""
        canal = self.get_object()
        return Response({'jitsi_domain': 'meet.jit.si', 'jitsi_room': canal.jitsi_room})


class MessageCanalViewSet(viewsets.ModelViewSet):
    queryset = MessageCanal.objects.none()
    serializer_class = MessageCanalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        mes_canaux = Canal.objects.all() if is_super_admin(user) else Canal.objects.filter(membres=user)
        base = (
            MessageCanal.objects.select_related('auteur', 'canal')
            .filter(canal__in=mes_canaux)
            .exclude(supprime_pour=user)
        )
        canal_id = self.request.query_params.get('canal')
        if canal_id:
            try:
                base = base.filter(canal_id=int(canal_id))
            except (TypeError, ValueError):
                return MessageCanal.objects.none()
        return base.order_by('date_envoi')

    def perform_create(self, serializer):
        user = self.request.user
        canal = serializer.validated_data.get('canal')
        if not (is_super_admin(user) or canal.membres.filter(id=user.id).exists()):
            raise PermissionDenied("Vous n'êtes pas membre de ce canal.")
        serializer.save(auteur=user)

    @action(detail=False, methods=['post'])
    def supprimer(self, request):
        """
        Suppression façon WhatsApp d'un ou plusieurs messages :
        - mode='moi' : masque les messages choisis pour l'utilisateur courant
          uniquement (les autres membres du canal continuent de les voir).
        - mode='tous' : efface le contenu pour tout le monde (laisse une trace
          « message supprimé ») — réservé à l'auteur du message ou au Super Admin ;
          les messages non éligibles dans la sélection sont simplement ignorés.
        """
        user = request.user
        ids = request.data.get('ids') or []
        mode = request.data.get('mode')
        if mode not in ('moi', 'tous'):
            return Response({'detail': "mode doit être 'moi' ou 'tous'."}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset().filter(id__in=ids)
        if mode == 'moi':
            for msg in qs:
                msg.supprime_pour.add(user)
            return Response({'detail': f'{qs.count()} message(s) masqué(s) pour vous.', 'count': qs.count()})

        eligible = qs if is_super_admin(user) else qs.filter(auteur=user)
        n = eligible.update(supprime_pour_tous=True, contenu='', fichier_joint='')
        return Response({'detail': f'{n} message(s) supprimé(s) pour tout le monde.', 'count': n})
