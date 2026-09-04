# Design Document — Dark/Light Mode Toggle, Manual Time Setting & Task Reordering

## Overview

This design extends the existing single-page Productivity Dashboard (`index.html` + `css/style.css` + `js/app.js`) with three enhancements:

1. **Theme Toggle** — a persistent dark/light mode switch applied via a `data-theme` attribute on `<html>` and driven entirely by CSS custom properties and `[data-theme="dark"]` overrides.
2. **Manual Time Setting** — lets users set a custom clock time that continues counting from the chosen offset, persisted in `localStorage` so it survives page reloads.
3. **Task Reordering** — Up ▲ / Down ▼ buttons on each task item swap positions in the persisted task array and manage keyboard focus correctly after re-render.

### Constraints

| Constraint | Detail |
|---|---|
| Files | One CSS file (`css/style.css`), one JS file (`js/app.js`) |
| Frameworks / build | None — vanilla HTML, CSS, JS only |
| Backend | None — all state in `localStorage` |
| localStorage keys | `pd_theme`, `pd_time_offset`, `pd_tasks` |
| Theme application | `data-theme` attribute on `<html>`; all colour overrides via `[data-theme="dark"]` selectors |
| Flash prevention | Tiny inline `<script>` in `<head>` sets `data-theme` before `<body>` parses |
| Toggle button | Fixed top-right, min 44 × 44 px, native `<button>` |
| New buttons | All native `<button>` elements, keyboard accessible |

---

## Architecture

### Module Breakdown in `app.js`

`app.js` is organized as five clearly separated sections delimited by banner comments, matching the existing pattern:

```
Section 0 — Theme Manager
  - initTheme()      : runs on script load, reads pd_theme / system pref
  - applyTheme(t)    : sets data-theme on <html>, updates button labels/aria, persists
  - toggle button event listener

Section 1 — Live Clock & Greeting  (EXISTING — extended)
  - updateClock()    : reads Time_Offset, applies to system time, formats display
  - initClockUI()    : wires Set_Time_Button, Reset_Time_Button, inline form

Section 2 — Focus Timer            (EXISTING — unchanged)

Section 3 — To-Do List             (EXISTING — extended)
  - renderTasks()    : now emits Up/Down buttons per item, disables boundary buttons
  - reorderTask(id, direction) : swaps elements, saves, re-renders, restores focus

Section 4 — Quick Links            (EXISTING — unchanged)
```

> **Rationale**: Keeping all logic in one file preserves the no-build-tool constraint. Section banners make the code navigable without a module system.

### Initialization Sequence

```
Browser parses <head>
  └─ Inline <script> in <head>:
       read pd_theme from localStorage (or detect prefers-color-scheme)
       set document.documentElement.setAttribute('data-theme', resolved)
       (runs synchronously before any painting — no FOUC)

Browser parses <body> and renders DOM

<script src="js/app.js"> executes:
  └─ Section 0 (Theme): wire toggle button, no re-apply needed (already set in head)
  └─ Section 1 (Clock): read pd_time_offset, start setInterval
  └─ Section 3 (Tasks): renderTasks() (includes reorder controls)
  └─ Section 4 (Links): renderLinks()
```

### Interaction Flow — Theme Toggle

```
User clicks Toggle_Button
  └─ applyTheme(current === 'dark' ? 'light' : 'dark')
       ├─ document.documentElement.setAttribute('data-theme', newTheme)
       ├─ localStorage.setItem('pd_theme', newTheme)
       ├─ toggleBtn.textContent = newTheme === 'dark' ? '☀️ Light' : '🌙 Dark'
       └─ toggleBtn.setAttribute('aria-label', newTheme === 'dark'
                                               ? 'Switch to light mode'
                                               : 'Switch to dark mode')
```

### Interaction Flow — Manual Time Setting

```
User clicks Set_Time_Button
  └─ show inline form (time-input + confirm-btn) inside clock card
       └─ User types HH:MM:SS, clicks Confirm
            ├─ validate pattern + ranges
            ├─ [invalid] show inline error, no state change
            └─ [valid]  compute offset = userSecs − systemSecs
                        localStorage.setItem('pd_time_offset', offset)
                        show Reset_Time_Button
                        hide inline form
                        (updateClock uses offset on next tick)

User clicks Reset_Time_Button
  └─ localStorage.removeItem('pd_time_offset')
     timeOffset = 0
     hide Reset_Time_Button
     (next updateClock tick shows live system time)
```

### Interaction Flow — Task Reordering

```
User clicks Up ▲ on task at index i (i > 0)
  └─ reorderTask(id, 'up')
       ├─ tasks = loadTasks()
       ├─ swap tasks[i] and tasks[i-1]
       ├─ saveTasks(tasks)
       ├─ renderTasks()
       └─ focus Up button of task (now at index i-1)

User clicks Down ▼ on task at index i (i < tasks.length-1)
  └─ reorderTask(id, 'down')
       ├─ swap tasks[i] and tasks[i+1]
       ├─ saveTasks(tasks)
       ├─ renderTasks()
       └─ focus Down button of task (now at index i+1)
```

---

## Components and Interfaces

### Toggle Button

**HTML** (injected into `<body>` at top, before `.dashboard`, or appended to `<body>` by JS):

```html
<button
  id="themeToggle"
  class="btn theme-toggle"
  aria-label="Switch to dark mode"
>🌙 Dark</button>
```

**Placement**: `position: fixed; top: 16px; right: 16px; z-index: 200`. Minimum size enforced via CSS: `min-width: 44px; min-height: 44px`.

**Label logic**:

| Active Theme | Button Text | `aria-label` |
|---|---|---|
| `light` | `🌙 Dark` | `Switch to dark mode` |
| `dark` | `☀️ Light` | `Switch to light mode` |

---

### Inline `<head>` Script (FOUC Prevention)

```html
<script>
  (function () {
    var stored = localStorage.getItem('pd_theme');
    var valid  = stored === 'light' || stored === 'dark';
    var theme  = valid
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

This IIFE runs synchronously in `<head>` — the `<body>` has not been painted yet, so no flash of the wrong theme occurs.

---

### Clock Card Extensions

New elements added inside `.card--clock`:

```html
<!-- Set Time controls (hidden by default) -->
<div class="clock-time-controls">
  <button class="btn btn--secondary" id="setTimeBtn">Set Time</button>
  <div class="time-inline-form" id="timeInlineForm" hidden>
    <input class="input" type="text" id="timeInput"
           placeholder="HH:MM:SS" maxlength="8"
           aria-label="Enter custom time in HH:MM:SS format" />
    <button class="btn btn--primary" id="timeConfirmBtn">Confirm</button>
    <p class="time-error" id="timeError" hidden aria-live="polite"></p>
  </div>
  <button class="btn btn--secondary" id="resetTimeBtn" hidden>Reset Time</button>
</div>
```

**Show/hide pattern** (no page reload):
- `timeInlineForm.hidden = true/false` toggled by JS
- `resetTimeBtn.hidden = true/false` toggled based on `timeOffset !== 0`
- `timeError.hidden = true/false` toggled based on validation result

---

### Task Item Structure (Extended)

Each `<li class="task-item">` now contains reorder controls alongside existing controls:

```
[checkbox] [label..................] [▲] [▼] [Edit] [Delete]
```

```html
<li class="task-item" data-task-id="{id}">
  <input type="checkbox" ... />
  <span class="task-label ...">text</span>
  <div class="task-actions">
    <button class="btn btn--reorder" data-action="up"   aria-label="Move '{text}' up">▲</button>
    <button class="btn btn--reorder" data-action="down" aria-label="Move '{text}' down">▼</button>
    <button class="btn btn--edit"    aria-label="Edit task: {text}">Edit</button>
    <button class="btn btn--danger"  aria-label="Delete task: {text}">Delete</button>
  </div>
</li>
```

**Disabled state**: boundary buttons get `disabled` attribute (not just visual), which prevents activation by keyboard too:
- First item: Up ▲ button has `disabled`
- Last item: Down ▼ button has `disabled`

---

## Data Models

### `localStorage` Schema

| Key | Type | Default | Description |
|---|---|---|---|
| `pd_theme` | `"light" \| "dark"` | _(absent — falls back to system pref)_ | User's last chosen theme |
| `pd_time_offset` | Integer string (seconds) | _(absent — means 0)_ | Signed offset: user-set time minus system time at confirm moment |
| `pd_tasks` | JSON array string | `"[]"` | Array of task objects |

**Task object schema** (unchanged):

```json
{
  "id":   "string (base-36 timestamp + random)",
  "text": "string",
  "done": "boolean"
}
```

**Time_Offset arithmetic**:

```
At confirm:   offset = toSeconds(userInput) − toSeconds(new Date())
On each tick: displayTime = new Date() + offset  (seconds)
After reload: offset = parseInt(localStorage.getItem('pd_time_offset') || '0', 10)
```

Where `toSeconds(date)` = `date.getHours()*3600 + date.getMinutes()*60 + date.getSeconds()`.

### CSS Custom Properties Schema

All colour tokens are defined on `:root` (light defaults) and overridden under `[data-theme="dark"]`:

```css
:root {
  --color-body-bg:        linear-gradient(135deg, #6c63ff 0%, #8b5cf6 40%, #a855f7 70%, #c084fc 100%);
  --color-card-bg:        #ffffff;
  --color-text-primary:   #374151;
  --color-text-heading:   #1a1a2e;
  --color-text-muted:     #888888;
  --color-accent:         #6c63ff;
  --color-input-border:   #d1d5db;
  --color-task-item-bg:   #f9fafb;
  --color-task-item-hover:#f3f4f6;
  --color-modal-overlay:  rgba(0, 0, 0, 0.45);
  --color-modal-bg:       #ffffff;
}

[data-theme="dark"] {
  --color-body-bg:        #0f0f1a;
  --color-card-bg:        #1e1e2e;
  --color-text-primary:   #e2e8f0;
  --color-text-heading:   #f1f5f9;
  --color-text-muted:     #94a3b8;
  --color-accent:         #7c73ff;   /* brightened for ≥ 3:1 on #1e1e2e */
  --color-input-border:   #4a4a6a;   /* ≥ 3:1 against #1e1e2e */
  --color-task-item-bg:   #252535;
  --color-task-item-hover:#2e2e40;
  --color-modal-overlay:  rgba(0, 0, 0, 0.65);
  --color-modal-bg:       #1e1e2e;
}
```

> **Contrast rationale**:
> - Body text `#e2e8f0` on card `#1e1e2e` ≈ 11.5:1 (far exceeds WCAG AA 4.5:1).
> - Accent `#7c73ff` on card `#1e1e2e` ≈ 3.2:1 (meets 3:1 for non-text / large text per Req 2.5).
> - Input border `#4a4a6a` on card `#1e1e2e` ≈ 3.1:1 (meets WCAG AA non-text contrast Req 2.6).
> - Card `#1e1e2e` on body `#0f0f1a` ≈ 1.6:1 (meets Req 2.2 which specifies ≥ 1.5:1).

---

## Key Algorithms (Pseudocode)

### `applyTheme(theme)`

```
function applyTheme(theme):
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('pd_theme', theme)
  if theme === 'dark':
    toggleBtn.textContent    = '☀️ Light'
    toggleBtn.ariaLabel      = 'Switch to light mode'
  else:
    toggleBtn.textContent    = '🌙 Dark'
    toggleBtn.ariaLabel      = 'Switch to dark mode'
```

### `initTheme()`

```
function initTheme():
  stored = localStorage.getItem('pd_theme')
  if stored === 'light' or stored === 'dark':
    theme = stored
  else:
    if window.matchMedia exists and matchMedia('(prefers-color-scheme: dark)').matches:
      theme = 'dark'
    else:
      theme = 'light'
  // data-theme already set by inline <head> script; only sync the button state:
  syncToggleButtonState(theme)
```

> Note: `applyTheme` is NOT called again by `initTheme` on page load because the inline `<head>` script already set `data-theme`. `initTheme` only wires up the button's initial label/aria state to match what is already applied.

### `setManualTime(inputValue)`

```
function setManualTime(inputValue):
  if not matches /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/:
    show error "Please enter a valid time in HH:MM:SS format (e.g. 14:30:00)"
    return

  [hh, mm, ss] = inputValue.split(':').map(Number)
  userSecs     = hh * 3600 + mm * 60 + ss

  now      = new Date()
  sysSecs  = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()

  offset   = userSecs − sysSecs
  localStorage.setItem('pd_time_offset', String(offset))
  timeOffset = offset        // update module-level variable

  hide timeInlineForm
  hide timeError
  show resetTimeBtn
```

### `updateClock()` (extended)

```
function updateClock():
  now     = new Date()
  rawSecs = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds()
  adjSecs = rawSecs + timeOffset         // timeOffset is 0 when not set

  // wrap adjSecs into [0, 86400) to handle day boundary crossings
  adjSecs = ((adjSecs % 86400) + 86400) % 86400

  h = floor(adjSecs / 3600)
  m = floor((adjSecs % 3600) / 60)
  s = adjSecs % 60

  clockTimeEl.textContent = pad(h) + ':' + pad(m) + ':' + pad(s)

  // Date and greeting remain based on real `now` (not offset)
  // ... (existing date/greeting logic unchanged)
```

### `reorderTask(id, direction)`

```
function reorderTask(id, direction):
  tasks = loadTasks()
  i     = tasks.findIndex(t => t.id === id)
  if i === -1: return

  if direction === 'up' and i === 0: return
  if direction === 'down' and i === tasks.length - 1: return

  swapIdx = direction === 'up' ? i - 1 : i + 1

  // Swap in-place
  [tasks[i], tasks[swapIdx]] = [tasks[swapIdx], tasks[i]]

  saveTasks(tasks)
  renderTasks()

  // Restore keyboard focus to the corresponding button of the moved task
  // (after re-render the task is now at swapIdx)
  targetItem    = taskListEl.querySelector(`[data-task-id="${id}"]`)
  targetButton  = targetItem.querySelector(`[data-action="${direction}"]`)
  if targetButton exists and not targetButton.disabled:
    targetButton.focus()
  else:
    // Button became disabled (moved to boundary) — focus the other reorder button
    otherAction  = direction === 'up' ? 'down' : 'up'
    targetItem.querySelector(`[data-action="${otherAction}"]`).focus()
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme toggle is its own inverse (round-trip)

*For any* initial theme value (`"light"` or `"dark"`), calling `applyTheme` twice with alternating values must return the `data-theme` attribute and `localStorage["pd_theme"]` to the original value.

**Validates: Requirements 1.3, 4.1**

---

### Property 2: initTheme resolves to a valid theme

*For any* combination of `localStorage["pd_theme"]` content (valid, invalid, absent) and `prefers-color-scheme` value, `initTheme` must resolve to exactly one of the two valid values `"light"` or `"dark"` — never any other string and never undefined.

**Validates: Requirements 4.3, 4.4, 4.5, 5.1, 5.2, 5.3**

---

### Property 3: applyTheme button label consistency

*For any* theme `t ∈ {"light", "dark"}`, after `applyTheme(t)` is called the Toggle_Button's `textContent` and `aria-label` must both reflect the opposite theme (i.e., show what the user can switch *to*, not the current theme).

**Validates: Requirements 1.2, 6.2, 6.3, 6.4**

---

### Property 4: Time_Offset arithmetic round-trip

*For any* valid `HH:MM:SS` time string `T`, calling `setManualTime(T)` and then computing `systemTime + storedOffset` on the very same clock tick must yield a time equal to `T` (in seconds-of-day).

**Validates: Requirements 8.5, 8.6, 8.7**

---

### Property 5: Time validation rejects all invalid inputs

*For any* string that does not match the pattern `HH:MM:SS` with hours 00–23, minutes 00–59, seconds 00–59, `setManualTime` must leave `localStorage["pd_time_offset"]` unchanged and leave the clock display unchanged.

**Validates: Requirements 8.3, 8.4**

---

### Property 6: Task reorder preserves list contents

*For any* task list of length ≥ 2 and any valid reorder operation (up or down, not at boundary), `reorderTask` must produce a new list containing exactly the same task objects (by `id`, `text`, `done`) with no additions, deletions, or mutations — only position changed.

**Validates: Requirements 9.2, 9.3, 9.6**

---

### Property 7: Boundary buttons are always disabled

*For any* task list of length ≥ 1, after `renderTasks()` the Up ▲ button of the first item and the Down ▼ button of the last item must have `disabled = true`. All other reorder buttons must have `disabled = false`.

**Validates: Requirements 9.4, 9.5**

---

### Property 8: Task reorder persists correct data

*For any* task list, after any reorder operation the value stored in `localStorage["pd_tasks"]` must be a valid JSON array where each element retains its original `id`, `text`, and `done` values, and the array length equals the original length.

**Validates: Requirements 9.6**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `applyTheme` cannot write to `localStorage` (e.g. private browsing quota) | `try/catch` around `localStorage.setItem`; if it throws, the theme is still applied to `data-theme` in the DOM (session-only). A non-intrusive status message is shown. (Req 1.5) |
| `pd_theme` holds an invalid value on load | Ignored; falls back to system preference detection (Req 4.5) |
| `pd_time_offset` holds a non-numeric value on load | `parseInt` returns `NaN`; treated as 0 (live clock) |
| Time input fails format/range validation | Inline error shown next to the input; `localStorage` and clock state unchanged (Req 8.4) |
| Task array in `localStorage` is malformed JSON | `loadTasks` returns `[]` via `try/catch` around `JSON.parse`; renders empty list |
| Reorder called at boundary index | Guard clause returns early with no state change (defensive against programmatic calls) |

---

## Testing Strategy

This feature involves a mix of pure logic (offset arithmetic, validation, array manipulation) and DOM/`localStorage` side effects.

### Unit Tests (example-based)

- `applyTheme('dark')` sets `document.documentElement.dataset.theme` to `"dark"` and updates button label.
- `initTheme()` with no `localStorage` entry and `matchMedia` returning `true` → applies `"dark"`.
- `initTheme()` with `localStorage = "dark"` → applies `"dark"` regardless of `matchMedia`.
- `setManualTime('25:00:00')` → returns error, no offset written.
- `setManualTime('14:30:00')` → offset = correct integer.
- `reorderTask(id, 'up')` on first task → no change.
- `reorderTask(id, 'down')` on last task → no change.
- After `reorderTask`, focus lands on the correct button.

### Property-Based Tests

Property tests should use a library such as [fast-check](https://fast-check.dev/) (JS) with a minimum of 100 iterations per property.

Each test must be tagged with a comment of the form:
`// Feature: dark-light-mode-toggle, Property N: <property text>`

| Property | Test Strategy |
|---|---|
| P1 — Toggle round-trip | Generate `"light"` or `"dark"` at random; call `applyTheme` twice; assert DOM + storage equal start |
| P2 — initTheme valid output | Arbitrarily populate `localStorage["pd_theme"]` (valid / invalid / absent) and mock `matchMedia`; assert result ∈ `{"light","dark"}` |
| P3 — Button label consistency | For each theme, call `applyTheme`; assert button text and aria-label are the opposite-theme labels |
| P4 — Offset round-trip | Generate random valid `HH:MM:SS`; freeze clock; call `setManualTime`; assert `systemSecs + offset === inputSecs` |
| P5 — Validation rejects invalid | Generate arbitrary strings; filter out valid ones; assert `setManualTime` never writes to `localStorage` |
| P6 — Reorder preserves contents | Generate random task arrays (≥ 2 items); pick random non-boundary id + direction; assert same multiset of task objects |
| P7 — Boundary buttons disabled | Generate random task arrays (≥ 1 item); call `renderTasks`; assert boundary button states |
| P8 — Reorder persists data | Generate random task arrays; reorder; parse `localStorage["pd_tasks"]`; assert length and all id/text/done values intact |

### Integration / Smoke Tests

- Page loads with `localStorage` cleared → light theme applied, no FOUC observable.
- Page loads with `localStorage["pd_theme"] = "dark"` → dark theme applied, no FOUC observable.
- Theme toggle button is reachable and activatable via keyboard Tab + Enter.
- All new `<button>` elements appear in the natural Tab order.
