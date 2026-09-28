'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function EnviarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: demandaId } = use(params)
  
  const [demanda, setDemanda] = useState<any>(null)
  const [valorTotal, setValorTotal] = useState('')
  const [moeda, setMoeda] = useState('BRL')
  const [cnpjFaturamento, setCnpjFaturamento] = useState('')
  const [tipoFrete, setTipoFrete] = useState<'CIF' | 'FOB'>('CIF')
  const [condicaoPagamento, setCondicaoPagamento] = useState('')
  
  // Estoque e Entrega
  const [disponibilidadeEstoque, setDisponibilidadeEstoque] = useState<boolean>(true)
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState('')
  const [dataEntrega, setDataEntrega] = useState('')

  const [temIpi, setTemIpi] = useState<boolean>(false)
  const [aliquotaIpi, setAliquotaIpi] = useState('')
  const [valorComImpostos, setValorComImpostos] = useState<boolean>(true)
  const [observacoes, setObservacoes] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadDemanda() {
      const { data, error } = await supabase
        .from('demandas')
        .select('*')
        .eq('id', demandaId)
        .single()

      if (!error && data) {
        setDemanda(data)
        // Pré-preenche a quantidade disponível com a quantidade solicitada pela Fortgreen
        if (data.quantidade) {
          setQuantidadeDisponivel(Number(data.quantidade).toLocaleString('pt-BR'))
        }
      }
      setFetching(false)
    }
    loadDemanda()
  }, [demandaId, supabase])

  // Máscara automática de CNPJ
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 14) value = value.slice(0, 14)

    value = value.replace(/^(\d{2})(\d)/, '$1.$2')
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2')
    value = value.replace(/(\d{4})(\d)/, '$1-$2')

    setCnpjFaturamento(value)
  }

  // Máscara automática para a Quantidade com pontos de milhar
  const handleQuantidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value

    value = value.replace(/[^0-9,]/g, '')

    const parts = value.split(',')
    let integerPart = parts[0]

    if (integerPart) {
      integerPart = integerPart.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }

    if (parts.length > 1) {
      value = `${integerPart},${parts[1].slice(0, 4)}`
    } else {
      value = integerPart
    }

    setQuantidadeDisponivel(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (demanda?.status !== 'ABERTA') {
      setMessage({ type: 'error', text: 'Esta cotação já se encontra encerrada ou cancelada.' })
      return
    }

    if (!pdfFile) {
      setMessage({ type: 'error', text: 'Selecione um ficheiro PDF com a proposta comercial.' })
      return
    }

    const valorLimpo = valorTotal.replace(/\./g, '').replace(',', '.')
    const valorNumerico = parseFloat(valorLimpo)

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setMessage({ type: 'error', text: 'Informe um valor total válido para a proposta.' })
      return
    }

    let ipiNumerico = 0
    if (temIpi) {
      ipiNumerico = parseFloat(aliquotaIpi.replace(',', '.'))
      if (isNaN(ipiNumerico) || ipiNumerico < 0) {
        setMessage({ type: 'error', text: 'Informe uma alíquota de IPI (%) válida.' })
        return
      }
    }

    let qtyNumerica: number | null = null
    if (disponibilidadeEstoque) {
      const qtyLimpa = quantidadeDisponivel.replace(/\./g, '').replace(',', '.')
      qtyNumerica = parseFloat(qtyLimpa)

      if (isNaN(qtyNumerica) || qtyNumerica <= 0) {
        setMessage({ type: 'error', text: 'Informe uma quantidade válida em estoque.' })
        return
      }

      if (!dataEntrega) {
        setMessage({ type: 'error', text: 'Informe a data de entrega prevista.' })
        return
      }
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilizador não autenticado.')

      const fileExt = pdfFile.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('propostas-pdf')
        .upload(filePath, pdfFile, { cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error(`Erro no envio do PDF: ${uploadError.message}`)

      const { data: urlData } = supabase.storage
        .from('propostas-pdf')
        .getPublicUrl(filePath)

      const { error: insertError } = await supabase.from('propostas').insert([
        {
          demanda_id: demandaId,
          fornecedor_id: user.id,
          valor_total: valorNumerico,
          moeda: moeda,
          cnpj_faturamento: cnpjFaturamento,
          tipo_frete: tipoFrete,
          condicao_pagamento: condicaoPagamento,
          disponibilidade_estoque: disponibilidadeEstoque,
          quantidade_disponivel: disponibilidadeEstoque ? qtyNumerica : null,
          data_entrega: disponibilidadeEstoque ? dataEntrega : null,
          tem_ipi: temIpi,
          aliquota_ipi: temIpi ? ipiNumerico : 0,
          valor_com_impostos: valorComImpostos,
          observacoes,
          pdf_url: urlData.publicUrl,
        },
      ])

      if (insertError) throw new Error(`Erro ao guardar no banco: ${insertError.message}`)

      setMessage({ type: 'success', text: 'Proposta enviada com sucesso!' })
      setTimeout(() => {
        router.push('/fornecedor')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Erro ao enviar proposta.' })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center text-white font-medium">A carregar detalhes da cotação...</div>
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative flex items-center justify-center p-4 md:p-8"
      style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-2xl space-y-6 my-8">
        
        {/* CARD INFORMATIVO DA SOLICITAÇÃO FORTGREEN */}
        <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/20 space-y-4">
          <div className="flex justify-between items-start border-b border-gray-200 pb-3">
            <div>
              <span className="text-[10px] font-extrabold text-green-700 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wider">
                Solicitação Fortgreen
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">{demanda?.titulo}</h1>
            </div>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              demanda?.status === 'ABERTA' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'
            }`}>
              {demanda?.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200/80">
            <div>
              <span className="text-gray-500 font-medium block">Qtd Solicitada:</span>
              <span className="font-black text-blue-900 text-base">
                {demanda?.quantidade ? Number(demanda.quantidade).toLocaleString('pt-BR') : '-'}
              </span>
            </div>

            <div>
              <span className="text-gray-500 font-medium block">Data da Necessidade:</span>
              <span className="font-bold text-gray-800 text-sm">
                {demanda?.data_necessidade ? new Date(demanda.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
              </span>
            </div>

            <div>
              <span className="text-gray-500 font-medium block">Prazo Cotação:</span>
              <span className="font-bold text-red-700 text-sm">
                {demanda?.data_limite ? new Date(demanda.data_limite).toLocaleString('pt-BR') : '-'}
              </span>
            </div>
          </div>

          {demanda?.descricao && (
            <div className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
              <span className="font-bold text-gray-800 block mb-0.5">Observações / Especificações Técnicas:</span>
              <p className="whitespace-pre-line text-gray-600">{demanda.descricao}</p>
            </div>
          )}
        </div>

        {/* CARD FORMULÁRIO COMPLETO DA PROPOSTA COMERCIAL */}
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Preencher Sua Proposta Comercial</h2>

          {message && (
            <div className={`p-4 mb-6 text-sm rounded-lg border ${message.type === 'success' ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
              {message.text}
            </div>
          )}

          {demanda?.status !== 'ABERTA' ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center font-medium my-4">
              Esta cotação já não se encontra disponível para o envio de propostas.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Moeda e Valor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                  <select
                    value={moeda}
                    onChange={(e) => setMoeda(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none bg-white text-gray-900"
                  >
                    <option value="BRL">Real (R$)</option>
                    <option value="USD">Dólar (US$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor Total da Proposta *</label>
                  <div className="relative mt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-sm font-medium">
                      {moeda === 'BRL' ? 'R$' : 'US$'}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={valorTotal}
                      onChange={(e) => setValorTotal(e.target.value)}
                      placeholder="0,00"
                      className="block w-full border border-gray-300 rounded-lg py-2.5 pl-12 pr-3 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* CNPJ e Frete */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">CNPJ de Faturamento *</label>
                  <input
                    type="text"
                    required
                    value={cnpjFaturamento}
                    onChange={handleCnpjChange}
                    placeholder="00.000.000/0001-00"
                    maxLength={18}
                    className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Frete</label>
                  <select
                    value={tipoFrete}
                    onChange={(e) => setTipoFrete(e.target.value as 'CIF' | 'FOB')}
                    className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none bg-white text-gray-900"
                  >
                    <option value="CIF">CIF (Frete incluso pelo fornecedor)</option>
                    <option value="FOB">FOB (Frete por conta da Fortgreen)</option>
                  </select>
                </div>
              </div>

              {/* Condição de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Condição de Pagamento *</label>
                <input
                  type="text"
                  required
                  value={condicaoPagamento}
                  onChange={(e) => setCondicaoPagamento(e.target.value)}
                  placeholder="Ex: 30 dias, 28/56 dias, À vista..."
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none text-gray-900"
                />
              </div>

              {/* Disponibilidade de Estoque e Entrega */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tem Disponibilidade de Estoque?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="disponibilidadeEstoque"
                        checked={disponibilidadeEstoque === true}
                        onChange={() => setDisponibilidadeEstoque(true)}
                        className="text-green-700 focus:ring-green-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-medium">
                      <input
                        type="radio"
                        name="disponibilidadeEstoque"
                        checked={disponibilidadeEstoque === false}
                        onChange={() => {
                          setDisponibilidadeEstoque(false)
                          setQuantidadeDisponivel('')
                          setDataEntrega('')
                        }}
                        className="text-green-700 focus:ring-green-500"
                      />
                      Não
                    </label>
                  </div>
                </div>

                {disponibilidadeEstoque && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Sua Capacidade de Fornecimento *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={quantidadeDisponivel}
                        onChange={handleQuantidadeChange}
                        placeholder="Ex: 10.000"
                        className="block w-full border border-gray-300 rounded-lg p-2.5 text-sm shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Data Prevista de Entrega *</label>
                      <input
                        type="date"
                        required
                        value={dataEntrega}
                        onChange={(e) => setDataEntrega(e.target.value)}
                        className="block w-full border border-gray-300 rounded-lg p-2.5 text-sm shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none text-gray-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* IPI e Impostos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tem IPI?</label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="temIpi"
                        checked={temIpi === true}
                        onChange={() => setTemIpi(true)}
                        className="text-green-700 focus:ring-green-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="temIpi"
                        checked={temIpi === false}
                        onChange={() => {
                          setTemIpi(false)
                          setAliquotaIpi('')
                        }}
                        className="text-green-700 focus:ring-green-500"
                      />
                      Não
                    </label>
                  </div>

                  {temIpi && (
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Alíquota IPI (%) *</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        required
                        value={aliquotaIpi}
                        onChange={(e) => setAliquotaIpi(e.target.value)}
                        placeholder="Ex: 3,25"
                        className="block w-full border border-gray-300 rounded-lg p-2 text-sm shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none text-gray-900"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor com impostos inclusos?</label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="valorComImpostos"
                        checked={valorComImpostos === true}
                        onChange={() => setValorComImpostos(true)}
                        className="text-green-700 focus:ring-green-500"
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="valorComImpostos"
                        checked={valorComImpostos === false}
                        onChange={() => setValorComImpostos(false)}
                        className="text-green-700 focus:ring-green-500"
                      />
                      Não
                    </label>
                  </div>
                </div>
              </div>

              {/* Anexo PDF */}
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700">Ficheiro da Proposta (PDF) *</label>
                <input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Observações Comerciais (Opcional)</label>
                <textarea
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Validade da proposta, local de faturamento..."
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-600 focus:outline-none text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition font-medium"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition font-medium shadow-md"
                >
                  {loading ? 'A enviar Proposta...' : 'Enviar Proposta'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}