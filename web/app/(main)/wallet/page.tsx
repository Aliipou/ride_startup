"use client";

import { useState } from "react";
import { CreditCard, Plus, ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { useWallet, useWalletTransactions } from "@/lib/hooks/useApi";

const TOPUP_AMOUNTS = [10, 20, 50];

export default function WalletPage() {
  const { wallet, isLoading } = useWallet();
  const { transactions } = useWalletTransactions();
  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-emerald-100 text-sm font-medium">Your Balance</p>
        <p className="text-5xl font-bold mt-1">
          €{wallet?.balance?.toFixed(2) ?? "0.00"}
        </p>
        <div className="flex items-center gap-1 mt-3 text-emerald-100 text-xs">
          <CreditCard size={12} />
          <span>Ride & Chill Wallet</span>
        </div>
      </div>

      {/* Top-up */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3">Add Money</h2>
        <div className="flex gap-2 mb-3">
          {TOPUP_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => { setTopupAmount(amount); setCustomAmount(""); }}
              className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                topupAmount === amount
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              €{amount}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="Custom amount (€)"
          value={customAmount}
          onChange={(e) => { setCustomAmount(e.target.value); setTopupAmount(null); }}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          disabled={!topupAmount && !customAmount}
          className="w-full bg-primary text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} />
          Top Up €{topupAmount ?? customAmount || "0"}
        </button>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Recent Transactions</h2>
        {transactions?.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions?.map((txn: any) => (
              <div key={txn.id} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm border border-gray-100">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  txn.amount > 0 ? "bg-green-100" : "bg-red-100"
                }`}>
                  {txn.amount > 0
                    ? <ArrowDownLeft size={16} className="text-green-600" />
                    : <ArrowUpRight size={16} className="text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{txn.description}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(txn.created_at).toLocaleDateString("en-FI", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className={`font-semibold text-sm ${txn.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                  {txn.amount > 0 ? "+" : ""}€{Math.abs(txn.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
