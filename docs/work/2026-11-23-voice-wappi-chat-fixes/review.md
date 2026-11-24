# Review

Base: 3877bbe13be48e33b5354aeefde05f9313b8488e (snapshot of the dirty tree: docs/debt.md already modified)
R1 package snapshot: cce75bdd89f20446df920266c5b705548bc204b2

## R1 (full, opus): ship, no Must/Should fix
Minor:
1. Draft lost when a new thread is renamed (`new:<uuid>` → backend id) while typing a follow-up. Fixed anyway (user
   asked for zero debt): the composer moves a `new:` thread's draft to its new id. Playwright: typed after sending
   in a new chat, text kept after the rename.
2. Gesture fired on mount (a stored chat full of `approving` answers all nod). Fixed: only a change of state pokes.
3. Debt entry for watch statuses still listed open: moved to Paid in docs/debt.md.
4. `opaqueredirect` branch untested.
   Ruling: no component test harness in apps/dashboard (no jsdom/testing-library); one condition, exercised by the
   Playwright check that an expired access cookie now gets 200 (the redirect path is the fallback) — cost if wrong:
   an ended session shows "Có lỗi khi trả lời" instead of "Phiên đăng nhập đã hết".
Not checked by R1: >10 MB recording through the proxy (route still checks Content-Length → 413).
