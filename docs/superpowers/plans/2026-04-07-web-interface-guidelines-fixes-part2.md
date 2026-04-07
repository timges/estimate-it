# Web Interface Guidelines Fixes - Part 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix remaining accessibility, forms, typography, and content handling issues not covered in Part 1.

**Architecture:** 11 independent tasks. Each task produces a standalone commit. Some tasks touch the same files but different lines.

**Tech Stack:** React 19, CSS Modules, Vitest + Testing Library

---

## File Map

| File | Tasks that modify it |
|------|---------------------|
| `src/client/components/ParticipantList.tsx` | 3, 4 |
| `src/client/components/ParticipantList.module.css` | 1, 4 |
| `src/client/components/NamePrompt.module.css` | 1 |
| `src/client/components/AddStory.module.css` | 1 |
| `src/client/pages/Landing.module.css` | 1 |
| `src/client/pages/Room.tsx` | 4 |
| `src/client/pages/Room.module.css` | 11 |
| `src/client/components/CardGrid.module.css` | 5 |
| `src/client/components/RevealBoard.tsx` | 7 |
| `src/client/components/RevealBoard.module.css` | 6, 7 |
| `src/client/components/StoryList.tsx` | 8 |
| `src/client/components/StoryList.module.css` | 8 |
| `src/client/components/StoryCard.tsx` | 9 |
| `src/client/components/StoryCard.module.css` | 8, 9 |

---

## Task 1: Fix CSS outline:none → focus-visible replacement

**Why:** Several CSS files have `outline: none` without providing a `:focus-visible` replacement, breaking keyboard navigation visibility.

**Files:**
- Modify: `src/client/components/ParticipantList.module.css:113`
- Modify: `src/client/components/NamePrompt.module.css:42`
- Modify: `src/client/components/AddStory.module.css:49`
- Modify: `src/client/pages/Landing.module.css:57`

- [ ] **Step 1: Fix ParticipantList.module.css**

Replace line 113 (`outline: none;`) with:

```css
.renameInput:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

- [ ] **Step 2: Fix NamePrompt.module.css**

Replace line 42 (`outline: none;`) with:

```css
.input:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

- [ ] **Step 3: Fix AddStory.module.css**

Replace line 49 (`outline: none;`) with:

```css
.input:focus,
.textarea:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

- [ ] **Step 4: Fix Landing.module.css**

Replace line 57 (`outline: none;`) with:

```css
.input:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/client/components/ParticipantList.module.css src/client/components/NamePrompt.module.css src/client/components/AddStory.module.css src/client/pages/Landing.module.css
git commit -m "fix: replace outline:none with focus-visible styles"
```

---

## Task 2: Add autocomplete, name, spellCheck to form inputs

**Why:** Form inputs need `autocomplete` for browser autofill, meaningful `name` attributes, and `spellCheck={false}` for display names to avoid distraction.

**Files:**
- Modify: `src/client/pages/Landing.tsx:39,63,74`
- Modify: `src/client/components/NamePrompt.tsx:58`
- Modify: `src/client/components/AddStory.tsx:34,45`

- [ ] **Step 1: Fix Landing.tsx create-name input (line 39)**

Replace:

```tsx
<input
  id="create-name"
  className={styles.input}
  placeholder="Your display name…"
  value={createName}
  onChange={(e) => setCreateName(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
/>
```

With:

```tsx
<input
  id="create-name"
  name="displayName"
  autocomplete="name"
  spellCheck={false}
  className={styles.input}
  placeholder="Your display name…"
  value={createName}
  onChange={(e) => setCreateName(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
/>
```

- [ ] **Step 2: Fix Landing.tsx join-code input (line 63)**

Replace:

```tsx
<input
  id="join-code"
  className={styles.input}
  placeholder="Room code (e.g. coral-falcon)…"
  value={joinCode}
  onChange={(e) => setJoinCode(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
/>
```

With:

```tsx
<input
  id="join-code"
  name="roomCode"
  autocomplete="off"
  spellCheck={false}
  className={styles.input}
  placeholder="Room code (e.g. coral-falcon)…"
  value={joinCode}
  onChange={(e) => setJoinCode(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
/>
```

- [ ] **Step 3: Fix Landing.tsx join-name input (line 74)**

Replace:

```tsx
<input
  id="join-name"
  className={styles.input}
  placeholder="Your display name…"
  value={joinName}
  onChange={(e) => setJoinName(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
/>
```

With:

```tsx
<input
  id="join-name"
  name="displayName"
  autocomplete="name"
  spellCheck={false}
  className={styles.input}
  placeholder="Your display name…"
  value={joinName}
  onChange={(e) => setJoinName(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
/>
```

- [ ] **Step 4: Fix NamePrompt.tsx input (line 58)**

Replace:

```tsx
<input
  ref={inputRef}
  className={styles.input}
  placeholder="Your display name…"
  aria-label="Display name"
  maxLength={30}
  value={name}
  onChange={(e) => setName(e.target.value)}
  onKeyDown={handleKeyDown}
/>
```

With:

```tsx
<input
  ref={inputRef}
  name="displayName"
  autocomplete="name"
  spellCheck={false}
  className={styles.input}
  placeholder="Your display name…"
  aria-label="Display name"
  maxLength={30}
  value={name}
  onChange={(e) => setName(e.target.value)}
  onKeyDown={handleKeyDown}
/>
```

- [ ] **Step 5: Fix AddStory.tsx title input (line 34)**

Replace:

```tsx
<input
  id="story-title"
  className={styles.input}
  placeholder="Story title…"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  autoFocus={window.matchMedia("(pointer: fine)").matches}
/>
```

With:

```tsx
<input
  id="story-title"
  name="storyTitle"
  autocomplete="off"
  className={styles.input}
  placeholder="Story title…"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
  autoFocus={window.matchMedia("(pointer: fine)").matches}
/>
```

- [ ] **Step 6: Fix AddStory.tsx description textarea (line 45)**

Replace:

```tsx
<textarea
  id="story-description"
  className={styles.textarea}
  placeholder="Description (optional)…"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={3}
/>
```

With:

```tsx
<textarea
  id="story-description"
  name="storyDescription"
  autocomplete="off"
  className={styles.textarea}
  placeholder="Description (optional)…"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={3}
/>
```

- [ ] **Step 7: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/client/pages/Landing.tsx src/client/components/NamePrompt.tsx src/client/components/AddStory.tsx
git commit -m "fix: add autocomplete, name, and spellCheck to form inputs"
```

---

## Task 3: Add aria-live to async text updates

**Why:** Dynamic text updates (like "copied" feedback and participant status) need `aria-live="polite"` so screen readers announce them.

**Files:**
- Modify: `src/client/pages/Room.tsx:156`
- Modify: `src/client/components/ParticipantList.tsx:120-122`

- [ ] **Step 1: Fix Room.tsx copied label (line 156)**

Replace:

```tsx
<span className={styles.copiedLabel}>copied</span>
```

With:

```tsx
<span className={styles.copiedLabel} aria-live="polite">copied</span>
```

- [ ] **Step 2: Fix ParticipantList.tsx status element (lines 120-122)**

Replace:

```tsx
<div
  className={`${styles.status} ${p.hasEstimated ? styles.voted : ""}`}
>
  {p.hasEstimated ? "✓ estimated" : "picking…"}
</div>
```

With:

```tsx
<div
  className={`${styles.status} ${p.hasEstimated ? styles.voted : ""}`}
  aria-live="polite"
>
  {p.hasEstimated ? "✓ Estimated" : "Picking…"}
</div>
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/pages/Room.tsx src/client/components/ParticipantList.tsx
git commit -m "fix: add aria-live to async text updates"
```

---

## Task 4: Fix semantic HTML (div→button for clickable elements)

**Why:** Interactive elements should use semantic `<button>` elements, not `<div>` with role="button". This ensures proper keyboard handling and accessibility.

**Files:**
- Modify: `src/client/components/ParticipantList.tsx:71-89`
- Modify: `src/client/components/ParticipantList.module.css:62-102`

- [ ] **Step 1: Fix ParticipantList.tsx name element**

Replace lines 70-89:

```tsx
<div
  role="button"
  tabIndex={p.id === currentParticipantId ? 0 : undefined}
  className={`${styles.name} ${p.id === currentParticipantId ? styles.clickable : ""}`}
  onClick={p.id === currentParticipantId ? () => handleStartEdit(p) : undefined}
  onKeyDown={
    p.id === currentParticipantId
      ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleStartEdit(p);
          }
        }
      : undefined
  }
  title={p.id === currentParticipantId ? "Click to rename" : undefined}
>
  {p.displayName}
</div>
```

With:

```tsx
<button
  type="button"
  className={`${styles.name} ${p.id === currentParticipantId ? styles.clickable : ""}`}
  onClick={p.id === currentParticipantId ? () => handleStartEdit(p) : undefined}
  title={p.id === currentParticipantId ? "Click to rename" : undefined}
>
  {p.displayName}
</button>
```

- [ ] **Step 2: Update ParticipantList.module.css for button**

Replace `.name` CSS (lines 62-68):

```css
.name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

With:

```css
.name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: none;
  border: none;
  color: inherit;
  padding: 0;
  cursor: default;
  text-align: left;
}
```

- [ ] **Step 3: Fix StoryList.tsx heading**

In `src/client/components/StoryList.tsx`, replace line 27:

```tsx
<div className={styles.heading}>Stories</div>
```

With:

```tsx
<h3 className={styles.heading}>Stories</h3>
```

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/client/components/ParticipantList.tsx src/client/components/ParticipantList.module.css src/client/components/StoryList.tsx
git commit -m "fix: use semantic HTML elements (button, h3)"
```

---

## Task 5: Fix CardGrid transition to animate only transform/opacity

**Why:** The guidelines require animating only compositor-friendly properties (`transform`, `opacity`). CardGrid includes `border-color`, `color`, `box-shadow` in its transition.

**Files:**
- Modify: `src/client/components/CardGrid.module.css:36`

- [ ] **Step 1: Fix CardGrid.module.css transition**

Replace line 36:

```css
transition: transform 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
```

With:

```css
transition: transform 0.2s ease, opacity 0.2s ease;
```

- [ ] **Step 2: Add hover/selected opacity changes**

Add after the `.card:hover:not(:disabled)` block:

```css
.card:hover:not(:disabled) {
  transform: translateY(-8px);
  opacity: 0.9;
}

.card.selected {
  transform: translateY(-12px);
  opacity: 0.9;
}
```

Note: Border color changes will be removed — visual feedback comes from transform + opacity only.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/components/CardGrid.module.css
git commit -m "fix: animate only transform and opacity in CardGrid"
```

---

## Task 6: Add tabular-nums to RevealBoard numeric values

**Why:** Numbers (estimate values, distribution counts) should use `font-variant-numeric: tabular-nums` for proper alignment in columns.

**Files:**
- Modify: `src/client/components/RevealBoard.module.css:32-43,82-110`

- [ ] **Step 1: Add tabular-nums to .estimateCard**

Add to `.estimateCard` CSS (after line 42):

```css
font-variant-numeric: tabular-nums;
```

- [ ] **Step 2: Add tabular-nums to distribution values**

Add to `.distValue` CSS:

```css
font-variant-numeric: tabular-nums;
```

Add to `.distCount` CSS:

```css
font-variant-numeric: tabular-nums;
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/components/RevealBoard.module.css
git commit -m "fix: add tabular-nums to RevealBoard numeric values"
```

---

## Task 7: Fix Title Case in UI text

**Why:** Headings and buttons should use Title Case (Chicago style) per the guidelines.

**Files:**
- Modify: `src/client/components/CardGrid.tsx:43`
- Modify: `src/client/components/RevealBoard.tsx:101`

- [ ] **Step 1: Fix CardGrid.tsx label**

Replace line 43:

```tsx
<h3 className={styles.label}>Your estimate</h3>
```

With:

```tsx
<h3 className={styles.label}>Your Estimate</h3>
```

- [ ] **Step 2: Fix RevealBoard.tsx consensus message**

Replace line 101:

```tsx
<div className={styles.consensus}>All agree!</div>
```

With:

```tsx
<div className={styles.consensus}>All Agree!</div>
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/components/CardGrid.tsx src/client/components/RevealBoard.tsx
git commit -m "fix: apply Title Case to UI headings"
```

---

## Task 8: Add text truncation to StoryList

**Why:** Long story titles need `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap` to handle overflow gracefully.

**Files:**
- Modify: `src/client/components/StoryList.module.css:59-62`

- [ ] **Step 1: Add truncation styles to .title**

Replace lines 59-62:

```css
.title {
  font-size: 13px;
  color: #d4d4d4;
}
```

With:

```css
.title {
  font-size: 13px;
  color: #d4d4d4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/client/components/StoryList.module.css
git commit -m "fix: add text truncation to StoryList titles"
```

---

## Task 9: Add text truncation and line-clamp to StoryCard

**Why:** StoryCard needs overflow handling for both title (single line) and description (multi-line clamp).

**Files:**
- Modify: `src/client/components/StoryCard.module.css:17-27`

- [ ] **Step 1: Add truncation to .title**

Replace lines 17-21:

```css
.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}
```

With:

```css
.title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Add line-clamp to .description**

Replace lines 23-27:

```css
.description {
  color: #a3a3a3;
  font-size: 14px;
  line-height: 1.6;
}
```

With:

```css
.description {
  color: #a3a3a3;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/client/components/StoryCard.module.css
git commit -m "fix: add text truncation and line-clamp to StoryCard"
```

---

## Task 10: Add overscroll-behavior to modal backdrop

**Why:** Modal/dialog backdrops should have `overscroll-behavior: contain` to prevent the page behind from scrolling when the user scrolls within the modal.

**Files:**
- Modify: `src/client/components/NamePrompt.module.css:1-9`

- [ ] **Step 1: Add overscroll-behavior to .backdrop**

Replace lines 1-9:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
```

With:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  overscroll-behavior: contain;
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/client/components/NamePrompt.module.css
git commit -m "fix: add overscroll-behavior to modal backdrop"
```

---

## Task 11: Add hover state to Room copy button

**Why:** Interactive elements need visible hover states for visual feedback.

**Files:**
- Modify: `src/client/pages/Room.module.css:42-55`

- [ ] **Step 1: Add hover state to .code**

Add after the `.code:focus-visible` block:

```css
.code:hover {
  background: #262626;
  color: #a3a3a3;
}
```

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/client/pages/Room.module.css
git commit -m "fix: add hover state to room code button"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All remaining audit findings covered:
  - outline:none → focus-visible → Task 1
  - autocomplete/name/spellCheck → Task 2
  - aria-live → Task 3
  - Semantic HTML (div→button) → Task 4
  - CardGrid transition → Task 5
  - tabular-nums → Task 6
  - Title Case → Task 7
  - StoryList truncation → Task 8
  - StoryCard truncation → Task 9
  - overscroll-behavior → Task 10
  - Hover states → Task 11
- [x] **No placeholders:** All code blocks contain complete implementation code.
- [x] **Type consistency:** No new types introduced.
- [x] **Task independence:** Tasks can be executed in any order.