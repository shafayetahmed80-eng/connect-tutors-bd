// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecordTable, { type RecordColumn } from "./RecordTable";

const DESKTOP_WIDTH = 1024;

afterEach(() => {
  cleanup();
  window.innerWidth = DESKTOP_WIDTH;
});

/** The hook behind the two shapes reads the window's own width. */
function onAPhone() {
  window.innerWidth = 375;
}

type Row = { id: number; jobId: string; subjects: string; salary: string };

const rows: Row[] = [
  { id: 1, jobId: "6801", subjects: "Physics, Chemistry", salary: "BDT 8,000" },
  { id: 2, jobId: "6802", subjects: "English", salary: "BDT 5,000" },
];

const onOpen = vi.fn();
const columns: RecordColumn<Row>[] = [
  { key: "jobId", label: "Job ID", place: "head", cell: row => row.jobId },
  { key: "subjects", label: "Subjects", wide: true, cell: row => row.subjects },
  { key: "salary", label: "Salary", cell: row => row.salary },
  {
    key: "open", label: "Applicants", place: "action", headingHidden: true,
    cell: row => <button type="button" onClick={() => onOpen(row.id)}>Open {row.jobId}</button>,
  },
];

function renderTable(list: Row[] = rows) {
  return render(<RecordTable
    caption="Your tuitions"
    columns={columns}
    rows={list}
    rowKey={row => row.id}
    empty="No tuition yet."
    tableClassName="min-w-[56rem]"
  />);
}

describe("RecordTable", () => {
  it("is a table on a laptop, with one column per heading", () => {
    renderTable();

    const headings = screen.getAllByRole("columnheader").map(cell => cell.textContent);
    expect(headings).toEqual(["Job ID", "Subjects", "Salary", "Applicants"]);
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[0]).getByText("Physics, Chemistry")).toBeTruthy();
  });

  it("is one card per row on a phone, carrying every column the table carries", () => {
    onAPhone();
    renderTable();

    expect(screen.queryByRole("table")).toBeNull();
    const cards = screen.getAllByRole("listitem");
    expect(cards).toHaveLength(2);

    const first = within(cards[0]);
    // The head columns lead the card unlabelled; the rest arrive as labelled pairs.
    expect(first.getByText("6801")).toBeTruthy();
    expect(first.getByText("Subjects")).toBeTruthy();
    expect(first.getByText("Physics, Chemistry")).toBeTruthy();
    expect(first.getByText("Salary")).toBeTruthy();
    expect(first.getByText("BDT 8,000")).toBeTruthy();
    // The controls are the same ones, still reachable.
    expect(first.getByRole("button", { name: "Open 6801" })).toBeTruthy();
    // A head column's heading is not repeated as a label above its value.
    expect(first.queryByText("Job ID")).toBeNull();
  });

  it("says the same thing about an empty list in both shapes", () => {
    renderTable([]);
    expect(screen.getByText("No tuition yet.")).toBeTruthy();

    cleanup();
    onAPhone();
    renderTable([]);
    expect(screen.getByText("No tuition yet.")).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("draws no card of its own when the table already sits in one", () => {
    const { container } = render(<RecordTable
      caption="Security events"
      columns={columns}
      rows={rows}
      rowKey={row => row.id}
      empty="No event."
      plain
    />);

    expect(container.firstElementChild?.className).toBe("overflow-x-auto");
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("names the card list the way the table's caption names the table", () => {
    onAPhone();
    renderTable();
    expect(screen.getByRole("list", { name: "Your tuitions" })).toBeTruthy();
  });

  it("carries no rise-in class or step by default, and stamps each row's step when asked", () => {
    const { rerender } = render(<RecordTable caption="Your tuitions" columns={columns} rows={rows} rowKey={row => row.id} empty="No tuition yet." />);
    const plainRows = screen.getAllByRole("row").slice(1);
    expect(plainRows[0].className).not.toContain("stagger-row-enter");
    expect(plainRows[0].style.getPropertyValue("--stagger")).toBe("");

    rerender(<RecordTable caption="Your tuitions" columns={columns} rows={rows} rowKey={row => row.id} empty="No tuition yet." animateEntrance />);
    const animatedRows = screen.getAllByRole("row").slice(1);
    expect(animatedRows[0].className).toContain("stagger-row-enter");
    expect(animatedRows[0].style.getPropertyValue("--stagger")).toBe("0");
    expect(animatedRows[1].style.getPropertyValue("--stagger")).toBe("1");
  });

  it("caps the step on a phone card too, so a long list does not make the last rows wait", () => {
    onAPhone();
    const longList = Array.from({ length: 10 }, (_, index) => ({ id: index, jobId: String(6800 + index), subjects: "Physics", salary: "BDT 5,000" }));
    render(<RecordTable caption="Your tuitions" columns={columns} rows={longList} rowKey={row => row.id} empty="No tuition yet." animateEntrance />);
    const cards = screen.getAllByRole("listitem");
    expect(cards[9].style.getPropertyValue("--stagger")).toBe("8");
  });
});
