import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StoryCard from "../../src/client/components/StoryCard";

describe("StoryCard", () => {
  it("shows 'No Story' and 'Estimating...' when story is null", () => {
    render(<StoryCard story={null} />);
    expect(screen.getByText("No Story")).toBeInTheDocument();
    expect(screen.getByText("Estimating...")).toBeInTheDocument();
  });

  it("shows story title when provided", () => {
    render(
      <StoryCard
        story={{ id: 1, title: "Login Page", description: "", position: 0, status: "active" }}
      />,
    );
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("shows description when provided", () => {
    render(
      <StoryCard
        story={{
          id: 1,
          title: "Login Page",
          description: "Add OAuth support",
          position: 0,
          status: "active",
        }}
      />,
    );
    expect(screen.getByText("Add OAuth support")).toBeInTheDocument();
  });
});
