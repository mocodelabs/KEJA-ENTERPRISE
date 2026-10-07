import * as React from 'react'
import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200">
      <table className={cn('w-full text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-slate-50 text-left text-xs uppercase text-slate-500', className)} {...props} />
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-slate-100', className)} {...props} />
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-slate-50', className)} {...props} />
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-2.5 font-medium', className)} {...props} />
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-2.5 text-slate-700', className)} {...props} />
}

function TableEmpty({ colSpan, children }: { colSpan: number; children?: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-slate-400">
        {children ?? 'No records yet.'}
      </TableCell>
    </TableRow>
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty }
