import type { ReviewStatus, Verdict, Severity } from "./db";

export interface SubmitListingInput {
  title: string;
  description: string;
  category: string;
  imageUrls?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface SubmitListingOutput {
  reviewId: string;
}

export interface ReviewStatusOutput {
  reviewId: string;
  status: ReviewStatus;
  verdict: Verdict | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScanReviewOutput extends ReviewStatusOutput {
  explanation: string | null;
  trace: Record<string, unknown>;
}

export interface ScanListingOutput {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrls: string[];
}

export interface ScanViolationOutput {
  id: string;
  policySection: string;
  severity: Severity;
  description: string;
}

export interface ScanResultOutput {
  review: ScanReviewOutput;
  listing: ScanListingOutput;
  violations: ScanViolationOutput[];
}
