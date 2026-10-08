import { createRoot } from "react-dom/client";
// Tokens first, then fonts, then the shell's own styles that read them.
import "@mlduke/ui/tokens.css";
import "@mlduke/ui/fonts.css";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
