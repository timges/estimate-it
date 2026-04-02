import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ParticipantList from "../../src/client/components/ParticipantList";

const makeParticipant = (overrides = {}) => ({
  id: "1",
  displayName: "Alice",
  color: "#ff0000",
  hasEstimated: false,
  ...overrides,
});

describe("ParticipantList", () => {
  it("shows 'Participants (N)' with correct count", () => {
    render(
      <ParticipantList
        participants={[makeParticipant(), makeParticipant({ id: "2" })]}
      />,
    );
    expect(screen.getByText("Participants (2)")).toBeInTheDocument();
  });

  it("shows '✓ estimated' for hasEstimated=true", () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ hasEstimated: true })]}
      />,
    );
    expect(screen.getByText("✓ estimated")).toBeInTheDocument();
  });

  it("shows 'picking...' for hasEstimated=false", () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ hasEstimated: false })]}
      />,
    );
    expect(screen.getByText("picking...")).toBeInTheDocument();
  });
});
