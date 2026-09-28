import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { demandaId, status } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Validação estrita: se for ENCERRAR (CONCLUIDA), exige que haja pelo menos uma proposta vencedora
    if (status === 'CONCLUIDA') {
      const { data: vencedoras } = await supabase
        .from('propostas')
        .select('id')
        .eq('demanda_id', demandaId)
        .eq('vencedora', true)

      if (!vencedoras || vencedoras.length === 0) {
        return NextResponse.json(
          { error: 'É necessário selecionar pelo menos um fornecedor vencedor antes de encerrar a cotação.' },
          { status: 400 }
        )
      }
    }

    const { error } = await supabase
      .from('demandas')
      .update({ status })
      .eq('id', demandaId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}