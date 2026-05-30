import type { Role, SessionMode } from "../../types";

export const roleLabels: Record<Role, string> = {
  "USER_SELF": "I wrote",
  "USER_PEER": "They wrote"
};

export const messages = {
  "brand": {
    "name": "Flirto Guru",
    "tagline": "New consultation"
  },
  "tabs": [
    {
      "to": "/app",
      "label": "Advice"
    },
    {
      "to": "/paywall",
      "label": "Access"
    },
    {
      "to": "/help",
      "label": "Help"
    },
    {
      "to": "/app/profile",
      "label": "Profile"
    }
  ],
  "shell": {
    "logout": "Log out",
    "boot": "Opening Flirto Guru...",
    "back": "Back",
    "finishSession": "Finish",
    "close": "Close",
    "retry": "Try again",
    "themeLight": "Light theme",
    "themeDark": "Dark theme"
  },
  "login": {
    "eyebrow": "Login",
    "title": "Log in",
    "body": "",
    "emailLabel": "Email",
    "emailPlaceholder": "you@example.com",
    "codeLabel": "Email code",
    "codePlaceholder": "000000",
    "requestCode": "Get code →",
    "confirmCode": "Log in →",
    "resendCode": "Change email",
    "emailHint": "",
    "requestSuccess": "Code sent. Check your email.",
    "requestError": "Could not send the code.",
    "confirmError": "The code did not work."
  },
  "paywall": {
    "eyebrow": "Access",
    "title": "Activation required",
    "body": "After payment, come back here and the app will refresh your status.",
    "primaryCta": "Open payment",
    "activeTitle": "Access active",
    "activeBody": "Your access is linked to this email",
    "activeStatusLabel": "Current access",
    "activeEmailLabel": "Email",
    "manageCta": "Manage access",
    "checkoutStarting": "Opening payment...",
    "checkoutError": "Could not open payment. Try again.",
    "bullets": [
      "Access is linked to your email.",
      "You do not need to log in again after payment.",
      "Support can help if something does not work."
    ],
    "checking": "Checking access status..."
  },
  "access": {
    "grace_period": {
      "title": "Extend access",
      "body": "Your grace period is about to end.",
      "cta": "Extend"
    },
    "token_issued": {
      "title": "Access issued",
      "body": "If you just paid, open payment and return here.",
      "cta": "Open access"
    }
  },
  "home": {
    "eyebrow": "Advice",
    "title": "",
    "body": "Add context and get a breakdown right in chat.",
    "opening": "Opening...",
    "startConsultation": "New consultation",
    "startBody": "Add a chat, screenshot, or voice note to get analysis, a plan, and a reply draft.",
    "startCta": "New consultation",
    "quickProfile": "Profile",
    "quickSupport": "Support",
    "quickHelp": "Help",
    "pushTitle": "Notify you when the answer is ready?",
    "pushBody": "Only important updates: ready answer, access, and account status.",
    "pushEnable": "Enable notifications",
    "pushSkip": "Not now",
    "installTitle": "Install on Home Screen",
    "installBody": "The app opens like a native app and does not get lost in browser tabs.",
    "installAction": "Install",
    "installIos": "On iPhone, open Share and choose Add to Home Screen.",
    "installSteps": {
      "ios": {
        "title": "Install Flirto Guru first",
        "body": "On iPhone, tap Share in Safari and choose Add to Home Screen. The app will open from your Home Screen like a native app.",
        "action": "Install"
      },
      "android": {
        "title": "Install Flirto Guru first",
        "body": "Add the app to your Home screen so it opens faster and does not get lost in browser tabs.",
        "action": "Install"
      },
      "desktop": {
        "title": "Install Flirto Guru first",
        "body": "Use the install icon in your browser address bar or menu to keep the app one click away.",
        "action": "Install"
      }
    },
    "installAssist": {
      "ios": "The share sheet is not available. Open Safari Share and choose Add to Home Screen.",
      "android": "If the install prompt did not open, use the browser menu and choose Install app.",
      "desktop": "If the install prompt did not open, use the install icon in the address bar or browser menu."
    },
    "statusTitle": "Access status",
    "statusFallback": "Active",
    "accountTitle": "Account",
    "resetTitle": "Reset active sessions",
    "resetBody": "If an unfinished session is stuck, close it and start again.",
    "resetCta": "Close sessions",
    "resetSuccess": "Active sessions closed.",
    "resetEmpty": "There were no active sessions.",
    "resetError": "Could not close sessions.",
    "recentTitle": "Recent",
    "recentEmptyTitle": "History will appear here",
    "recentEmptyBody": "After completed consultations, recent sessions can be opened from here.",
    "recentFallbackPreview": "Recently opened consultation",
    "hoursAgo": "h ago",
    "daysAgo": "d ago",
    "onboardingSkip": "Skip",
    "onboardingNext": "Next",
    "onboardingStart": "Start",
    "onboardingSteps": [
      {
        "title": "Add context",
        "body": "Text, screenshot, or voice note. The bot will understand roles from context."
      },
      {
        "title": "Tap done",
        "body": "We show loading in chat and prepare the answer without extra screens."
      },
      {
        "title": "Analysis in chat",
        "body": "The main answer is visible right away, with details under buttons."
      }
    ]
  },
  "session": {
    "composerPlaceholder": "Describe the situation or paste the chat...",
    "send": "Send",
    "attach": "Attachment",
    "attachImage": "Gallery",
    "attachCamera": "Camera",
    "attachAudio": "Audio file",
    "attachVoice": "Voice note",
    "roleTitle": "Who sent the message",
    "roleHint": "These details are sent with text, photos, or voice notes.",
    "roleName": "Author name",
    "roleDate": "Date and time",
    "roleApply": "Save",
    "batchMore": "+ More",
    "batchClose": "Done",
    "batchReady": "fragments · Ready for analysis",
    "confirmTitle": "Check context",
    "confirmHeading": "Check context",
    "confirmBody": "Quickly check that I understood the situation and did not miss anything.",
    "confirmYes": "Correct →",
    "confirmEdit": "Clarify",
    "confirmEditCancel": "Collapse",
    "confirmEditSend": "Send",
    "confirmEditPlaceholder": "What should be added or clarified?",
    "generate": "Generate",
    "generateTitle": "Preparing advice",
    "generateBody": "Preparing analysis",
    "generateHintMid": "Formulating advice...",
    "generateHintLate": "Almost ready...",
    "resultTitle": "Ready analysis",
    "resultSubtitle": "Main answer first, details under buttons.",
    "refineTitle": "Refine answer",
    "refinePlaceholder": "For example: make it softer, no question at the end...",
    "refineSend": "Apply",
    "refinePresets": [
      "Softer",
      "Shorter",
      "Bolder",
      "Another option"
    ],
    "refineCustom": "Custom",
    "finish": "Finish session",
    "support": "Contact support",
    "thinking": "Analyzing context...",
    "stageCollect": "Collect context",
    "stageGenerate": "Preparing answer",
    "emptyChat": "Your messages, screenshots, and voice notes will appear here.",
    "emptyChatTitle": "Add context",
    "emptyChatBody": "Text, chat screenshot, or voice note",
    "contextFallback": "Context",
    "confirmEyebrow": "Check before generation",
    "confirmContextTitle": "Context",
    "confirmTimelineBody": "Check that the order, authors, and wording match what you added.",
    "confirmSimpleBody": "Check that I understood the core of the situation.",
    "confirmEmpty": "Context looks empty. Go back and add details.",
    "confirmHelper": "If something is missing, go back and add it.",
    "fragmentOne": "fragment",
    "fragmentFew": "fragments",
    "fragmentMany": "fragments",
    "readyForAnalysis": "Ready for analysis",
    "screenshot": "Screenshot",
    "voiceNote": "Voice note",
    "message": "Message",
    "userSelfShort": "Me",
    "userPeerShort": "Other person",
    "readOnly": "This session is read-only.",
    "loadError": "Could not load the session.",
    "imagePendingTag": "[IMAGE]",
    "voicePendingTag": "[VOICE]",
    "uploadHint": "Add role and author date if needed.",
    "systemSaved": "Context added.",
    "systemReady": "Context collected.",
    "systemRefined": "Answer updated.",
    "sceneCollectTitle": "New consultation",
    "sceneCollectSubtitle": "Situation analysis",
    "voiceHoldToRecord": "Tap to record",
    "voiceRecording": "Recording",
    "voiceDecodeError": "Could not transcribe the voice note.",
    "voiceCancelHint": "Swipe left to cancel",
    "voiceCancelReady": "Release to cancel",
    "microphoneDenied": "Allow microphone access in browser settings.",
    "sessionExitTitle": "Interrupt session?",
    "sessionExitBody": "Unfinished context will be lost.",
    "share": "Share",
    "newSession": "New session",
    "copy": "Copy",
    "copied": "Copied",
    "copyInlineHint": "Main answer block",
    "sessionMenu": "Session settings",
    "resetSession": "Reset session",
    "bubbleDetails": "Fragment details",
    "bubbleActions": "Fragment actions",
    "deleteFragment": "Delete",
    "deleteFragmentConfirm": "Delete fragment",
    "deleteFragmentCancel": "Cancel",
    "deleteFragmentBody": "The fragment will disappear from context and will not be used for checking or generation.",
    "deleteFragmentError": "Could not delete the fragment.",
    "showMore": "Show more",
    "showLess": "Collapse",
    "resultDetails": "Answer details",
    "detailOpen": "Open block",
    "stepLabels": [
      "Context",
      "Check",
      "Generate",
      "Result"
    ],
    "loadingTitle": "Preparing answer",
    "loadingBody": "I will show the analysis here as soon as it is ready.",
    "cards": {
      "primaryMessage": "Message",
      "why": "Why",
      "risks": "Risks",
      "avoid": "Avoid",
      "nextStep": "Next step",
      "simpleVersion": "Simple version",
      "alternatives": "Alternatives",
      "diagnosis": "Diagnosis",
      "leverage": "Core leverage",
      "plan24": "24h plan",
      "ifReply": "If she replies",
      "ifNoReply": "If she does not reply",
      "template": "Template",
      "emptyList": "Empty for now."
    }
  },
  "support": {
    "title": "Support",
    "subtitle": "Access, payment, bug, or something else",
    "placeholder": "Describe the issue: access, payment, bug, login code...",
    "detailPlaceholder": "Describe it in detail...",
    "submit": "Send",
    "submitting": "Sending...",
    "successTitle": "Sent",
    "success": "We will reply through the support channel.",
    "homeCta": "Home",
    "empty": "Message is empty."
  },
  "profile": {
    "title": "Profile",
    "plan": "Plan",
    "status": "Status",
    "promoSection": "Promo code",
    "promoLabel": "Enter promo code",
    "promoPlaceholder": "For example, FG-AB12CD34",
    "promoSubmit": "Activate code",
    "promoSubmitting": "Activating...",
    "promoSuccess": "Promo code {code} activated.",
    "promoError": "Could not activate promo code.",
    "endSession": "End active sessions",
    "notifications": "Notifications",
    "notificationsOff": "Off",
    "manageAccess": "Manage access",
    "resetSubtitle": "Reset unfinished",
    "supportSubtitle": "Access, payment, bugs",
    "help": "How it works",
    "account": "Account",
    "assistance": "Help",
    "language": "Language",
    "languageSubtitle": "Russian is also available",
    "languageEnglish": "English",
    "languageRussian": "Русский"
  },
  "offline": {
    "title": "No connection",
    "body": "The offline shell opened, but internet and account access are required to continue."
  },
  "staticPages": {
    "help": {
      "eyebrow": "Help",
      "title": "How it works",
      "body": "After login, start a new consultation, add context, and get analysis right in chat.",
      "cards": [
        {
          "title": "Add context",
          "body": "Describe the situation, send a screenshot, or add a voice note."
        },
        {
          "title": "Tap Done",
          "body": "We collect everything into one story and show the analysis in chat."
        },
        {
          "title": "Continue the dialogue",
          "body": "New messages and previous answers are used further."
        }
      ],
      "resultSectionLabel": "What you get",
      "resultCards": [
        {
          "title": "Situation analysis",
          "body": "What is happening and where the main leverage is now."
        },
        {
          "title": "Action plan",
          "body": "What to do in the next 24 hours, if she replies, and if she does not."
        },
        {
          "title": "Message text",
          "body": "A ready version you can send or lightly adapt."
        }
      ],
      "replayOnboarding": "Show onboarding again"
    },
    "premium": {
      "eyebrow": "Access",
      "title": "One access for website and app",
      "body": "Payment activates the same email across the website, checkout, and PWA.",
      "cards": [
        {
          "title": "Parity",
          "body": "Advice and situation analysis are available across the website and the app."
        },
        {
          "title": "Return after payment",
          "body": "After payment, just come back to the app."
        }
      ]
    }
  },
  "toasts": {
    "defaultError": "Something went wrong.",
    "sessionRestart": "The session was lost. Started a new one.",
    "sessionConflict": "This session is no longer available. Started a new one.",
    "sessionOwnershipMismatch": "This session belongs to another login or is outdated.",
    "startOver": "Start over",
    "forbidden": "This screen requires active access.",
    "authExpired": "Your login session expired. Log in again."
  }
} as const;

export const modeMessages: Record<SessionMode, { title: string; subtitle: string; accent: string }> = {
  "write_now": {
    "title": "New consultation",
    "subtitle": "Quick analysis right in chat",
    "accent": "write_now"
  },
  "analyze_case": {
    "title": "New consultation",
    "subtitle": "Diagnosis, plan, and template",
    "accent": "analyze_case"
  }
};
