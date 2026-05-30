import type { AppMessages } from "./types";
import { legalDocuments } from "../../../../../shared/legal/documents";

export const enMessages: AppMessages = {
  ui: {
    langRu: "RU",
    langEn: "EN",
    continue: "Continue",
    questionLabel: "Question",
    analyzing: "Analyzing your answers...",
    payWait: "Start your subscription",
    payError: "Unable to open payment.",
    payUnavailable: "Enter your email and continue to secure Stripe checkout.",
    payPlansError: "Unable to load available plans right now.",
    payTitle: "Choose your access plan",
    paySubtitle: "Start with the plan that fits your pace. You can manage or cancel your subscription anytime.",
    payEmailLabel: "Email for access",
    payEmailExplain: "We use your email to send your access details and payment receipt right after purchase.",
    payEmailHintNoSpam: "No spam. Only access, receipt, and account recovery messages.",
    payEmailPlaceholder: "you@example.com",
    payEmailRequired: "Enter your email to continue to checkout.",
    payEmailInvalid: "Enter a valid email, for example you@example.com.",
    payPlanLabel: "Select your plan",
    payPlanWeeklyTitle: "Weekly plan",
    payPlanMonthlyTitle: "Monthly plan",
    payPlanYearlyTitle: "Yearly plan",
    payBillingWeekly: "per week",
    payBillingMonthly: "per month",
    payBillingYearly: "per year",
    payPerDay: "per day",
    payPromoToggleLabel: "I have a promo code",
    payPromoLabel: "Promo code",
    payPromoPlaceholder: "For example, VIP2026",
    payPromoInvalid: "Promo code is invalid or inactive.",
    payPromoApplied: "Promo code {code} applied.",
    payPromoChecking: "Checking promo code...",
    payMostPopular: "Most popular",
    paySecureCheckout: "Secure Stripe checkout",
    paySupportAccess: "Help if you run into access issues",
    payCancelAnytime: "Cancel your subscription anytime",
    payMoneyBack: "Help with access and activation",
    paySelectPlanHint: "Choose a plan first, then continue to checkout.",
    payPlanHelperIdle: "Choose one plan to continue",
    payPlanHelperNeedsEmail: "Enter a valid email first to unlock plans",
    payPlanHelperSelected: "Selected plan: {plan}",
    payStartSelected: "Continue with",
    payModeOneTime: "One-time access",
    payModeSubscription: "Subscription",
    payStart: "Go to checkout",
    payStarting: "Opening checkout...",
    payPreparingOverlay: "Preparing secure payment...",
    payOrCard: "or pay with card",
    payConfirmButton: "Pay now",
    payConfirmingButton: "Processing payment...",
    paySuccessTitle: "Payment received",
    paySuccessPending: "Payment is still processing. This page will update automatically in a few seconds.",
    paySuccessDone: "Access is ready. Open the bot and activate your access.",
    payCancelTitle: "Payment canceled",
    payCancelBody: "You can return to checkout at any time.",
    payManageTitle: "Manage subscription",
    payManageButton: "Open Stripe portal",
    payRestoreHint: "If you did not get access, message /restore in the bot.",
    payOpenBot: "Open bot",
  },
  hero: {
    title: "You text first... and still get left on read?",
    subtitle:
      "\"Hey, how are you?\" and the convo flatlines? Give us 3 minutes and we'll show you exactly where it falls apart.",
    list: [
      "You overthink every line, but it barely changes the outcome",
      "You rewrite messages over and over, and the convo still dies",
      "You put in way too much effort and still get silence",
      "You spend a ton of energy, but dates almost never happen",
    ],
    note: "This quick quiz will show where attraction drops in your chats",
    cta: "Find out in 3 minutes",
    microcopy: "No sign-up needed to start",
    fallback: "Video is not available in your browser",
    videoSrc: "",
  },
  footer: {
    terms: "Terms of Use",
    refund: "Refund Policy",
    privacy: "Privacy Policy",
  },
  quiz: {
    blocks: [
      {
        intro:
          "Pick what sounds most like you. We'll show where interest slips in the very first stage of your chats.",
        questions: [
          {
            title: "Where do you usually meet women right now?",
            options: [
              "In dating apps",
              "In social media / messengers",
              "Offline (friends, events)",
              "Mixed, in different places",
            ],
          },
          {
            title: "Where does it usually fall apart?",
            options: [
              "No reply to the first message",
              "The chat dies quickly",
              "Can't move the chat toward a date",
              "Everything goes cold after the first date",
            ],
          },
          {
            title: "What do you want most from dating right now?",
            options: [
              "Real dates, not endless texting",
              "Convos that actually go somewhere, not nowhere",
              "Feeling real interest from her side",
              "Finding something stable / a relationship",
            ],
          },
          {
            title: "How many new chats do you usually start per week?",
            options: ["0", "1-2", "3-5", "6+"],
          },
        ],
        microcopy:
          "Got it. We can already see where results start leaking. Now let's break down why.",
      },
      {
        intro: "Pick the options that best match your current texting reality.",
        questions: [
          {
            title: "How do your new chats usually end?",
            options: [
              "We actually make it to a date",
              "The convo drags and slowly dies",
              "She stops replying",
              "It varies, no clear pattern yet",
            ],
          },
          {
            title: "At what point does it usually break?",
            options: [
              "At the very start",
              "After a couple of messages",
              "Right before asking her out",
              "Different every time",
            ],
          },
          {
            title: "How well do you understand why a chat dies?",
            options: [
              "Usually I get it",
              "Sometimes I can tell",
              "Most of the time, not really",
              "I almost never get it",
            ],
          },
          {
            title: "What do you usually feel during the conversation?",
            options: [
              "Calm and in control",
              "Sometimes unsure",
              "Often tense",
              "Constantly overthinking every reply",
            ],
          },
        ],
        microcopy:
          "This looks like a pattern, not a one-off. Let's see what's driving it.",
      },
      {
        intro: "Choose what feels closest to your usual texting style.",
        questions: [
          {
            title: "How do you usually text?",
            options: [
              "Short and direct",
              "I try to be clear and detailed",
              "I tend to over-explain",
              "It depends on the situation",
            ],
          },
          {
            title: "If she doesn't reply for a long time, you usually...",
            options: [
              "Wait for her to reply",
              "Message later to bump the chat",
              "Start doubting what to send",
              "Send another text to revive it",
            ],
          },
          {
            title: "In texting, you usually...",
            options: [
              "Take the lead and set direction",
              "Adapt to her style",
              "Wait for her to lead",
              "Keep changing strategy",
            ],
          },
          {
            title: "How often do you reread a message before sending it?",
            options: ["Almost never", "Sometimes", "Often", "Almost always"],
          },
        ],
        microcopy:
          "Now we can see not just outcomes, but your repeating chat pattern.",
      },
      {
        intro: "Rate how often this happens and how much it affects you.",
        questions: [
          {
            title: "How often do new chats fail to reach a date?",
            options: ["Almost never", "Sometimes", "Most of the time", "Almost always"],
          },
          {
            title: "How does that usually affect you?",
            options: [
              "Almost no effect",
              "A bit frustrating",
              "It wears me down over time",
              "It drains me a lot",
            ],
          },
          {
            title: "Have you noticed this affecting your confidence?",
            options: ["No", "Sometimes", "Yeah, definitely", "It hits my confidence hard"],
          },
        ],
        microcopy: "When the same thing keeps happening, that's a pattern, not bad luck.",
      },
      {
        intro: "Pick what you've already tried and what results it gave you.",
        questions: [
          {
            title: "Have you tried changing your communication approach?",
            options: [
              "Yeah, I tried different tips and methods",
              "Yeah, I changed things by feel",
              "I tried, but without a system",
              "No, not really",
            ],
          },
          {
            title: "Did that give you stable results?",
            options: [
              "Yes, results got noticeably better",
              "It worked sometimes",
              "It helped once in a while",
              "Almost no real change",
            ],
          },
          {
            title: "How hard is it for you to figure out what and when to text?",
            options: [
              "I usually know what to do",
              "Sometimes I second-guess",
              "I'm often unsure",
              "I'm mostly guessing",
            ],
          },
        ],
        microcopy: "Looks like this isn't about motivation or consuming more advice.",
      },
    ],
  },
  block6: {
    screen1: {
      title: "What's really happening",
      paragraphs: [
        "Your answers show it isn't about one bad message. Interest drops because of the overall flow of the chat.",
        "Things may start okay, then uncertainty kicks in: what to send next, too early or too late.",
        "Her signals feel mixed, and you end up improvising.",
      ],
      timeline: [
        "The chat starts normally",
        "Uncertainty appears",
        "Timing gets tricky",
        "Her reactions become unclear",
        "You start guessing",
        "And the cycle repeats",
      ],
      cta: "Sound familiar?",
    },
    screen2: {
      title: "Why it keeps repeating",
      intro: [
        "It's not that you're doing something wrong. The real issue is this: in the moment, you don't have a clear frame to lean on.",
        "When you're inside a live chat, it's hard to keep pace, sense timing, and evaluate reactions clearly at the same time.",
      ],
      anchor: "And in texting, nobody gives you a free second chance.",
      postAnchor:
        "If your message misses the moment, the convo often never starts. Not because you made some huge mistake, but because attention moves fast.",
      loop: [
        "No clear frame in the moment",
        "Your judgment gets distorted",
        "The same behavior repeats",
        "The chat goes in the dark",
      ],
      microcopy: "And every time, you're back at square one.",
      cta: "See the solution",
    },
  },
  block7: {
    offerTitle: "Your chats stop dying halfway.",
    offerLead: "You know exactly what to send next, without guesswork or extra stress.",
    workTitle: "How it works",
    workSteps: [
      "You describe the situation",
      "You choose the reply style",
      "You get a ready-to-send message",
    ],
    workHint: "Fast. Practical. Fits the exact moment in your convo.",
    compareTitle: "What's the difference",
    compareLeftTitle: "Without the assistant",
    compareLeftItems: [
      "you guess what to send",
      "you freeze before every reply",
      "the convo often dies out",
    ],
    compareRightTitle: "With the assistant",
    compareRightItems: [
      "you know what to send and when",
      "you reply calmly and confidently",
      "the convo moves forward instead of stalling",
    ],
    benefitsTitle: "What you get",
    benefitsItems: [
      "Ready-to-send lines for your exact situation",
      "Replies that sound natural, not robotic",
      "More control in chats, less emotional chaos",
    ],
    benefitsHintLines: [
      "You don't need to be a wordsmith.",
      "Just describe what's happening.",
    ],
    casesTitleLines: ["Real", "feedback"],
    cases: [
      {
        name: "Artem, 29",
        text: "I used to spend 20 minutes on every reply. Now I describe the situation and get a solid message right away. In two weeks, I turned three chats into dates.",
        image: "/assets/отзывы2.jpg",
        imageAlt: "Artem's photo",
      },
      {
        name: "Nikita, 33",
        text: "This assistant cut my texting stress hard. I stopped texting into the void and started getting real replies instead of dead-end one-word answers.",
        image: "/assets/отзывы3.jpg",
        imageAlt: "Nikita's photo",
      },
      {
        name: "Maxim, 31",
        text: "I finally got how to keep momentum after matching. No more dry, boring lines, and chats now flow naturally toward asking her out.",
        image: "/assets/отзывы4.jpg",
        imageAlt: "Maxim's photo",
      },
      {
        name: "Kirill, 27",
        text: "Before this, I kept losing momentum after the first few messages. Now it's clear: I know what to send and when, and I lose fewer great matches.",
        image: "/assets/отзывы5.jpg",
        imageAlt: "Kirill's photo",
      },
      {
        name: "Sergey, 35",
        text: "This kept my style natural. The replies still sound like me, just sharper. First time in a long while, I had two dates in one month.",
        image: "/assets/Снимок экрана 2026-02-13 в 16.59.16.png",
        imageAlt: "Sergey's photo",
      },
    ],
    saleTitle: "Ready to stop losing good chats?",
    saleCta: "- start now",
  },
  legal: legalDocuments,
};
