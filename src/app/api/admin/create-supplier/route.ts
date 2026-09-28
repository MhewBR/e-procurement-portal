import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, nomeEmpresa, cnpj } = await request.json()

    // Instancia o cliente com a chave Mestre (ignora regras de segurança RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Cria o utilizador na aba de Autenticação do Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Já valida o e-mail automaticamente
    })

    if (authError) throw authError

    // 2. Insere os dados manualmente na tabela 'profiles'
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: email,
            nome_empresa: nomeEmpresa,
            cnpj: cnpj || null,
            role: 'FORNECEDOR' // Define explicitamente como fornecedor
          }
        ])

      // Se der erro ao salvar na tabela profiles, apagamos a auth para não gerar dados "fantasmas"
      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw new Error(`Erro ao salvar perfil: ${profileError.message}`)
      }
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}