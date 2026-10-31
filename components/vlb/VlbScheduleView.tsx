'use client';

import type { ReactNode } from 'react';
import { formatPesewas } from '@/lib/money';
import { formatDeviceDate } from '@/lib/devicesAdmin';

export type VlbScheduleItem = {
  id?: string;
  type: string;
  period_no: number;
  due_date: string;
  gross_pesewas: number;
  scholar_pesewas: number;
  net_pesewas: number;
};

export function scheduleRowLabel(row: Pick<VlbScheduleItem, 'type' | 'period_no'>, returnTotal: number): string {
  if (row.type === 'principal') return 'Principal repayment';
  return `Return ${row.period_no} of ${returnTotal}`;
}

export function VlbScheduleView({
  rows,
  extra,
}: {
  rows: VlbScheduleItem[];
  extra?: (row: VlbScheduleItem) => ReactNode;
}) {
  const returnTotal = rows.filter((row) => row.type !== 'principal').length;

  return (
    <>
      <div className="mt-3 space-y-3 md:hidden">
        {rows.map((row, index) => (
          <div
            key={row.id || `${row.type}-${row.period_no}-${index}`}
            className="rounded-lg border border-gray-100 p-3"
          >
            <p className="font-medium text-[#1A1A1A]">{scheduleRowLabel(row, returnTotal)}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-[#3A3A3A]">Date</dt>
              <dd className="text-right text-[#1A1A1A]">{formatDeviceDate(row.due_date)}</dd>
              <dt className="text-[#3A3A3A]">Gross</dt>
              <dd className="text-right text-[#1A1A1A]">{formatPesewas(row.gross_pesewas)}</dd>
              <dt className="text-[#3A3A3A]">Scholar</dt>
              <dd className="text-right text-[#1A1A1A]">{formatPesewas(row.scholar_pesewas)}</dd>
              <dt className="text-[#3A3A3A]">Net</dt>
              <dd className="text-right font-medium text-[#1A1A1A]">{formatPesewas(row.net_pesewas)}</dd>
            </dl>
            {extra ? <div className="mt-2">{extra(row)}</div> : null}
          </div>
        ))}
      </div>
      <div className="mt-3 hidden overflow-x-auto sticky-first md:block">
        <table className="min-w-[40rem] w-full text-left text-sm">
          <thead>
            <tr className="text-[#3A3A3A]">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Label</th>
              <th className="pb-2 font-medium">Gross</th>
              <th className="pb-2 font-medium">Scholar</th>
              <th className="pb-2 font-medium">Net</th>
              {extra ? <th className="pb-2 font-medium"> </th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id || `${row.type}-${row.period_no}-${index}`} className="border-t border-gray-100">
                <td className="py-2">{formatDeviceDate(row.due_date)}</td>
                <td className="py-2">{scheduleRowLabel(row, returnTotal)}</td>
                <td className="py-2">{formatPesewas(row.gross_pesewas)}</td>
                <td className="py-2">{formatPesewas(row.scholar_pesewas)}</td>
                <td className="py-2">{formatPesewas(row.net_pesewas)}</td>
                {extra ? <td className="py-2">{extra(row)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
