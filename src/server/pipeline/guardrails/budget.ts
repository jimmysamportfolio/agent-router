import { InvariantError } from "@/lib/errors";

const DEFAULT_TOKEN_BUDGET = 50_000;

export class TokenTracker {
  private used = 0;
  private readonly budget: number;

  constructor(budget: number = DEFAULT_TOKEN_BUDGET) {
    this.budget = budget;
  }

  add(tokens: number): void {
    this.used += tokens;
    if (this.used > this.budget) {
      throw new InvariantError(
        `Token budget exceeded: ${this.used} > ${this.budget}`,
      );
    }
  }

  get total(): number {
    return this.used;
  }
}
