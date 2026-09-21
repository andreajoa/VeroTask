import { authorizeCronToken, GITHUB_SCHEDULED_JOB_CREDENTIAL } from "@/lib/cron-token";

export async function authorizeEmailCron(authorization: string | null) {
  // A separate hashed credential authorizes only email recovery, never CRM or
  // settlement. GitHub can run this on Vercel Hobby without a high-frequency cron.
  return authorizeCronToken(authorization, [GITHUB_SCHEDULED_JOB_CREDENTIAL]);
}
