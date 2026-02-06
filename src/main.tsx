import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root")!;

// Guard against missing env variables (transient hot-reload issue)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;flex-direction:column;gap:12px;">
      <p style="color:#888;">Загрузка конфигурации…</p>
      <button onclick="location.reload()" style="padding:8px 16px;cursor:pointer;border:1px solid #ccc;border-radius:6px;background:#fff;">Обновить</button>
    </div>
  `;
} else {
  createRoot(root).render(<App />);
}
