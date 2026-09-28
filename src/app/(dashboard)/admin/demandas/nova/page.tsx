'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NovaDemandaPage() {
  const [titulo, setTitulo] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dataNecessidade, setDataNecessidade] = useState('')
  const [dataLimite, setDataLimite] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const handleQuantidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9,]/g, '')
    const parts = value.split(',')
    let integerPart = parts[0]
    if (integerPart) integerPart = integerPart.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    setQuantidade(parts.length > 1 ? `${integerPart},${parts[1]}` : integerPart)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado.')

      const qtdLimpa = quantidade.replace(/\./g, '').replace(',', '.')
      const qtdNumerica = Number(qtdLimpa)

      if (isNaN(qtdNumerica) || qtdNumerica <= 0) {
        alert('Informe uma quantidade válida.')
        setSubmitting(false)
        return
      }

      const { error } = await supabase.from('demandas').insert([{
        titulo,
        quantidade: qtdNumerica,
        descricao: descricao ? descricao.trim() : '', // Envia string vazia se estiver em branco
        data_necessidade: dataNecessidade,
        data_limite: dataLimite,
        criado_por: user.id,
        status: 'ABERTA'
      }])

      if (error) throw error

      alert('Cotação criada com sucesso!')
      router.push('/admin')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cotação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative flex items-center justify-center p-4" style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      <div className="relative z-10 max-w-lg w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Criar Nova Cotação / Demanda</h1>
          <p className="text-xs text-gray-500 mt-1">Preencha os dados do produto para liberar a cotação aos fornecedores</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Produto MP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
              placeholder="Ex: MP SULFATO DE MANGANES 31%"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Quantidade Solicitada <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={quantidade}
              onChange={handleQuantidadeChange}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
              placeholder="Ex: 30.000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Observações / Especificações Técnicas <span className="text-gray-400 font-normal">(Opcional)</span>
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none resize-none"
              placeholder="Ex: Embalagem em sacos de 25kg, laudo prévio obrigatório..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Data da Necessidade <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dataNecessidade}
                onChange={(e) => setDataNecessidade(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Data e Hora Limite <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/admin"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              Voltar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-green-700 hover:bg-green-800 text-white transition disabled:opacity-50 shadow-md"
            >
              {submitting ? 'A publicar...' : 'Publicar Cotação'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}