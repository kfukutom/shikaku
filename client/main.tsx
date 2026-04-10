import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const redirect = new URLSearchParams(window.location.search).get('redirect');
if (redirect) {
    window.history.replaceState(null, '', redirect);
}

createRoot(document.getElementById('root')!).render(
  <App />
)