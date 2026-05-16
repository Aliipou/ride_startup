import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import StatusBadge from "@/components/ui/StatusBadge";

describe("StatusBadge", () => {
  it("COMPLETED badge is green", () => {
    const { container } = render(<StatusBadge status="COMPLETED" />);
    expect(container.firstChild).toHaveClass("bg-green-100");
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it("CANCELLED badge is red", () => {
    const { container } = render(<StatusBadge status="CANCELLED" />);
    expect(container.firstChild).toHaveClass("bg-red-100");
  });

  it("PENDING badge is yellow", () => {
    const { container } = render(<StatusBadge status="PENDING" />);
    expect(container.firstChild).toHaveClass("bg-yellow-100");
  });

  it("IN_PROGRESS badge is blue", () => {
    const { container } = render(<StatusBadge status="IN_PROGRESS" />);
    expect(container.firstChild).toHaveClass("bg-blue-100");
  });

  it("ACCEPTED badge is blue", () => {
    const { container } = render(<StatusBadge status="ACCEPTED" />);
    expect(container.firstChild).toHaveClass("bg-blue-100");
  });

  it("displays human-readable text", () => {
    render(<StatusBadge status="RIDER_ARRIVED" />);
    expect(screen.getByText(/rider arrived/i)).toBeInTheDocument();
  });
});
