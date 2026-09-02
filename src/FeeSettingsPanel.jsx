import React, { useState } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import { db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const FEE_SETTINGS_COLLECTION = "settings";
const FEE_SETTINGS_DOC_ID = "feeConfig";

function genRowId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function digitsOnly(raw) {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits === "" ? 0 : Number(digits);
}

// One editable column of tiers (either the "in"/transfer schedule or the
// "out"/withdraw schedule). Each row = "starting from this amount, fee is
// this much", e.g. 0 -> 300 Ks, 100,000 -> 500 Ks, 200,000 -> 1,000 Ks.
function TierColumn({ title, tiers, onChange }) {
  function updateTier(id, field, raw) {
    const value = digitsOnly(raw);
    onChange(tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }
  function addTier() {
    onChange([...tiers, { id: genRowId(), threshold: 0, fee: 0 }]);
  }
  function removeTier(id) {
    onChange(tiers.filter((t) => t.id !== id));
  }

  return (
    <div className="flex-1 min-w-0 space-y-2.5">
      <p className="text-slate-500 text-xs sm:text-sm font-semibold uppercase tracking-wider px-0.5">
        {title}
      </p>
      <div className="space-y-2">
        {tiers.map((t) => (
          <div
            key={t.id}
            className="flex items-end gap-1.5 bg-slate-50 rounded-xl border border-slate-200 p-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 px-1 mb-0.5">
                ပမာဏ (Ks) - မှစတင်
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={t.threshold ? t.threshold.toLocaleString("en-US") : "0"}
                onChange={(e) => updateTier(t.id, "threshold", e.target.value)}
                className="w-full h-9 rounded-lg bg-white border border-slate-200 px-2 text-sm font-semibold text-blue-950 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 px-1 mb-0.5">
                Fee (Ks)
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={t.fee ? t.fee.toLocaleString("en-US") : "0"}
                onChange={(e) => updateTier(t.id, "fee", e.target.value)}
                className="w-full h-9 rounded-lg bg-white border border-slate-200 px-2 text-sm font-semibold text-blue-950 text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={() => removeTier(t.id)}
              aria-label="ဖျက်မည်"
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg bg-red-50 text-red-500 active:scale-90 transition-transform"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addTier}
        className="w-full h-9 rounded-lg border-2 border-dashed border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
      >
        <Plus size={14} /> Tier ထပ်တိုးရန်
      </button>
    </div>
  );
}

// Big bottom sheet — opened from the account dropdown in App.jsx. Lets the
// shop owner define separate tiered fee schedules for ငွေသွင်း (in) and
// ငွေထုတ် (out), saved to Firestore so every device shares the same setting.
export default function FeeSettingsPanel({ feeTiers, onClose }) {
  const [inTiers, setInTiers] = useState(feeTiers.in);
  const [outTiers, setOutTiers] = useState(feeTiers.out);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const sortByThreshold = (arr) =>
        [...arr].sort((a, b) => a.threshold - b.threshold);
      await setDoc(
        doc(db, FEE_SETTINGS_COLLECTION, FEE_SETTINGS_DOC_ID),
        {
          inTiers: sortByThreshold(inTiers),
          outTiers: sortByThreshold(outTiers),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onClose();
    } catch (err) {
      console.error("Fee settings save failed:", err);
      window.alert("Setting သိမ်းဆည်းမှု မအောင်မြင်ပါ — ထပ်စမ်းကြည့်ပါ။");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40" />
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-bold text-blue-950 text-base sm:text-lg">
              Fee Calculate Setting
            </p>
            <p className="text-slate-400 text-xs">
              ပမာဏအလိုက် ငွေသွင်း/ငွေထုတ် fee သတ်မှတ်ပါ
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="ပိတ်မည်"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-90 transition-transform shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
            <TierColumn
              title="ငွေသွင်း (Transfer) Fee"
              tiers={inTiers}
              onChange={setInTiers}
            />
            <TierColumn
              title="ငွေထုတ် (Withdraw) Fee"
              tiers={outTiers}
              onChange={setOutTiers}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 font-bold text-base sm:text-lg bg-amber-500 text-blue-950 active:scale-[0.98] shadow-md hover:bg-amber-400 disabled:opacity-50"
          >
            <Save size={18} />
            Save
          </button>
        </div>
      </div>
    </>
  );
}