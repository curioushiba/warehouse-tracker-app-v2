"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { Size } from "@/types";

// Table Context
interface TableContextValue {
  variant: "simple" | "striped" | "bordered";
  size: Size;
}

const TableContext = React.createContext<TableContextValue>({
  variant: "simple",
  size: "md",
});

// Table Component
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: "simple" | "striped" | "bordered";
  size?: Size;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = "simple", size = "md", children, ...props }, ref) => {
    return (
      <TableContext.Provider value={{ variant, size }}>
        <div className="w-full overflow-auto">
          <table
            ref={ref}
            className={cn(
              "w-full text-left border-collapse",
              variant === "bordered" && "border border-border",
              className
            )}
            {...props}
          >
            {children}
          </table>
        </div>
      </TableContext.Provider>
    );
  }
);

Table.displayName = "Table";

// TableHeader Component
export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={cn("bg-neutral-50 border-b border-border", className)}
      {...props}
    />
  );
});

TableHeader.displayName = "TableHeader";

// TableBody Component
export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TableContext);

  return (
    <tbody
      ref={ref}
      className={cn(
        "divide-y divide-border",
        variant === "striped" && "[&>tr:nth-child(odd)]:bg-neutral-50",
        className
      )}
      {...props}
    />
  );
});

TableBody.displayName = "TableBody";

// TableFooter Component
export interface TableFooterProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  TableFooterProps
>(({ className, ...props }, ref) => {
  return (
    <tfoot
      ref={ref}
      className={cn(
        "bg-neutral-50 border-t border-border font-medium",
        className
      )}
      {...props}
    />
  );
});

TableFooter.displayName = "TableFooter";

// TableRow Component
export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean;
  isClickable?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, isSelected = false, isClickable = false, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={cn(
          "transition-colors",
          isClickable && "cursor-pointer hover:bg-primary-50",
          isSelected && "bg-primary-50",
          className
        )}
        {...props}
      />
    );
  }
);

TableRow.displayName = "TableRow";

// TableHead Component (th)
export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  (
    { className, sortable = false, sortDirection, onSort, children, ...props },
    ref
  ) => {
    const { size, variant } = React.useContext(TableContext);

    const sizeClasses: Record<Size, string> = {
      xs: "px-2 py-1.5 text-xs",
      sm: "px-3 py-2 text-xs",
      md: "px-4 py-3 text-sm",
      lg: "px-6 py-4 text-sm",
      xl: "px-6 py-4 text-base",
      "2xl": "px-8 py-5 text-base",
    };

    return (
      <th
        ref={ref}
        className={cn(
          "font-semibold text-foreground whitespace-nowrap",
          sizeClasses[size],
          variant === "bordered" && "border border-border",
          sortable && "cursor-pointer select-none hover:bg-neutral-100",
          className
        )}
        onClick={sortable ? onSort : undefined}
        aria-sort={
          sortDirection === "asc"
            ? "ascending"
            : sortDirection === "desc"
            ? "descending"
            : undefined
        }
        {...props}
      >
        <div className="flex items-center gap-1">
          {children}
          {sortable && (
            <span className="text-foreground-muted">
              {sortDirection === "asc" ? (
                <ChevronUp className="w-4 h-4" />
              ) : sortDirection === "desc" ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronsUpDown className="w-4 h-4 opacity-50" />
              )}
            </span>
          )}
        </div>
      </th>
    );
  }
);

TableHead.displayName = "TableHead";

// TableCell Component (td)
export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => {
    const { size, variant } = React.useContext(TableContext);

    const sizeClasses: Record<Size, string> = {
      xs: "px-2 py-1.5 text-xs",
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-3 text-sm",
      lg: "px-6 py-4 text-sm",
      xl: "px-6 py-4 text-base",
      "2xl": "px-8 py-5 text-base",
    };

    return (
      <td
        ref={ref}
        className={cn(
          "text-foreground-secondary",
          sizeClasses[size],
          variant === "bordered" && "border border-border",
          className
        )}
        {...props}
      />
    );
  }
);

TableCell.displayName = "TableCell";

// TableCaption Component
export interface TableCaptionProps
  extends React.HTMLAttributes<HTMLTableCaptionElement> {}

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  TableCaptionProps
>(({ className, ...props }, ref) => {
  return (
    <caption
      ref={ref}
      className={cn(
        "mt-4 text-sm text-foreground-muted caption-bottom",
        className
      )}
      {...props}
    />
  );
});

TableCaption.displayName = "TableCaption";

// Empty State for Table
export interface TableEmptyProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  colSpan?: number;
}

export const TableEmpty: React.FC<TableEmptyProps> = ({
  title = "No data",
  description = "No items to display",
  action,
  icon,
  colSpan = 5,
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex flex-col items-center gap-2">
          {icon && (
            <div className="w-12 h-12 text-foreground-muted">{icon}</div>
          )}
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-foreground-muted">{description}</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </td>
    </tr>
  );
};

export default Table;
