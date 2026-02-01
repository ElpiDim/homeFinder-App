// src/index.js
import "bootstrap/dist/css/bootstrap.min.css";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import api from "./api";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext"; // 👈 ΑΥΤΟ ΕΛΕΙΠΕ
import {NotificationProvider} from "./context/NotificationContext";
import { MessageProvider } from "./context/MessageContext";
import { SidebarProvider } from "./context/SidebarContext";

const root = ReactDOM.createRoot(document.getElementById('root'));

const bootToken = localStorage.getItem("token");
if (bootToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${bootToken}`;
}
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <MessageProvider>
              <SidebarProvider>
                <App />
              </SidebarProvider>
            </MessageProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);



// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
