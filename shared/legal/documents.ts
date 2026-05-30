export const LEGAL_DOCUMENT_KEYS = ["terms", "privacy", "refund"] as const;
export type LegalDocumentKey = (typeof LEGAL_DOCUMENT_KEYS)[number];

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  email?: string;
  children?: LegalSection[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

export const LEGAL_DOCUMENT_SLUGS: Record<LegalDocumentKey, string> = {
  terms: "terms.html",
  privacy: "privacy-policy.html",
  refund: "refund-policy.html",
};

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    title: "Terms of Use",
    updated: "Last updated: May 5, 2026",
    intro: "By using this service through our website, web application, or installable PWA, you agree to these terms.",
    sections: [
      {
        title: "1. Service Description",
        paragraphs: [
          "Flirto is an AI-powered dating communication assistant for adults aged 18 and older.",
          "The service is provided through our website, web application, and installable PWA. It helps users analyze conversation context entered by the user and generate AI-powered communication suggestions for conversations they already have on third-party dating apps, websites, messengers, or social platforms.",
          "The user is responsible for reviewing, editing, and deciding whether to use any AI-generated suggestion.",
          "The service does not provide dating profiles, matchmaking, synthetic dating partners, escort services, compensated dating, adult sexual services, affair dating, fetish dating, or transactional international matchmaking.",
          "The service is not professional psychological, medical, legal, financial, relationship, or other professional advice.",
        ],
      },
      {
        title: "2. Access and Subscription",
        paragraphs: [
          "Access to the service is provided on a paid basis for a limited period (for example, one week or one month), depending on the selected plan.",
          "After successful payment, access to the paid service functionality is provided automatically for the selected period through the website, web application, or installable PWA.",
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
        email: "support@flirto.guru",
        list: ["Billing contact: billing@advertex.biz"],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: May 5, 2026",
    intro:
      "This Privacy Policy explains what data we collect, how we use it, and how we protect it when you use our website, web application, and installable PWA.",
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
        paragraphs: ["For all data-processing questions, you can contact us at:"],
        email: "support@flirto.guru",
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    updated: "Last updated: May 5, 2026",
    sections: [
      {
        title: "1. Digital Service",
        paragraphs: [
          "The service provides digital access to paid functionality immediately after payment confirmation.",
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
        email: "support@flirto.guru",
        list: [
          "payment confirmation;",
          "the account email used for access;",
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
};

export const getLegalDocumentBySlug = (slug: string | undefined): LegalDocumentKey | null => {
  if (!slug) {
    return null;
  }

  const entry = Object.entries(LEGAL_DOCUMENT_SLUGS).find(([, value]) => value === slug);
  return entry ? entry[0] as LegalDocumentKey : null;
};
