<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- All backend calls go through `src/lib/api.ts`, which targets the external Express/Mongo backend at `VITE_API_URL` and falls back to an in-memory mock store when unreachable or in a demo session — keeps every page usable without the API.
- Domain types in `src/lib/types.ts` mirror the backend's Mongoose models/constants; update them together with the backend schema.
- Chance rules in `src/lib/chance.ts` must stay identical to the backend's `utils/chance.js` (covered by `chance.test.ts`).
- Auth token lives in localStorage, so signed-in layouts (`_student.tsx`, `admin.tsx`) are client-rendered (`ssr: false`) and gated by `RoleGate`; the backend enforces roles.
