import { useIsMobile } from "@/hooks/useMobile";
import type { CSSProperties, ReactNode } from "react";

/**
 * One set of rows in two shapes: the table everyone knows on a laptop, and one
 * card per row on a phone, where a twelve-column table can only be read
 * sideways.
 *
 * Both shapes render the same column list, so a column can never appear in one
 * and go missing from the other, and a control can never be reachable in one
 * and out of reach in the other.
 */
export type RecordColumn<Row> = {
  key: string;
  /** The column heading, and the label the value carries on a card. */
  label: string;
  cell: (row: Row, index: number) => ReactNode;
  /** The same value or control, sized for a card. Defaults to `cell`. */
  cardCell?: (row: Row, index: number) => ReactNode;
  /**
   * Where the value sits on a card: the top line (`head`, unlabelled), a
   * labelled pair (`body`, the default), or the footer row of controls
   * (`action`).
   */
  place?: "head" | "body" | "action";
  /** A long value - subjects, an address - takes the card's full width. */
  wide?: boolean;
  /** The heading is for screen readers only, as an icon-only column's is. */
  headingHidden?: boolean;
  headClassName?: string;
  cellClassName?: string;
};

export type RecordTableProps<Row> = {
  /** The table's caption; the card list carries it as its label. */
  caption: string;
  columns: RecordColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row, index: number) => string | number;
  /** What stands in for the rows when there are none. */
  empty: string;
  /** The table's own width class, e.g. `min-w-[72rem]`. Cards never use it. */
  tableClassName?: string;
  /**
   * The table draws no card of its own - for a table already inside one, where
   * a second border would box a box. Cards are unaffected: each carries its own.
   */
  plain?: boolean;
  /** Rows rise in, one after another, the first time this list of rows appears. */
  animateEntrance?: boolean;
};

/** Steps beyond this many rows would make the last ones wait too long to arrive. */
const ROW_STAGGER_CAP = 8;

function rowEntranceProps(animateEntrance: boolean | undefined, index: number): { className: string; style?: CSSProperties } {
  if (!animateEntrance) return { className: "" };
  return { className: "stagger-row-enter", style: { "--stagger": Math.min(index, ROW_STAGGER_CAP) } as CSSProperties };
}

function cardContent<Row>(column: RecordColumn<Row>, row: Row, index: number) {
  return (column.cardCell ?? column.cell)(row, index);
}

function RecordCards<Row>({ caption, columns, rows, rowKey, empty, animateEntrance }: RecordTableProps<Row>) {
  if (rows.length === 0) {
    return <div className="rounded-xl border border-j-border bg-white p-8 text-center text-sm text-j-ink-soft shadow-sm">{empty}</div>;
  }

  const head = columns.filter(column => column.place === "head");
  const body = columns.filter(column => (column.place ?? "body") === "body");
  const actions = columns.filter(column => column.place === "action");

  return <ul aria-label={caption} className="space-y-2.5">
    {rows.map((row, index) => {
      const entrance = rowEntranceProps(animateEntrance, index);
      return <li key={rowKey(row, index)} className={`rounded-xl border border-j-border bg-white p-3.5 shadow-sm ${entrance.className}`} style={entrance.style}>
      {head.length > 0 ? <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        {head.map(column => <div key={column.key} className="min-w-0">{cardContent(column, row, index)}</div>)}
      </div> : null}

      {body.length > 0 ? <dl className={`grid grid-cols-2 gap-x-3 gap-y-2.5 ${head.length > 0 ? "mt-3" : ""}`}>
        {body.map(column => <div key={column.key} className={`min-w-0 ${column.wide ? "col-span-2" : ""}`}>
          <dt className="text-2xs font-bold uppercase tracking-wide text-j-ink-muted">{column.label}</dt>
          <dd className="mt-0.5 break-words text-sm">{cardContent(column, row, index)}</dd>
        </div>)}
      </dl> : null}

      {/* A control sized for a mouse is too small for a thumb; on a card every one of them clears 40px. */}
      {actions.length > 0 ? <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eef4f9] pt-3 [&_a]:min-h-10 [&_a]:min-w-10 [&_button]:min-h-10 [&_button]:min-w-10">
        {actions.map(column => <div key={column.key} className="min-w-0">{cardContent(column, row, index)}</div>)}
      </div> : null}
    </li>;
    })}
  </ul>;
}

export default function RecordTable<Row>(props: RecordTableProps<Row>) {
  const { caption, columns, rows, rowKey, empty, tableClassName = "", plain = false, animateEntrance } = props;
  const isMobile = useIsMobile();

  if (isMobile) return <RecordCards {...props} />;

  return <div className={plain ? "overflow-x-auto" : "overflow-x-auto rounded-xl border border-j-border bg-white shadow-sm"}>
    <table className={`w-full border-collapse text-sm ${tableClassName}`}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-j-border text-left text-2xs font-bold uppercase tracking-wide text-j-ink-muted">
          {columns.map(column => <th key={column.key} scope="col" className={`px-3 py-2.5 ${column.headClassName ?? ""}`}>
            {column.headingHidden ? <span className="sr-only">{column.label}</span> : column.label}
          </th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const entrance = rowEntranceProps(animateEntrance, index);
          return <tr key={rowKey(row, index)} className={`border-b border-[#eef4f9] last:border-b-0 hover:bg-j-surface-sunken/60 ${entrance.className}`} style={entrance.style}>
            {columns.map(column => <td key={column.key} className={`px-3 py-2.5 align-top ${column.cellClassName ?? ""}`}>{column.cell(row, index)}</td>)}
          </tr>;
        })}
        {rows.length === 0 ? <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-j-ink-soft">{empty}</td></tr> : null}
      </tbody>
    </table>
  </div>;
}
