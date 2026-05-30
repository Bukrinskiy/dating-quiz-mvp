import { LEGAL_DOCUMENT_SLUGS, getLegalDocumentBySlug, legalDocuments } from "../../../shared/legal/documents";

test("shared legal content maps canonical slugs", () => {
  expect(LEGAL_DOCUMENT_SLUGS.terms).toBe("terms.html");
  expect(LEGAL_DOCUMENT_SLUGS.privacy).toBe("privacy-policy.html");
  expect(LEGAL_DOCUMENT_SLUGS.refund).toBe("refund-policy.html");
  expect(getLegalDocumentBySlug("terms.html")).toBe("terms");
  expect(getLegalDocumentBySlug("privacy-policy.html")).toBe("privacy");
  expect(getLegalDocumentBySlug("refund-policy.html")).toBe("refund");
});

test("shared legal content no longer references Telegram delivery", () => {
  const serialized = JSON.stringify(legalDocuments);

  expect(serialized).not.toContain("Telegram bot functionality");
  expect(serialized).not.toContain("Telegram username");
  expect(serialized).toContain("website");
  expect(serialized).toContain("installable PWA");
});
