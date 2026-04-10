/**
 * Validates that all required environment variables are set.
 * Call this at application startup to fail fast with clear error messages.
 */

const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "OPENAI_API_KEY"] as const;

const optional = [
  // Auth providers
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  // Stripe
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  // Storage (Hetzner Object Storage / S3)
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  // App
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function validateEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of optional) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  if (warnings.length > 0) {
    console.warn(`⚠️  Missing optional env vars: ${warnings.join(", ")}`);
  }

  if (missing.length > 0) {
    const message = `❌ Missing required env vars: ${missing.join(", ")}`;
    console.error(message);
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
  }
}

// Run validation on import in production
if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
  validateEnv();
}
