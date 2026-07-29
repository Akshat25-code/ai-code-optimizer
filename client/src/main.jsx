import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { ThemeProvider } from '@/contexts/ThemeContext';
import AppErrorBoundary from "@/components/layout/AppErrorBoundary";
import "@/styles/index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);


