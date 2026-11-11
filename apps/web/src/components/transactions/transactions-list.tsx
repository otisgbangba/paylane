"use client";

import { useState } from "react";
import { ChevronRight, ReceiptText } from "lucide-react";
import {
  formatDateTime,
  formatNaira,
  type TransactionDTO,
} from "@paylane/shared";
import { ServiceIcon } from "@/components/brand";
import { StatusBadge } from "@/components/ui/badges";
import { PurchaseReceipt } from "@/components/ui/purchase-receipt";
import { useWallet } from "@/components/wallet/wallet-provider";
import { cn } from "@/lib/utils";

export function TransactionsList({
  transactions,
}: {
  transactions: TransactionDTO[];
}) {
  const { wallet } = useWallet();
  const [selected, setSelected] = useState<TransactionDTO | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-cream text-ink/35">
          <ReceiptText className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-bold text-ink">Nothing matches those filters</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">
          Try a different status or service. New purchases appear here as soon as they are
          recorded.
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/80 px-4 py-4 sm:px-5">
          <div>
            <h3 className="font-display text-base font-bold text-ink">
              Your transactions
            </h3>
            <p className="mt-0.5 text-[0.65rem] text-muted">
              {transactions.length} loaded · tap a row for the receipt
            </p>
          </div>
          <span className="chip bg-cream text-[0.6rem] text-ink/55">
            <ReceiptText className="size-3" aria-hidden />
            Receipts
          </span>
        </div>

        <ul className="divide-y divide-line/60">
          {transactions.map((transaction) => {
            const inbound =
              transaction.type === "WALLET_FUNDING" || transaction.status === "REFUNDED";
            return (
              <li key={transaction.id}>
                <button
                  type="button"
                  onClick={() => setSelected(transaction)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-cream/60 sm:px-5"
                >
                  <ServiceIcon type={transaction.type} className="size-9 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{transaction.description}</p>
                    <p className="mt-0.5 truncate text-[0.65rem] text-muted">
                      {transaction.recipient} · {formatDateTime(transaction.createdAt)}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[0.58rem] text-muted/80">
                      {transaction.reference}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        inbound ? "text-success" : "text-ink",
                      )}
                    >
                      {inbound ? "+" : "-"}
                      {formatNaira(transaction.totalKobo)}
                    </span>
                    <StatusBadge status={transaction.status} />
                  </div>
                  <ChevronRight className="mt-2 hidden size-4 shrink-0 text-muted/50 sm:block" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected ? (
        <PurchaseReceipt
          open
          onClose={() => setSelected(null)}
          transaction={selected}
          wallet={wallet}
        />
      ) : null}
    </>
  );
}
