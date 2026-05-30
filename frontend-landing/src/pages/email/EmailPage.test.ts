import { describe, expect, test } from "vitest";

import { resolveInitialEmail } from "./emailQuery";

describe("resolveInitialEmail", () => {
  test("returns normalized email from query", () => {
    expect(resolveInitialEmail("?email=USER%40Example.com")).toBe("user@example.com");
  });

  test("ignores invalid email query", () => {
    expect(resolveInitialEmail("?email=not-an-email")).toBe("");
  });

  test("returns empty string when email is missing", () => {
    expect(resolveInitialEmail("?source=app")).toBe("");
  });
});
