import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import Landing from "../../src/client/pages/Landing";
import AddStory from "../../src/client/components/AddStory";

describe("form input accessibility", () => {
  it("Landing inputs have accessible names via labels", () => {
    render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>,
    );
    expect(
      screen.getByLabelText("Your Display Name", { selector: "#create-name" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Room Code")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Your Display Name", { selector: "#join-name" }),
    ).toBeInTheDocument();
  });

  it("AddStory inputs have accessible names via labels", async () => {
    const user = userEvent.setup();
    render(<AddStory onAdd={() => {}} />);
    await user.click(screen.getByText("+ Add Story"));
    expect(screen.getByLabelText("Story Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });
});
