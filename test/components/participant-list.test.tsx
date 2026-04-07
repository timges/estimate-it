import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParticipantList from "../../src/client/components/ParticipantList";

const makeParticipant = (overrides = {}) => ({
  id: "1",
  displayName: "Alice",
  color: "#ff0000",
  hasEstimated: false,
  ...overrides,
});

const noop = () => {};

describe("ParticipantList", () => {
  it("shows 'Participants (N)' with correct count", () => {
    render(
      <ParticipantList
        participants={[makeParticipant(), makeParticipant({ id: "2" })]}
        currentParticipantId={null}
        onRename={noop}
      />,
    );
    expect(screen.getByText("Participants (2)")).toBeInTheDocument();
  });

  it("shows '✓ estimated' for hasEstimated=true", () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ hasEstimated: true })]}
        currentParticipantId={null}
        onRename={noop}
      />,
    );
    expect(screen.getByText("✓ estimated")).toBeInTheDocument();
  });

  it("shows 'picking…' for hasEstimated=false", () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ hasEstimated: false })]}
        currentParticipantId={null}
        onRename={noop}
      />,
    );
    expect(screen.getByText("picking…")).toBeInTheDocument();
  });

  it("shows pencil icon next to the current user's name", () => {
    render(
      <ParticipantList
        participants={[
          makeParticipant({ id: "1", displayName: "Alice" }),
          makeParticipant({ id: "2", displayName: "Bob" }),
        ]}
        currentParticipantId="1"
        onRename={noop}
      />,
    );
    const pencilIcons = document.querySelectorAll("[data-pencil-icon]");
    expect(pencilIcons).toHaveLength(1);
    expect(pencilIcons[0].closest(`[data-participant-id="1"]`)).toBeTruthy();
  });

  it("does not show pencil icon for other participants", () => {
    render(
      <ParticipantList
        participants={[
          makeParticipant({ id: "1", displayName: "Alice" }),
          makeParticipant({ id: "2", displayName: "Bob" }),
        ]}
        currentParticipantId="1"
        onRename={noop}
      />,
    );
    const bobRow = document.querySelector(`[data-participant-id="2"]`);
    expect(bobRow?.querySelector("[data-pencil-icon]")).toBeNull();
  });

  it("clicking pencil icon triggers rename for current user", () => {
    render(
      <ParticipantList
        participants={[
          makeParticipant({ id: "1", displayName: "Alice" }),
        ]}
        currentParticipantId="1"
        onRename={noop}
      />,
    );
    const pencilIcon = document.querySelector("[data-pencil-icon]");
    expect(pencilIcon).toBeTruthy();
    fireEvent.click(pencilIcon as Element);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("does not show pencil icon when currentParticipantId is null", () => {
    render(
      <ParticipantList
        participants={[makeParticipant({ id: "1", displayName: "Alice" })]}
        currentParticipantId={null}
        onRename={noop}
      />,
    );
    const pencilIcons = document.querySelectorAll("[data-pencil-icon]");
    expect(pencilIcons).toHaveLength(0);
  });
});
