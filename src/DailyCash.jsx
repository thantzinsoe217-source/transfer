import React, { useState, useEffect } from "react";
import { Banknote, Check, AlertTriangle, Lock } from "lucide-react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

// One document per calendar day, doc ID = "YYYY-MM-DD".
// setDoc(..., { merge: true }) is used everywhere so Daily Open and Daily
// Close both write into the same document without needing to look up an ID.
const DAILY_CASH_COLLECTION = "daily_cash";

function formatKs(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US") + " Ks";
}

function digitsOnly(raw) {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits === "" ? 0 : Number(digits);
}

function todayDocId() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// todayTotalIn / todayTotalOut / todayTotalFee are passed in from App.jsx,
// which already keeps a live Firestore subscription for today's "transfers"
// — Daily Cash re-uses that instead of subscribing twice. Fee is included
// in the expected-cash math below because it is real cash the shop keeps
// from the customer regardless of transfer direction.
export default function DailyCash({
  todayTotalIn,
  todayTotalOut,
  todayTotalFee = 0,
}) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [openInput, setOpenInput] = useState("");
  const [closeInput, setCloseInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ref = doc(db, DAILY_CASH_COLLECTION, todayDocId());
    const unsubscribe = onSnapshot(
      ref,
      (snap) => setSession(snap.exists() ? snap.data() : null),
      (err) => {
        console.error("Daily cash subscription failed:", err);
        setSession(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const isOpen =
    !!session && (session.openingAmount || session.openingAmount === 0);
  const isClosed = isOpen && !!session.closedAt;
  const openingAmount = Number(session?.openingAmount) || 0;
  const expectedNow =
    openingAmount +
    (Number(todayTotalIn) || 0) -
    (Number(todayTotalOut) || 0) +
    (Number(todayTotalFee) || 0);

  async function handleOpenDay() {
    const amount = digitsOnly(openInput);
    setSaving(true);
    try {
      await setDoc(
        doc(db, DAILY_CASH_COLLECTION, todayDocId()),
        {
          openingAmount: amount,
          openedAt: serverTimestamp(),
          closingAmount: null,
          closedAt: null,
          expectedAtClose: null,
          difference: null,
        },
        { merge: true }
      );
      setOpenInput("");
    } catch (err) {
      console.error("Daily open failed:", err);
      window.alert("Daily Open မအောင်မြင်ပါ — ထပ်စမ်းကြည့်ပါ။");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseDay() {
    const counted = digitsOnly(closeInput);
    const expected = expectedNow;
    const difference = counted - expected;
    setSaving(true);
    try {
      await setDoc(
        doc(db, DAILY_CASH_COLLECTION, todayDocId()),
        {
          closingAmount: counted,
          closedAt: serverTimestamp(),
          expectedAtClose: expected,
          difference,
        },
        { merge: true }
      );
      setCloseInput("");
    } catch (err) {
      console.error("Daily close failed:", err);
      window.alert("Daily Close မအောင်မြင်ပါ — ထပ်စမ်းကြည့်ပါ။");
    } finally {
      setSaving(false);
    }
  }

  if (session === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        စောင့်ဆိုင်းနေပါသည်...
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Banknote size={18} />
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider">
            Daily Cash
          </p>
        </div>

        {/* Daily Open form — shown until the day has been opened */}
        {!isOpen && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <p className="text-blue-950 font-semibold text-base sm:text-lg">
              Daily Open — အံဆွဲထဲ စတင်ငွေ
            </p>
            <p className="text-slate-400 text-xs sm:text-sm">
              မနက်ပိုင်း အံဆွဲထဲ ထည့်လိုက်တဲ့ ငွေပမာဏကို ရိုက်ထည့်ပါ
            </p>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={openInput ? digitsOnly(openInput).toLocaleString("en-US") : ""}
                onChange={(e) => setOpenInput(e.target.value)}
                placeholder="ပမာဏ ရိုက်ထည့်ပါ"
                className="w-full h-12 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 px-4 text-lg sm:text-xl font-semibold text-blue-950 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                Ks
              </span>
            </div>
            <button
              onClick={handleOpenDay}
              disabled={saving}
              className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 font-bold text-base sm:text-lg bg-amber-500 text-blue-950 active:scale-[0.98] shadow-md hover:bg-amber-400 disabled:opacity-50"
            >
              Daily Open
            </button>
          </div>
        )}

        {/* Running cash summary — live, recalculated from today's transfers */}
        {isOpen && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">အံဆွဲ Open ပမာဏ</span>
              <span className="font-semibold text-blue-950">
                {formatKs(openingAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ယနေ့ ငွေသွင်း</span>
              <span className="font-semibold text-emerald-600">
                +{formatKs(todayTotalIn)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ယနေ့ ငွေထုတ်</span>
              <span className="font-semibold text-orange-600">
                -{formatKs(todayTotalOut)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ယနေ့ Fee ကောက်ခံငွေ</span>
              <span className="font-semibold text-amber-600">
                +{formatKs(todayTotalFee)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-100">
              <span className="text-blue-950 font-semibold text-sm sm:text-base">
                ယခု အံဆွဲထဲ ရှိသင့်သည့်ငွေ
              </span>
              <span className="text-lg sm:text-xl font-bold text-blue-950">
                {formatKs(expectedNow)}
              </span>
            </div>
          </div>
        )}

        {/* Daily Close form — shown once opened, until closed */}
        {isOpen && !isClosed && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <p className="text-blue-950 font-semibold text-base sm:text-lg">
              Daily Close — အံဆွဲထဲ ရေတွက်ငွေ
            </p>
            <p className="text-slate-400 text-xs sm:text-sm">
              ညနေပိုင်း အံဆွဲထဲက ငွေကို ရေတွက်ပြီး ရိုက်ထည့်ပါ
            </p>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={closeInput ? digitsOnly(closeInput).toLocaleString("en-US") : ""}
                onChange={(e) => setCloseInput(e.target.value)}
                placeholder="ရေတွက်ရလဒ် ရိုက်ထည့်ပါ"
                className="w-full h-12 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 px-4 text-lg sm:text-xl font-semibold text-blue-950 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                Ks
              </span>
            </div>
            <button
              onClick={handleCloseDay}
              disabled={saving}
              className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 font-bold text-base sm:text-lg bg-blue-950 text-white active:scale-[0.98] shadow-md hover:bg-blue-900 disabled:opacity-50"
            >
              <Lock size={18} />
              Daily Close
            </button>
          </div>
        )}

        {/* Result — shown once closed. Green if it matches, red with the
            difference amount if it doesn't. */}
        {isClosed && (
          <div
            className={`rounded-2xl border shadow-sm p-4 sm:p-5 space-y-2 ${
              session.difference === 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {session.difference === 0 ? (
                <Check size={20} className="text-emerald-600" />
              ) : (
                <AlertTriangle size={20} className="text-red-600" />
              )}
              <p
                className={`font-semibold text-base sm:text-lg ${
                  session.difference === 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {session.difference === 0 ? "ကိုက်ညီပါသည်" : "ကိုက်ညီမှု မရှိပါ"}
              </p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ရှိသင့်သည့်ငွေ</span>
              <span className="font-semibold text-blue-950">
                {formatKs(session.expectedAtClose)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">ရေတွက်ရလဒ်</span>
              <span className="font-semibold text-blue-950">
                {formatKs(session.closingAmount)}
              </span>
            </div>
            {session.difference !== 0 && (
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-red-200">
                <span className="text-red-700 font-semibold text-sm sm:text-base">
                  ကွာခြားငွေ
                </span>
                <span className="text-lg sm:text-xl font-bold text-red-600">
                  {session.difference > 0 ? "+" : ""}
                  {formatKs(session.difference)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}