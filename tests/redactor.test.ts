import { redactPersonalInformation } from "@/server/pipeline/guardrails/redactor";

describe("redactPII", () => {
  it("redacts email addresses", () => {
    expect(redactPersonalInformation("Contact me at john@example.com")).toBe(
      "Contact me at [EMAIL]",
    );
  });

  it("redacts multiple emails", () => {
    expect(redactPersonalInformation("a@b.com and c@d.org")).toBe(
      "[EMAIL] and [EMAIL]",
    );
  });

  it("redacts phone numbers", () => {
    expect(redactPersonalInformation("Call 555-123-4567")).toBe("Call [PHONE]");
  });

  it("redacts phone numbers with parentheses", () => {
    expect(redactPersonalInformation("Call (555) 123-4567")).toBe(
      "Call [PHONE]",
    );
  });

  it("redacts SSNs", () => {
    expect(redactPersonalInformation("SSN: 123-45-6789")).toBe("SSN: [SSN]");
  });

  it("redacts credit card numbers", () => {
    expect(redactPersonalInformation("Card: 4111 1111 1111 1111")).toBe(
      "Card: [CC]",
    );
  });

  it("redacts credit card numbers with dashes", () => {
    expect(redactPersonalInformation("Card: 4111-1111-1111-1111")).toBe(
      "Card: [CC]",
    );
  });

  it("preserves text without PII", () => {
    const clean = "This is a normal listing description";
    expect(redactPersonalInformation(clean)).toBe(clean);
  });

  it("handles multiple PII types in one string", () => {
    const input = "Email: a@b.com, Phone: 555-123-4567, SSN: 123-45-6789";
    const result = redactPersonalInformation(input);
    expect(result).toContain("[EMAIL]");
    expect(result).toContain("[PHONE]");
    expect(result).toContain("[SSN]");
    expect(result).not.toContain("a@b.com");
    expect(result).not.toContain("555-123-4567");
    expect(result).not.toContain("123-45-6789");
  });

  it("does not redact 7-digit product codes as phone numbers", () => {
    const clean = "Model 123-4567";
    expect(redactPersonalInformation(clean)).toBe(clean);
  });
});
