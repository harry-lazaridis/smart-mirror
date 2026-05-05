# ABC Task Priority System

## Overview

The ABC-list is a method for better task prioritization integrated into the Smart Mirror's ToDo widget. It classifies tasks into three priority tiers:

- **A (Akut):** Highest priority. Must be done today or tomorrow.
- **B (Bråttom):** Medium priority. Less urgent, but needs to be done relatively soon (e.g., within a week).
- **C (Senare):** Lowest priority. Tasks that are easier or fun, but not critical.

## Features

- **Dynamic UI Titles:** Instead of cluttering individual tasks with priority labels, the main title of the list automatically updates to reflect the currently active tier (e.g., displaying "Akut" in red, "Bråttom" in orange, or "Senare" in green) when ABC mode is active.
- **Strict Visibility:** To reduce bloat, the widget and the admin panel strictly show the highest pending priority. If there are unfinished 'A' tasks, 'B' and 'C' are hidden. Once all 'A' tasks are marked as "Done", 'B' tasks are revealed, and so on.
- **Auto-Escalation:** Deadlines automatically promote tasks as the date approaches:
  - A 'B' task due today or tomorrow dynamically acts as an 'A' task.
  - A 'C' task due within 7 days dynamically acts as a 'B' task.
  *Note: This escalation is computed dynamically at render time, preventing irreversible data mutation if deadlines change.*
- **Done Today:** Tasks completed on the current calendar day are moved to a separate "Done Today" section at the bottom of the list.
- **Mode Toggle:** Administrators can seamlessly toggle the task manager between the "Normal" list mode and "ABC-list" mode without losing data.

## Technical Implementation

The system modifies the base `todo` object structure stored in Firestore:

```javascript
{
  id: "uuid",
  text: "Task description",
  done: false,
  tier: "A" | "B" | "C" | null, // Set when ABC mode is active
  createdAt: 1715000000000,
  deadline: 1715086400000 | null, // Optional timestamp
  doneAt: 1715000000000 | null // Timestamp when marked as done
}
```

### Key Files

- `client/src/components/admin/TodoSettings.jsx`: Handles adding tasks with tier enforcement, displaying tasks based on the active mode, and toggling the `todoMode` setting on the user's Firestore document.
- `client/src/components/Mirror/TodoWidget.jsx`: Mirrors the strict visibility and auto-escalation rules established in the admin panel to ensure the mirror display is identical in behavior.
- Both files share the `calculateEffectiveTier(todo)` logic to determine deadline-based priority shifts gracefully at render-time.
