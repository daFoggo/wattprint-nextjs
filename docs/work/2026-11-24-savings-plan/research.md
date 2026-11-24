# Research: savings plan from NILM data only

Date: 2026-11-24. Inputs: product documents (read-only/wattprint-document), backend and web code, and a literature and
product scan. Items marked (unverified) came from a single secondary source.

## What the evidence says

- **Size of the effect is small.** Feedback saves about 3–20% in early reviews (Darby 2006). The systematic review of
  disaggregated feedback finds about 4.5% across 12 opt-in studies, and no clear win over whole-home feedback
  ([arXiv 1605.00962](https://arxiv.org/pdf/1605.00962)). The best-identified field number is Opower's 2% from an
  80,000-home randomized trial ([Allcott](https://ceepr.mit.edu/workingpaper/social-norms-and-energy-conservation)).
  The project's own impact report recommends claiming 2 / 3.5 / 5.5%, which is 14k / 24k / 38k đ per month.
- **What works:** a specific, hard goal combined with feedback and a commitment (Abrahamse et al. 2005). An if-then plan
  ("when I leave the room, I switch the AC off") helps people follow through.
- **Effects decay** within about two weeks of each nudge and come back when the nudge repeats
  ([Allcott & Rogers](https://www.nber.org/papers/w18492)). A plan therefore needs regular check-ins, not a one-off
  setup.
- **Verification (M&V, IPMVP Option C):** compare actual use against a weather-adjusted counterfactual and report a
  confidence band. With 10–15% day-to-day noise, a 2–3% saving cannot be detected within a few weeks, so the app must
  say "too early to tell" until the effect exceeds the minimum detectable effect (MDE).
  ([LBNL M&V 2.0](https://buildings.lbl.gov/sites/default/files/LBNL%20Guidance%20on%20M%26V%202.0%20savings%20claims%202019-06-30.pdf))
- **Products:**
  - Sense has goals and Always-On alerts, but no per-action estimate and no follow-up.
  - Opower and Bidgely say users do not know how to act, and their tips go stale.
  - EVN apps only offer a kWh threshold, with no appliance breakdown.
  - None of them pairs an appliance-level plan with verification, which is the gap this feature could fill.

## Estimating an action from NILM alone

| Action | Inputs NILM gives | Estimate | Confidence |
|---|---|---|---|
| Cut always-on load | night floor of the aggregate, excluding cycling devices (fridge) | Δfloor × hours × price | High (whole-home signal) |
| Run a device for less time | the device's weekly hours and mean power when on | Δhours × power | Depends on that device's model quality |
| Fewer runs (washer, dishwasher, kettle) | runs per week and kWh per run | Δruns × kWh per run | Medium (NILM fragments runs) |
| Fridge running more than usual | duty cycle compared with its own history | No number without a baseline; it is a check, not an action | Medium |
| AC or heater setpoint | not visible to NILM | 3–8% per °C, always shown as a range (unverified) | Low; ask the user |
| Replace a device | needs the model, which NILM cannot see | Only as "uses X kWh a year; an efficient model uses about Y" | Low |
| Shift to another time of day | n/a | **Not offered**: the EVN residential tariff is tiered, not time-of-use | n/a |

- **Money** is priced at the **marginal tier**: the bill is computed with and without the saving (QĐ 2892, 5 tiers from
  2026-11-01). A saving near a tier boundary is worth more and gets an "avoid tier N" label.

## What already exists in WattPrint

**Backend**
- `tb_suggestion` (kind `plan`), `tb_suggestion_feedback` and `tb_savings_measure`.
- Wappi's `propose_plan` tool. Its kWh comes from the LLM and its price from the cycle average. Both break the rules
  below.
- `measure_plans` compares the whole home 14 days before and after, with no weather adjustment.
- There is no API to list or read plans.
- `billing/services/device_forecast.py` already computes per-device advice priced at the marginal tier: `fewer_runs`,
  `heater_setpoint`, `heater_earlier_off`, `kettle_fill`, `fridge_check`.
- `tb_expect_hourly` holds expected usage as P05–P95 with weather, calendar, routine and trend factors. It is the
  counterfactual base for M&V.

**Web**
- A plan exists only as a `PlanWidget` inside the Wappi chat. There is no page for it, and measured results are never
  shown.

**Demo data**
- REFIT houses 2 and 5 (plus a simulated heater) have Fridge, WashMach, Dishwash, Microwave, Toaster, Kettle and Other.
  **They have no AC and no water heater**, so the old prototype's flagship example (AC plus water heater) cannot be
  reproduced on them.

## Rules carried over from the anomaly and forecast work

- Numbers come from the data, never from the LLM.
- Every number shows kWh together with đ.
- No time-shifting advice.
- Per-device numbers come only from NILM output.
- Simulated data is always labelled.
- Uncertainty is shown as a range.
- Comparisons are made against the device's own history, not against fixed thresholds.

## Failure modes to avoid

1. Giving point numbers that the data cannot support.
2. Taking credit for a cooler month or for regression to the mean (people set goals after a high month).
3. Missing rebound, where one device saves and another uses more.
4. Setting a goal smaller than the MDE, so the user never sees progress.
5. Generic tips with no numbers and no follow-up.
6. Pricing at the average rate instead of the marginal tier.
