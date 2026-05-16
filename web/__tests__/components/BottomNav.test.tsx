import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/home",
}));

import BottomNav from "@/components/ui/BottomNav";

describe("BottomNav", () => {
  it("renders 4 navigation items", () => {
    render(<BottomNav />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("Home item is active when on /home", () => {
    render(<BottomNav />);
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/home");
  });

  it("all items have correct hrefs", () => {
    render(<BottomNav />);
    expect(screen.getByText("History").closest("a")).toHaveAttribute("href", "/history");
    expect(screen.getByText("Wallet").closest("a")).toHaveAttribute("href", "/wallet");
    expect(screen.getByText("Profile").closest("a")).toHaveAttribute("href", "/profile");
  });
});
