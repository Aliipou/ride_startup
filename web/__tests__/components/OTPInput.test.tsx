/**
 * Tests for OTPInput component — critical for phone auth flow.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import OTPInput from "@/components/ui/OTPInput";

describe("OTPInput", () => {
  it("renders 6 individual input boxes", () => {
    render(<OTPInput onComplete={jest.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
  });

  it("calls onComplete with 6-digit code when all filled", async () => {
    const onComplete = jest.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole("textbox");

    for (let i = 0; i < 6; i++) {
      await userEvent.type(inputs[i], String(i + 1));
    }

    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("only accepts single digits", async () => {
    render(<OTPInput onComplete={jest.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "ab");
    expect((inputs[0] as HTMLInputElement).value).toBe("");
  });

  it("does not call onComplete with fewer than 6 digits", async () => {
    const onComplete = jest.fn();
    render(<OTPInput onComplete={onComplete} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.type(inputs[0], "1");
    await userEvent.type(inputs[1], "2");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("has accessible labels", () => {
    render(<OTPInput onComplete={jest.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    inputs.forEach((input) => {
      expect(input).toHaveAttribute("aria-label");
    });
  });
});
