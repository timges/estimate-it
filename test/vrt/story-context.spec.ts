import { test, expect } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

/**
 * Creates a room, adds a story, and runs the activate cycle so that the
 * first pending story becomes active (status "active").
 *
 * Activate cycle: because there is no active story initially, the Reveal
 * Estimates call marks the voting round as revealed with story_id=0 (no story
 * active), then "Next Story" promotes the first pending story to "active".
 */
async function createRoomWithActiveStory(
  page: import("@playwright/test").Page,
  storyTitle: string
) {
  await page.goto("/");
  await page.getByPlaceholder("John Doe").first().fill("Alice");
  await page.getByRole("button", { name: "Create Room" }).click();
  await page.waitForURL(/\/room\//);

  // Add the story via the sidebar form
  await page.getByRole("button", { name: "+ Add Story" }).click();
  await page.getByLabel("Story Title").fill(storyTitle);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // Activate the first pending story via the reveal→next cycle.
  // Without an active story the "Reveal Estimates" vote round uses story_id=0,
  // but "Next Story" still promotes the first pending story to active.
  await page.getByRole("button", { name: "5" }).click();
  await page.getByRole("button", { name: "Reveal Estimates" }).click();
  await expect(page.getByRole("button", { name: "Next Story" })).toBeVisible();
  await page.getByRole("button", { name: "Next Story" }).click();
}

test("story spotlight active", async ({ page }) => {
  await createRoomWithActiveStory(page, "Add OAuth login");

  // The spotlight should now show "Now estimating" with the story title
  await expect(page.getByText("Now estimating")).toBeVisible();
  // Use the spotlight panel title element to avoid strict-mode collision with
  // the story-list entry that also shows the same text.
  await expect(
    page.locator("[class*='_panel_']").getByText("Add OAuth login")
  ).toBeVisible();

  await expect(page).toHaveScreenshot("story-spotlight.png");
});

test("session summary", async ({ page }) => {
  // Set up: two stories.
  // Story 1 will be fully completed (voted → revealed → final estimate → Next Story → done).
  // Story 2 will be voted and revealed as the last story. At that point the
  // client's revealed state is true and story 2 is still tracked as "active"
  // client-side (the server-side "revealed" broadcast does not update story
  // status in the client store).
  //
  // NOTE: The "Next Story" button is only rendered when hasNextStory is true
  // (i.e. a pending story exists). For the last story there is no "Next Story"
  // button, so we trigger the session summary via a different path: after
  // revealing story 2 we use "Next Story" (story 2 is the FIRST story we
  // activate, story 1 is still pending, so hasNextStory is true at that point).
  // We therefore run story 2 first, then story 1.
  //
  // Concretely: add 2 stories, activate via null-round cycle (story 1 →
  // active, story 2 pending), complete story 1 with Next Story (→ story 2
  // active, story 1 done), complete story 2's reveal with Next Story — but
  // there are no more pending stories at that point. So instead: add story 2
  // first so it gets activated first, then story 1 is the "spare" pending story
  // that keeps the Next Story button alive.

  await page.goto("/");
  await page.getByPlaceholder("John Doe").first().fill("Alice");
  await page.getByRole("button", { name: "Create Room" }).click();
  await page.waitForURL(/\/room\//);

  // Add story A (will become active first via activate cycle)
  await page.getByRole("button", { name: "+ Add Story" }).click();
  await page.getByLabel("Story Title").fill("Add OAuth login");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // Add story B (keeps hasNextStory=true during story A's reveal)
  await page.getByRole("button", { name: "+ Add Story" }).click();
  await page.getByLabel("Story Title").fill("Setup CI pipeline");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // Activate story A via reveal→next cycle (no active story yet)
  await page.getByRole("button", { name: "5" }).click();
  await page.getByRole("button", { name: "Reveal Estimates" }).click();
  await expect(page.getByRole("button", { name: "Next Story" })).toBeVisible();
  await page.getByRole("button", { name: "Next Story" }).click();

  // Story A is now active; story B is pending (hasNextStory = true)
  await expect(page.getByText("Now estimating")).toBeVisible();

  // Vote and reveal story A; set its final estimate
  await page.getByRole("button", { name: "5" }).click();
  await page.getByRole("button", { name: "Reveal Estimates" }).click();
  await expect(page.getByRole("button", { name: "Final estimate 5" })).toBeVisible();
  await page.getByRole("button", { name: "Final estimate 5" }).click();

  // Next Story is shown because story B is still pending → advances to story B
  await expect(page.getByRole("button", { name: "Next Story" })).toBeVisible();
  await page.getByRole("button", { name: "Next Story" }).click();

  // Story B is now active; story A is done; no more pending stories.
  // Select a card and reveal story B.
  await expect(page.getByText("Now estimating")).toBeVisible();
  await page.getByRole("button", { name: "5" }).click();
  await page.getByRole("button", { name: "Reveal Estimates" }).click();

  // The client now has revealed=true, story A=done, story B=active (client-
  // side — the server marked it "revealed" but that status change is not
  // propagated back via story_changed, so the client doesn't see it yet).
  // Set the final estimate so it's recorded in the RevealBoard.
  await expect(page.getByRole("button", { name: "Final estimate 5" })).toBeVisible();
  await page.getByRole("button", { name: "Final estimate 5" }).click();

  // WORKAROUND: The "Next Story" button does not appear for the last story
  // because hasNextStory (= stories.some(s => s.status === "pending")) is
  // false. The session summary can only be reached via nextStory() sending
  // story_changed for all stories including the final story as "done".
  //
  // To trigger that, we delete story B (the last story) from the story list.
  // The story_deleted handler sees revealed=true and the story as active, so
  // it resets the reveal state and removes it. With only story A (done)
  // remaining, sessionComplete becomes true and the session summary renders.
  //
  // BUG REPORT: "Next Story" should also appear on the last story's reveal
  // to allow ending the session cleanly. The fix in Room.tsx would be:
  //   const hasNextStory = stories.some(s => s.status === "pending") || hasActiveStory;
  // (or a dedicated "End Session" button). Until fixed, the session summary
  // state is unreachable via the intended flow.
  await page.getByRole("button", { name: "Delete Setup CI pipeline" }).click();

  // Session complete view should appear now that story B is removed
  await expect(page.getByText("Session complete")).toBeVisible();

  await expect(page).toHaveScreenshot("session-summary.png");
});
