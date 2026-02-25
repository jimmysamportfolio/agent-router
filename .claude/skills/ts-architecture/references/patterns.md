# TypeScript OOP Patterns — Code Reference

Detailed code examples for each of the seven production-quality principles.
This file is loaded on-demand from SKILL.md when Claude needs concrete
implementation examples.

---

## 1. Cohesion / Single Responsibility

### Bad — one class doing everything

```typescript
class UserManager {
  createUser(name: string, email: string) { /* DB + email + logging */ }
  sendWelcomeEmail(email: string) { /* ... */ }
  generateReport(userId: string) { /* ... */ }
  logActivity(userId: string, action: string) { /* ... */ }
}
```

### Good — each class owns one job

```typescript
class UserService {
  constructor(
    private repo: UserRepository,
    private notifier: NotificationService
  ) {}

  async createUser(name: string, email: string): Promise<User> {
    const user = await this.repo.save({ name, email });
    await this.notifier.sendWelcome(user);
    return user;
  }
}

class UserRepository {
  async save(data: { name: string; email: string }): Promise<User> { /* DB only */ }
  async findById(id: string): Promise<User | null> { /* DB only */ }
}

class NotificationService {
  async sendWelcome(user: User): Promise<void> { /* Email only */ }
}
```

---

## 2. Encapsulation & Abstraction

### Access Modifiers

```typescript
class BankAccount {
  public readonly holderName: string;
  private balance: number;
  protected accountType: string;

  constructor(holderName: string, initialBalance: number) {
    this.holderName = holderName;
    this.balance = initialBalance;
    this.accountType = "checking";
  }

  getBalance(): number { return this.balance; }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error("Deposit must be positive");
    this.balance += amount;
  }

  withdraw(amount: number): void {
    if (amount > this.balance) throw new Error("Insufficient funds");
    this.balance -= amount;
  }
}

// account.balance = 0;  // ❌ Compile error
```

### Abstraction — hiding complexity behind a simple interface

```typescript
interface FileStorage {
  upload(file: Buffer, name: string): Promise<string>;
  download(name: string): Promise<Buffer>;
  delete(name: string): Promise<void>;
}

class S3Storage implements FileStorage {
  private client: S3Client;
  private bucket: string;

  constructor(bucket: string, region: string) {
    this.client = new S3Client({ region });
    this.bucket = bucket;
  }

  async upload(file: Buffer, name: string): Promise<string> {
    // Complex AWS SDK logic hidden from consumers
    return `https://${this.bucket}.s3.amazonaws.com/${name}`;
  }

  async download(name: string): Promise<Buffer> { /* ... */ }
  async delete(name: string): Promise<void> { /* ... */ }
}
```

---

## 3. Loose Coupling & Modularity

### Dependency Injection via Interfaces

```typescript
interface PaymentGateway {
  charge(amount: number, currency: string): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
}

class StripeGateway implements PaymentGateway {
  async charge(amount: number, currency: string): Promise<PaymentResult> {
    return { success: true, transactionId: "stripe_123" };
  }
  async refund(transactionId: string) { return { success: true }; }
}

class PayPalGateway implements PaymentGateway {
  async charge(amount: number, currency: string): Promise<PaymentResult> {
    return { success: true, transactionId: "pp_456" };
  }
  async refund(transactionId: string) { return { success: true }; }
}

// Depends on interface, not concrete class
class OrderService {
  constructor(private paymentGateway: PaymentGateway) {}

  async placeOrder(order: Order): Promise<void> {
    const result = await this.paymentGateway.charge(order.total, "USD");
    if (!result.success) throw new Error("Payment failed");
  }
}

// Swap implementations freely
const service = new OrderService(new StripeGateway());
```

### Interface vs Abstract Class

```typescript
// Interface — pure contract, zero runtime cost
interface Logger {
  info(msg: string): void;
  error(msg: string, err?: Error): void;
}

// Abstract class — contract + shared implementation
abstract class BaseLogger implements Logger {
  protected formatMessage(level: string, msg: string): string {
    return `[${new Date().toISOString()}] [${level}] ${msg}`;
  }

  abstract info(msg: string): void;
  abstract error(msg: string, err?: Error): void;
}

class ConsoleLogger extends BaseLogger {
  info(msg: string) { console.log(this.formatMessage("INFO", msg)); }
  error(msg: string, err?: Error) { console.error(this.formatMessage("ERROR", msg), err); }
}

class FileLogger extends BaseLogger {
  info(msg: string) { fs.appendFileSync("app.log", this.formatMessage("INFO", msg) + "\n"); }
  error(msg: string, err?: Error) { fs.appendFileSync("error.log", this.formatMessage("ERROR", msg) + "\n"); }
}
```

**Decision rule:** Start with an interface. Add an abstract class only when
subclasses need shared logic. A class can implement many interfaces but
extend only one class.

---

## 4. Reusability & Extensibility

### Generics — write once, use with any type

```typescript
class Result<T> {
  private constructor(
    public readonly value: T | null,
    public readonly error: string | null
  ) {}

  static ok<T>(value: T): Result<T> { return new Result(value, null); }
  static fail<T>(error: string): Result<T> { return new Result(null, error); }
  isOk(): boolean { return this.error === null; }
}

const userResult = Result.ok<User>({ id: "1", name: "Alice" });
const numResult = Result.fail<number>("Division by zero");
```

### Strategy Pattern — extend behavior without changing existing code

```typescript
interface PricingStrategy {
  calculate(basePrice: number, quantity: number): number;
}

class StandardPricing implements PricingStrategy {
  calculate(basePrice: number, quantity: number) {
    return basePrice * quantity;
  }
}

class BulkDiscount implements PricingStrategy {
  calculate(basePrice: number, quantity: number) {
    const discount = quantity >= 100 ? 0.2 : quantity >= 50 ? 0.1 : 0;
    return basePrice * quantity * (1 - discount);
  }
}

// Adding new pricing = new class. No changes to ShoppingCart.
class ShoppingCart {
  constructor(private pricing: PricingStrategy) {}

  getTotal(items: { price: number; quantity: number }[]): number {
    return items.reduce(
      (sum, item) => sum + this.pricing.calculate(item.price, item.quantity), 0
    );
  }
}
```

---

## 5. Portability

### Abstract platform-specific concerns

```typescript
interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

class RedisCache implements Cache {
  constructor(private client: RedisClient) {}
  async get(key: string) { return this.client.get(key); }
  async set(key: string, value: string, ttl?: number) { /* ... */ }
  async delete(key: string) { /* ... */ }
}

class MemoryCache implements Cache {
  private store = new Map<string, string>();
  async get(key: string) { return this.store.get(key) ?? null; }
  async set(key: string, value: string) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
}

// Business logic doesn't care which cache it gets
class UserProfileService {
  constructor(private cache: Cache) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const cached = await this.cache.get(`profile:${userId}`);
    if (cached) return JSON.parse(cached);
    // fetch from DB, cache, return
  }
}
```

---

## 6. Defensibility

### Value Objects with validation

```typescript
class Email {
  public readonly value: string;

  private constructor(value: string) { this.value = value; }

  static create(input: string): Email {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      throw new Error(`Invalid email: "${input}"`);
    }
    return new Email(trimmed);
  }
}
```

### Discriminated Unions for exhaustive handling

```typescript
type OrderStatus =
  | { kind: "pending" }
  | { kind: "confirmed"; confirmedAt: Date }
  | { kind: "shipped"; trackingNumber: string }
  | { kind: "delivered"; deliveredAt: Date }
  | { kind: "cancelled"; reason: string };

function getStatusMessage(status: OrderStatus): string {
  switch (status.kind) {
    case "pending":    return "Order is being processed.";
    case "confirmed":  return `Confirmed on ${status.confirmedAt.toLocaleDateString()}.`;
    case "shipped":    return `Shipped! Tracking: ${status.trackingNumber}`;
    case "delivered":  return `Delivered on ${status.deliveredAt.toLocaleDateString()}.`;
    case "cancelled":  return `Cancelled: ${status.reason}`;
    default:
      // Compile error if a new status is added but not handled here
      const _exhaustive: never = status;
      throw new Error(`Unhandled status: ${JSON.stringify(_exhaustive)}`);
  }
}
```

### Immutability

```typescript
interface AppConfig {
  readonly apiUrl: string;
  readonly maxRetries: number;
  readonly features: readonly string[];
}

const config: AppConfig = {
  apiUrl: "https://api.example.com",
  maxRetries: 3,
  features: ["dark-mode", "beta-dashboard"],
};

// config.apiUrl = "x";             // ❌ Compile error
// config.features.push("y");       // ❌ Compile error
```

### Validated Environment Config

```typescript
// config/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Fails fast at startup with a clear error if misconfigured
export const env = envSchema.parse(process.env);
```

---

## 7. Testability

### Constructor injection makes everything mockable

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

class PasswordResetService {
  constructor(
    private users: UserRepository,
    private email: EmailSender
  ) {}

  async requestReset(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new Error("User not found");

    const token = crypto.randomUUID();
    user.resetToken = token;
    await this.users.save(user);
    await this.email.send(user.email, "Password Reset", `Token: ${token}`);
  }
}
```

### Test doubles — no mocking library needed

```typescript
class MockUserRepository implements UserRepository {
  private users = new Map<string, User>();

  async seed(user: User) { this.users.set(user.id, user); }
  async findById(id: string) { return this.users.get(id) ?? null; }
  async save(user: User) { this.users.set(user.id, user); }
}

class MockEmailSender implements EmailSender {
  public sentEmails: { to: string; subject: string; body: string }[] = [];
  async send(to: string, subject: string, body: string) {
    this.sentEmails.push({ to, subject, body });
  }
}

describe("PasswordResetService", () => {
  it("sends a reset email with a token", async () => {
    const userRepo = new MockUserRepository();
    const emailSender = new MockEmailSender();
    const service = new PasswordResetService(userRepo, emailSender);

    await userRepo.seed({ id: "1", name: "Alice", email: "alice@test.com" });
    await service.requestReset("1");

    expect(emailSender.sentEmails).toHaveLength(1);
    expect(emailSender.sentEmails[0].to).toBe("alice@test.com");
  });

  it("throws if user not found", async () => {
    const userRepo = new MockUserRepository();
    const emailSender = new MockEmailSender();
    const service = new PasswordResetService(userRepo, emailSender);

    await expect(service.requestReset("nope")).rejects.toThrow("User not found");
    expect(emailSender.sentEmails).toHaveLength(0);
  });
});
```

---

## Bonus: Base Repository Pattern

A reusable base for database access across features:

```typescript
// lib/db/base.repository.ts
import { pool } from "./client";

export abstract class BaseRepository {
  protected async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await pool.query(sql, params);
    return result.rows as T[];
  }

  protected async queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }
}

// features/orders/repositories/order.repository.ts
import { BaseRepository } from "@/lib/db/base.repository";
import type { OrderRow } from "@/types/db";

export class OrderRepository extends BaseRepository {
  async findById(id: string): Promise<OrderRow | null> {
    return this.queryOne<OrderRow>("SELECT * FROM orders WHERE id = $1", [id]);
  }

  async insert(data: CreateOrderInput): Promise<OrderRow> {
    return this.queryOne<OrderRow>(
      "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *",
      [data.userId, data.total]
    )!;
  }
}
```
