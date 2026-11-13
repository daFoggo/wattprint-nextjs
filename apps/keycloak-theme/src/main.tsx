import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./styles.css"
import { KcPage } from "./kc.gen"

// `pnpm dev` previews a page with mock data: open /?page=login.ftl (any pageId) and add &lang=en, &error=1.
// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vite's build mode, not a runtime env var
if (import.meta.env.DEV && !window.kcContext) {
  const { mockKcContext } = await import("./login/mock")
  window.kcContext = mockKcContext(new URLSearchParams(location.search))
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {window.kcContext ? <KcPage kcContext={window.kcContext} /> : null}
  </StrictMode>
)
