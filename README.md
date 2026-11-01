# Thomas Mata S.A.: panel de asesores (Next.js)

This is the internal panel for advisors and administrators, built in Next.js 16 (App Router) with TypeScript and connected to Supabase. The schema lives in `../supabase`; the public site is `../RealState.Web`.

```bash
cp .env.example .env.local   # Supabase URL + publishable key, panel/site URLs, REVALIDATE_SECRET
npm install
npm run dev                  # http://localhost:3001  (the public site runs on 3000)
npm run build && npm start   # production mode
```

Sign in with a team account. Seed accounts are listed in `../supabase/seed.sql`. A website client account cannot get in.

## Pages

| Route | Screen |
| --- | --- |
| `/login` | Email/password sign-in, "Forgot your password?" and "Back to site" |
| `/auth/callback` | Target of Auth emails (password recovery, `token_hash` links) |
| `/auth/nueva-contrasena` | Create a password: team invitation and recovery |
| `/` | Overview: figures, upcoming visits, to-dos, recent clients |
| `/propiedades` | Inventory with status, operation, advisor and text filters; duplicate and delete |
| `/propiedades/nueva`, `/propiedades/[code]` | Editor: details, features, photos (upload to Storage or https URL, cover, order), map, publishing, visits, live preview |
| `/visitas` | List and calendar, status change, create/edit/delete |
| `/clientes` | Clients and the **client file**: assignment, status, preferences, matches, visits, internal notes |
| `/matches` | Client ↔ property pairs scored by the database (`get_client_matches`), with dismiss |
| `/asesores`, `/zonas` | Admin only: invite and edit the team, activate/deactivate accounts, featured zones (order, visibility, image) |
| `/perfil` | Own public profile and password change (asks for the current one) |

## Architecture

**The database decides; the panel validates and displays.**

- **Session.**
  - `proxy.ts` refreshes the Supabase session on every request and redirects to `/login` when there is none.
  - `lib/auth.ts` (`getSession`, once per request) checks the JWT with `getClaims` and loads the user's **active** row in `agents`.
  - Without one (no session, website client, deactivated advisor), the layout sends the user to `/login`.
  - The session cookie has its own name (`sb-isf-panel-auth`), so it does not mix with the public site's cookie on the same host.
- **Reads.**
  - `lib/data.ts` makes one parallel load per navigation in `app/(app)/layout.tsx`, using the user's client.
  - **RLS** filters what each person sees. An advisor sees their own clients and unassigned ones, and the visits for their properties and clients; an admin sees everything.
  - Nothing is cached between users.
  - Match scores come from the `client_property_matches` view, which uses the same rules the client sees under "Para ti".
- **Writes: Server Actions** in `app/actions/*`.
  - They go through `runAction` (`lib/action.ts`). It requires an active advisor, validates every input (closed lists, uuids, CR phone, lengths, ranges), translates database errors into clear messages, and refreshes the screen with `refresh()`.
  - Changes that touch several tables are **atomic RPCs**, all `SECURITY INVOKER` so RLS still applies (migration `panel_writes`):
    - `save_property`: data + amenities + gallery.
    - `save_client`: client + preferences + required amenities.
    - `delete_client`: keeps the visits.
    - `reorder_featured_zones`.
  - Plain updates check that a row was actually affected. When RLS blocks a row there is no error, so without this check a change could be reported as saved when it was not.
- **Photos.** They are uploaded from the browser straight to Storage (`property-images/<property id>/…`, `zone-images/…`). The bucket policies only let the property's owner or an admin write. The gallery is then saved in order with `save_property`.
- **Team.**
  - Invitations go through the `invite-team-member` Edge Function. It is the only piece that uses the service role, and that role never leaves Supabase.
  - Members are never deleted: they are **deactivated**. That cuts their panel access through RLS and removes them from the site, while their properties, clients and visits are kept.
- **Public site.** Every change to properties, advisors or zones calls `POST {SITE}/api/revalidate` with `REVALIDATE_SECRET`, after the response (`after`). If the site does not respond, its cache expires on its own: 1 minute for properties, 1 hour for the rest.
- **Security headers** are set in `next.config.ts`: no iframes (`X-Frame-Options: DENY`), `noindex`, HSTS, nosniff.

## Supabase setup (dashboard)

- **Authentication → URL Configuration → Redirect URLs.** Add `http://localhost:3001/auth/callback` and `http://localhost:3001/auth/nueva-contrasena`, plus the production equivalents. Without them, the invitation and recovery emails point to the Site URL.
- **Authentication → Emails → SMTP.** Supabase's default SMTP only delivers to the project's team emails and has a very low limit. To invite real advisors, set up your own SMTP (Resend, SES, …).
- **Optional:** enable leaked password protection (HaveIBeenPwned).

## Pending

- **Agent photos.** The `agent-photos` bucket and its policies already exist, but there is no upload in the profile yet (avatars use initials).
- **Orphaned files in Storage.** Removing a photo from the gallery or deleting a property does not delete the file. Duplicated properties share URLs, so deleting files could break the copies. A periodic cleanup job that only removes files no row references is safer.
- **Volume.** The panel loads up to 2,000 rows per table and visits from the last 180 days. That is enough for a team of a few dozen people; beyond that, clients and visits should be paginated on the server.
