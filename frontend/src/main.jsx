import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";

const wallets = [new PetraWallet()];
createRoot(document.getElementById('root')).render(
  <AptosWalletAdapterProvider plugins={wallets} autoConnect={true}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AptosWalletAdapterProvider>
)
