# AGENTS.md
 
Guidelines for AI coding agents working in this repository. This is a Chrome extension, so small mistakes (a new permission, a changed manifest field, a broken content script) can affect users' browsers and Chrome Web Store review. When in doubt, stop and ask.
 
## Core Principles
 
1. **Plan first, then act.** For anything beyond a trivial fix, present a short plan and wait for approval before editing files.
2. **Keep changes small and focused.** Make the smallest change that solves the problem. One concern per change.
3. **Don't surprise the maintainer.** No unrequested refactors, renames, reformatting, dependency swaps, or "while I'm here" cleanups.
4. **Ask when unclear.** If requirements are ambiguous or there are multiple reasonable approaches, ask rather than guess.
5. **Be honest.** Say what you changed, what you didn't, and what you couldn't verify. Never claim something works without testing it.
## Workflow
 
1. **Understand**: Read the relevant code, `manifest.json`, and any docs before proposing anything.
2. **Plan**: Share a brief plan covering:
   - What you intend to change and why
   - Which files will be touched
   - Risks or side effects (especially permissions, storage, messaging)
   - How you'll verify it
3. **Wait for approval** on the plan if the change is non-trivial (see "Ask First" below).
4. **Implement** in small, reviewable steps.
5. **Verify**: Run the build, linter, and tests, and describe how to manually check the change in `chrome://extensions`.
6. **Summarize**: List files changed, behavior changes, and any follow-ups or open questions.
## Ask First (Requires Explicit Approval)
 
Do not do any of the following without the maintainer's go-ahead:
 
- Adding, removing, or changing **permissions**, **host permissions**, or **optional permissions** in `manifest.json`
- Changing `content_scripts` match patterns, `web_accessible_resources`, or `externally_connectable`
- Editing the Content Security Policy
- Changing the manifest version, extension name, description, icons, or version number
- Adding, removing, or upgrading **dependencies** (including dev dependencies and build tools)
- Changing build config, bundler setup, CI/CD, or release scripts
- **UI or design changes**: layout, colors, typography, copy, icons, or new components
- Changing the **storage schema** (`chrome.storage` keys/shape) or anything that requires data migration
- Renaming or moving files and directories, or changing project structure
- Large changes: touching many files, rewriting modules, or altering architecture
- Introducing new patterns, frameworks, or libraries
- Deleting files or removing features
- Anything involving network requests to new domains or new data collection
## Do Not Do (Hard Rules)
 
- Do not make large rewrites or sweeping refactors.
- Do not change the look and feel of the UI unless explicitly asked.
- Do not commit secrets, API keys, tokens, or credentials. Never hardcode them.
- Do not load or execute **remotely hosted code** (this violates Manifest V3 and Web Store policy). No `eval`, `new Function`, or injecting remote scripts.
- Do not add analytics, telemetry, or tracking.
- Do not request broader permissions than needed (e.g. `<all_urls>`, `tabs`, `history`) as a shortcut.
- Do not disable or bypass linters, type checks, or tests to make something pass.
- Do not force-push, rewrite git history, or modify git config.
- Do not edit generated or build output directories (e.g. `dist/`, `build/`) by hand.
- Do not touch files unrelated to the task.
## Chrome Extension Guidelines
 
### Manifest and Permissions
- Follow **Manifest V3**. Assume the background context is a **service worker**, not a persistent page.
- Apply the principle of least privilege. Prefer `activeTab` and optional permissions over broad host access.
- Any permission change must be called out explicitly, with justification, in your plan and summary.
### Service Worker
- Service workers can be terminated at any time. Don't rely on global variables for state; persist to `chrome.storage` instead.
- Register event listeners synchronously at the top level.
- Avoid long-running work; use alarms (`chrome.alarms`) instead of `setInterval`/`setTimeout` for anything long-lived.
### Content Scripts
- Keep them minimal and scoped to the narrowest match patterns needed.
- Avoid polluting the host page's global scope or CSS. Isolate styles (e.g. Shadow DOM) where appropriate.
- Don't assume the host page's DOM is stable. Handle missing elements gracefully.
### Messaging and Storage
- Validate and sanitize all messages (`chrome.runtime.sendMessage`, ports) and check `sender` where relevant.
- Choose storage deliberately: `local` vs `sync` vs `session`. Respect quota limits.
- Never store sensitive data in plain text without discussing it first.
### Security and Privacy
- Treat all page content and external data as untrusted. Avoid `innerHTML` with untrusted input; prefer `textContent` or safe DOM APIs.
- Collect only the data necessary for the feature. Flag anything that affects the privacy policy or Web Store data-use disclosures.
- Stay compliant with the [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies).
## Code Style and Conventions
 
- **Match the existing code.** Follow the conventions, structure, naming, and formatting already present in the repo.
- Use the project's configured linter and formatter. Don't introduce a conflicting style.
- Keep functions small and readable; add comments only where intent isn't obvious.
- Prefer clear, boring solutions over clever ones.
- Don't leave dead code, stray `console.log` statements, or commented-out blocks behind.
- Keep commits and diffs minimal. Avoid unrelated whitespace or formatting changes.
## Testing and Verification
- Run the relevant checks after every meaningful change and report the results.
- Add or update tests for bug fixes and new logic where a test setup exists.
- If you can't run something (no browser, missing credentials), say so clearly. Don't claim it passes.
- Provide manual verification steps, for example:
  1. Run the build.
  2. Open `chrome://extensions`, enable **Developer mode**.
  3. Click **Load unpacked** and select the build output folder.
  4. Reload the extension after changes and check the service worker console for errors.
## Git and Pull Requests
 
- Work on a branch; never commit directly to `main`.
- Write clear, descriptive commit messages (imperative mood, explain the "why").
- Keep PRs small and single-purpose.
- In the PR description, include: what changed, why, how it was tested, and any permission, storage, or UI impact.
- Don't merge, publish, or release anything. That's the maintainer's call.
## Communication
 
- Be concise. Lead with the outcome, then details.
- Flag uncertainty, trade-offs, and risks early rather than after the fact.
- If a task would require breaking one of these rules, stop and ask instead of working around it.
- If you notice unrelated bugs or improvements, **mention them** but don't fix them unless asked.
## Quick Checklist Before Finishing
 
- [ ] Change is small, focused, and matches the approved plan
- [ ] No unapproved permission, dependency, UI, or structure changes
- [ ] No secrets, remote code, or new tracking added
- [ ] Build, lint, and tests run (or clearly noted if not)
- [ ] Summary lists files changed, behavior impact, and open questions