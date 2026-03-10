# Analytics (Google Analytics 4)

The site uses **Google Analytics 4 (GA4)** via `@next/third-parties`. Page views are tracked on initial load and on client-side route changes. You can also send custom events for conversions and key actions.

## Setup

1. **Get a GA4 Measurement ID**  
   In [Google Analytics](https://analytics.google.com/), create a GA4 property and copy the Measurement ID (e.g. `G-XXXXXXXXXX`).

2. **Configure the ID** (one of):
   - **Environment**: Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` in `.env` or in Vercel.
   - **Database**: In admin go to **Settings** → **Show Env Vars** and set `NEXT_PUBLIC_GA_MEASUREMENT_ID` (stored as `env_NEXT_PUBLIC_GA_MEASUREMENT_ID`). Database value overrides env.

3. **Deploy**  
   If the ID is set, the GA script loads and page views are tracked. If not set, no analytics code runs.

## What’s tracked automatically

- **Page views** on first load and on every client-side navigation (route change).

## Custom events

Use the `trackEvent` helper from `@/lib/analytics` in client components to track conversions or important actions:

```ts
import { trackEvent } from "@/lib/analytics";

// Simple event
trackEvent("book_consultation_click");

// With parameters (show up in GA4 as event params)
trackEvent("contact_submit", { form_name: "footer" });
trackEvent("generate_certificate", { service_id: "xyz" });
```

Examples of events you might add:

- `book_consultation_click` – CTA to book a consultation
- `contact_submit` – contact form submitted (param: `form_name`)
- `certificate_download` – certificate generated/downloaded
- `gallery_image_open` – gallery lightbox opened

Events only send when GA is loaded (i.e. when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set).
