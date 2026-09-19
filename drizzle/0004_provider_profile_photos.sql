CREATE TABLE "provider_profile_photos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL,
  "uploaded_by_user_id" uuid NOT NULL,
  "content_type" varchar(40) NOT NULL,
  "byte_size" integer NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "image_base64" text NOT NULL,
  "attested_recent" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deactivated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "provider_profile_photos" ADD CONSTRAINT "provider_profile_photos_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_profile_photos" ADD CONSTRAINT "provider_profile_photos_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "provider_profile_photos_business_idx" ON "provider_profile_photos" USING btree ("business_id","active");
--> statement-breakpoint
CREATE INDEX "provider_profile_photos_sha_idx" ON "provider_profile_photos" USING btree ("sha256");
--> statement-breakpoint
CREATE UNIQUE INDEX "provider_profile_photos_one_active_per_business" ON "provider_profile_photos" USING btree ("business_id") WHERE "active" = true;
