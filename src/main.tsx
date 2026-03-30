import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.js";
import GroceryPage from "./pages/GroceryPage.js";
import RestaurantPage from "./pages/RestaurantPage.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/restaurant/:camis" element={<RestaurantPage />} />
        <Route path="/store/:storeId" element={<GroceryPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
