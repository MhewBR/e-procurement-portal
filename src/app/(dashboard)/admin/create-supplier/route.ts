import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, nomeEmpresa, cnpj } = await request.json()

    // Instancia o client com privilégio de administrador
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome_empresa: nomeEmpresa,
        role: 'FORNECEDOR',
      },
    })

    if (authError) throw authError

    // Salva o CNPJ na tabela de perfis
    if (cnpj && authData.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ cnpj })
        .eq('id', authData.user.id)
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}