---
paths:
  - ".agents/skills/**"
  - ".claude/skills/**"
---

# Project skills

`.claude/skills/` is a copy of `.agents/skills/`: change a skill in both. The verify command fails when they differ (`diff -rq --strip-trailing-cr .agents/skills .claude/skills`).
