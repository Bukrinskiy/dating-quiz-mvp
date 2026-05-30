import type { Role, SessionMode } from "../../types";

export const roleLabels: Record<Role, string> = {
  "USER_SELF": "Yo escribí",
  "USER_PEER": "La otra persona escribió"
};

export const messages = {
  "brand": {
    "name": "Flirto Guru",
    "tagline": "Nueva consulta"
  },
  "tabs": [
    {
      "to": "/app",
      "label": "Consejo"
    },
    {
      "to": "/paywall",
      "label": "Acceso"
    },
    {
      "to": "/help",
      "label": "Ayuda"
    },
    {
      "to": "/app/profile",
      "label": "Perfil"
    }
  ],
  "shell": {
    "logout": "Cerrar sesión",
    "boot": "Abriendo Flirto Guru...",
    "back": "Atrás",
    "finishSession": "Finalizar",
    "close": "Cerrar",
    "retry": "Intentar de nuevo",
    "themeLight": "Tema claro",
    "themeDark": "Tema oscuro"
  },
  "login": {
    "eyebrow": "Inicio de sesión",
    "title": "Iniciar sesión",
    "body": "",
    "emailLabel": "Email",
    "emailPlaceholder": "you@example.com",
    "codeLabel": "Código de email",
    "codePlaceholder": "000000",
    "requestCode": "Recibir código →",
    "confirmCode": "Iniciar sesión →",
    "resendCode": "Cambiar email",
    "emailHint": "",
    "requestSuccess": "Código enviado. Revisa tu email.",
    "requestError": "No se pudo enviar el código.",
    "confirmError": "El código no funcionó."
  },
  "paywall": {
    "eyebrow": "Acceso",
    "title": "Activación requerida",
    "body": "Después del pago, vuelve aquí y la app actualizará tu estado.",
    "primaryCta": "Abrir pago",
    "activeTitle": "Acceso activo",
    "activeBody": "Tu acceso está vinculado a este email",
    "activeStatusLabel": "Acceso actual",
    "activeEmailLabel": "Email",
    "manageCta": "Gestionar acceso",
    "checkoutStarting": "Abriendo pago...",
    "checkoutError": "No se pudo abrir el pago. Inténtalo de nuevo.",
    "bullets": [
      "El acceso está vinculado a tu email.",
      "No necesitas volver a iniciar sesión después del pago.",
      "Soporte puede ayudarte si algo no funciona."
    ],
    "checking": "Comprobando estado de acceso..."
  },
  "access": {
    "grace_period": {
      "title": "Ampliar acceso",
      "body": "Tu periodo de gracia está por terminar.",
      "cta": "Ampliar"
    },
    "token_issued": {
      "title": "Acceso emitido",
      "body": "Si acabas de pagar, abre el pago y vuelve aquí.",
      "cta": "Abrir acceso"
    }
  },
  "home": {
    "eyebrow": "Consejo",
    "title": "",
    "body": "Añade contexto y recibe el análisis directamente en el chat.",
    "opening": "Abriendo...",
    "startConsultation": "Nueva consulta",
    "startBody": "Añade un chat, captura o nota de voz para obtener análisis, plan y borrador de respuesta.",
    "startCta": "Nueva consulta",
    "quickProfile": "Perfil",
    "quickSupport": "Soporte",
    "quickHelp": "Ayuda",
    "pushTitle": "¿Avisarte cuando la respuesta esté lista?",
    "pushBody": "Solo actualizaciones importantes: respuesta lista, acceso y estado de cuenta.",
    "pushEnable": "Activar notificaciones",
    "pushSkip": "Ahora no",
    "installTitle": "Instalar en pantalla de inicio",
    "installBody": "La app se abre como una app nativa y no se pierde entre pestañas.",
    "installAction": "Instalar",
    "installIos": "En iPhone, abre Compartir y elige Añadir a pantalla de inicio.",
    "installSteps": {
      "ios": {
        "title": "Primero instala Flirto Guru",
        "body": "En iPhone, abre Safari, toca Compartir y elige Añadir a pantalla de inicio. La app se abrirá como una app nativa.",
        "action": "Instalar"
      },
      "android": {
        "title": "Primero instala Flirto Guru",
        "body": "Añade la app a tu pantalla de inicio para abrirla más rápido y no perderla entre pestañas.",
        "action": "Instalar"
      },
      "desktop": {
        "title": "Primero instala Flirto Guru",
        "body": "Usa el icono de instalación en la barra de direcciones o el menú del navegador para tener la app a un clic.",
        "action": "Instalar"
      }
    },
    "installAssist": {
      "ios": "No se pudo abrir la hoja de compartir. Abre Compartir en Safari y elige Añadir a pantalla de inicio.",
      "android": "Si no se abrió la ventana de instalación, usa el menú del navegador y elige Instalar aplicación.",
      "desktop": "Si no se abrió la ventana de instalación, usa el icono de instalación en la barra de direcciones o el menú del navegador."
    },
    "statusTitle": "Estado de acceso",
    "statusFallback": "Activo",
    "accountTitle": "Cuenta",
    "resetTitle": "Restablecer sesiones activas",
    "resetBody": "Si una sesión sin terminar se bloqueó, ciérrala y empieza de nuevo.",
    "resetCta": "Cerrar sesiones",
    "resetSuccess": "Sesiones activas cerradas.",
    "resetEmpty": "No había sesiones activas.",
    "resetError": "No se pudieron cerrar las sesiones.",
    "recentTitle": "Recientes",
    "recentEmptyTitle": "El historial aparecerá aquí",
    "recentEmptyBody": "Después de consultas completadas, podrás abrir sesiones recientes desde aquí.",
    "recentFallbackPreview": "Consulta abierta recientemente",
    "hoursAgo": "h",
    "daysAgo": "d",
    "onboardingSkip": "Omitir",
    "onboardingNext": "Siguiente",
    "onboardingStart": "Empezar",
    "onboardingSteps": [
      {
        "title": "Añadir contexto",
        "body": "Texto, captura o nota de voz. El bot entenderá los roles por el contexto."
      },
      {
        "title": "Toca Listo",
        "body": "Mostramos la carga en el chat y preparamos la respuesta sin pantallas extra."
      },
      {
        "title": "Análisis en el chat",
        "body": "La respuesta principal se ve enseguida, con detalles bajo los botones."
      }
    ]
  },
  "session": {
    "composerPlaceholder": "Describe la situación o pega el chat...",
    "send": "Enviar",
    "attach": "Adjunto",
    "attachImage": "Galería",
    "attachCamera": "Cámara",
    "attachAudio": "Archivo de audio",
    "attachVoice": "Nota de voz",
    "roleTitle": "Quién envió el mensaje",
    "roleHint": "Estos detalles se envían con texto, fotos o notas de voz.",
    "roleName": "Nombre del autor",
    "roleDate": "Fecha y hora",
    "roleApply": "Guardar",
    "batchMore": "+ Más",
    "batchClose": "Listo",
    "batchReady": "fragmentos · Listo para analizar",
    "confirmTitle": "Revisar contexto",
    "confirmHeading": "Revisar contexto",
    "confirmBody": "Revisa rápido que entendí la situación y no omití nada.",
    "confirmYes": "Correcto →",
    "confirmEdit": "Aclarar",
    "confirmEditCancel": "Contraer",
    "confirmEditSend": "Enviar",
    "confirmEditPlaceholder": "¿Qué hay que añadir o aclarar?",
    "generate": "Generar",
    "generateTitle": "Preparando consejo",
    "generateBody": "Preparando análisis",
    "generateHintMid": "Formulando consejo...",
    "generateHintLate": "Casi listo...",
    "resultTitle": "Análisis listo",
    "resultSubtitle": "Respuesta principal primero, detalles bajo los botones.",
    "refineTitle": "Ajustar respuesta",
    "refinePlaceholder": "Por ejemplo: hazlo más suave, sin pregunta al final...",
    "refineSend": "Aplicar",
    "refinePresets": [
      "Más suave",
      "Más corto",
      "Más directo",
      "Otra opción"
    ],
    "refineCustom": "Personalizado",
    "finish": "Finalizar sesión",
    "support": "Contactar soporte",
    "thinking": "Analizando contexto...",
    "stageCollect": "Recoger contexto",
    "stageGenerate": "Preparando respuesta",
    "emptyChat": "Tus mensajes, capturas y notas de voz aparecerán aquí.",
    "emptyChatTitle": "Añadir contexto",
    "emptyChatBody": "Texto, captura del chat o nota de voz",
    "contextFallback": "Contexto",
    "confirmEyebrow": "Revisar antes de generar",
    "confirmContextTitle": "Contexto",
    "confirmTimelineBody": "Comprueba que el orden, autores y texto coinciden con lo que añadiste.",
    "confirmSimpleBody": "Comprueba que entendí lo esencial de la situación.",
    "confirmEmpty": "El contexto parece vacío. Vuelve y añade detalles.",
    "confirmHelper": "Si falta algo, vuelve y añádelo.",
    "fragmentOne": "fragmento",
    "fragmentFew": "fragmentos",
    "fragmentMany": "fragmentos",
    "readyForAnalysis": "Listo para analizar",
    "screenshot": "Captura",
    "voiceNote": "Nota de voz",
    "message": "Mensaje",
    "userSelfShort": "Yo",
    "userPeerShort": "La otra persona",
    "readOnly": "Esta sesión es de solo lectura.",
    "loadError": "No se pudo cargar la sesión.",
    "imagePendingTag": "[IMAGEN]",
    "voicePendingTag": "[VOZ]",
    "uploadHint": "Añade rol y fecha del autor si hace falta.",
    "systemSaved": "Contexto añadido.",
    "systemReady": "Contexto recopilado.",
    "systemRefined": "Respuesta actualizada.",
    "sceneCollectTitle": "Nueva consulta",
    "sceneCollectSubtitle": "Análisis de situación",
    "voiceHoldToRecord": "Toca para grabar",
    "voiceRecording": "Grabando",
    "voiceDecodeError": "No se pudo transcribir la nota de voz.",
    "voiceCancelHint": "Desliza a la izquierda para cancelar",
    "voiceCancelReady": "Suelta para cancelar",
    "microphoneDenied": "Permite acceso al micrófono en la configuración del navegador.",
    "sessionExitTitle": "¿Interrumpir sesión?",
    "sessionExitBody": "Se perderá el contexto sin terminar.",
    "share": "Compartir",
    "newSession": "Nueva sesión",
    "copy": "Copiar",
    "copied": "Copiado",
    "copyInlineHint": "Bloque principal de respuesta",
    "sessionMenu": "Ajustes de sesión",
    "resetSession": "Restablecer sesión",
    "bubbleDetails": "Detalles del fragmento",
    "bubbleActions": "Acciones del fragmento",
    "deleteFragment": "Eliminar",
    "deleteFragmentConfirm": "Eliminar fragmento",
    "deleteFragmentCancel": "Cancelar",
    "deleteFragmentBody": "El fragmento desaparecerá del contexto y no se usará para revisión ni generación.",
    "deleteFragmentError": "No se pudo eliminar el fragmento.",
    "showMore": "Mostrar más",
    "showLess": "Contraer",
    "resultDetails": "Detalles de la respuesta",
    "detailOpen": "Abrir bloque",
    "stepLabels": [
      "Contexto",
      "Revisar",
      "Generar",
      "Resultado"
    ],
    "loadingTitle": "Preparando respuesta",
    "loadingBody": "Mostraré el análisis aquí en cuanto esté listo.",
    "cards": {
      "primaryMessage": "Mensaje",
      "why": "Por qué",
      "risks": "Riesgos",
      "avoid": "Evitar",
      "nextStep": "Siguiente paso",
      "simpleVersion": "Versión simple",
      "alternatives": "Alternativas",
      "diagnosis": "Diagnóstico",
      "leverage": "Palanca principal",
      "plan24": "Plan 24 h",
      "ifReply": "Si responde",
      "ifNoReply": "Si no responde",
      "template": "Plantilla",
      "emptyList": "Vacío por ahora."
    }
  },
  "support": {
    "title": "Soporte",
    "subtitle": "Acceso, pago, bug u otra cosa",
    "placeholder": "Describe el problema: acceso, pago, bug, código de inicio...",
    "detailPlaceholder": "Descríbelo en detalle...",
    "submit": "Enviar",
    "submitting": "Enviando...",
    "successTitle": "Enviado",
    "success": "Responderemos por el canal de soporte.",
    "homeCta": "Inicio",
    "empty": "El mensaje está vacío."
  },
  "profile": {
    "title": "Perfil",
    "plan": "Plan",
    "status": "Estado",
    "promoSection": "Código promo",
    "promoLabel": "Introduce el código promo",
    "promoPlaceholder": "Por ejemplo, FG-AB12CD34",
    "promoSubmit": "Activar código",
    "promoSubmitting": "Activando...",
    "promoSuccess": "Código promo {code} activado.",
    "promoError": "No se pudo activar el código promo.",
    "endSession": "Terminar sesiones activas",
    "notifications": "Notificaciones",
    "notificationsOff": "Desactivadas",
    "manageAccess": "Gestionar acceso",
    "resetSubtitle": "Restablecer sin terminar",
    "supportSubtitle": "Acceso, pago, bugs",
    "help": "Cómo funciona",
    "account": "Cuenta",
    "assistance": "Ayuda",
    "language": "Idioma",
    "languageSubtitle": "Russian is also available",
    "languageEnglish": "English",
    "languageRussian": "Русский"
  },
  "offline": {
    "title": "Sin conexión",
    "body": "Se abrió la interfaz sin conexión, pero se necesita internet y acceso a la cuenta para continuar."
  },
  "staticPages": {
    "help": {
      "eyebrow": "Ayuda",
      "title": "Cómo funciona",
      "body": "Después de iniciar sesión, empieza una nueva consulta, añade contexto y recibe el análisis en el chat.",
      "cards": [
        {
          "title": "Añadir contexto",
          "body": "Describe la situación, envía una captura o añade una nota de voz."
        },
        {
          "title": "Toca Listo",
          "body": "Unimos todo en una historia y mostramos el análisis en el chat."
        },
        {
          "title": "Continuar el diálogo",
          "body": "Los nuevos mensajes y respuestas anteriores se usan después."
        }
      ],
      "resultSectionLabel": "Qué recibes",
      "resultCards": [
        {
          "title": "Análisis de situación",
          "body": "Qué está pasando y dónde está ahora la palanca principal."
        },
        {
          "title": "Plan de acción",
          "body": "Qué hacer en las próximas 24 horas, si responde y si no responde."
        },
        {
          "title": "Texto del mensaje",
          "body": "Una versión lista para enviar o adaptar ligeramente."
        }
      ],
      "replayOnboarding": "Ver onboarding otra vez"
    },
    "premium": {
      "eyebrow": "Acceso",
      "title": "Un acceso para el sitio web y la app",
      "body": "El pago activa el mismo email en el sitio web, el checkout y la PWA.",
      "cards": [
        {
          "title": "Paridad",
          "body": "Los consejos y análisis están disponibles tanto en el sitio web como en la app."
        },
        {
          "title": "Volver después del pago",
          "body": "Después del pago, simplemente vuelve a la app."
        }
      ]
    }
  },
  "toasts": {
    "defaultError": "Algo salió mal.",
    "sessionRestart": "La sesión se perdió. Se inició una nueva.",
    "sessionConflict": "Esta sesión ya no está disponible. Se inició una nueva.",
    "sessionOwnershipMismatch": "Esta sesión pertenece a otro inicio de sesión o está desactualizada.",
    "startOver": "Empezar de nuevo",
    "forbidden": "Esta pantalla requiere acceso activo.",
    "authExpired": "Tu sesión expiró. Inicia sesión de nuevo."
  }
} as const;

export const modeMessages: Record<SessionMode, { title: string; subtitle: string; accent: string }> = {
  "write_now": {
    "title": "Nueva consulta",
    "subtitle": "Análisis rápido directamente en el chat",
    "accent": "write_now"
  },
  "analyze_case": {
    "title": "Nueva consulta",
    "subtitle": "Diagnóstico, plan y plantilla",
    "accent": "analyze_case"
  }
};
