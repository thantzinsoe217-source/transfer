import React, { createContext, useContext, useState } from "react";
import { Wallet, Lock } from "lucide-react";

const AuthContext = createContext(null);
const STORAGE_KEY = "pos_auth_role";

// .env ထဲက VITE_OWNER_PASSWORD / VITE_STAFF_PASSWORD ကို ဖတ်တယ်
// (Vercel deploy ဆိုရင် Vercel Project Settings > Environment Variables
// ထဲမှာလည်း ဒီ 2 ခုကို ထည့်ပေးဖို့ လိုပါတယ်)
const OWNER_PASSWORD = import.meta.env.VITE_OWNER_PASSWORD;
const STAFF_PASSWORD = import.meta.env.VITE_STAFF_PASSWORD;

export function AuthProvider({ children }) {
  const [role, setRole] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );

  function login(password) {
    if (OWNER_PASSWORD && password === OWNER_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "owner");
      setRole("owner");
      return true;
    }
    if (STAFF_PASSWORD && password === STAFF_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "staff");
      setRole("staff");
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setRole(null);
  }

  return (
    <AuthContext.Provider
      value={{ role, isOwner: role === "owner", isStaff: role === "staff", login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function Login() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const ok = login(password);
    if (!ok) {
      setError(true);
      setPassword("");
    }
  }

  return (
    <div className="w-full h-[100dvh] bg-slate-50 flex items-center justify-center p-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-7 space-y-5"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-950 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <p className="font-bold text-blue-950 text-lg">ငွေလွှဲ / ငွေထုတ်</p>
          <p className="text-slate-400 text-xs">POS Terminal — Login လုပ်ပါ</p>
        </div>

        <div className="relative">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password ရိုက်ထည့်ပါ"
            className={`w-full h-12 sm:h-14 rounded-xl bg-slate-50 border px-4 pl-11 text-base font-semibold text-blue-950 focus:outline-none focus:ring-2 ${
              error
                ? "border-red-300 focus:ring-red-400"
                : "border-slate-200 focus:ring-blue-400"
            }`}
          />
          <Lock
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </div>

        {error && (
          <p className="text-red-500 text-xs sm:text-sm -mt-3 px-1">
            Password မှားနေပါသည် — ထပ်စမ်းကြည့်ပါ
          </p>
        )}

        <button
          type="submit"
          className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 font-bold text-base sm:text-lg bg-amber-500 text-blue-950 active:scale-[0.98] shadow-md hover:bg-amber-400"
        >
          Login
        </button>
      </form>
    </div>
  );
}