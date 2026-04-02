import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Landing from "../../src/client/pages/Landing";

describe("Landing", () => {
  const renderLanding = () =>
    render(
      <BrowserRouter>
        <Landing />
      </BrowserRouter>,
    );

  it("shows 'Create a Room' and 'Join a Room'", () => {
    renderLanding();
    expect(screen.getByText("Create a Room")).toBeInTheDocument();
    expect(screen.getByText("Join a Room")).toBeInTheDocument();
  });

  it("create button is disabled without name", () => {
    renderLanding();
    expect(screen.getByText("Create Room")).toBeDisabled();
  });

  it("join button is disabled without code and name", () => {
    renderLanding();
    expect(screen.getByText("Join Room")).toBeDisabled();
  });
});
