'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'ADMIN') {
      router.push('/admin')
    } else {
      router.push('/fornecedor')
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative p-4"
      style={{ 
        backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" 
      }}
    >
      {/* Camada escura para dar destaque e contraste ao formulário */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

      <form 
        onSubmit={handleLogin} 
        className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl space-y-6 border border-white/20"
      >
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Portal de cotações Fortgreen
          </h1>
          <p className="text-sm text-gray-500">Aceda ao portal para gerir as suas propostas</p>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100/90 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2.5 shadow-sm focus:border-green-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
            placeholder="seu.email@empresa.com"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Palavra-passe</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2.5 shadow-sm focus:border-green-600 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'A entrar...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}