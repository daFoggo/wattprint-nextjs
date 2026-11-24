# Spec: a plan's device results against the device's weather-aware expectation
Intent (user, 2026-11-24): "xử lý triệt để debt đi". Debt entry: "Device results are not weather-adjusted (the
device's usual before the plan). Pay: the device model's expectation, frozen like the home's."
Status: approved by delegation. Lane L (insight freeze job, expect API, plan schema, web). Bases: backend snapshot
ae835f1, web snapshot 597692c.

## Requirements
1. `freeze_plans`, for each newly complete day, also freezes each planned device with a trusted model
   (`trusted_device`: it beat the weekday-hour mean): `days[<date>]["devices"][<device_id>] = {expected, actual}`,
   expected = the device model's P50 over the hours NILM measured that day (≥ 20), with observed weather but the
   usage-derived inputs as known at the plan's start (the device's own 7-day level, the home's presence), plus the
   device model's mean out-of-sample error scaled to those hours; actual = NILM's kWh over the same hours. A day is
   frozen once, so a later refit does not move it. A device without a trusted model, or under 20 hours, gets no
   entry. The home's measurement and its inputs are unchanged.
1b. (R1) A plan with device actions freezes a day only once NILM has finished it (its `nilm` checkpoint is past the
   day), or 2 days after it without (an outage must not hold the home's result back); a day is frozen once, so a
   day frozen while NILM lags would lose its devices for good.
2. `GET /plans/current`, `/history`, `/{id}`: each day carries `devices` (`{}` when none).
3. The plan page's "Từng việc" and the week chips: a device with frozen entries shows actual against expected per
   day (mean over its frozen days, "Thực tế" / "Dự kiến"), said to follow the weather; one without keeps today's
   comparison with its usual before the plan, said not to follow the weather. The always-on row is unchanged.
4. The seed's past demo plans get no device entries (the device models of that time are not kept: today's would
   have seen the plan period); their device rows read as before.

## Areas of concern
1. Only 5 of 18 device models are trusted today; most devices keep the usual-before comparison. The page says which.
2. Plans frozen before this change have no device entries for their earlier days; their device rows mix: the mean
   is over the days that have entries only.
3. Cost: per plan per rollover, one device frame and NILM read per trusted planned device (≤ 3), on top of the
   home's two feature frames.

## Found while checking it on the heater demo home (fixed in this change)
- Two actions on one device (the heater's setpoint and earlier-off) gave two identical week chips: one chip a device.
- The heater had no icon (`electric_heater` missing from `DeviceIcon`): a flame.
- The setpoint commitment said "thấp hơn 1°C" under an action of 2°C: the commitment no longer names a number (the
  action above it does); the seed's labels take the advice's own numbers (`degrees`, `hours`).
