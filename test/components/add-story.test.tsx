import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AddStory from "../../src/client/components/AddStory";

describe("AddStory", () => {
  it("calls onAdd with title and description when form is submitted via modal", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddStory onAdd={onAdd} />);

    await user.click(screen.getByRole("button", { name: /add story/i }));

    // Modal should be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/story title/i);
    await user.click(titleInput);
    await user.type(titleInput, "My new story");

    const descInput = screen.getByLabelText(/description/i);
    await user.click(descInput);
    await user.type(descInput, "Some details");

    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(onAdd).toHaveBeenCalledWith("My new story", "Some details");
    // Modal should be closed after submit
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
