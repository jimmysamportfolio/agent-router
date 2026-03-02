import {
  submitListingSchema,
  reviewIdSchema,
} from "@/features/reviews/validators";

describe("submitListingSchema", () => {
  const validInput = {
    title: "Test Listing",
    description: "A valid description",
    category: "electronics",
    tenantId: "550e8400-e29b-41d4-a716-446655440000",
  };

  it("accepts valid input with required fields only", () => {
    const result = submitListingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with all optional fields", () => {
    const result = submitListingSchema.safeParse({
      ...validInput,
      imageUrls: ["https://example.com/img.jpg"],
      metadata: { brand: "Acme" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = submitListingSchema.safeParse({ ...validInput, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 characters", () => {
    const result = submitListingSchema.safeParse({
      ...validInput,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = submitListingSchema.safeParse({
      ...validInput,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 5000 characters", () => {
    const result = submitListingSchema.safeParse({
      ...validInput,
      description: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing category", () => {
    const result = submitListingSchema.safeParse({
      title: validInput.title,
      description: validInput.description,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URLs in imageUrls", () => {
    const result = submitListingSchema.safeParse({
      ...validInput,
      imageUrls: ["not-a-url"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty imageUrls array", () => {
    const result = submitListingSchema.safeParse({
      ...validInput,
      imageUrls: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("reviewIdSchema", () => {
  it("accepts a valid UUID", () => {
    const result = reviewIdSchema.safeParse(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    const result = reviewIdSchema.safeParse("not-a-uuid");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = reviewIdSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});
