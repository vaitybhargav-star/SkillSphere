import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import api from '../services/api';

function TwoFactorSetup(){
  const [qrUrl, setQrUrl] = useState('');
  const [base32, setBase32] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await api.get('/auth/2fa/setup');
        if(res.data?.otpauth_url){
          // use external QR generator for a quick preview
          const encoded = encodeURIComponent(res.data.otpauth_url);
          setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200`);
          setBase32(res.data.base32);
        }
      }catch(err){
        setStatus('Unable to initialize 2FA setup.');
      }
    })();
  },[]);

  const enable = async (e) =>{
    e.preventDefault();
    try{
      const res = await api.post('/auth/2fa/enable', { code });
      if(res.data?.success){
        setStatus('2FA enabled.');
        setTimeout(()=>navigate('/profile'),1200);
      }
    }catch(err){ setStatus(err.response?.data?.message || 'Enable failed'); }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="auth-card rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Two-Factor Authentication</h2>
          <p className="text-slate-400 mb-4">Scan the QR with an authenticator app (Google Authenticator, Authy) and enter the 6-digit code to enable 2FA.</p>
          {qrUrl ? (
            <div className="mb-4">
              <img src={qrUrl} alt="QR" className="mx-auto" />
              <p className="mt-2 text-sm text-slate-300">Manual secret: <code className="text-xs">{base32}</code></p>
            </div>
          ) : <p className="text-sm text-slate-400">Preparing QR code...</p>}

          <form onSubmit={enable} className="space-y-4">
            <input type="text" value={code} onChange={e=>setCode(e.target.value)} required placeholder="123456" className="auth-input w-full rounded-3xl px-4 py-3" />
            <button className="brand-button w-full rounded-3xl px-4 py-3">Enable 2FA</button>
          </form>

          {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        </div>
      </div>
    </MainLayout>
  );
}

export default TwoFactorSetup;
