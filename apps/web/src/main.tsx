import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { LandingPage } from "./LandingPage.js";
import "./styles.css";

function IvritCodeSite() {
  const [entered, setEntered] = useState(() => window.location.hash === "#observatory");

  useEffect(() => {
    const enter = () => {
      setEntered(true);
      window.history.replaceState(null, "", "#observatory");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("ivritcode:enter", enter);
    return () => window.removeEventListener("ivritcode:enter", enter);
  }, []);

  return entered ? <App /> : <LandingPage />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IvritCodeSite />
  </StrictMode>,
);
