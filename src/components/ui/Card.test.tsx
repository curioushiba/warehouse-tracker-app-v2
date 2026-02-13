import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("does not apply overflow-hidden by default", () => {
    const { container } = render(<Card>Content</Card>);
    const cardEl = container.firstChild as HTMLElement;
    expect(cardEl.className).not.toContain("overflow-hidden");
  });

  it("allows explicit overflow-hidden via className prop", () => {
    const { container } = render(
      <Card className="overflow-hidden">Content</Card>
    );
    const cardEl = container.firstChild as HTMLElement;
    expect(cardEl.className).toContain("overflow-hidden");
  });
});
