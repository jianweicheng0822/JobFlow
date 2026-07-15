# CLAUDE.md

## User
The user is **jianweisde**. Always refer to them by name, not "user".

## Rules

1. Before writing any code, discuss the plan with the user first. Chat about the approach, get alignment, then implement.
2. Before every git push, summarize what was changed and why to the user.
3. Do not include "Co-Authored-By: Claude" in commit messages.
4. Write all code comments and commit messages in English. Keep them human-friendly, clear, and concise — as if a real developer wrote them. Avoid robotic or overly formal language.
5. Before designing any UI component or page, always review the design reference image (`Gemini_Generated_Image_5hnol55hnol55hno.png` in project root) to ensure the implementation matches the intended final look.
6. Execute plans one step at a time. After completing each step, stop and wait for the user's confirmation before moving on to the next step. Never execute multiple steps at once.