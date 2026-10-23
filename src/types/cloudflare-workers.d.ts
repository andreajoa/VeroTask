/** Runtime binding is supplied by workerd; production Cloudflare types may be
 * regenerated with `cf workers types`. This declaration is for source builds. */
declare module 'cloudflare:workers' {
  export const env: { DB: unknown };
}
