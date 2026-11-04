# CLAUDE.md

## User
The user is **jianweisde**. Always refer to them by name, not "user".

## Rules

1. Before writing any code, discuss the plan with the user first. Chat about the approach, get alignment, then implement.
2. Before every git push, summarize what was changed and why to the user.
3. Do not include "Co-Authored-By: Claude" in commit messages.
4. Write all code comments and commit messages in English. Keep them human-friendly, clear, and concise — as if a real developer wrote them. Avoid robotic or overly formal language.
5. Before designing any UI component or page, look at the README screenshots in `docs/` (e.g. `dashboard.png`, `jobs.png`, `dashboard-dark.png`) and the existing components, so new UI matches the look already in place, in both light and dark mode. When a change alters what a screenshot shows, retake that screenshot.
6. Execute plans one step at a time. After completing each step, stop and wait for the user's confirmation before moving on to the next step. Never execute multiple steps at once.

## Future Features (TODO)
- **Social / Chat feature**: Add friend system + chat, so users can see each other's Job Title & Bio, share job search progress, and exchange interview tips. When this is implemented, re-add Job Title and Bio fields to the Settings profile page.