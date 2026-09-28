'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function FornecedorMuralPage() {
  const [demandas, setDemandas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadDemandas = async () => {
      const { data } = await supabase
        .from('demandas')
        .select('*, propostas(id, fornecedor_id)')
        .eq('status', 'ABERTA')
        .order('created_at', { ascending: false })

      setDemandas(data || [])
      setLoading(false)
    }

    loadDemandas()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Carregando mural...</div>

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative p-4 md:p-8" style={{ backgroundImage: "url('https://fortgreen.com.br/public/images/og-img/dc0323873922ee19b3cde9102758845d.jpg')" }}>
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
      
      <div className="relative z-10 max-w-[98%] mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white drop-shadow-md">Mural de Cotações Abertas</h1>
          <p className="text-sm text-gray-200">Confira os itens solicitados pela Fortgreen e envie suas propostas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demandas.map((d) => (
            <div key={d.id} className="bg-white/95 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900">{d.titulo}</h3>
                  <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Aberta
                  </span>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Qtd Solicitada:</span>
                    <span className="font-bold text-blue-800 text-sm">
                      {d.quantidade ? Number(d.quantidade).toLocaleString('pt-BR') : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Necessidade Fortgreen:</span>
                    <span className="font-semibold text-gray-800">
                      {d.data_necessidade ? new Date(d.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Prazo Cotação:</span>
                    <span className="font-semibold text-red-700">
                      {d.data_limite ? new Date(d.data_limite).toLocaleString('pt-BR') : '-'}
                    </span>
                  </div>
                </div>

                {d.descricao && (
                  <div className="text-xs text-gray-600 bg-white p-2.5 rounded border border-gray-100">
                    <p className="font-semibold text-gray-700 mb-0.5">Observações / Especificações:</p>
                    <p className="italic">{d.descricao}</p>
                  </div>
                )}
              </div>

              <Link
                href={`/fornecedor/demandas/${d.id}`}
                className="w-full text-center py-2.5 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg text-xs tracking-wider uppercase transition shadow-md block mt-auto"
              >
                Enviar Proposta
              </Link>
            </div>
          ))}

          {demandas.length === 0 && (
            <div className="col-span-full bg-white/90 p-8 rounded-xl text-center text-gray-600 shadow-xl">
              Nenhuma cotação aberta no momento.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}