// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { TutorProfileSystemInfo } from "./TutorProfileSystemInfo";

describe("TutorProfileSystemInfo", () => {
  it("renders only server-derived Section H information and a local last-updated value", () => {
    render(<TutorProfileSystemInfo
      profile={{
        completionPercentage: 74,
        lastUpdatedAt: new Date("2026-08-18T10:30:00.000Z"),
        profileStatus: "pending",
        accountStatus: "active",
        assignedRequestCount: 0,
      }}
    />);

    expect(screen.getByRole("heading", { name: /section h.*system information/i })).toBeTruthy();
    expect(screen.getByText("74%")).toBeTruthy();
    expect(screen.getAllByText(/pending review/i)).toHaveLength(2);
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText(/no requests are assigned yet/i)).toBeTruthy();
    expect(screen.getByText(new Date("2026-08-18T10:30:00.000Z").toLocaleString())).toBeTruthy();
  });

  it("does not render editable controls for server-managed values", () => {
    render(<TutorProfileSystemInfo
      profile={{
        completionPercentage: 100,
        lastUpdatedAt: new Date("2026-08-18T10:30:00.000Z"),
        profileStatus: "approved",
        accountStatus: "active",
        assignedRequestCount: 0,
      }}
    />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
