'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovoFornecedorPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/create-supplier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nomeEmpresa, cnpj }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro ao criar fornecedor')

      setMessage({ type: 'success', text: 'Fornecedor cadastrado com sucesso!' })
      setEmail('')
      setPassword('')
      setNomeEmpresa('')
      setCnpj('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative flex items-center justify-center p-4"
      style={{ 
        backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" 
      }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 my-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Cadastrar Novo Fornecedor</h1>

        {message && (
          <div className={`p-4 mb-4 text-sm rounded-lg border ${message.type === 'success' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Razão Social / Nome da Empresa</label>
            <input
              type="text"
              required
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              placeholder="Ex: Agromix Insumos LTDA"
              className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CNPJ Principal</label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">E-mail de Acesso do Fornecedor</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendas@fornecedor.com.br"
              className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Senha Provisória</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition font-medium"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition font-medium shadow-md"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}