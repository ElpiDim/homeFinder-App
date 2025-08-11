import 'bootstrap/dist/css/bootstrap.min.css';
import {AuthProvider} from './context/AuthContext';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from "axios";


const root = ReactDOM.createRoot(document.getElementById('root'));

axios.defaults.baseURL = "http://localhost:5000"; // match your backend
const bootToken = localStorage.getItem("token");
if (bootToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${bootToken}`;
}
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);



// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
