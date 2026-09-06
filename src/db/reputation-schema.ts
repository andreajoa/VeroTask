import { index, integer, numeric, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { bookings, businesses, users } from "@/db/schema";

export const ratingDirection = pgEnum("rating_direction", [
  "customer_to_provider",
  "provider_to_customer"
]);

export const bilateralRatings = pgTable("bilateral_ratings", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
  direction: ratingDirection("direction").notNull(),
  raterUserId: uuid("rater_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => [
  uniqueIndex("bilateral_ratings_booking_direction_unique").on(t.bookingId, t.direction),
  index("bilateral_ratings_customer_idx").on(t.customerId, t.createdAt),
  index("bilateral_ratings_business_idx").on(t.businessId, t.createdAt)
]);

export const customerReputation = pgTable("customer_reputation", {
  customerId: uuid("customer_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  ratingCount: integer("rating_count").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
