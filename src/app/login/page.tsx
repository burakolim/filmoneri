'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

function RegistrationMessage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  if (!registered) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg mb-6"
    >
      <p className="text-center text-sm font-medium">
        Kayıt başarılı! Şimdi giriş yapabilirsiniz.
      </p>
    </motion.div>
  );
}

export default function Login() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/auth/login', formData);
      await checkAuth();
      router.push('/');
      router.refresh();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Giriş işlemi başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-black/40 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/10"
      >
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Giriş Yap
        </h1>

        {/* ✅ Suspense ile sardık */}
        <Suspense fallback={null}>
          <RegistrationMessage />
        </Suspense>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6"
          >
            <p className="text-center text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-blue-500 text-white py-3 rounded-lg font-medium
              hover:from-primary/90 hover:to-blue-500/90 focus:outline-none focus:ring-2 focus:ring-primary/50
              disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          <p className="text-center text-gray-400">
            Hesabınız yok mu?{' '}
            <Link href="/signup" className="text-primary hover:text-blue-500 transition-colors duration-200">
              Kayıt Olun
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
