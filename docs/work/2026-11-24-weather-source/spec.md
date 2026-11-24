# Spec (lane M): say where and from whom the demo home's weather comes
User: "(Loughborough, Anh) · OpenWeather — sao lại lấy data ở Anh?" Ruling (user, 2026-11-24): keep the recording
site's weather for a demo home (its readings, model and heater scenario use it), but say so plainly and name the
true source.

1. `GET /energy/weather` gains `source`: `"openweather"` for a home's province (live), `"era5"` for a demo home's
   stored recording-site hours (ERA5 via Open-Meteo, `scripts/import_refit_weather.py`).
2. The demo place label reads "Nơi đo dữ liệu nhà demo (Loughborough, Anh)" / "Where the demo home was recorded
   (Loughborough, UK)".
3. The card's line names the source: "… · ERA5 qua Open-Meteo" or "… · OpenWeather".
Tests: `tests/test_weather_api.py` asserts `source` and the label for both paths.
