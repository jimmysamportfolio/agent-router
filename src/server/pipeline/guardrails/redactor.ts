const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]?\d{4}(?!\d)/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const CC_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

export function redactPII(text: string): string {
  return text
    .replace(SSN_REGEX, "[SSN]")
    .replace(CC_REGEX, "[CC]")
    .replace(EMAIL_REGEX, "[EMAIL]")
    .replace(PHONE_REGEX, "[PHONE]");
}
