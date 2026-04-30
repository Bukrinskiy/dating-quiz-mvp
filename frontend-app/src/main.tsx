import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app/App";
import "./styles/app.css";
import "./styles/chat.css";
import "./styles/sheets.css";
import "./styles/overlays.css";

function installNativeViewportGuards() {
  const preventGesture = (event: Event) => {
    event.preventDefault();
  };

  const preventPinchZoom = (event: TouchEvent) => {
    if (event.touches.length > 1 || ("scale" in event && event.scale !== 1)) {
      event.preventDefault();
    }
  };

  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });
  document.addEventListener("touchmove", preventPinchZoom, { passive: false });
}

installNativeViewportGuards();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
