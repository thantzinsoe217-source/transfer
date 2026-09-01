# ငွေလွှဲ / ငွေထုတ် POS — Firebase Setup Guide

Design/UI က မူရင်းအတိုင်း (Kpay, WavePay, AyaPay, UAB Pay, MMQR) ၊ Save နှိပ်တိုင်း Firebase Firestore ထဲ record တစ်ခု insert ဖြစ်ပြီး browser ပိတ်ပြီး ပြန်ဖွင့်လည်း ယနေ့ history တွေ Firestore ကနေ ပြန်ဆွဲပြပါတယ်။

## 1. Prerequisites

- [Node.js](https://nodejs.org) v18 ဒါမှမဟုတ် အသစ်ထက် install လုပ်ထားရမယ် (`node -v` နဲ့ စစ်ကြည့်နိုင်တယ်)
- VS Code (ဒါမှမဟုတ် ကြိုက်တဲ့ code editor)
- Google account (Firebase အတွက်)

## 2. Zip ဖိုင်ကို ဖွင့်ခြင်း

```bash
unzip money-transfer-app.zip
cd money-transfer-app
npm install
```

## 3. Firebase Project ဖန်တီးခြင်း

1. https://console.firebase.google.com သို့ဝင်ပြီး **Add project** နှိပ်ပါ
2. Project name ပေးပြီး (Google Analytics လိုချင်ရင် ချန်၊ မလိုရင် off) **Create project** နှိပ်ပါ
3. Project dashboard ရောက်ရင် **</> (Web)** icon ကို နှိပ်ပြီး App nickname ရေးပြီး **Register app** နှိပ်ပါ
4. ပေါ်လာမယ့် `firebaseConfig` object ထဲက value တွေ (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) ကို မှတ်ထားပါ — နောက်ခြေလှမ်းမှာ လိုပါမယ်

## 4. Firestore Database ဖွင့်ခြင်း

1. ဘယ်ဘက် menu ကနေ **Build > Firestore Database** ကို သွားပါ
2. **Create database** နှိပ်ပါ
3. Location ရွေးပြီး (asia-southeast1 လို region နီးစပ်တာရွေးလို့ရတယ်) **Start in test mode** ကို ယာယီရွေးပါ (dev အတွက်)
4. Database ဖန်တီးပြီးရင် project root ထဲက `firestore.rules` ဖိုင်ကို ဖွင့်ပြီး Firestore > Rules tab ထဲကို ကူးထည့်ပါ — app က `transfers` collection ကို ဖတ်/ရေး လုပ်ခွင့်ရှိအောင်

> **Test mode rule (`allow read, write: if true`) ကို public app အတွက် အမြဲထားလို့မရပါ** — Section 7 (Security) ကို ဆက်ဖတ်ပါ

## 5. .env ဖိုင် ပြင်ဆင်ခြင်း

```bash
cp .env.example .env
```

`.env` ဖိုင်ကို ဖွင့်ပြီး Section 3 မှာ မှတ်ထားတဲ့ Firebase config value တွေထည့်ပါ:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

`.env` ဖိုင်ကို GitHub ပေါ်တင်ရင် `.gitignore` ထဲမှာ ထည့်ပြီးသားဖြစ်လို့ automatic ignore ဖြစ်ပါတယ်။

## 6. Local မှာ Run ကြည့်ခြင်း

```bash
npm run dev
```

Terminal မှာပြမယ့် link (ပုံမှန် `http://localhost:5173`) ကို browser ထဲ ဖွင့်ပါ။ Payment type တစ်ခု ရွေး → ပမာဏထည့် → Save နှိပ်ကြည့်ပါ။ Firebase Console > Firestore Database > `transfers` collection ထဲမှာ document အသစ် ဝင်လာတာ တွေ့ရမှာပါ။

## 7. Data Structure

`transfers` collection ထဲက document တစ်ခုစီမှာ ဒီ field တွေပါမယ်:

| Field | Type | ရှင်းလင်းချက် |
|---|---|---|
| `items` | array | line item တစ်ခုစီရဲ့ `typeId`, `typeName`, `amount`, `direction` |
| `totalIn` | number | စုစုပေါင်း ငွေသွင်း |
| `totalOut` | number | စုစုပေါင်း ငွေထုတ် |
| `net` | number | အသားတင် စုစုပေါင်း |
| `createdAt` | timestamp | Firestore server time (save လုပ်တဲ့အချိန်) |

App က mount ဖြစ်တာနဲ့ **ယနေ့ရက်စွဲ** ရဲ့ document တွေကိုပဲ `createdAt` ပေါ်မူတည်ပြီး query ဆွဲပြီး history list ထဲမှာ ပြပေးပါတယ် (live — Firestore ထဲ data ပြောင်းတာနဲ့ UI auto update ဖြစ်တယ်)။

## 8. Production Build & Deploy

```bash
npm run build
```

`dist/` folder ထဲမှာ static site ထွက်လာမယ်။ Deploy လုပ်ဖို့ ရွေးစရာများ:

**Firebase Hosting (အကြံပြု):**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public directory: dist, single-page app: Yes
firebase deploy
```

**အခြား static host (Vercel, Netlify, စသည်):** `dist/` folder ကို upload ရုံပါပဲ — environment variables (Section 5 ကအတိုင်း) ကို host ရဲ့ project settings ထဲမှာ ထည့်ပေးဖို့ မမေ့ပါနဲ့။

## 9. Security (အရေးကြီး)

Test mode rule (`allow read, write: if true;`) ဟာ **လူတိုင်း** Firestore data ကို ဖတ်/ရေး/ဖျက် လုပ်ခွင့်ရှိတာမို့ shop အသုံးပြုမယ့် production app အတွက် မသင့်တော်ပါ။ အကြံပြုချက်နှစ်ခု:

- **Firebase Authentication** ထည့်ပြီး (email/password ဒါမှမဟုတ် Google sign-in) rule ကို `allow read, write: if request.auth != null;` လို့ ပြောင်းပါ — login ဝင်ထားသူပဲ data ကို ကိုင်တွယ်နိုင်မယ်
- App ကို public link အနေနဲ့ မဖြန့်ဘဲ shop ကွန်ပျူတာမှာပဲ run ချင်ရင် test mode rule ကို ဆက်သုံးလို့ရပေမယ့် project ID/API key ကို public မထုတ်ဖော်ဖို့ သတိထားပါ (client-side app key တွေဟာ secret မဟုတ်ပေမယ့် Firestore rules ကသာ တကယ့် access control ဖြစ်ပါတယ်)

## 10. VS Code မှာ ဖွင့်နည်း

1. Folder ကို VS Code နဲ့ ဖွင့်ပါ (`File > Open Folder`)
2. Terminal ဖွင့်ပြီး Section 2–6 အတိုင်း လုပ်ပါ
3. React/JSX syntax highlighting အတွက် "ES7+ React/Redux/React-Native snippets" extension ထည့်ချင်ရင် ထည့်လို့ရပါတယ် (optional)

---

ပြဿနာတွေ့ရင် error message ကို Terminal ကနေ copy ကူးပြီး မေးနိုင်ပါတယ်။
