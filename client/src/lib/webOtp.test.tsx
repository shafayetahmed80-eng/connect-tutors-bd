// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supportsWebOtp, useWebOtp } from "./webOtp";

const get = vi.fn();

function Probe({ active = true, onCode, listenKey }: { active?: boolean; onCode: (code: string) => void; listenKey?: unknown }) {
  useWebOtp(active, onCode, listenKey);
  return null;
}

function stubBrowserWithWebOtp() {
  Object.defineProperty(window, "OTPCredential", { configurable: true, value: function OTPCredential() {} });
  Object.defineProperty(window.navigator, "credentials", { configurable: true, value: { get } });
}

beforeEach(() => {
  get.mockReset();
  delete (window as unknown as { OTPCredential?: unknown }).OTPCredential;
});

afterEach(() => cleanup());

describe("reading the code from the SMS", () => {
  it("does nothing where the browser cannot do it", () => {
    Object.defineProperty(window.navigator, "credentials", { configurable: true, value: { get } });
    render(<Probe onCode={vi.fn()} />);

    expect(supportsWebOtp()).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it("asks the browser for an SMS code and hands over the four digits it gets", async () => {
    stubBrowserWithWebOtp();
    get.mockResolvedValue({ code: "4821" });
    const onCode = vi.fn();
    render(<Probe onCode={onCode} />);

    await act(async () => {});
    expect(get).toHaveBeenCalledWith(expect.objectContaining({ otp: { transport: ["sms"] }, signal: expect.any(AbortSignal) }));
    expect(onCode).toHaveBeenCalledWith("4821");
  });

  it("ignores anything that is not exactly four digits, and a refusal", async () => {
    stubBrowserWithWebOtp();
    const onCode = vi.fn();
    get.mockResolvedValueOnce({ code: "48213" });
    render(<Probe onCode={onCode} />);
    await act(async () => {});
    cleanup();

    get.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
    render(<Probe onCode={onCode} />);
    await act(async () => {});
    expect(onCode).not.toHaveBeenCalled();
  });

  it("waits again for the next SMS when a new code was sent, and stops waiting when it goes away", async () => {
    stubBrowserWithWebOtp();
    get.mockReturnValue(new Promise(() => {}));
    const view = render(<Probe onCode={vi.fn()} listenKey={1} />);
    expect(get).toHaveBeenCalledTimes(1);
    const firstSignal = get.mock.calls[0]![0].signal as AbortSignal;

    view.rerender(<Probe onCode={vi.fn()} listenKey={2} />);
    expect(firstSignal.aborted).toBe(true);
    expect(get).toHaveBeenCalledTimes(2);

    const secondSignal = get.mock.calls[1]![0].signal as AbortSignal;
    view.unmount();
    expect(secondSignal.aborted).toBe(true);
  });

  it("does not listen while the screen is not waiting for a code", () => {
    stubBrowserWithWebOtp();
    get.mockReturnValue(new Promise(() => {}));
    render(<Probe active={false} onCode={vi.fn()} />);

    expect(get).not.toHaveBeenCalled();
  });
});
