# Spec (lane M): echo_run repeats join into one run

Goal: `scripts.scenario start --name echo_run --param device=<type> --param times=N` replays the device's typical
run N times back to back as ONE longer run (a stuck kettle), so the device anomaly detector (D2 long run) can see it.

Problem: `_shape` subtracts the minimum minute as base, so the shape always holds at least one 0 minute. For a
kettle the shape is [2017, 0]; repeating it gives 1-minute pulses with 1-minute gaps (12 normal boils), not a long run.

Requirement: drop the leading and trailing minutes under 10 % of the shape's peak (base noise); keep pauses inside
the run (a washer's soak). Shapes already stored in tb_demo_scenario are unchanged.

Areas of concern: the 10 % cut could trim a device's genuine low-power tail (washer spin-down ~111 W vs 2.4 kW peak);
acceptable for a demo echo.
