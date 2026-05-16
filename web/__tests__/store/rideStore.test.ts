import { describe, it, expect, beforeEach } from "@jest/globals";
import { useRideStore } from "@/lib/store/rideStore";

describe("rideStore", () => {
  beforeEach(() => {
    useRideStore.setState({ currentRide: null, riderLocation: null, rideStatus: null });
  });

  it("initial state is empty", () => {
    const state = useRideStore.getState();
    expect(state.currentRide).toBeNull();
    expect(state.riderLocation).toBeNull();
  });

  it("setRide updates currentRide", () => {
    const mockRide = { id: "r1", status: "PENDING", final_price: 7.5 } as any;
    useRideStore.getState().setRide(mockRide);
    expect(useRideStore.getState().currentRide?.id).toBe("r1");
  });

  it("updateRiderLocation updates position", () => {
    useRideStore.getState().updateRiderLocation({ lat: 63.838, lng: 23.130 });
    const state = useRideStore.getState();
    expect(state.riderLocation?.lat).toBe(63.838);
    expect(state.riderLocation?.lng).toBe(23.130);
  });

  it("clearRide resets to null", () => {
    const mockRide = { id: "r1", status: "COMPLETED" } as any;
    useRideStore.getState().setRide(mockRide);
    useRideStore.getState().clearRide();
    expect(useRideStore.getState().currentRide).toBeNull();
  });

  it("setStatus updates rideStatus", () => {
    useRideStore.getState().setStatus("IN_PROGRESS");
    expect(useRideStore.getState().rideStatus).toBe("IN_PROGRESS");
  });
});
