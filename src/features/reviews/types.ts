import type { ReviewRow, ListingRow } from "@/types";

export interface ReviewWithListing {
  review: ReviewRow;
  listing: ListingRow;
}
