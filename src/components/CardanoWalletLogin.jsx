import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Buffer } from 'buffer';
import * as CSL from '@emurgo/cardano-serialization-lib-browser';
import Button from 'react-bootstrap/Button';
import "./../styles/AuthPage.css"


const SUPPORTED_WALLETS = ["nami", "eternl", "flint", "lace"];
const WALLET_ICONS = {
  nami: "/icons/nami.png",
  eternl: "/icons/eternl.png",
  flint: "/icons/flint.png",
  lace: "/icons/lace.png"
};


function CardanoWalletLogin({ onLogin, showToast }) {
  const { t } = useTranslation();
  const [availableWallets, setAvailableWallets] = useState([]);

  useEffect(() => {
    const wallets = SUPPORTED_WALLETS.filter(w => window.cardano && window.cardano[w]);
    setAvailableWallets(wallets);
  }, []);

  const handleConnect = async (walletName) => {
    try {
      const walletApi = await window.cardano[walletName].enable();
      const rawAddress = await walletApi.getChangeAddress();
      const bech32Address = CSL.Address.from_bytes(
        Buffer.from(rawAddress, 'hex')
        ).to_bech32();

      const response = await fetch('/api/auth/cardano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cbor_address: rawAddress, address: bech32Address }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      localStorage.setItem('userData', JSON.stringify(data));

      if (onLogin) onLogin(data);
      if (showToast) showToast(t('loginSuccess'), 'success');

    } catch (err) {
      console.error('Cardano Auth Error:', err);
      if (showToast) showToast(t('loginError') + `: ${err.message}`, 'danger');
    }
  };

  return (
    <div className='Auth-oauth-wallets'>
      
      {availableWallets.length > 0 ? (
        <div style={{ marginBottom: '0.5rem', fontFamily: 'monospace', color: 'gray' }}>
        {t('loginWithWallet')}
      </div>
      ) && (
        availableWallets.map(wallet => (
          <Button 
            key={wallet} 
            variant="outline-secondary"
            size="md"
            onClick={() => handleConnect(wallet)} 
            className="Auth-oauth-button"
            >
            <img src={WALLET_ICONS[wallet]} alt={wallet} className='Auth-oauth-logo' />
            {t('connectWallet', { wallet })}
          </Button>
        ))
      ) : (
        <div style={{fontSize: '0.75rem'}}>
            <Trans i18nKey="walletNotFound"
                components={{
                    nami: <a className="Auth-wallet-link" href="https://namiwallet.io/" target="_blank" rel="noopener noreferrer" />,
                    lace: <a className="Auth-wallet-link" href="https://lace.io/" target="_blank" rel="noopener noreferrer" />,
                    flint: <a className="Auth-wallet-link" href="https://flint-wallet.com/" target="_blank" rel="noopener noreferrer" />,
                    eternl: <a className="Auth-wallet-link" href="https://eternl.io/" target="_blank" rel="noopener noreferrer" />
                }}
            />
        </div>
      )}
    </div>
  );
}

export default CardanoWalletLogin;
