import { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import api from '../services/api';

function ForgotPassword(){
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const submit = async (e) =>{
    e.preventDefault();
    try{
      await api.post('/auth/forgot-password', { email });
      setStatus('If an account exists, a reset email was sent.');
    }catch(err){
      setStatus(err.response?.data?.message || 'Error sending reset email');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="auth-card rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Reset your password</h2>
          <p className="text-slate-400 mb-4">Enter your account email and we'll send instructions to reset your password.</p>
          <form onSubmit={submit} className="space-y-4">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" className="auth-input w-full rounded-3xl px-4 py-3" />
            <button type="submit" className="brand-button w-full rounded-3xl px-4 py-3">Send reset email</button>
          </form>
          {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        </div>
      </div>
    </MainLayout>
  );
}

export default ForgotPassword;
