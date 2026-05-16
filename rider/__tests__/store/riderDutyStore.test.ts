import { describe, it, expect, beforeEach } from "@jest/globals";
import { useRiderDutyStore } from "@/lib/store/riderDutyStore";

describe("riderDutyStore", () => {
  beforeEach(() => {
    useRiderDutyStore.setState({
      status: "OFFLINE",
      currentRide: null,
      incomingRide: null,
      earnings: { today: 0, available: 0, pending: 0 },
    });
  });

  it("initial status is OFFLINE", () => {
    expect(useRiderDutyStore.getState().status).toBe("OFFLINE");
  });

  it("setStatus updates status", () => {
    useRiderDutyStore.getState().setStatus("ONLINE");
    expect(useRiderDutyStore.getState().status).toBe("ONLINE");
  });

  it("setIncomingRide stores the ride", () => {
    const ride = { id: "r1", final_price: 8.5, origin_address: "Market" } as any;
    useRiderDutyStore.getState().setIncomingRide(ride);
    expect(useRiderDutyStore.getState().incomingRide?.id).toBe("r1");
  });

  it("clearIncomingRide removes the ride", () => {
    const ride = { id: "r1" } as any;
    useRiderDutyStore.getState().setIncomingRide(ride);
    useRiderDutyStore.getState().clearIncomingRide();
    expect(useRiderDutyStore.getState().incomingRide).toBeNull();
  });

  it("setCurrentRide updates current ride", () => {
    const ride = { id: "r2", status: "IN_PROGRESS" } as any;
    useRiderDutyStore.getState().setCurrentRide(ride);
    expect(useRiderDutyStore.getState().currentRide?.id).toBe("r2");
  });

  it("updateEarnings sums correctly", () => {
    useRiderDutyStore.getState().updateEarnings({ today: 45.50, available: 40.00, pending: 5.50 });
    const { earnings } = useRiderDutyStore.getState();
    expect(earnings.today).toBe(45.50);
    expect(earnings.available).toBe(40.00);
    expect(earnings.pending).toBe(5.50);
  });
});
