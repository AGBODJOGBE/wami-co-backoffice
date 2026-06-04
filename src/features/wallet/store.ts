"use client";

import { create } from "zustand";

export type TxType =
  | "RECHARGE"
  | "PAYMENT"
  | "TRANSFER"
  | "WITHDRAW"
  | "REFERRAL_BONUS"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT"
  | "REFUND";

export type TxMethod = "WALLET" | "FEDAPAY" | "MOMO" | "MOOV" | "KKIAPAY" | "CASH";
export type TxStatus = "SUCCESS" | "PENDING" | "FAILED" | "REJECTED";
export type UserKind = "PASSENGER" | "DRIVER" | "ADMIN";

export interface TxRow {
  id: string;
  type: TxType;
  userName: string;
  userKind: UserKind;
  amount: number;
  method: TxMethod;
  reference: string;
  status: TxStatus;
  ago: string;
  reason?: string;
}

const seed: TxRow[] = [
  {
    id: "tx-0001",
    type: "RECHARGE",
    userName: "Aline Kouassi",
    userKind: "PASSENGER",
    amount: 10000,
    method: "FEDAPAY",
    reference: "FEDA-AB12CD",
    status: "SUCCESS",
    ago: "il y a 4 min",
  },
  {
    id: "tx-0002",
    type: "PAYMENT",
    userName: "Yann Bognon",
    userKind: "PASSENGER",
    amount: 7200,
    method: "WALLET",
    reference: "FY-RD-9HJ4Q2LP",
    status: "SUCCESS",
    ago: "il y a 7 min",
  },
  {
    id: "tx-0003",
    type: "WITHDRAW",
    userName: "Marc Tossou",
    userKind: "DRIVER",
    amount: 25000,
    method: "MOMO",
    reference: "MOMO-991042",
    status: "PENDING",
    ago: "il y a 18 min",
  },
  {
    id: "tx-0004",
    type: "REFERRAL_BONUS",
    userName: "David Olatundji",
    userKind: "PASSENGER",
    amount: 1000,
    method: "WALLET",
    reference: "REF-D87Z2",
    status: "SUCCESS",
    ago: "il y a 32 min",
  },
  {
    id: "tx-0005",
    type: "REFUND",
    userName: "Marlène Pognon",
    userKind: "PASSENGER",
    amount: 6800,
    method: "WALLET",
    reference: "FY-RD-1KP9JEXR",
    status: "SUCCESS",
    ago: "il y a 47 min",
  },
  {
    id: "tx-0006",
    type: "MANUAL_CREDIT",
    userName: "Sandra Adoumon",
    userKind: "DRIVER",
    amount: 5000,
    method: "WALLET",
    reference: "ADJ-BONUS-04",
    status: "SUCCESS",
    ago: "il y a 1 h",
  },
  {
    id: "tx-0007",
    type: "RECHARGE",
    userName: "Esther Nlandu",
    userKind: "PASSENGER",
    amount: 3000,
    method: "MOMO",
    reference: "MOMO-883201",
    status: "FAILED",
    ago: "il y a 1 h 24 min",
  },
  {
    id: "tx-0008",
    type: "TRANSFER",
    userName: "Patricia Hounsou → Béatrice A.",
    userKind: "PASSENGER",
    amount: 2000,
    method: "WALLET",
    reference: "TRANSFER-44PL",
    status: "SUCCESS",
    ago: "il y a 2 h",
  },
  {
    id: "tx-0009",
    type: "WITHDRAW",
    userName: "Honoré Kpogan",
    userKind: "DRIVER",
    amount: 18500,
    method: "MOMO",
    reference: "MOMO-991188",
    status: "PENDING",
    ago: "il y a 38 min",
  },
];

interface ManualOpInput {
  type: "MANUAL_CREDIT" | "MANUAL_DEBIT";
  userName: string;
  userKind: UserKind;
  amount: number;
  reason: string;
}

interface WalletStore {
  transactions: TxRow[];
  approveWithdraw: (id: string) => void;
  refuseWithdraw: (id: string, reason: string) => void;
  createManual: (input: ManualOpInput) => string;
}

function nowAgo(): string {
  return "à l'instant";
}

export const useWalletStore = create<WalletStore>((set) => ({
  transactions: seed,
  approveWithdraw: (id) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, status: "SUCCESS" as TxStatus, ago: nowAgo() } : t,
      ),
    })),
  refuseWithdraw: (id, reason) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.id === id
          ? { ...t, status: "REJECTED" as TxStatus, reason, ago: nowAgo() }
          : t,
      ),
    })),
  createManual: (input) => {
    const id = `tx-${Math.random().toString(36).slice(2, 6).padEnd(4, "0")}`;
    const tx: TxRow = {
      id,
      type: input.type,
      userName: input.userName,
      userKind: input.userKind,
      amount: input.amount,
      method: "WALLET",
      reference: `ADJ-${id.slice(3).toUpperCase()}`,
      status: "SUCCESS",
      ago: "à l'instant",
      reason: input.reason,
    };
    set((s) => ({ transactions: [tx, ...s.transactions] }));
    return id;
  },
}));
