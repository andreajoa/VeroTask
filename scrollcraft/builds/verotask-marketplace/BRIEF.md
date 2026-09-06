# VeroTask Marketplace Redesign Brief

Self-authored under explicit creative delegation from the product owner.

## 0. Implementation guardrails
- Inspect the existing application before visual changes and preserve the working marketplace architecture.
- Keep the existing Next.js/React application and existing database, Stripe, CRM, booking, reputation, evidence and audit flows unless a functional bug requires a targeted fix.
- Reuse existing VeroTask assets where they remain appropriate. New imagery may use properly licensed public photography or generated assets when needed. Do not use KIE.
- Competitor references are for familiar marketplace patterns and user expectations, not visual cloning.
- Visual redesign must not alter transaction semantics, authorization rules, payout logic, dispute logic or auditability.
- Public interactive controls must maintain clear foreground/background contrast and visible keyboard focus.
- Hero imagery and motion must be implemented with performance and LCP in mind; motion may not block search or navigation.

## 1. Vibe
Trusted, premium, American, calm, capable, human.

References supplied by the owner: current Thumbtack/Angi marketplace patterns, TaskRabbit service/category discovery, guided project qualification flows. These are functional references, not visual templates to copy.

## 2. Journey
1. Recognition — visitor immediately sees that VeroTask helps with both home services and everyday tasks.
2. Clarity — natural-language request becomes a short guided brief.
3. Confidence — category photography, verified-work language, transparent protection and clear provider signals reduce risk.
4. Matching — client sees why suggested professionals fit the job, location and timing.
5. Trust — payment protection, evidence-backed completion and dispute handling are explained plainly.
6. Choice — customers can hire; professionals can join or claim a profile.
7. Commitment — one clear action: Find trusted help.

## 3. Energy curve
- Hero: calm confidence — premium photographic service scenes crossfade behind a highly usable search surface.
- Guided brief: focused — one question at a time, no visual noise.
- Category range: discovery — photographic cards reveal the breadth of help available.
- Trust/protection: reassurance — quieter section with plain evidence and rules.
- Provider proposition: possibility — warmer human image and concise business benefits.
- Close: decisive — one search action and one provider entry point.

## 4. Feeling curve and peak
- Hero: "This looks familiar and safe to use."
- Guided brief: "They understand what I actually need."
- Category range: "I can use this for much more than repairs."
- Trust: "The rules are clear if something goes wrong."
- Provider side: "This can bring real work without chaos."

Peak: the guided brief converting a vague request into a structured job, then revealing matched professionals.
Tell-someone sentence: "It is the marketplace that turns what you type into a properly defined local job before it shows you who fits."

## 5. Signature move
**Brief Builder Transition** — the hero request smoothly becomes a focused one-question-at-a-time job brief. The same request remains visible as a compact context pill while size, timing and location are collected. The final action transforms that brief into the filtered provider results URL.

## 6. Aesthetic range
Premium-minimal, but service-marketplace rather than luxury. White and cool-gray grounds, deep navy ink, restrained sky-blue accent, photography used as proof/context rather than decoration. No green SaaS palette, no violet/blue AI gradient.

## 7. World structure
Distinct scenes, not one continuous cinematic world. This is a working marketplace; usability and confidence outrank theatrical scroll effects.

## 8. Assets
Use existing VeroTask brand assets where still appropriate. Use owner-supplied screenshots only as references, not copied assets. New service photography may use properly licensed public images or generated assets; do not use KIE.

## Page grammar
Custom **Marketplace Utility Editorial** grammar: persistent useful header, photographic hero/search, guided modal utility surface, visual category catalog, trust editorial, provider acquisition summary, utility footer. Major navigation subjects open dedicated pages instead of relying on homepage anchor jumps.

Public information architecture:
- `/services` — discovery and matching
- `/how-it-works` — end-to-end marketplace journey
- `/protection` — protection, evidence, disputes and refunds
- `/providers` — provider proposition and optional plans
- `/providers/join` — provider onboarding

## Fingerprint gate
No prior VeroTask Scroll Craft fingerprint is registered in this repository. Planned fingerprint:
- Grammar: Marketplace Utility Editorial
- Nav: service-marketplace utility header with customer/provider split and dedicated destination pages
- Hero: rotating photographic service scenes + persistent search surface
- Sequence: search → guided brief → visual category catalog → trust → provider growth → local close
- Close: dual-path marketplace close (find help / offer help)
- Signature move: Brief Builder Transition

## Mobile art direction
Search is first-screen priority. Hero photography crops to a single clear worker/task scene; no desktop-style multi-column overlays. Guided brief becomes a bottom-sheet/full-screen stepper with large tap targets and a persistent Continue button. Dedicated public pages retain the same navigation hierarchy without horizontal overflow.

## Reduced motion
Hero rotation stops on reduced-motion preference and shows one stable service scene. Guided brief remains fully functional with no reliance on animation.

## Verification pass
Before the redesign is considered complete:
1. Confirm Next.js/React and marketplace business architecture were preserved.
2. Verify public routes and all primary navigation destinations in EN, PT-BR and ES.
3. Verify primary/secondary/destructive CTA contrast, hover, disabled and keyboard-focus states.
4. Verify the Brief Builder signature move from hero request through provider-results URL.
5. Verify mobile art direction at narrow phone width, tablet width and desktop width.
6. Verify reduced-motion behavior.
7. Check hero/category imagery for cropping, text readability and obvious broken remote assets; keep photography subordinate to search usability.
8. Check for horizontal overflow and obscured sticky/fixed controls.
9. Verify provider/customer transactional states were not changed by visual work.
10. Run deterministic CI: `npm ci`, typecheck, lint, tests and production build.
11. Treat successful build as necessary but not sufficient: perform a runtime smoke pass on the deployed public routes when environment access is available.
