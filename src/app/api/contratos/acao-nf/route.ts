import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { propostaId, abatimentoId, acao, recusaUrl } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem realizar esta ação.' }, { status: 403 })
    }

    if (acao === 'VER_TODAS') {
      const { error } = await supabase.from('contrato_abatimentos')
        .update({ status_nf: 'VISTA' })
        .eq('proposta_id', propostaId)
        .eq('status_nf', 'PENDENTE')
      if (error) throw error
    } 
    else if (acao === 'RECUSAR') {
      const { data: ab, error: fetchErr } = await supabase
        .from('contrato_abatimentos')
        .select('*')
        .eq('id', abatimentoId)
        .single()

      if (fetchErr || !ab) throw new Error('Registo de abatimento não encontrado.')

      if (ab.status_nf === 'RECUSADA') {
        return NextResponse.json({ success: true, message: 'Nota já estava recusada.' })
      }

      // Atualiza status e grava o anexo de recusa (se enviado)
      const { data: updatedRows, error: updateError } = await supabase
        .from('contrato_abatimentos')
        .update({ 
          status_nf: 'RECUSADA',
          recusa_url: recusaUrl || null
        })
        .eq('id', abatimentoId)
        .select()

      if (updateError) throw updateError
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('O banco de dados bloqueou a alteração da nota.')
      }

      // Devolve o saldo ao contrato
      const { data: prop, error: propFetchErr } = await supabase
        .from('propostas')
        .select('quantidade_disponivel')
        .eq('id', ab.proposta_id)
        .single()

      if (propFetchErr || !prop) throw new Error('Contrato não encontrado para devolução.')

      const saldoDevolvido = Number(prop.quantidade_disponivel || 0) + Number(ab.quantidade || 0)
      const { error: propError } = await supabase
        .from('propostas')
        .update({ quantidade_disponivel: saldoDevolvido })
        .eq('id', ab.proposta_id)

      if (propError) throw propError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}