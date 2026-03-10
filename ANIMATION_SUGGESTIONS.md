# Animation suggestions for GRWTEE

You already use **framer-motion** (Header, MobileMenu, GalleryPreview) and Tailwind’s **fade-in-up** keyframe. Below are focused suggestions you can add without changing your design.

---

## 1. Hero

- **Staggered entrance**  
  Fade + slide up the buttons and divider when the section mounts so the hero doesn’t feel static after the video loads.

  - Wrap the inner content (buttons + divider) in a `motion.div` with `initial={{ opacity: 0, y: 24 }}`, `animate={{ opacity: 1, y: 0 }}`, and a short `transition` (e.g. 0.6s, delay ~0.3s).
  - Optionally wrap each button in its own `motion.div` and use `transition={{ delay: 0.1 * index }}` for a light stagger.

- **Optional:** subtle scale on the divider (e.g. `scaleX: 0 → 1` with a short duration) so it “draws” in.

---

## 2. Featured Services (home)

- **Section title**  
  Use your existing Tailwind class: `animate-fade-in-up` on the heading + paragraph container so the block fades in and moves up on load.

- **Service cards**  
  Stagger card entrance with framer-motion:
  - Wrap each card in `<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index, duration: 0.4 }}>`.
  - Keeps the section feeling light and editorial.

- **Card hover**  
  You already have `lux-card-hover`. You can add a subtle lift:  
  `whileHover={{ y: -4 }}` and `transition={{ type: "tween", duration: 0.2 }}` on the motion wrapper so cards lift on hover.

---

## 3. Gallery preview (home)

- You already have slide crossfade and dot transitions.
- **Optional:** Stagger the “Our Styled Looks” title + description with `animate-fade-in-up` or a short `motion` fade-in so the section doesn’t pop in abruptly.

---

## 4. Call to action

- **One-shot entrance**  
  Wrap the CTA block (heading + text + button) in a `motion.div` with:
  - `initial={{ opacity: 0, y: 16 }}`
  - `animate={{ opacity: 1, y: 0 }}`
  - `transition={{ duration: 0.5 }}`
  - Optionally use `whileInView` with `once: true` and a small `viewport` margin so it animates when scrolled into view.

---

## 5. FAQ page

- **Accordion open/close**  
  Use `AnimatePresence` + `motion` for the answer content:
  - `initial={{ height: 0, opacity: 0 }}`
  - `animate={{ height: "auto", opacity: 1 }}`
  - `exit={{ height: 0, opacity: 0 }}`
  - `transition={{ duration: 0.25 }}`
  So answers expand/collapse smoothly instead of snapping.

- **Section titles**  
  Add `animate-fade-in-up` to each FAQ section title so sections appear with a light stagger as you scroll (or on load).

- **Plus icon**  
  You already rotate on `group-open:rotate-45`. You can wrap it in `motion.span` with `animate={{ rotate: isOpen ? 45 : 0 }}` and a short transition for a smoother rotation.

---

## 6. Gallery / portfolio grid

- **Grid items**  
  Stagger item appearance (e.g. `initial={{ opacity: 0, scale: 0.98 }}`, `animate={{ opacity: 1, scale: 1 }}`, `transition={{ delay: 0.03 * index }}`) so the grid “fills in” when the page loads.

- **Lightbox**  
  When opening the lightbox, animate the backdrop (opacity 0 → 1) and the media (e.g. `initial={{ scale: 0.95, opacity: 0 }}`, `animate={{ scale: 1, opacity: 1 }}`) for a short, smooth open. On close, reverse with `exit` so it doesn’t disappear abruptly.

---

## 7. Global / layout

- **Header on scroll**  
  You already change background on scroll. Optionally animate the border or shadow (e.g. `motion.header` with `animate={{ boxShadow: scrolled ? "0 4px 12px rgba(0,0,0,0.08)" : "0 0 0 transparent" }}`) for a subtle “lifting” effect.

- **Footer links**  
  Keep current `transition hover:text-gold-light`. Optional: add `transition` to the social icon wrapper with a small `whileHover={{ scale: 1.05 }}` for a light feedback.

---

## 8. Buttons (optional polish)

- Primary/outline buttons already have hover transitions. You can wrap `ButtonLink` contents in `motion.span` with `whileTap={{ scale: 0.98 }}` for a quick press feedback (or do it once inside the shared `Button` component).

---

## Tailwind keyframes (optional)

You have `fadeInUp`. You can add in `tailwind.config.ts` for reuse:

- **fadeIn** – opacity only (e.g. for overlays):
  - `0%: { opacity: "0" }`, `100%: { opacity: "1" }`
- **scaleIn** – for modals/lightbox:
  - `0%: { opacity: "0", transform: "scale(0.96)" }`, `100%: { opacity: "1", transform: "scale(1)" }`

Then expose as `animation: { "fade-in": "fadeIn 0.3s ease-out", "scale-in": "scaleIn 0.25s ease-out" }`.

---

## Summary

| Area           | Suggestion summary                                      |
|----------------|---------------------------------------------------------|
| Hero           | Staggered fade-in for buttons + divider                 |
| FeaturedServices | Fade-in-up for title; staggered card entrance + hover lift |
| Gallery preview | Optional title/description fade-in                     |
| Call to action | Fade + slide on load or when in view                   |
| FAQ            | Animated accordion height + optional title stagger     |
| Gallery grid   | Staggered grid item appearance; lightbox open/close   |
| Header/Footer  | Optional shadow on scroll; optional icon hover scale   |

Stick to **short durations** (0.2–0.5s) and **small motion** (y: 16–24px, scale ~0.98–1.03) so the site stays calm and on-brand.
