// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  requests: [] as Array<Record<string, unknown>>,
  request: vi.fn(),
  withdraw: vi.fn(),
  sendCode: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ account: { changeRequests: { invalidate: vi.fn() } } }),
    account: {
      changeRequests: { useQuery: () => ({ data: { offered: ["name", "mobile", "verification", "close_account"], isOwner: false, currentName: "Rina Akter", currentMobile: "+8801711111111", liveTuition: false, requests: state.requests }, isLoading: false }) },
      requestChange: { useMutation: () => ({ mutate: state.request, isPending: false }) },
      withdrawChange: { useMutation: () => ({ mutate: state.withdraw, isPending: false }) },
      sendMobileChangeCode: { useMutation: () => ({ mutate: state.sendCode, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { CloseAccountRequest, useAccountChanges, ValueChangeRequest, VerificationRequest } from "./AccountChangeRequests";

function NameRequest() {
  const changes = useAccountChanges();
  return <ValueChangeRequest changes={changes} type="name" label="Name" current="Rina Akter" />;
}
function MobileRequest() {
  const changes = useAccountChanges();
  return <ValueChangeRequest changes={changes} type="mobile" label="Mobile number" current="+8801711111111" />;
}
function Verification({ nidReady = true, verified = false }: { nidReady?: boolean; verified?: boolean }) {
  const changes = useAccountChanges();
  return <VerificationRequest changes={changes} nidReady={nidReady} verified={verified} />;
}
function CloseAccount({ live }: { live?: string }) {
  const changes = useAccountChanges();
  return <CloseAccountRequest changes={changes} liveTuitionMessage={live} />;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.requests = [];
});

describe("asking for a new mobile number", () => {
  it("sends a code to the new number first, then the request with that code", () => {
    state.sendCode.mockImplementation((_input, options) => options.onSuccess({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300, sentTo: "+8801822222222" }));
    render(<MobileRequest />);

    fireEvent.change(screen.getByLabelText("New mobile number"), { target: { value: "01822222222" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/ }));
    expect(state.sendCode).toHaveBeenCalledWith({ value: "01822222222" }, expect.anything());
    expect(state.request).not.toHaveBeenCalled();
    expect(screen.getByText("Sent to +8801822222222")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Send request/ }));
    expect(screen.getByText("Enter the 4-digit code sent to the new number.")).toBeTruthy();
    expect(state.request).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Verification code/), { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: /Send request/ }));
    expect(state.request).toHaveBeenCalledWith({ type: "mobile", value: "01822222222", phoneCode: "4821" }, expect.anything());
  });

  it("drops the code when the number is edited", () => {
    state.sendCode.mockImplementation((_input, options) => options.onSuccess({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300, sentTo: "+8801822222222" }));
    render(<MobileRequest />);
    fireEvent.change(screen.getByLabelText("New mobile number"), { target: { value: "01822222222" } });
    fireEvent.click(screen.getByRole("button", { name: /Send code/ }));

    fireEvent.change(screen.getByLabelText("New mobile number"), { target: { value: "01933333333" } });
    expect(screen.queryByLabelText(/Verification code/)).toBeNull();
    expect(screen.getByRole("button", { name: /Send code/ })).toBeTruthy();
  });
});

describe("asking for a new name", () => {
  it("sends the new value", () => {
    render(<NameRequest />);
    expect(screen.getByText("Rina Akter")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New name"), { target: { value: "Rina Begum" } });
    fireEvent.click(screen.getByRole("button", { name: /Send request/ }));
    expect(state.request).toHaveBeenCalledWith({ type: "name", value: "Rina Begum" }, expect.anything());
  });

  it("shows a waiting request in place of the form, with Withdraw", () => {
    state.requests = [{ id: 3, type: "name", status: "pending", requestedValue: "Rina Begum", declineReason: null }];
    render(<NameRequest />);
    expect(screen.getByText("Requested: Rina Begum")).toBeTruthy();
    expect(screen.queryByLabelText("New name")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(state.withdraw).toHaveBeenCalledWith({ type: "name" });
  });

  it("says why the last one was declined, and lets the Guardian ask again", () => {
    state.requests = [{ id: 3, type: "name", status: "declined", requestedValue: "R", declineReason: "Use your full name as on your NID." }];
    render(<NameRequest />);
    expect(screen.getByText("Use your full name as on your NID.")).toBeTruthy();
    expect(screen.getByLabelText("New name")).toBeTruthy();
  });
});

describe("asking to be verified", () => {
  it("is one button, closed until both NID sides are on the profile, and gone once verified", () => {
    const { rerender } = render(<Verification nidReady={false} />);
    expect((screen.getByRole("button", { name: "Request to Verify" }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<Verification />);
    fireEvent.click(screen.getByRole("button", { name: "Request to Verify" }));
    expect(state.request).toHaveBeenCalledWith({ type: "verification" });

    rerender(<Verification verified />);
    expect(screen.queryByRole("button", { name: "Request to Verify" })).toBeNull();
  });
});

describe("asking to close the account", () => {
  it("needs a reason and the account's password", () => {
    render(<CloseAccount />);
    const send = screen.getByRole("button", { name: /Send delete request/ }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Moving abroad" } });
    expect(send.disabled).toBe(true);
    const password = screen.getByLabelText(/Enter Your Password/) as HTMLInputElement;
    expect(password.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    fireEvent.change(password, { target: { value: "my-secret-1" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    expect(state.request).toHaveBeenCalledWith({ type: "close_account", reason: "Moving abroad", password: "my-secret-1" }, expect.anything());
  });

  it("is closed while a tuition is still running, and says why", () => {
    render(<CloseAccount live="An Appointed or Confirmed tuition is still running on this account." />);
    expect(screen.getByText(/still running/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Send delete request/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
