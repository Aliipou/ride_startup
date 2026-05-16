import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import StatCard from "@/components/ui/StatCard";
import { DollarSign } from "lucide-react";

describe("StatCard", () => {
  it("renders title and value", () => {
    render(<StatCard title="Revenue Today" value="€42.00" icon={DollarSign} color="green" />);
    expect(screen.getByText("Revenue Today")).toBeInTheDocument();
    expect(screen.getByText("€42.00")).toBeInTheDocument();
  });

  it("renders numeric value as string", () => {
    render(<StatCard title="Total Rides" value={15} icon={DollarSign} color="blue" />);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("shows delta badge when provided", () => {
    render(<StatCard title="Rides" value={10} icon={DollarSign} color="blue" delta="+3" deltaPositive />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("renders with all color variants without crashing", () => {
    const colors = ["blue", "green", "emerald", "purple", "amber"] as const;
    colors.forEach((color) => {
      const { unmount } = render(<StatCard title="Test" value={0} icon={DollarSign} color={color} />);
      unmount();
    });
  });
});
