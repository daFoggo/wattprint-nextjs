# Citation order

Goal: Wappi's inline source marks and the "Nguồn" legend always read 1, 2, 3 ascending, in the order the answer cites them.
Problem: backend numbers sources by tool-call order (`cite` in chat.py), so text could cite [3] [2] [1] or [3] [1] [2].
Requirements: citedSegments (apps/dashboard/features/copilot/text.ts) renumbers by first use in the text; a source is marked once; marks with no source are dropped; legend uses the new numbers.
Areas of concern: stored chats re-render with new numbers (display only); nothing else reads `cited.n`.
