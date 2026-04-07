# Web Interface Guidelines Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ `) syntax for tracking.

**Goal:** Fix all Web Interface Guidelines violations found in the `src/**/*.tsx` + CSS module audit.

**Architecture:** Seven independent tasks, each touching 1-3 files. Each task produces a standalone commit. No task depends on a later task. Some tasks touch the same files but different lines.

**Tech Stack:** React 19, CSS Modules, framer-motion, Vitest + Testing Library

---

## File Map

| File | Tasks that modify it |
|------|---------------------|
| `src/client/pages/Landing.tsx` | 1, 5 |
| `src/client/pages/Landing.module.css` | 3 |
| `src/client/pages/Room.tsx` | 2 |
| `src/client/pages/Room.module.css` | 2, 3 |
| `src/client/components/AddStory.tsx` | 1, 7 |
| `src/client/components/AddStory.module.css` | 3 |
| `src/client/components/NamePrompt.tsx` | 7 |
| `src/client/components/NamePrompt.module.css` | 3 |
| `src/client/components/ParticipantList.module.css` | 2, 3 |
| `src/client/components/RevealBoard.tsx` | 4 |
| `src/client/components/RevealBoard.module.css` | 2, 3 |
| `src/client/components/CardGrid.module.css` | 2, 3 |
| `src/client/components/StoryCard.tsx` | 5 |
| `src/client/index.css` | 4 |
| `index.html` | 6 |

---

### Task 1: Form Input Accessibility Labels

**Why:** Inputs in Landing.tsx and AddStory.tsx have placeholder text but no `<label>` elements or `aria-label` attributes. Screen readers cannot identify these fields.

**Files:**
- Modify: `src/client/pages/Landing.tsx:36-41,57-62,63-68`
- Modify: `src/client/components/AddStory.tsx:31-36,38-43`
- Create: `test/components/form-labels.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// test/components/form-labels.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Landing from "../../src/client/pages/Landing";
import AddStory from "../../src/client/components/AddStory";

describe("form input accessibility", () => {
  it("Landing create-name input has accessible name", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const inputs = screen.getAllByRole("textbox");
    const createName = inputs.find(
      (el) => el.getAttribute("placeholder") === "Your display name"
    );
    expect(createName).toBeDefined();
    expect(
      createName!.getAttribute("aria-label") ||
        createName!.closest("label") ||
        createName!.id
    ).toBeTruthy();
  });

  it("Landing room-code input has accessible name", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText("Room code (e.g. coral-falcon)");
    expect(
      input.getAttribute("aria-label") || input.closest("label") || input.id
    ).toBeTruthy();
  });

  it("Landing join-name input has accessible name", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    );
    const inputs = screen.getAllByPlaceholderText("Your display name");
    const joinName = inputs[inputs.length - 1];
    expect(
      joinName.getAttribute("aria-label") ||
        joinName.closest("label") ||
        joinName.id
    ).toBeTruthy();
  });

  it("AddStory title input has accessible name", () => {
    render(<AddStory onAdd={() => {}} />);
    // click the trigger to open the form
    screen.getByText("+ Add Story").click();
    const input = screen.getByPlaceholderText("Story title");
    expect(
      input.getAttribute("aria-label") || input.closest("label") || input.id
    ).toBeTruthy();
  });

  it("AddStory description textarea has accessible name", () => {
    render(<AddStory onAdd={() => {}} />);
    screen.getByText("+ Add Story").click();
    const textarea = screen.getByPlaceholderText("Description (optional)");
    expect(
      textarea.getAttribute("aria-label") ||
        textarea.closest("label") ||
        textarea.id
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/components/form-labels.test.tsx`
Expected: FAIL — inputs have no `aria-label`, no `<label>`, no `id`

- [ ] **Step 3: Fix Landing.tsx inputs**

Replace `src/client/pages/Landing.tsx:36-42` with:

```tsx
        <label className={styles.label} htmlFor="create-name">
          Your Display Name
        </label>
        <input
          id="create-name"
          className={styles.input}
          placeholder="Your display name…"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          autoComplete="off"
        />
```

Replace `src/client/pages/Landing.tsx:55-62` with:

```tsx
        <label className={styles.label} htmlFor="join-code">
          Room Code
        </label>
        <input
          id="join-code"
          className={styles.input}
          placeholder="Room code (e.g. coral-falcon)…"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          autoComplete="off"
        />
        <label className={styles.label} htmlFor="join-name">
          Your Display Name
        </label>
        <input
          id="join-name"
          className={styles.input}
          placeholder="Your display name…"
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          autoComplete="off"
        />
```

Note: The existing `.label` CSS class in `Landing.module.css` is styled uppercase — these `<label>` elements will match the existing visual design.

- [ ] **Step 4: Fix AddStory.tsx inputs**

Replace `src/client/components/AddStory.tsx:31-43` with:

```tsx
      <label className={styles.label} htmlFor="story-title">
        Story Title
      </label>
      <input
        id="story-title"
        className={styles.input}
        placeholder="Story title…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <label className={styles.label} htmlFor="story-description">
        Description
      </label>
      <textarea
        id="story-description"
        className={styles.textarea}
        placeholder="Description (optional)…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run test/components/form-labels.test.tsx`
Expected: PASS

- [ ] **Step 6: Run lint**

Run: `pnpm lint`
Expected: PASS (no type errors)

- [ ] **Step 7: Commit**

```bash
git add src/client/pages/Landing.tsx src/client/components/AddStory.tsx test/components/form-labels.test.tsx
git commit -m "a11y: add labels to form inputs in Landing and AddStory"
```

---

### Task 2: Button Accessibility — aria-labels and Focus Rings

**Why:** The room-code copy button in Room.tsx has no `aria-label` explaining its purpose. CSS modules for buttons across the app lack `focus-visible` styles.

**Files:**
- Modify: `src/client/pages/Room.tsx:157`
- Modify: `src/client/pages/Room.module.css:104-115`
- Modify: `src/client/components/CardGrid.module.css:25-40`
- Modify: `src/client/components/RevealBoard.module.css:117-126`
- Modify: `src/client/components/ParticipantList.module.css:70-79`
- Modify: `src/client/pages/Landing.module.css:70-81`
- Create: `test/components/button-a11y.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// test/components/button-a11y.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useRoomStore } from "../../src/client/store/room";

// We need the store populated for Room to render
function RoomWrapper() {
  const Room = require("../../src/client/pages/Room").default;
  return (
    <MemoryRouter initialEntries={["/room/test-room"]}>
      <Room />
    </MemoryRouter>
  );
}

describe("button a11y", () => {
  beforeEach(() => {
    useRoomStore.setState({
      connected: true,
      room: { id: "test-room", name: "Test" },
      participants: [],
      myParticipantId: "p1",
      stories: [],
      revealed: false,
      estimates: [],
      revealResult: null,
      myEstimate: null,
      error: null,
    });
  });

  it("copy room code button has aria-label", () => {
    render(<RoomWrapper />);
    const copyBtn = screen.getByRole("button", { name: /test-room/i });
    expect(copyBtn.getAttribute("aria-label")).toMatch(/copy/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/components/button-a11y.test.tsx`
Expected: FAIL — button has no `aria-label`

- [ ] **Step 3: Fix Room.tsx copy button**

Replace `src/client/pages/Room.tsx:157-159` with:

```tsx
          <button
            onClick={handleRoomClick}
            className={styles.code}
            aria-label={`Copy room code ${roomId}`}
          >
            {roomId}
          </button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/components/button-a11y.test.tsx`
Expected: PASS

- [ ] **Step 5: Add focus-visible ring to `.code` button**

Add to `src/client/pages/Room.module.css` after `.code` block (after line 50):

```css
.code:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

- [ ] **Step 6: Add focus-visible ring to `.revealBtn`**

Add to `src/client/pages/Room.module.css` after `.revealBtn` block (after line 115):

```css
.revealBtn:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

- [ ] **Step 7: Add focus-visible to card buttons**

Add to `src/client/components/CardGrid.module.css` after `.card` block (after line 40):

```css
.card:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

- [ ] **Step 8: Add focus-visible to RevealBoard buttons**

Add to `src/client/components/RevealBoard.module.css` after `.btnPrimary,.btnSecondary` block (after line 126):

```css
.btnPrimary:focus-visible,
.btnSecondary:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

- [ ] **Step 9: Add focus-visible to Landing buttons**

Add to `src/client/pages/Landing.module.css` after `.btnPrimary,.btnSecondary` block (after line 81):

```css
.btnPrimary:focus-visible,
.btnSecondary:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

- [ ] **Step 10: Add focus-visible to pencil icon**

Add to `src/client/components/ParticipantList.module.css` after `.pencilIcon` block (after line 79):

```css
.pencilIcon:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}
```

- [ ] **Step 11: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/client/pages/Room.tsx src/client/pages/Room.module.css src/client/components/CardGrid.module.css src/client/components/RevealBoard.module.css src/client/components/ParticipantList.module.css src/client/pages/Landing.module.css test/components/button-a11y.test.tsx
git commit -m "a11y: add aria-label to copy button and focus-visible rings to all interactive elements"
```

---

### Task 3: Replace `transition: all` With Explicit Properties

**Why:** `transition: all` causes the browser to watch every CSS property for changes, which can cause performance issues and unintended animations. The guidelines require listing properties explicitly.

**Files:**
- Modify: `src/client/pages/Room.module.css:114,155`
- Modify: `src/client/components/RevealBoard.module.css:125`
- Modify: `src/client/components/CardGrid.module.css:36`
- Modify: `src/client/components/AddStory.module.css:13`
- Modify: `src/client/pages/Landing.module.css:80`

- [ ] **Step 1: Fix Room.module.css `.revealBtn` (line 114)**

Replace:
```css
    transition: all 0.15s;
```
With:
```css
    transition: opacity 0.15s, transform 0.15s;
```

- [ ] **Step 2: Fix Room.module.css `.errorLink` (line 155)**

Replace:
```css
    transition: all 0.15s;
```
With:
```css
    transition: opacity 0.15s, transform 0.15s;
```

- [ ] **Step 3: Fix RevealBoard.module.css `.btnPrimary,.btnSecondary` (line 125)**

Replace:
```css
  transition: all 0.15s;
```
With:
```css
  transition: opacity 0.15s, background-color 0.15s;
```

- [ ] **Step 4: Fix CardGrid.module.css `.card` (line 36)**

Replace:
```css
  transition: all 0.2s ease;
```
With:
```css
  transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
```

- [ ] **Step 5: Fix AddStory.module.css `.trigger` (line 13)**

Replace:
```css
  transition: all 0.15s;
```
With:
```css
  transition: border-color 0.15s, color 0.15s;
```

- [ ] **Step 6: Fix Landing.module.css `.btnPrimary,.btnSecondary` (line 80)**

Replace:
```css
  transition: all 0.15s;
```
With:
```css
  transition: opacity 0.15s, transform 0.15s, background-color 0.15s;
```

- [ ] **Step 7: Verify no `transition: all` remains**

Run: `grep -rn "transition: all" src/client/`
Expected: no matches

- [ ] **Step 8: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/client/pages/Room.module.css src/client/components/RevealBoard.module.css src/client/components/CardGrid.module.css src/client/components/AddStory.module.css src/client/pages/Landing.module.css
git commit -m "css: replace transition: all with explicit properties"
```

---

### Task 4: Add prefers-reduced-motion Support

**Why:** RevealBoard uses framer-motion animations that cannot be disabled by users who prefer reduced motion. The `fadeInOut` keyframe in Room.module.css also needs a reduced-motion variant. Additionally, card hover transforms should respect the preference.

**Files:**
- Modify: `src/client/components/RevealBoard.tsx`
- Modify: `src/client/components/RevealBoard.module.css`
- Modify: `src/client/index.css`

- [ ] **Step 1: Add reduced-motion media query to global CSS**

Add to the end of `src/client/index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Wrap framer-motion components in RevealBoard.tsx**

Replace the `motion.h3` at `src/client/components/RevealBoard.tsx:41-48` with:

```tsx
      <motion.h3
        className={styles.title}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
```

Actually — the global CSS rule handles this. Framer-motion generates inline styles with `transition` and `animation` properties, which the `prefers-reduced-motion: reduce` rule will override. But framer-motion also uses `transform` via JS — for full compliance we should check the `useReducedMotion` hook.

Replace `src/client/components/RevealBoard.tsx:1-8` with:

```tsx
import { motion, useReducedMotion } from "framer-motion";
import type {
  Estimate,
  RevealResult,
  Participant,
  FibonacciValue,
} from "../../shared/types";
import styles from "./RevealBoard.module.css";
```

Replace the component body start at `src/client/components/RevealBoard.tsx:28-30` with:

```tsx
}: RevealBoardProps) {
  const shouldReduceMotion = useReducedMotion();
```

Replace `src/client/components/RevealBoard.tsx:41-48` with:

```tsx
      <motion.h3
        className={styles.title}
        initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
        animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1 }}
      >
```

Replace `src/client/components/RevealBoard.tsx:54-64` with:

```tsx
            <motion.div
              key={est.participantId}
              className={styles.slot}
              initial={shouldReduceMotion ? {} : { opacity: 0, y: -60, scale: 0.8 }}
              animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      delay: 0.2 + i * 0.12,
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                    }
              }
            >
```

Replace `src/client/components/RevealBoard.tsx:84-88` with:

```tsx
        <motion.div
          className={styles.stats}
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 + sorted.length * 0.12 + 0.3 }}
        >
```

Replace `src/client/components/RevealBoard.tsx:117-121` with:

```tsx
      <motion.div
        className={styles.actions}
        initial={shouldReduceMotion ? {} : { opacity: 0 }}
        animate={shouldReduceMotion ? {} : { opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 + sorted.length * 0.12 + 0.5 }}
      >
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/components/RevealBoard.tsx src/client/index.css
git commit -m "a11y: add prefers-reduced-motion support for framer-motion animations"
```

---

### Task 5: Typography — Ellipsis and Curly Quotes

**Why:** Guidelines require `…` (ellipsis character) not `...` (three dots). StoryCard.tsx uses `"..."`.

**Files:**
- Modify: `src/client/components/StoryCard.tsx:24`
- Modify: `src/client/components/NamePrompt.tsx:59` (placeholder ellipsis handled in Task 1 if applied, but NamePrompt already has aria-label — just fix the placeholder ending)

- [ ] **Step 1: Fix StoryCard.tsx**

Replace `src/client/components/StoryCard.tsx:24`:

```tsx
      <div className={styles.title}>Estimating…</div>
```

- [ ] **Step 2: Fix NamePrompt.tsx placeholder**

Replace `src/client/components/NamePrompt.tsx:59`:

```tsx
          placeholder="Your display name…"
```

- [ ] **Step 3: Verify no `"..."` remains in TSX**

Run: `grep -n '"\.\.\."' src/client/**/*.tsx`
Expected: no matches

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/StoryCard.tsx src/client/components/NamePrompt.tsx
git commit -m "typography: replace ... with ellipsis character and add … to placeholders"
```

---

### Task 6: HTML Meta — theme-color and color-scheme

**Why:** Dark-themed app needs `<meta name="theme-color">` to match the background, and `color-scheme: dark` so native form controls (scrollbars, inputs) render in dark mode on all OS.

**Files:**
- Modify: `index.html`
- Modify: `src/client/index.css`

- [ ] **Step 1: Add theme-color meta tag**

Add to `index.html` after line 5 (after the viewport meta):

```html
        <meta name="theme-color" content="#060606" />
```

- [ ] **Step 2: Add color-scheme to global CSS**

Add to the top of `src/client/index.css` body block (after line 9):

```css
html {
  color-scheme: dark;
}
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add index.html src/client/index.css
git commit -m "meta: add theme-color and color-scheme: dark"
```

---

### Task 7: Review autoFocus Usage

**Why:** Guidelines say use `autoFocus` sparingly — desktop only, single primary input, avoid on mobile. Both NamePrompt.tsx and AddStory.tsx use it.

**Files:**
- Modify: `src/client/components/NamePrompt.tsx:13-15`
- Modify: `src/client/components/AddStory.tsx:36`

- [ ] **Step 1: Gate NamePrompt focus behind viewport check**

Replace `src/client/components/NamePrompt.tsx:13-15` with:

```tsx
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, []);
```

This only auto-focuses on devices with a fine pointer (desktop/mouse), not touch devices.

- [ ] **Step 2: Gate AddStory autoFocus behind viewport check**

Replace `src/client/components/AddStory.tsx:36`:

```tsx
        autoFocus={window.matchMedia("(pointer: fine)").matches}
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/components/NamePrompt.tsx src/client/components/AddStory.tsx
git commit -m "a11y: gate autoFocus behind fine-pointer media query"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All findings from the audit are covered:
  - Input labels → Task 1
  - Button aria-label (Room copy) → Task 2
  - Focus-visible rings → Task 2
  - `transition: all` → Task 3
  - prefers-reduced-motion → Task 4
  - `…` typography → Task 5
  - theme-color / color-scheme → Task 6
  - autoFocus → Task 7
- [x] **No placeholders:** All code blocks contain complete implementation code.
- [x] **Type consistency:** No new types introduced; existing types unchanged.
- [x] **No duplicate work:** Placeholder ellipsis fixes in Landing.tsx appear in Task 1 (where inputs are already being modified), NamePrompt.tsx placeholder in Task 5, AddStory.tsx placeholder in Task 1.
- [x] **Task independence:** Tasks can be executed in any order. Task 1 and Task 5 both modify NamePrompt.tsx and AddStory.tsx but at different lines — merge carefully if executing sequentially.
