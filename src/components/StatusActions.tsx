'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StatusActionsProps {
  demandaId: string
  currentStatus: string
}

export default function StatusActions({ demandaId, currentStatus }: StatusActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpdateStatus = async (newStatus: string) => {
    const acaoText = newStatus === 'CONCLUIDA' ? 'encerrar' : newStatus === 'CANCELADA' ? 'cancelar' : 'reabrir'
    if (!confirm(`Tem certeza que deseja ${acaoText} esta cotação?`)) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/demandas/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandaId, status: newStatus }),
      })

      // Proteção: verifica se a resposta é realmente um JSON antes de tentar ler
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Erro ao atualizar estado')
        }
      } else {
        throw new Error("A API não foi encontrada. Verifique se o ficheiro route.ts foi criado na pasta exata: /api/admin/demandas/update-status/route.ts")
      }

      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 items-center">
      {currentStatus === 'ABERTA' && (
        <>
          <button
            onClick={() => handleUpdateStatus('CONCLUIDA')}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-green-700 hover:bg-green-800 text-white transition shadow-sm disabled:opacity-50"
          >
            Encerrar Cotação
          </button>
          <button
            onClick={() => handleUpdateStatus('CANCELADA')}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition shadow-sm disabled:opacity-50"
          >
            Cancelar Cotação
          </button>
        </>
      )}

      {currentStatus !== 'ABERTA' && (
        <button
          onClick={() => handleUpdateStatus('ABERTA')}
          disabled={loading}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-800 text-white transition shadow-sm disabled:opacity-50"
        >
          Reabrir Cotação
        </button>
      )}
    </div>
  )
}