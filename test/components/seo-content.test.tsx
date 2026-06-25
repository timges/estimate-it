import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SeoContent from "../../src/client/components/SeoContent";

describe("SeoContent", () => {
  it("renders How It Works section with 3 steps", () => {
    render(<SeoContent />);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("Create a Room")).toBeInTheDocument();
    expect(screen.getByText("Vote Together")).toBeInTheDocument();
    expect(screen.getByText("Reveal & Discuss")).toBeInTheDocument();
  });

  it("renders Why estimate-it section with 3 benefits", () => {
    render(<SeoContent />);
    expect(screen.getByText("Why estimate-it")).toBeInTheDocument();
    expect(screen.getByText("Bias-Free by Design")).toBeInTheDocument();
    expect(screen.getByText("Zero Friction")).toBeInTheDocument();
    expect(screen.getByText("Real-Time Sync")).toBeInTheDocument();
  });

  it("renders FAQ section with 3 questions", () => {
    render(<SeoContent />);
    expect(screen.getByText("FAQ")).toBeInTheDocument();
    expect(screen.getByText("What is planning poker?")).toBeInTheDocument();
    expect(screen.getByText("Why use Fibonacci numbers?")).toBeInTheDocument();
    expect(screen.getByText("Is estimate-it free?")).toBeInTheDocument();
  });

  it("renders footer links to landing pages", () => {
    render(<SeoContent />);
    const pokerLink = screen.getByText("What is Planning Poker");
    const guideLink = screen.getByText("Sprint Planning Guide");
    expect(pokerLink).toHaveAttribute("href", "/what-is-planning-poker");
    expect(guideLink).toHaveAttribute("href", "/sprint-planning-guide");
  });

  it("includes FAQPage JSON-LD structured data", () => {
    const { container } = render(<SeoContent />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    const schema = JSON.parse(script!.textContent!);
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(3);
  });
});
