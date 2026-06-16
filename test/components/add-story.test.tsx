import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AddStory from "../../src/client/components/AddStory";

describe("AddStory bulk paste", () => {
  it("adds one story per pasted line via onAddMany", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onAddMany = vi.fn();
    render(<AddStory onAdd={onAdd} onAddMany={onAddMany} />);

    await user.click(screen.getByRole("button", { name: /add story/i }));
    await user.click(screen.getByRole("button", { name: /paste list/i }));

    const textarea = screen.getByPlaceholderText(/one per line/i);
    await user.type(textarea, "- Add login{enter}- Export CSV");
    await user.click(screen.getByRole("button", { name: /^add 2/i }));

    expect(onAddMany).toHaveBeenCalledWith(["Add login", "Export CSV"]);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
