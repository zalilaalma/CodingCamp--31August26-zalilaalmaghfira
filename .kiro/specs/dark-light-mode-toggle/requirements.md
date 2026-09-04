# Requirements Document

## Introduction

This feature adds a dark mode / light mode toggle to the Productivity Dashboard. Users can switch between a light theme (the existing purple-gradient + white-card design) and a dark theme (dark background, dark cards, adjusted text and accent colours). The chosen preference is saved in `localStorage` under the key `pd_theme` so it persists across browser sessions. The toggle is always visible on the dashboard and works without any page reload.

In addition, this document covers two further enhancements to the dashboard: **Manual Time Setting**, which lets users override the displayed clock time and resume counting from a custom offset (persisted in `localStorage` under `pd_time_offset`); and **Task Reordering**, which lets users move to-do items up or down the list to reflect personal priority, with the new order saved immediately to `localStorage` under `pd_tasks`.

## Glossary

- **Dashboard**: The single-page Productivity Dashboard application served from `index.html`.
- **Theme**: A named visual style applied to the Dashboard. Valid values are `light` and `dark`.
- **Toggle_Button**: The interactive UI control that switches the active Theme.
- **Theme_Manager**: The client-side JavaScript module responsible for reading, applying, and persisting the Theme.
- **Preference_Store**: The browser `localStorage` entry with key `pd_theme` that holds the user's last chosen Theme.
- **System_Preference**: The operating-system-level colour-scheme preference exposed via the `prefers-color-scheme` CSS media query.
- **Clock**: The live clock widget displayed in the clock card that shows the current time, date, and greeting.
- **Clock_Controller**: The client-side JavaScript module responsible for managing clock display, computing time offsets, and persisting the manual time offset.
- **Time_Offset**: A signed integer (in seconds) representing the difference between the user-set time and the real system time at the moment the custom time was confirmed. Stored in `localStorage` under key `pd_time_offset`.
- **Time_Input**: The UI control (text field) that accepts a user-supplied time string in `HH:MM:SS` format.
- **Set_Time_Button**: The button that opens the Time_Input for manual time entry.
- **Reset_Time_Button**: The button that clears the Time_Offset and restores the live system clock.
- **Task_List**: The ordered collection of task items rendered in the to-do list card.
- **Reorder_Controls**: The pair of Up (▲) and Down (▼) buttons attached to each task item that shift its position in the Task_List.

---

## Requirements

### Requirement 1: Theme Toggle Control

**User Story:** As a dashboard user, I want a visible toggle button on the page, so that I can switch between light and dark mode at any time.

#### Acceptance Criteria

1. THE Dashboard SHALL render the Toggle_Button in a fixed position that remains visible within the viewport during scrolling, with a minimum clickable area of 44×44 pixels.
2. THE Toggle_Button SHALL display a label or icon that communicates the current Theme ("🌙 Dark" when light mode is active, "☀️ Light" when dark mode is active).
3. WHEN the user activates the Toggle_Button, THE Theme_Manager SHALL switch the active Theme to the opposite value within 100 milliseconds.
4. WHEN the Theme changes, THE Dashboard SHALL update all visible colours, backgrounds, and text styles within 300 milliseconds without a page reload.
5. IF the Theme_Manager fails to apply the Theme change, THEN THE Dashboard SHALL retain the previously active Theme and display an error message indicating the Theme could not be updated.

---

### Requirement 2: Dark Theme Visual Design

**User Story:** As a dashboard user, I want a comfortable dark colour scheme, so that I can use the dashboard in low-light environments without eye strain.

#### Acceptance Criteria

1. WHILE the active Theme is `dark`, THE Dashboard SHALL apply `#0f0f1a` as the background colour of the page body.
2. WHILE the active Theme is `dark`, THE Dashboard SHALL render card surfaces in `#1e1e2e`, maintaining a contrast ratio of at least 1.5:1 between the card surface and the body background.
3. WHILE the active Theme is `dark`, THE Dashboard SHALL render all body text and labels in a light colour with a contrast ratio of at least 4.5:1 against the card background, per WCAG 2.1 AA.
4. WHILE the active Theme is `dark`, THE Dashboard SHALL apply the purple accent colour (`#6c63ff`) to interactive elements.
5. IF the purple accent colour (`#6c63ff`) produces a contrast ratio below 3:1 against the dark card surface, THEN THE Dashboard SHALL use a brightened variant of the purple accent that achieves a contrast ratio of at least 3:1.
6. WHILE the active Theme is `dark`, THE Dashboard SHALL render input field borders with a contrast ratio of at least 3:1 between the border colour and the card surface colour, per WCAG 2.1 AA non-text contrast.

---

### Requirement 3: Light Theme Visual Design

**User Story:** As a dashboard user, I want the existing light colour scheme preserved as the default, so that the dashboard looks unchanged when dark mode is not active.

#### Acceptance Criteria

1. WHILE the active Theme is `light`, THE Dashboard SHALL apply the original purple gradient background (`linear-gradient(135deg, #6c63ff 0%, #8b5cf6 40%, #a855f7 70%, #c084fc 100%)`) to the page body.
2. WHILE the active Theme is `light`, THE Dashboard SHALL render card surfaces in `#ffffff`.
3. WHILE the active Theme is `light`, THE Dashboard SHALL render all body text in `#374151`, clock time and timer display in `#6c63ff`, card titles in `#1a1a2e`, and muted labels in `#888`, matching the original values in `css/style.css`.

---

### Requirement 4: Theme Persistence

**User Story:** As a dashboard user, I want my theme preference saved automatically, so that the dashboard opens in my chosen theme on every visit.

#### Acceptance Criteria

1. WHEN the user switches the Theme, THE Theme_Manager SHALL write the new Theme value (`"light"` or `"dark"`) to `localStorage` under the key `pd_theme`.
2. WHEN the Dashboard page begins loading, THE Theme_Manager SHALL read `localStorage` key `pd_theme` and apply the stored Theme synchronously in a `<script>` block in the `<head>` before the `<body>` is parsed, so that no flash of the opposite theme is visible.
3. IF the Preference_Store contains no value, THEN THE Theme_Manager SHALL apply the Theme that matches the System_Preference reported by `prefers-color-scheme`.
4. IF the Preference_Store contains no value AND the browser does not support `prefers-color-scheme`, THEN THE Theme_Manager SHALL default to the `light` Theme.
5. IF the Preference_Store contains a value that is neither `"light"` nor `"dark"`, THEN THE Theme_Manager SHALL ignore the stored value and fall back to System_Preference detection as defined in Requirement 5.

---

### Requirement 5: System Preference Detection

**User Story:** As a first-time visitor, I want the dashboard to match my operating system's colour scheme by default, so that I don't have to manually set the theme on first load.

#### Acceptance Criteria

1. WHEN the Dashboard loads for the first time with no value in the Preference_Store, THE Theme_Manager SHALL query `window.matchMedia('(prefers-color-scheme: dark)')` to detect the System_Preference.
2. IF `window.matchMedia('(prefers-color-scheme: dark)').matches` is `true`, THEN THE Theme_Manager SHALL apply the `dark` Theme on the initial load.
3. IF `window.matchMedia('(prefers-color-scheme: dark)').matches` is `false` or `window.matchMedia` is not supported by the browser, THEN THE Theme_Manager SHALL apply the `light` Theme on the initial load.

---

### Requirement 6: Accessibility

**User Story:** As a keyboard or assistive-technology user, I want the toggle to be fully accessible, so that I can switch themes without relying on a mouse.

#### Acceptance Criteria

1. THE Toggle_Button SHALL be a native `<button>` element so that it receives focus via keyboard Tab navigation and can be activated via the Enter and Space keys.
2. WHILE the active Theme is `light`, THE Toggle_Button SHALL expose `aria-label="Switch to dark mode"`.
3. WHILE the active Theme is `dark`, THE Toggle_Button SHALL expose `aria-label="Switch to light mode"`.
4. WHEN the Theme changes, THE Theme_Manager SHALL update the Toggle_Button `aria-label` to the value defined for the newly active Theme state.
5. THE Toggle_Button SHALL have a visible focus indicator (`:focus-visible` outline) with a contrast ratio of at least 3:1 against adjacent colours in both the `light` and `dark` Themes.

---

### Requirement 7: Theme Application Scope

**User Story:** As a dashboard user, I want the theme applied consistently across all dashboard widgets, so that no section looks out of place.

#### Acceptance Criteria

1. WHEN the Theme changes, THE Theme_Manager SHALL set the `data-theme` attribute on the `<html>` element to either `"light"` or `"dark"`, and all theme-driven colour overrides SHALL be expressed as CSS rules scoped to `[data-theme="dark"]` selectors.
2. THE Dashboard SHALL NOT apply theme changes by manipulating individual element `style` attributes; all colour overrides SHALL be declared in `css/style.css`.
3. WHILE the active Theme is `dark`, THE Dashboard SHALL apply the dark card surface colour (`#1e1e2e`) to the edit-task modal surface and a semi-transparent dark overlay (`rgba(0,0,0,0.65)`) to the modal backdrop.
4. WHEN the Theme changes, THE Theme_Manager SHALL apply the new `data-theme` value to cover all of the following widgets: clock card, focus timer card, to-do list card, quick links card, edit-task modal, all `.btn` elements, and all `.input` elements.

---

### Requirement 8: Manual Time Setting

**User Story:** As a dashboard user, I want to manually set the clock to a custom time, so that I can use the dashboard with a different starting time and have it continue counting from there across page refreshes.

#### Acceptance Criteria

1. THE Dashboard SHALL render a Set_Time_Button adjacent to the clock card that is visible in both the `light` and `dark` Themes.
2. WHEN the user activates the Set_Time_Button, THE Dashboard SHALL reveal the Time_Input field and a confirm button inline within the clock card without a page reload.
3. WHEN the user confirms a time entry, THE Clock_Controller SHALL validate that the value matches the pattern `HH:MM:SS` with hours in the range 00–23, minutes in the range 00–59, and seconds in the range 00–59.
4. IF the user confirms a time entry that fails validation, THEN THE Clock_Controller SHALL display an inline error message adjacent to the Time_Input describing the required format and SHALL NOT update the displayed time.
5. WHEN the user confirms a valid time entry, THE Clock_Controller SHALL compute the Time_Offset as the difference in seconds between the user-supplied time and the current system time, write the Time_Offset to `localStorage` under the key `pd_time_offset`, and begin advancing the clock display from the user-supplied time at a rate of one second per second.
6. WHILE a non-zero Time_Offset is stored, THE Clock_Controller SHALL add the Time_Offset to the current system time on every clock tick to derive the displayed time, so that the custom time continues counting forward correctly after a page reload.
7. WHEN the Dashboard page begins loading, THE Clock_Controller SHALL read `localStorage` key `pd_time_offset`; IF a numeric value is present, THEN THE Clock_Controller SHALL apply that Time_Offset to the current system time immediately so the clock resumes from the correct custom time without interruption.
8. THE Dashboard SHALL render a Reset_Time_Button that is visible whenever a non-zero Time_Offset is active.
9. WHEN the user activates the Reset_Time_Button, THE Clock_Controller SHALL remove the `pd_time_offset` entry from `localStorage`, set the Time_Offset to zero, and resume displaying the live system time within one clock tick (≤ 1 second).
10. THE Set_Time_Button and Reset_Time_Button SHALL each be native `<button>` elements focusable via keyboard Tab navigation and activatable via the Enter and Space keys.

---

### Requirement 9: Task Reordering

**User Story:** As a dashboard user, I want to move tasks up or down the to-do list, so that I can organise tasks by my own priority and have that order preserved across page refreshes.

#### Acceptance Criteria

1. THE Dashboard SHALL render Reorder_Controls (an Up ▲ button and a Down ▼ button) on each task item in the Task_List alongside the existing Edit and Delete controls.
2. WHEN the user activates the Up ▲ button on a task item, THE Dashboard SHALL swap that task item with the task item immediately above it in the Task_List and re-render the list to reflect the new order.
3. WHEN the user activates the Down ▼ button on a task item, THE Dashboard SHALL swap that task item with the task item immediately below it in the Task_List and re-render the list to reflect the new order.
4. WHILE a task item occupies the first position in the Task_List, THE Dashboard SHALL render its Up ▲ button in a disabled state so that it cannot be activated.
5. WHILE a task item occupies the last position in the Task_List, THE Dashboard SHALL render its Down ▼ button in a disabled state so that it cannot be activated.
6. WHEN the user reorders a task item, THE Dashboard SHALL write the updated Task_List array (preserving each task's `id`, `text`, and `done` properties in their original values) to `localStorage` under the key `pd_tasks` immediately after re-rendering, so that the new order persists on page refresh.
7. THE Reorder_Controls SHALL be native `<button>` elements that receive focus via keyboard Tab navigation and can be activated via the Enter and Space keys.
8. WHEN a Reorder_Control is activated via keyboard, THE Dashboard SHALL return focus to the same task item's corresponding Reorder_Control after the list re-renders, so that the user can continue reordering without losing keyboard focus.
