// Точка входу застосунку: підключаємо стилі
// та "вмонтовуємо" компонент App у <div id="root"> з index.html.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './lib/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter дає сайту окремі сторінки: /, /booking ... */}
    <BrowserRouter>
      {/* AuthProvider робить дані про користувача доступними всьому сайту */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
