import type { Role, SessionMode } from "../../types";

export const roleLabels: Record<Role, string> = {
  "USER_SELF": "J’ai écrit",
  "USER_PEER": "L’autre personne a écrit"
};

export const messages = {
  "brand": {
    "name": "Flirto Guru",
    "tagline": "Nouvelle consultation"
  },
  "tabs": [
    {
      "to": "/app",
      "label": "Conseil"
    },
    {
      "to": "/paywall",
      "label": "Accès"
    },
    {
      "to": "/help",
      "label": "Aide"
    },
    {
      "to": "/app/profile",
      "label": "Profil"
    }
  ],
  "shell": {
    "logout": "Se déconnecter",
    "boot": "Ouverture de Flirto Guru...",
    "back": "Retour",
    "finishSession": "Terminer",
    "close": "Fermer",
    "retry": "Réessayer",
    "themeLight": "Thème clair",
    "themeDark": "Thème sombre"
  },
  "login": {
    "eyebrow": "Connexion",
    "title": "Se connecter",
    "body": "",
    "emailLabel": "Email",
    "emailPlaceholder": "you@example.com",
    "codeLabel": "Code e-mail",
    "codePlaceholder": "000000",
    "requestCode": "Recevoir le code →",
    "confirmCode": "Se connecter →",
    "resendCode": "Changer d’e-mail",
    "emailHint": "",
    "requestSuccess": "Code envoyé. Vérifie ton e-mail.",
    "requestError": "Impossible d’envoyer le code.",
    "confirmError": "Le code ne fonctionne pas."
  },
  "paywall": {
    "eyebrow": "Accès",
    "title": "Activation requise",
    "body": "Après le paiement, reviens ici et l’application mettra ton statut à jour.",
    "primaryCta": "Ouvrir le paiement",
    "activeTitle": "Accès actif",
    "activeBody": "Ton accès est lié à cet e-mail",
    "activeStatusLabel": "Accès actuel",
    "activeEmailLabel": "E-mail",
    "manageCta": "Gérer l’accès",
    "checkoutStarting": "Ouverture du paiement...",
    "checkoutError": "Impossible d’ouvrir le paiement. Réessaie.",
    "bullets": [
      "L’accès est lié à ton e-mail.",
      "Tu n’as pas besoin de te reconnecter après le paiement.",
      "Le support peut aider si quelque chose ne fonctionne pas."
    ],
    "checking": "Vérification de l’accès..."
  },
  "access": {
    "grace_period": {
      "title": "Prolonger l’accès",
      "body": "Ta période de grâce touche à sa fin.",
      "cta": "Prolonger"
    },
    "token_issued": {
      "title": "Accès accordé",
      "body": "Si tu viens de payer, ouvre le paiement puis reviens ici.",
      "cta": "Ouvrir l’accès"
    }
  },
  "home": {
    "eyebrow": "Conseil",
    "title": "",
    "body": "Ajoute le contexte et obtiens l’analyse directement dans le chat.",
    "opening": "Ouverture...",
    "startConsultation": "Nouvelle consultation",
    "startBody": "Ajoute une conversation, une capture ou un vocal pour obtenir une analyse, un plan et un brouillon de réponse.",
    "startCta": "Nouvelle consultation",
    "quickProfile": "Profil",
    "quickSupport": "Support",
    "quickHelp": "Aide",
    "pushTitle": "Te prévenir quand la réponse est prête ?",
    "pushBody": "Seulement les mises à jour importantes : réponse prête, accès et statut du compte.",
    "pushEnable": "Activer les notifications",
    "pushSkip": "Pas maintenant",
    "installTitle": "Installer sur l’écran d’accueil",
    "installBody": "L’app s’ouvre comme une application native et ne se perd pas dans les onglets.",
    "installAction": "Installer",
    "installIos": "Sur iPhone, ouvre Partager puis choisis Ajouter à l’écran d’accueil.",
    "installSteps": {
      "ios": {
        "title": "Installe d’abord Flirto Guru",
        "body": "Sur iPhone, ouvre Safari, touche Partager puis choisis Ajouter à l’écran d’accueil. L’app s’ouvrira comme une application native.",
        "action": "Installer"
      },
      "android": {
        "title": "Installe d’abord Flirto Guru",
        "body": "Ajoute l’app à ton écran d’accueil pour l’ouvrir plus vite et ne pas la perdre dans les onglets.",
        "action": "Installer"
      },
      "desktop": {
        "title": "Installe d’abord Flirto Guru",
        "body": "Utilise l’icône d’installation dans la barre d’adresse ou le menu du navigateur pour garder l’app à portée de clic.",
        "action": "Installer"
      }
    },
    "installAssist": {
      "ios": "Impossible d’ouvrir la feuille de partage. Ouvre Partager dans Safari puis choisis Ajouter à l’écran d’accueil.",
      "android": "Si la fenêtre d’installation ne s’est pas ouverte, utilise le menu du navigateur puis choisis Installer l’application.",
      "desktop": "Si la fenêtre d’installation ne s’est pas ouverte, utilise l’icône d’installation dans la barre d’adresse ou le menu du navigateur."
    },
    "statusTitle": "Statut d’accès",
    "statusFallback": "Actif",
    "accountTitle": "Compte",
    "resetTitle": "Réinitialiser les sessions actives",
    "resetBody": "Si une session inachevée est bloquée, ferme-la et recommence.",
    "resetCta": "Fermer les sessions",
    "resetSuccess": "Sessions actives fermées.",
    "resetEmpty": "Aucune session active.",
    "resetError": "Impossible de fermer les sessions.",
    "recentTitle": "Récent",
    "recentEmptyTitle": "L’historique apparaîtra ici",
    "recentEmptyBody": "Après les consultations terminées, les sessions récentes pourront être rouvertes ici.",
    "recentFallbackPreview": "Consultation ouverte récemment",
    "hoursAgo": "h",
    "daysAgo": "j",
    "onboardingSkip": "Ignorer",
    "onboardingNext": "Suivant",
    "onboardingStart": "Commencer",
    "onboardingSteps": [
      {
        "title": "Ajouter le contexte",
        "body": "Texte, capture ou note vocale. Le bot comprendra les rôles d’après le contexte."
      },
      {
        "title": "Appuie sur Terminé",
        "body": "Le chargement reste dans le chat et la réponse est préparée sans écran supplémentaire."
      },
      {
        "title": "Analyse dans le chat",
        "body": "La réponse principale est visible tout de suite, avec les détails sous les boutons."
      }
    ]
  },
  "session": {
    "composerPlaceholder": "Décris la situation ou colle la conversation...",
    "send": "Envoyer",
    "attach": "Pièce jointe",
    "attachImage": "Galerie",
    "attachCamera": "Caméra",
    "attachAudio": "Fichier audio",
    "attachVoice": "Note vocale",
    "roleTitle": "Qui a envoyé le message",
    "roleHint": "Ces détails sont envoyés avec le texte, les photos ou les vocaux.",
    "roleName": "Nom de l’auteur",
    "roleDate": "Date et heure",
    "roleApply": "Enregistrer",
    "batchMore": "+ Plus",
    "batchClose": "Terminé",
    "batchReady": "fragments · Prêt pour l’analyse",
    "confirmTitle": "Vérifier le contexte",
    "confirmHeading": "Vérifier le contexte",
    "confirmBody": "Vérifie rapidement que j’ai bien compris la situation et que rien ne manque.",
    "confirmYes": "Correct →",
    "confirmEdit": "Préciser",
    "confirmEditCancel": "Réduire",
    "confirmEditSend": "Envoyer",
    "confirmEditPlaceholder": "Que faut-il ajouter ou préciser ?",
    "generate": "Générer",
    "generateTitle": "Préparation du conseil",
    "generateBody": "Préparation de l’analyse",
    "generateHintMid": "Formulation du conseil...",
    "generateHintLate": "Presque prêt...",
    "resultTitle": "Analyse prête",
    "resultSubtitle": "Réponse principale d’abord, détails sous les boutons.",
    "refineTitle": "Affiner la réponse",
    "refinePlaceholder": "Par exemple : rends-la plus douce, sans question à la fin...",
    "refineSend": "Appliquer",
    "refinePresets": [
      "Plus doux",
      "Plus court",
      "Plus direct",
      "Autre option"
    ],
    "refineCustom": "Personnalisé",
    "finish": "Terminer la session",
    "support": "Contacter le support",
    "thinking": "Analyse du contexte...",
    "stageCollect": "Collecter le contexte",
    "stageGenerate": "Préparation de la réponse",
    "emptyChat": "Tes messages, captures et vocaux apparaîtront ici.",
    "emptyChatTitle": "Ajouter le contexte",
    "emptyChatBody": "Texte, capture de conversation ou vocal",
    "contextFallback": "Contexte",
    "confirmEyebrow": "Vérifier avant génération",
    "confirmContextTitle": "Contexte",
    "confirmTimelineBody": "Vérifie que l’ordre, les auteurs et les formulations correspondent à ce que tu as ajouté.",
    "confirmSimpleBody": "Vérifie que j’ai compris l’essentiel de la situation.",
    "confirmEmpty": "Le contexte semble vide. Reviens en arrière et ajoute des détails.",
    "confirmHelper": "S’il manque quelque chose, reviens en arrière et ajoute-le.",
    "fragmentOne": "fragment",
    "fragmentFew": "fragments",
    "fragmentMany": "fragments",
    "readyForAnalysis": "Prêt pour l’analyse",
    "screenshot": "Capture",
    "voiceNote": "Note vocale",
    "message": "Message",
    "userSelfShort": "Moi",
    "userPeerShort": "L’autre personne",
    "readOnly": "Cette session est en lecture seule.",
    "loadError": "Impossible de charger la session.",
    "imagePendingTag": "[IMAGE]",
    "voicePendingTag": "[VOCAL]",
    "uploadHint": "Ajoute le rôle et la date d’auteur si nécessaire.",
    "systemSaved": "Contexte ajouté.",
    "systemReady": "Contexte collecté.",
    "systemRefined": "Réponse mise à jour.",
    "sceneCollectTitle": "Nouvelle consultation",
    "sceneCollectSubtitle": "Analyse de situation",
    "voiceHoldToRecord": "Appuie pour enregistrer",
    "voiceRecording": "Enregistrement",
    "voiceDecodeError": "Impossible de transcrire le vocal.",
    "voiceCancelHint": "Balaye à gauche pour annuler",
    "voiceCancelReady": "Relâche pour annuler",
    "microphoneDenied": "Autorise l’accès au micro dans les réglages du navigateur.",
    "sessionExitTitle": "Interrompre la session ?",
    "sessionExitBody": "Le contexte non terminé sera perdu.",
    "share": "Partager",
    "newSession": "Nouvelle session",
    "copy": "Copier",
    "copied": "Copié",
    "copyInlineHint": "Bloc principal de réponse",
    "sessionMenu": "Paramètres de session",
    "resetSession": "Réinitialiser la session",
    "bubbleDetails": "Détails du fragment",
    "bubbleActions": "Actions du fragment",
    "deleteFragment": "Supprimer",
    "deleteFragmentConfirm": "Supprimer le fragment",
    "deleteFragmentCancel": "Annuler",
    "deleteFragmentBody": "Le fragment disparaîtra du contexte et ne sera pas utilisé pour la vérification ou la génération.",
    "deleteFragmentError": "Impossible de supprimer le fragment.",
    "showMore": "Afficher plus",
    "showLess": "Réduire",
    "resultDetails": "Détails de la réponse",
    "detailOpen": "Ouvrir le bloc",
    "stepLabels": [
      "Contexte",
      "Vérifier",
      "Générer",
      "Résultat"
    ],
    "loadingTitle": "Préparation de la réponse",
    "loadingBody": "J’afficherai l’analyse ici dès qu’elle sera prête.",
    "cards": {
      "primaryMessage": "Message",
      "why": "Pourquoi",
      "risks": "Risques",
      "avoid": "À éviter",
      "nextStep": "Étape suivante",
      "simpleVersion": "Version simple",
      "alternatives": "Alternatives",
      "diagnosis": "Diagnostic",
      "leverage": "Levier principal",
      "plan24": "Plan 24 h",
      "ifReply": "Si elle répond",
      "ifNoReply": "Si elle ne répond pas",
      "template": "Modèle",
      "emptyList": "Vide pour l’instant."
    }
  },
  "support": {
    "title": "Support",
    "subtitle": "Accès, paiement, bug ou autre chose",
    "placeholder": "Décris le problème : accès, paiement, bug, code de connexion...",
    "detailPlaceholder": "Décris-le en détail...",
    "submit": "Envoyer",
    "submitting": "Envoi...",
    "successTitle": "Envoyé",
    "success": "Nous répondrons via le canal de support.",
    "homeCta": "Accueil",
    "empty": "Le message est vide."
  },
  "profile": {
    "title": "Profil",
    "plan": "Offre",
    "status": "Statut",
    "promoSection": "Code promo",
    "promoLabel": "Saisis le code promo",
    "promoPlaceholder": "Par exemple, FG-AB12CD34",
    "promoSubmit": "Activer le code",
    "promoSubmitting": "Activation...",
    "promoSuccess": "Code promo {code} activé.",
    "promoError": "Impossible d’activer le code promo.",
    "endSession": "Terminer les sessions actives",
    "notifications": "Notifications",
    "notificationsOff": "Désactivées",
    "manageAccess": "Gérer l’accès",
    "resetSubtitle": "Réinitialiser les sessions inachevées",
    "supportSubtitle": "Accès, paiement, bugs",
    "help": "Comment ça marche",
    "account": "Compte",
    "assistance": "Aide",
    "language": "Langue",
    "languageSubtitle": "Russian is also available",
    "languageEnglish": "English",
    "languageRussian": "Русский"
  },
  "offline": {
    "title": "Aucune connexion",
    "body": "L’interface hors ligne s’est ouverte, mais Internet et l’accès au compte sont nécessaires pour continuer."
  },
  "staticPages": {
    "help": {
      "eyebrow": "Aide",
      "title": "Comment ça marche",
      "body": "Après connexion, lance une nouvelle consultation, ajoute le contexte et obtiens l’analyse dans le chat.",
      "cards": [
        {
          "title": "Ajouter le contexte",
          "body": "Décris la situation, envoie une capture ou ajoute un vocal."
        },
        {
          "title": "Appuie sur Terminé",
          "body": "Nous rassemblons tout en une seule histoire et affichons l’analyse dans le chat."
        },
        {
          "title": "Continuer le dialogue",
          "body": "Les nouveaux messages et les réponses précédentes sont réutilisés."
        }
      ],
      "resultSectionLabel": "Ce que tu obtiens",
      "resultCards": [
        {
          "title": "Analyse de situation",
          "body": "Ce qui se passe et où se trouve le levier principal maintenant."
        },
        {
          "title": "Plan d’action",
          "body": "Que faire dans les prochaines 24 heures, si elle répond et si elle ne répond pas."
        },
        {
          "title": "Texte du message",
          "body": "Une version prête à envoyer ou à ajuster légèrement."
        }
      ],
      "replayOnboarding": "Revoir l’onboarding"
    },
    "premium": {
      "eyebrow": "Accès",
      "title": "Un seul accès pour le site et l’application",
      "body": "Le paiement active le même e-mail sur le site, le checkout et la PWA.",
      "cards": [
        {
          "title": "Parité",
          "body": "Les conseils et l’analyse de situation sont disponibles sur le site et dans l’app."
        },
        {
          "title": "Revenir après paiement",
          "body": "Après le paiement, reviens simplement dans l’app."
        }
      ]
    }
  },
  "toasts": {
    "defaultError": "Une erreur est survenue.",
    "sessionRestart": "La session a été perdue. Une nouvelle session a été lancée.",
    "sessionConflict": "Cette session n’est plus disponible. Une nouvelle session a été lancée.",
    "sessionOwnershipMismatch": "Cette session appartient à une autre connexion ou est obsolète.",
    "startOver": "Recommencer",
    "forbidden": "Cet écran nécessite un accès actif.",
    "authExpired": "Ta session a expiré. Connecte-toi à nouveau."
  }
} as const;

export const modeMessages: Record<SessionMode, { title: string; subtitle: string; accent: string }> = {
  "write_now": {
    "title": "Nouvelle consultation",
    "subtitle": "Analyse rapide directement dans le chat",
    "accent": "write_now"
  },
  "analyze_case": {
    "title": "Nouvelle consultation",
    "subtitle": "Diagnostic, plan et modèle",
    "accent": "analyze_case"
  }
};
