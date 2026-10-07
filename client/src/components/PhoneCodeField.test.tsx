// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneCodeField } from "./registrationFields";

const get = vi.fn();

function Box({ resendInSeconds = 60, onChange = vi.fn(), onComplete }: { resendInSeconds?: number; onChange?: (value: string) => void; onComplete?: (code: string) => void }) {
  return <PhoneCodeField id="code" label="Verification code" sentTo="Sent to +8801712345678" value="" onChange={onChange} onComplete={onComplete} resendInSeconds={resendInSeconds} resending={false} onResend={vi.fn()} resendLabel="Send a new code" />;
}

beforeEach(() => {
  get.mockReset();
  get.mockReturnValue(new Promise(() => {}));
  Object.defineProperty(window, "OTPCredential", { configurable: true, value: function OTPCredential() {} });
  Object.defineProperty(window.navigator, "credentials", { configurable: true, value: { get } });
});

afterEach(() => cleanup());

describe("the code box", () => {
  it("says when the fourth digit is in, so a screen can verify at once", () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<Box onChange={onChange} onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "48a2" } });
    expect(onChange).toHaveBeenLastCalledWith("482");
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "4821" } });
    expect(onComplete).toHaveBeenCalledWith("4821");
  });

  it("fills itself from the SMS and reports it done, with no typing", async () => {
    get.mockResolvedValue({ code: "9034" });
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<Box onChange={onChange} onComplete={onComplete} />);

    await act(async () => {});
    expect(onChange).toHaveBeenCalledWith("9034");
    expect(onComplete).toHaveBeenCalledWith("9034");
  });

  it("waits for the next SMS when a code is sent again", () => {
    const view = render(<Box resendInSeconds={0} />);
    expect(get).toHaveBeenCalledTimes(1);

    // Sending a new code restarts the resend countdown.
    view.rerender(<Box resendInSeconds={60} />);
    expect(get).toHaveBeenCalledTimes(2);

    // The countdown ticking down is not a new code.
    view.rerender(<Box resendInSeconds={59} />);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
