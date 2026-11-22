# Intent: Wappi's answer widgets, one contract that does not break
Author: project owner. Status: accepted (2026-11-20, "cứ theo đề xuất tự động triển khai").
Source: conversation 2026-11-20. Record: none

## Problem
Wappi's answers carry widgets (charts, figures, a plan, links), but the mechanism does not scale: the backend
builds each widget as a bare dict, the web keeps a hand-written zod union and a `switch`, and the web parses the
whole answer strictly, so one unknown or malformed widget breaks the entire answer (the stream and stored history).
Free-form data questions (text2sql) already come back with a validated chart spec, but Wappi drops it, so those
answers have no chart at all.

## Proposed outcome
- Adding a widget kind is one backend model plus one registered web component; the type checker on each side
  says what is missing.
- A widget the web cannot read or render is dropped (logged), and the rest of the answer still shows.
- A text2sql answer shows its chart (line, area, bar, donut, kpi), or a table when the chart type is not one of
  those.
- This is the base for the next change: an alert card after Wappi creates a watch (project B, alerts).

## Affected users and systems
Everyone who chats with Wappi. wattprint-backend `app/modules/copilot` (tools, chat, schemas);
wattprint-web `apps/dashboard/features/copilot` (schemas, widgets, stream).

## Constraints
- Stored answers (`tb_message.reply`) written before this change keep rendering.
- Widgets are built by the backend from tool results, never written by the model (unchanged rule).
- Reuse Hairline components already vendored; no new dependency.
- Out of scope: a full port of text2sql's 32-type chart renderer; the alert card itself (project B).

## Open questions
None blocking.
