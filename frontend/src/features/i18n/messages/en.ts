import type { AppMessages } from "./types";

export const enMessages: AppMessages = {
  ui: {
    langRu: "RU",
    langEn: "EN",
    continue: "Continue",
    questionLabel: "Question",
    payWait: "Redirecting to payment...",
    payError: "Unable to start payment: clickid is missing.",
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
    salePrice: "Full access - $9.99 / month",
    saleCta: "- start now",
    saleNote: "If it doesn't help, we'll refund you. No drama.",
  },
  legal: {
    terms: {
      title: "Terms of Use",
      updated: "Last updated: February 11, 2026",
      intro: "By using this service, including the Telegram bot, you agree to these terms.",
      sections: [
        {
          title: "1. Service Description",
          paragraphs: [
            "The service is an online tool provided through a Telegram bot.",
            "The service is intended for automated analysis of text information entered by the user and generation of informational communication recommendations.",
            "The service is not professional psychological, medical, legal, or other consulting advice.",
          ],
        },
        {
          title: "2. Access and Subscription",
          paragraphs: [
            "Access to the service is provided on a paid basis for a limited period (for example, one week or one month), depending on the selected plan.",
            "After successful payment, access to the Telegram bot functionality is provided automatically for the selected period.",
          ],
        },
        {
          title: "3. Payment",
          paragraphs: [
            "Payments are processed through third-party payment systems. The service does not store or process users' bank card data.",
            "Pricing, access term, and payment conditions are shown before payment confirmation.",
          ],
        },
        {
          title: "4. No Guarantees",
          paragraphs: [
            "The service provides informational content generated automatically.",
            "You understand that effectiveness depends on multiple factors outside the service's control.",
          ],
          list: [
            "We do not guarantee any specific results.",
            "We do not guarantee improved communication outcomes.",
            "We do not guarantee that the service will match user expectations.",
          ],
        },
        {
          title: "5. User Responsibility",
          paragraphs: [
            "By using the service, the user confirms that:",
            "The user independently decides how to use the provided information.",
          ],
          list: [
            "they are at least 18 years old;",
            "they use the service on their own initiative;",
            "they understand the automated nature of the generated replies.",
          ],
        },
        {
          title: "6. Prohibited Use",
          paragraphs: [
            "The following is prohibited:",
            "Administration reserves the right to limit or terminate access in case of violations.",
          ],
          list: [
            "using the service for illegal purposes;",
            "attempts to interfere with service operation;",
            "using the service to cause harm to third parties.",
          ],
        },
        {
          title: "7. Service Availability",
          paragraphs: [
            "We aim to provide uninterrupted operation, but do not guarantee the absence of technical failures, errors, or temporary access restrictions.",
          ],
        },
        {
          title: "8. Limitation of Liability",
          paragraphs: [
            "The service and its owners are not liable for any indirect or consequential damages resulting from use of the service, to the extent permitted by applicable law.",
          ],
        },
        {
          title: "9. Contact Information",
          paragraphs: [
            "For any questions related to the service, contact us at:",
            "Billing contacts:",
            "ADVERTEX ADVERTISING RESEARCHES AND CONSULTANCIES LLC",
            "License No: 1054701",
            "Address: P.O.BOX 624937, Dubai, UAE",
          ],
          email: "ivanmarokv@gmail.com",
          list: ["Billing contact: billing@advertex.biz"],
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      updated: "Last updated: February 11, 2026",
      intro:
        "This Privacy Policy explains what data we collect, how we use it, and how we protect it when you use our website and online service.",
      sections: [
        {
          title: "1. What Data We Collect",
          paragraphs: ["We may collect the following categories of information:"],
          children: [
            {
              title: "1.1. Personal Data",
              paragraphs: ["You may voluntarily provide data such as:"],
              list: [
                "email address;",
                "name (when creating an account);",
                "information included in support requests.",
              ],
            },
            {
              title: "1.2. Technical Data",
              paragraphs: ["The following may be collected automatically:"],
              list: [
                "IP address;",
                "device and browser type;",
                "visited pages information;",
                "interaction data with the service.",
              ],
            },
            {
              title: "1.3. Payment Information",
              paragraphs: [
                "Payments are processed by third-party payment providers.",
                "We do not store or process bank card details.",
              ],
            },
          ],
        },
        {
          title: "2. Purposes of Processing",
          paragraphs: ["We use information to:"],
          list: [
            "provide and support the service;",
            "improve service quality;",
            "communicate with users;",
            "comply with legal requirements.",
          ],
        },
        {
          title: "3. Cookies",
          paragraphs: [
            "We may use cookies and similar technologies for:",
            "You can disable cookies in your browser settings.",
          ],
          list: ["traffic analytics;", "improving website functionality."],
        },
        {
          title: "4. Sharing Data with Third Parties",
          paragraphs: [
            "We may share data with:",
            "All third parties are required to maintain confidentiality of received information.",
          ],
          list: [
            "payment providers (for payment processing);",
            "analytics services;",
            "technical contractors.",
          ],
        },
        {
          title: "5. Data Protection",
          paragraphs: [
            "We apply reasonable technical and organizational measures to protect data from unauthorized access, loss, or alteration.",
            "However, no method of internet transmission can guarantee absolute security.",
          ],
        },
        {
          title: "6. Data Retention Period",
          paragraphs: [
            "Personal data is retained only for as long as necessary to provide services and meet legal obligations.",
          ],
        },
        {
          title: "7. User Rights",
          paragraphs: [
            "Under applicable law, you have the right to:",
            "To exercise these rights, contact us by email below.",
          ],
          list: [
            "request information about your data;",
            "request correction or deletion;",
            "withdraw consent to processing.",
          ],
        },
        {
          title: "8. Age Restrictions",
          paragraphs: [
            "The service is intended for users over 18 years old.",
            "We do not knowingly collect data from minors.",
          ],
        },
        {
          title: "9. Policy Changes",
          paragraphs: [
            "We may update this Policy periodically.",
            "The updated version is published on this page with the revision date.",
          ],
        },
        {
          title: "10. Contacts",
          paragraphs: [
            "For all data-processing questions, you can contact us at:",
          ],
          email: "ivanmarokv@gmail.com",
        },
      ],
    },
    refund: {
      title: "Refund Policy",
      updated: "Last updated: February 11, 2026",
      sections: [
        {
          title: "1. Digital Service",
          paragraphs: [
            "The service provides digital access to Telegram bot functionality immediately after payment confirmation.",
            "From the moment access is granted, the service is considered delivered.",
          ],
        },
        {
          title: "2. Refund Conditions",
          paragraphs: ["A refund request can be considered only if:"],
          list: [
            "access to the service was not provided due to a technical issue;",
            "the user contacted support within 24 hours of payment.",
          ],
        },
        {
          title: "3. Cases Where Refunds Are Not Issued",
          paragraphs: ["Refunds are not issued in the following cases:"],
          list: [
            "dissatisfaction with the content or format of generated responses;",
            "expectation of a specific result or effect;",
            "partial use of the paid period;",
            "incorrect understanding of service principles before payment.",
          ],
        },
        {
          title: "4. How to Request a Refund",
          paragraphs: [
            "To request a refund review, the user must send an email to:",
            "and include:",
          ],
          email: "ivanmarokv@gmail.com",
          list: [
            "payment confirmation;",
            "Telegram username;",
            "a brief description of the issue.",
          ],
        },
        {
          title: "5. Refund Timing",
          paragraphs: [
            "If approved, funds are returned to the original payment method within timelines defined by the payment provider.",
          ],
        },
      ],
    },
  },
};
