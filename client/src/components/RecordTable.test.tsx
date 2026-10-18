// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("puts a column's icon and its own label style on the heading and on the card's caption alike", () => {
    const styled: RecordColumn<Row>[] = [
      ...columns.slice(0, 2),
      { key: "salary", label: "Salary", labelIcon: <svg data-testid="salary-icon" />, labelClassName: "text-[#1680c2] tracking-[.16em]", cell: row => row.salary },
    ];
    const { unmount } = render(<RecordTable caption="Your tuitions" columns={styled} rows={rows} rowKey={row => row.id} empty="No tuition yet." />);

    const heading = screen.getByRole("columnheader", { name: "Salary" });
    expect(heading.textContent).toBe("Salary");
    expect(heading.querySelector("[data-testid=salary-icon]")).not.toBeNull();
    expect(heading.className).toContain("text-[#1680c2]");
    expect(heading.className).toContain("tracking-[.16em]");
    unmount();

    onAPhone();
    render(<RecordTable caption="Your tuitions" columns={styled} rows={rows} rowKey={row => row.id} empty="No tuition yet." />);
    const caption = within(screen.getAllByRole("listitem")[0]).getByText("Salary").closest("dt")!;
    expect(caption.querySelector("[data-testid=salary-icon]")).not.toBeNull();
    // The column's colour wins over the card caption's own grey-blue rather than sharing the element with it.
    expect(caption.className).toContain("text-[#1680c2]");
    expect(caption.className).not.toContain("text-j-ink-muted");
    // A column without them keeps the plain caption.
    expect(within(screen.getAllByRole("listitem")[0]).getByText("Subjects").closest("dt")!.className).toContain("text-j-ink-muted");
  });

  it("renders label and value side-by-side with a colon when cardInline is set on a card", () => {
    const inlineColumns: RecordColumn<Row>[] = [
      { key: "jobId", label: "Job ID", cell: row => row.jobId },
      { key: "salary", label: "Salary", wide: true, cardInline: true, cell: row => row.salary },
    ];
    onAPhone();
    render(<RecordTable caption="Tuitions" columns={inlineColumns} rows={rows} rowKey={row => row.id} empty="None." />);

    const firstCard = screen.getAllByRole("listitem")[0];
    const salaryPair = within(firstCard).getByText("Salary:").closest("div")!;
    expect(salaryPair.className).toContain("flex");
    expect(salaryPair.className).toContain("flex-nowrap");
    expect(salaryPair.className).toContain("items-center");
    expect(within(salaryPair).getByText("Salary:").closest("dt")?.textContent).toBe("Salary:");
    expect(within(salaryPair).getByText("BDT 8,000")).toBeTruthy();
  });

  it("puts a control in a heading in place of the label, which then is not drawn beside it", () => {
    const withBox: RecordColumn<Row>[] = [
      { key: "pick", label: "Pick", headingHidden: true, headCell: <input type="checkbox" aria-label="Pick them all" />, cell: row => <input type="checkbox" aria-label={`Pick ${row.jobId}`} /> },
      ...columns.slice(0, 3),
    ];
    render(<RecordTable caption="Your tuitions" columns={withBox} rows={rows} rowKey={row => row.id} empty="No tuition yet." />);

    const heading = screen.getAllByRole("columnheader")[0];
    expect(within(heading).getByRole("checkbox", { name: "Pick them all" })).toBeTruthy();
    expect(heading.textContent).toBe("");
    // The rows keep their own.
    expect(screen.getByRole("checkbox", { name: "Pick 6801" })).toBeTruthy();
  });

  it("adds a row's own classes to its table row and to its phone card", () => {
    const tint = (row: Row) => (row.id === 2 ? "bg-sky-50/70" : undefined);
    const { unmount } = render(<RecordTable caption="Your tuitions" columns={columns} rows={rows} rowKey={row => row.id} empty="None" rowClassName={tint} />);
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(bodyRows[0].className).not.toContain("bg-sky-50/70");
    expect(bodyRows[1].className).toContain("bg-sky-50/70");
    // The row keeps what it always has.
    expect(bodyRows[1].className).toContain("hover:bg-j-surface-sunken/60");
    unmount();

    onAPhone();
    render(<RecordTable caption="Your tuitions" columns={columns} rows={rows} rowKey={row => row.id} empty="None" rowClassName={tint} />);
    const cards = screen.getAllByRole("listitem");
    expect(cards[0].className).not.toContain("bg-sky-50/70");
    expect(cards[1].className).toContain("bg-sky-50/70");
    expect(cards[1].className).toContain("rounded-xl");
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

  describe("mobile card action overflow 'More (...)' menu", () => {
    const multiActionColumns: RecordColumn<Row>[] = [
      { key: "jobId", label: "Job ID", cell: row => row.jobId },
      { key: "act1", label: "Action 1", place: "action", cell: row => <button type="button">Btn 1 {row.jobId}</button> },
      { key: "act2", label: "Action 2", place: "action", cell: row => <button type="button">Btn 2 {row.jobId}</button> },
      { key: "act3", label: "Action 3", place: "action", headingHidden: true, cell: row => <button type="button">Btn 3 {row.jobId}</button> },
      { key: "act4", label: "Action 4", place: "action", headingHidden: true, cell: row => <button type="button">Btn 4 {row.jobId}</button> },
    ];

    it("shows all actions directly when maxCardActions is not specified", () => {
      onAPhone();
      render(<RecordTable caption="Tuitions" columns={multiActionColumns} rows={rows.slice(0, 1)} rowKey={row => row.id} empty="None." />);

      const card = within(screen.getAllByRole("listitem")[0]);
      expect(card.getByRole("button", { name: "Btn 1 6801" })).toBeTruthy();
      expect(card.getByRole("button", { name: "Btn 2 6801" })).toBeTruthy();
      expect(card.getByRole("button", { name: "Btn 3 6801" })).toBeTruthy();
      expect(card.getByRole("button", { name: "Btn 4 6801" })).toBeTruthy();
      expect(card.queryByRole("button", { name: "More actions" })).toBeNull();
    });

    it("shows all actions directly when total actions are less than or equal to maxCardActions", () => {
      onAPhone();
      render(<RecordTable caption="Tuitions" columns={multiActionColumns.slice(0, 3)} rows={rows.slice(0, 1)} rowKey={row => row.id} empty="None." maxCardActions={2} />);

      const card = within(screen.getAllByRole("listitem")[0]);
      expect(card.getByRole("button", { name: "Btn 1 6801" })).toBeTruthy();
      expect(card.getByRole("button", { name: "Btn 2 6801" })).toBeTruthy();
      expect(card.queryByRole("button", { name: "More actions" })).toBeNull();
    });

    it("collapses actions beyond maxCardActions into a 'More (...)' dropdown on a phone card", () => {
      onAPhone();
      render(<RecordTable caption="Tuitions" columns={multiActionColumns} rows={rows.slice(0, 1)} rowKey={row => row.id} empty="None." maxCardActions={2} />);

      const card = within(screen.getAllByRole("listitem")[0]);
      // First 2 actions are visible directly on the card
      expect(card.getByRole("button", { name: "Btn 1 6801" })).toBeTruthy();
      expect(card.getByRole("button", { name: "Btn 2 6801" })).toBeTruthy();
      // More actions button is present
      const moreBtn = card.getByRole("button", { name: "More actions" });
      expect(moreBtn).toBeTruthy();

      // Actions 3 and 4 are not rendered directly on card root
      expect(card.queryByRole("button", { name: "Btn 3 6801" })).toBeNull();
      expect(card.queryByRole("button", { name: "Btn 4 6801" })).toBeNull();

      // Opening the dropdown reveals actions 3 and 4 with their labels
      fireEvent.pointerDown(moreBtn, { button: 0, ctrlKey: false, pointerType: "mouse" });
      expect(screen.getByRole("button", { name: "Btn 3 6801" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Btn 4 6801" })).toBeTruthy();
      expect(screen.getByText("Action 3")).toBeTruthy();
      expect(screen.getByText("Action 4")).toBeTruthy();
    });

    it("respects cardActionPinned and cardActionOverflow flags", () => {
      const priorityColumns: RecordColumn<Row>[] = [
        { key: "jobId", label: "Job ID", cell: row => row.jobId },
        { key: "act1", label: "Action 1", place: "action", cell: row => <button type="button">Btn 1 {row.jobId}</button> },
        { key: "act2", label: "Action 2", place: "action", cardActionOverflow: true, cell: row => <button type="button">Btn 2 {row.jobId}</button> },
        { key: "act3", label: "Action 3", place: "action", cardActionPinned: true, cell: row => <button type="button">Btn 3 {row.jobId}</button> },
      ];

      onAPhone();
      render(<RecordTable caption="Tuitions" columns={priorityColumns} rows={rows.slice(0, 1)} rowKey={row => row.id} empty="None." maxCardActions={2} />);

      const card = within(screen.getAllByRole("listitem")[0]);
      // Pinned action 3 and regular action 1 stay visible directly
      expect(card.getByRole("button", { name: "Btn 3 6801" })).toBeTruthy();
      expect(card.getByRole("button", { name: "Btn 1 6801" })).toBeTruthy();
      // Explicit overflow action 2 goes into menu
      expect(card.queryByRole("button", { name: "Btn 2 6801" })).toBeNull();

      fireEvent.pointerDown(card.getByRole("button", { name: "More actions" }), { button: 0, ctrlKey: false, pointerType: "mouse" });
      expect(screen.getByRole("button", { name: "Btn 2 6801" })).toBeTruthy();
    });

    it("renders custom mobile card when renderCard is provided on a phone", () => {
      onAPhone();
      render(
        <RecordTable
          caption="Tuitions"
          columns={columns}
          rows={rows}
          rowKey={row => row.id}
          empty="None."
          renderCard={(row, index) => (
            <div data-testid={`custom-card-${row.id}`}>
              <span>Custom #{index + 1}: {row.jobId}</span>
            </div>
          )}
        />
      );

      expect(screen.getByTestId("custom-card-1")).toBeTruthy();
      expect(screen.getByText("Custom #1: 6801")).toBeTruthy();
      expect(screen.getByTestId("custom-card-2")).toBeTruthy();
      expect(screen.getByText("Custom #2: 6802")).toBeTruthy();
    });
  });
});


