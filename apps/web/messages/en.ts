import common from "./en/common.json"
import landing from "./en/landing.json"
import legal from "./en/legal.json"

import type vi from "./vi"

// One file per namespace, so features are translated without touching each other.
export default { common, landing, legal } satisfies typeof vi
