import React, { useState, useMemo, useEffect } from "react";
import {
  Smartphone,
  Wallet,
  CreditCard,
  Landmark,
  QrCode,
  X,
  Save,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// ---------- Sample payment type data ----------
const PAYMENT_TYPES = [
  {
    id: "kpay",
    name: "Kpay",
    icon: Smartphone,
    chip: "bg-emerald-600",
    ring: "border-emerald-200 hover:border-emerald-400 active:border-emerald-500",
  },
  {
    id: "wavepay",
    name: "WavePay",
    icon: Wallet,
    chip: "bg-amber-500",
    ring: "border-amber-200 hover:border-amber-400 active:border-amber-500",
  },
  {
    id: "ayapay",
    name: "AyaPay",
    icon: CreditCard,
    chip: "bg-rose-600",
    ring: "border-rose-200 hover:border-rose-400 active:border-rose-500",
  },
  {
    id: "uabpay",
    name: "UAB Pay",
    icon: Landmark,
    chip: "bg-blue-600",
    ring: "border-blue-200 hover:border-blue-400 active:border-blue-500",
  },
  {
    id: "mmqr",
    name: "MMQR",
    icon: QrCode,
    chip: "bg-violet-600",
    ring: "border-violet-200 hover:border-violet-400 active:border-violet-500",
    wide: true,
  },
];

const typeById = Object.fromEntries(PAYMENT_TYPES.map((t) => [t.id, t]));

// Firestore collection that holds every saved transfer record ("row").
const TRANSFERS_COLLECTION = "transfers";

function formatKs(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("en-US") + " Ks";
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function TypeChip({ type, size = 40 }) {
  const Icon = type.icon;
  return (
    <div
      className={`${type.chip} flex items-center justify-center rounded-full text-white shrink-0`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </div>
  );
}

function PaymentTile({ type, added, onAdd }) {
  const Icon = type.icon;
  return (
    <button
      onClick={() => !added && onAdd(type)}
      disabled={added}
      className={`relative min-w-0 w-full flex items-center justify-start gap-3 p-3 sm:p-3.5 rounded-2xl bg-white border-2 shadow-sm transition-all ${
        type.wide ? "col-span-2 md:col-span-1" : ""
      } ${
        added
          ? "opacity-40 border-slate-200 cursor-not-allowed"
          : `${type.ring} active:scale-95`
      }`}
    >
      <div
        className={`${type.chip} flex items-center justify-center rounded-xl text-white shrink-0 w-10 h-10 sm:w-11 sm:h-11`}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
      </div>
      <span className="text-blue-950 font-semibold text-sm sm:text-base truncate flex-1 text-left">
        {type.name}
      </span>
      {added && (
        <span className="w-5 h-5 rounded-full bg-blue-950 text-white flex items-center justify-center shrink-0">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function LineItem({ item, onAmountChange, onDirectionChange, onRemove }) {
  const type = typeById[item.typeId];
  const isIn = item.direction === "in";
  const isOut = item.direction === "out";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <TypeChip type={type} size={36} />
        <span className="font-semibold text-blue-950 text-base sm:text-lg flex-1 truncate">
          {type.name}
        </span>
        <button
          onClick={() => onRemove(item.id)}
          aria-label="ဖျက်မည်"
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-90 transition-transform shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={item.amount ? Number(item.amount).toLocaleString("en-US") : ""}
          onChange={(e) => onAmountChange(item.id, e.target.value)}
          placeholder="ပမာဏ ရိုက်ထည့်ပါ"
          className="w-full h-12 sm:h-14 rounded-xl bg-slate-50 border border-slate-200 px-4 text-lg sm:text-xl font-semibold text-blue-950 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
          Ks
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <button
          onClick={() => onDirectionChange(item.id, "in")}
          className={`h-12 sm:h-14 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-semibold text-sm sm:text-base transition-colors ${
            isIn
              ? "bg-emerald-600 text-white"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <ArrowDownCircle size={18} />
          ငွေသွင်း
        </button>
        <button
          onClick={() => onDirectionChange(item.id, "out")}
          className={`h-12 sm:h-14 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-semibold text-sm sm:text-base transition-colors ${
            isOut
              ? "bg-orange-600 text-white"
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}
        >
          <ArrowUpCircle size={18} />
          ငွေထုတ်
        </button>
      </div>
    </div>
  );
}

export default function TransferPOS() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = useClock();

  const addedTypeIds = useMemo(
    () => new Set(items.map((it) => it.typeId)),
    [items]
  );

  // ---------- Firebase: live-subscribe to today's saved transfers ----------
  // Runs once on mount. Because this reads straight from Firestore (not
  // local state), the history is correct even after the browser tab was
  // fully closed and reopened, and updates live if a record is added from
  // another device using the same Firebase project.
  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, TRANSFERS_COLLECTION),
      where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            time: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            items: data.items || [],
            totalIn: data.totalIn || 0,
            totalOut: data.totalOut || 0,
            net: data.net || 0,
          };
        });
        setHistory(records);
      },
      (err) => {
        console.error("Firestore history subscription failed:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  function addItem(type) {
    if (addedTypeIds.has(type.id)) return;
    setItems((prev) => [
      ...prev,
      { id: genId(), typeId: type.id, amount: 0, direction: "in" },
    ]);
  }

  function updateAmount(id, raw) {
    const digits = raw.replace(/[^0-9]/g, "");
    const value = digits === "" ? 0 : Number(digits);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, amount: value } : it))
    );
  }

  function updateDirection(id, direction) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, direction } : it))
    );
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const it of items) {
      if (it.direction === "in") totalIn += Number(it.amount) || 0;
      else totalOut += Number(it.amount) || 0;
    }
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [items]);

  const canSave = items.length > 0 && totals.totalIn + totals.totalOut > 0 && !saving;

  // ---------- Firebase: insert a new row into the "transfers" table ----------
  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await addDoc(collection(db, TRANSFERS_COLLECTION), {
        items: items.map((it) => ({
          typeId: it.typeId,
          typeName: typeById[it.typeId].name,
          amount: it.amount,
          direction: it.direction,
        })),
        totalIn: totals.totalIn,
        totalOut: totals.totalOut,
        net: totals.net,
        createdAt: serverTimestamp(),
      });
      // The onSnapshot listener above will pick up the new row automatically,
      // so we only need to clear the working "Transfer Box" here.
      setItems([]);
      setToast(true);
      setTimeout(() => setToast(false), 1500);
    } catch (err) {
      console.error("Save failed:", err);
      window.alert("Save မအောင်မြင်ပါ — Internet connection နှင့် Firebase setting ကို စစ်ဆေးပါ။");
    } finally {
      setSaving(false);
    }
  }

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div className="w-full h-[100dvh] bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-blue-950 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-800 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base sm:text-lg leading-tight truncate">
              ငွေလွှဲ / ငွေထုတ်
            </p>
            <p className="text-blue-300 text-xs">POS Terminal</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-sm sm:text-base leading-tight">
            {timeStr}
          </p>
          <p className="text-blue-300 text-xs">{dateStr}</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] overflow-hidden">
        {/* Payment Type Selection Area */}
        <div className="p-3.5 sm:p-4 bg-slate-100 md:bg-transparent border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto shrink-0 md:shrink max-h-[40vh] md:max-h-none">
          <p className="text-slate-500 text-xs sm:text-sm font-semibold mb-2.5 px-1 uppercase tracking-wider">
            Payment Type ရွေးပါ
          </p>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 sm:gap-3">
            {PAYMENT_TYPES.map((type) => (
              <PaymentTile
                key={type.id}
                type={type}
                added={addedTypeIds.has(type.id)}
                onAdd={addItem}
              />
            ))}
          </div>
        </div>

        {/* Workspace Area (Transfer Box + Totals/Save) */}
        <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          {/* Transfer Box & History Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
            <p className="text-slate-500 text-xs sm:text-sm font-semibold px-1 uppercase tracking-wider">
              Transfer Box
            </p>

            {items.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 h-36 sm:h-48 flex items-center justify-center text-center p-6">
                <p className="text-slate-400 text-sm sm:text-base max-w-xs">
                  Payment Type တစ်ခုကို နှိပ်ပြီး Transfer စတင်ပါ
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.map((item) => (
                  <LineItem
                    key={item.id}
                    item={item}
                    onAmountChange={updateAmount}
                    onDirectionChange={updateDirection}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            )}

            {/* History Section */}
            {history.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-1 py-2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <History size={16} />
                    ယနေ့ မှတ်တမ်း ({history.length})
                  </span>
                  {historyOpen ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                </button>

                {historyOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                    {history.map((rec) => (
                      <div
                        key={rec.id}
                        className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400 font-medium">
                            {rec.time.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-sm font-bold text-blue-950">
                            {formatKs(rec.net)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.items.map((it, i) => (
                            <span
                              key={i}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                it.direction === "in"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : "bg-orange-50 text-orange-700 border border-orange-100"
                              }`}
                            >
                              {it.typeName} {formatKs(it.amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Totals & Save Footer */}
          <div className="bg-blue-950 text-white px-4 sm:px-6 pt-3.5 pb-4 sm:pb-5 shrink-0 border-t border-blue-900 shadow-lg">
            <div className="max-w-4xl mx-auto space-y-1.5">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-blue-300">စုစုပေါင်း ငွေသွင်း</span>
                <span className="font-semibold text-emerald-400">
                  {formatKs(totals.totalIn)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-blue-300">စုစုပေါင်း ငွေထုတ်</span>
                <span className="font-semibold text-orange-400">
                  {formatKs(totals.totalOut)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-blue-900">
                <span className="text-blue-100 font-medium text-sm sm:text-base">
                  အသားတင် စုစုပေါင်း
                </span>
                <span className="text-xl sm:text-2xl font-bold text-amber-400">
                  {formatKs(totals.net)}
                </span>
              </div>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`w-full h-12 sm:h-14 mt-2 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 font-bold text-base sm:text-lg transition-all ${
                  canSave
                    ? "bg-amber-500 text-blue-950 active:scale-[0.98] shadow-md hover:bg-amber-400"
                    : "bg-blue-900 text-blue-500 cursor-not-allowed"
                }`}
              >
                <Save className="w-5 h-5 sm:w-6 sm:h-6" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Notification Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 z-50 animate-fade-in">
          <Check size={18} strokeWidth={2.5} />
          <span className="font-medium text-sm">မှတ်တမ်းတင်ပြီးပါပြီ</span>
        </div>
      )}
    </div>
  );
}
