import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import api from '../services/api';

function ResetPassword(){
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const token = searchParams.get('token') || '';

  useEffect(()=>{
    if(!token) navigate('/forgot-password');
  }, [token, navigate]);

  const submit = async (e) =>{
    e.preventDefault();
    if(password.length < 6) return setStatus('Password must be at least 6 characters');
    if(password !== confirm) return setStatus('Passwords do not match');
    try{
      await api.post('/auth/reset-password', { token, password });
      setStatus('Password reset successful. Redirecting to login...');
      setTimeout(()=>navigate('/login'), 1800);
    }catch(err){
      setStatus(err.response?.data?.message || 'Reset failed');
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="auth-card rounded-2xl p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">Set a new password</h2>
          <form onSubmit={submit} className="space-y-4">
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="New password" className="auth-input w-full rounded-3xl px-4 py-3" />
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required placeholder="Confirm password" className="auth-input w-full rounded-3xl px-4 py-3" />
            <button type="submit" className="brand-button w-full rounded-3xl px-4 py-3">Reset Password</button>
          </form>
          {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        </div>
      </div>
    </MainLayout>
  );
}

export default ResetPassword;
