import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyBrand } from "./lib/applyBrand";

// Paint the active client's palette and metadata before the first render.
applyBrand();

createRoot(document.getElementById("root")!).render(<App />);
