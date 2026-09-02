import React, { useState, useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet, Scale } from "lucide-react";
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";

// Same daily-cash doc that DailyCash.jsx reads/writes — Dashboard only
// needs to read it, to show today's opening/closing difference.
const DAILY_CASH_COLLECTION = "daily_cash";

function formatKs(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US") + " Ks";
}

function todayDocId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const COLOR_STYLES = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  red: "bg-red-50 border-red-200 text-red-700",
  slate: "bg-slate-50 border-slate-200 text-slate-500",
};

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div
      className={`rounded-3xl border-2 p-5 sm:p-6 flex flex-col items-center justify-center gap-2 text-center aspect-square sm:aspect-auto sm:h-40 shadow-sm ${COLOR_STYLES[color]}`}
    >
      <Icon size={26} />
      <p className="text-xs sm:text-sm font-semibold opacity-80 leading-tight">
        {label}
      </p>
      <p className="text-lg sm:text-2xl font-bold leading-tight">{value}</p>
    </div>
  );
}

// totalIn / totalOut / totalFee are today's already-saved-transfer sums,
// passed down from App.jsx (same numbers Daily Cash uses). Dashboard adds
// its own small subscription to the daily_cash doc just to read the
// close-out difference.
export default function Dashboard({ totalIn, totalOut, totalFee }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    const ref = doc(db, DAILY_CASH_COLLECTION, todayDocId());
    const unsubscribe = onSnapshot(
      ref,
      (snap) => setSession(snap.exists() ? snap.data() : null),
      (err) => {
        console.error("Dashboard daily-cash subscription failed:", err);
        setSession(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const isOpen =
    !!session && (session.openingAmount || session.openingAmount === 0);
  const isClosed = isOpen && !!session.closedAt;

  let diffValue = "Daily Open လုပ်ရန် လိုပါသည်";
  let diffColor = "slate";
  if (isOpen && !isClosed) {
    diffValue = "Daily Close လုပ်ရန် လိုပါသည်";
    diffColor = "slate";
  } else if (isClosed) {
    diffValue =
      (session.difference > 0 ? "+" : "") + formatKs(session.difference);
    diffColor = session.difference === 0 ? "emerald" : "red";
  }

  const cards = [
    {
      label: "စုစုပေါင်း ငွေသွင်း",
      value: formatKs(totalIn),
      icon: ArrowDownCircle,
      color: "emerald",
    },
    {
      label: "စုစုပေါင်း ငွေထုတ်",
      value: formatKs(totalOut),
      icon: ArrowUpCircle,
      color: "orange",
    },
    {
      label: "ဒီနေ့ရတဲ့ အမြတ် (Fee Total)",
      value: formatKs(totalFee),
      icon: Wallet,
      color: "amber",
    },
    {
      label: "Difference Amount",
      value: diffValue,
      icon: Scale,
      color: diffColor,
    },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-3 px-1 uppercase tracking-wider">
          Dashboard — ယနေ့ အနှစ်ချုပ်
        </p>
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      </div>
    </div>
  );
}