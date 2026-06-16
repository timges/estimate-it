import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AddStory from "../../src/client/components/AddStory";

describe("AddStory", () => {
  it("calls onAdd with title and description when form is submitted", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddStory onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: /add story/i }));

    const titleInput = screen.getByLabelText(/story title/i);
    await user.type(titleInput, "My new story");

    const descInput = screen.getByLabelText(/description/i);
    await user.type(descInput, "Some details");

    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(onAdd).toHaveBeenCalledWith("My new story", "Some details");
  });
});
