import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client";

if (import.meta.env.DEV) {
  // @ts-expect-error expose for debugging
  window.supabaseClient = supabase;
}

createRoot(document.getElementById("root")!).render(<App />);
