import common from "./vi/common.json"
import layout from "./vi/layout.json"
import auth from "./vi/auth.json"
import billing from "./vi/billing.json"
import energy from "./vi/energy.json"
import home from "./vi/home.json"
import insight from "./vi/insight.json"
import weather from "./vi/weather.json"

// One file per namespace, so features are translated without touching each other.
export default { common, layout, auth, billing, energy, home, insight, weather }
