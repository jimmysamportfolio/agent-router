import { InvariantError } from "@/lib/errors";

const DEFAULT_TOKEN_BUDGET = 50_000;
const CHARS_PER_TOKEN = 4;

export class BudgetGuard {
  private usage = new Map<string, number>();
  private readonly budget: number;

  constructor(budget: number = DEFAULT_TOKEN_BUDGET) {
    this.budget = budget;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  track(reviewId: string, inputText: string, outputText: string): void {
    const tokens =
      this.estimateTokens(inputText) + this.estimateTokens(outputText);
    const current = this.usage.get(reviewId) ?? 0;
    const updated = current + tokens;
    this.usage.set(reviewId, updated);

    if (updated > this.budget) {
      throw new InvariantError(
        `Token budget exceeded for review ${reviewId}: ${updated} > ${this.budget}`,
      );
    }
  }

  getUsage(reviewId: string): number {
    return this.usage.get(reviewId) ?? 0;
  }

  clear(reviewId: string): void {
    this.usage.delete(reviewId);
  }
}
