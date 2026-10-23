import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "verotask-vinext-preview",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-22",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      NEXT_PUBLIC_APP_URL: bindings.text("https://verotask-vinext-preview.andrealmeidashop.workers.dev"),
      NEXT_PUBLIC_SUPPORT_EMAIL: bindings.text("verotask@proton.me"),
      R2: bindings.r2({ name: "verotask-booking-evidence" }),
      DB: bindings.d1({ name: "verotask-migration-staging", id: "e989dd70-1805-48b4-88f3-1214985802ab" }),
    },
  }),
});
