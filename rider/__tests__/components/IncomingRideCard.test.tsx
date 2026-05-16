/**
 * Tests for IncomingRideCard component.
 * Critical: 30-second auto-decline must work reliably.
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import IncomingRideCard from "@/components/IncomingRideCard";

const mockRide = {
  id: "ride-123",
  origin_address: "Kauppatori, Kokkola",
  destination_address: "Halkokari Beach, Kokkola",
  distance_km: 3.2,
  final_price: 7.80,
  is_surge: false,
  bike_type: "STANDARD",
};

describe("IncomingRideCard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders pickup and dropoff addresses", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(<IncomingRideCard ride={mockRide as any} onAccept={onAccept} onDecline={onDecline} />);

    expect(screen.getByText("Kauppatori, Kokkola")).toBeInTheDocument();
    expect(screen.getByText("Halkokari Beach, Kokkola")).toBeInTheDocument();
  });

  it("displays price and distance", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(<IncomingRideCard ride={mockRide as any} onAccept={onAccept} onDecline={onDecline} />);

    expect(screen.getByText(/7.80/)).toBeInTheDocument();
    expect(screen.getByText(/3.2/)).toBeInTheDocument();
  });

  it("calls onAccept when Accept button clicked", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(<IncomingRideCard ride={mockRide as any} onAccept={onAccept} onDecline={onDecline} />);

    fireEvent.click(screen.getByRole("button", { name: /accept/i }));
    expect(onAccept).toHaveBeenCalledWith(mockRide.id);
  });

  it("calls onDecline when Decline button clicked", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(<IncomingRideCard ride={mockRide as any} onAccept={onAccept} onDecline={onDecline} />);

    fireEvent.click(screen.getByRole("button", { name: /decline/i }));
    expect(onDecline).toHaveBeenCalledWith(mockRide.id);
  });

  it("auto-calls onDecline after 30 seconds", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(<IncomingRideCard ride={mockRide as any} onAccept={onAccept} onDecline={onDecline} />);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(onDecline).toHaveBeenCalledWith(mockRide.id);
  });

  it("shows surge badge when is_surge is true", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(
      <IncomingRideCard
        ride={{ ...mockRide, is_surge: true } as any}
        onAccept={onAccept}
        onDecline={onDecline}
      />
    );
    expect(screen.getByText(/surge/i)).toBeInTheDocument();
  });

  it("countdown timer decrements each second", () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    render(<IncomingRideCard ride={mockRide as any} onAccept={onAccept} onDecline={onDecline} />);

    expect(screen.getByText("30")).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1000); });
    expect(screen.getByText("29")).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.getByText("24")).toBeInTheDocument();
  });
});
