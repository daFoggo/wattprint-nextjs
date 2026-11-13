import common from "./en/common.json"
import layout from "./en/layout.json"
import auth from "./en/auth.json"
import billing from "./en/billing.json"
import energy from "./en/energy.json"
import weather from "./en/weather.json"

import type vi from "./vi"

// One file per namespace, so features are translated without touching each other.
export default { common, layout, auth, billing, energy, weather } satisfies typeof vi
