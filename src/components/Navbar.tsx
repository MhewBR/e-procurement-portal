'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface NavbarProps {
  email: string
  role: string
}

export default function Navbar({ email, role }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-white px-4 md:px-8 py-3 sticky top-0 z-50">
      <div className="max-w-[98%] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-wide text-green-400">FORTGREEN</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium border border-white/10 hidden sm:inline-block">
              E-Procurement
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            {role === 'ADMIN' ? (
              <>
                <Link href="/admin" className="text-gray-300 hover:text-white transition">Cotações Abertas</Link>
                <Link href="/admin/contratos" className="text-gray-300 hover:text-green-400 transition">Contratos Ativos</Link>
                <Link href="/admin/finalizados" className="text-gray-300 hover:text-red-400 transition">Finalizados / Cancelados</Link>
                <Link href="/admin/indicadores" className="text-emerald-400 hover:text-emerald-300 font-semibold transition flex items-center gap-1">
                  📊 Indicadores (BI)
                </Link>
              </>
            ) : (
              <>
                <Link href="/fornecedor" className="text-gray-300 hover:text-white transition">Mural de Cotações</Link>
                <Link href="/fornecedor/contratos" className="text-gray-300 hover:text-green-400 transition">Meus Contratos Ativos</Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-right hidden sm:block">
            <p className="font-medium text-gray-200 text-xs">{email}</p>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-green-900/60 text-green-300 border border-green-700/50 font-semibold">
              {role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition shadow-sm border border-red-500/30"
          >
            Sair
          </button>
        </div>

        <div className="flex md:hidden w-full overflow-x-auto gap-4 text-xs font-medium pb-1 border-t border-white/10 pt-2">
           {role === 'ADMIN' ? (
              <>
                <Link href="/admin" className="text-gray-300 whitespace-nowrap">Abertas</Link>
                <Link href="/admin/contratos" className="text-gray-300 whitespace-nowrap">Contratos</Link>
                <Link href="/admin/finalizados" className="text-gray-300 whitespace-nowrap">Finalizados</Link>
                <Link href="/admin/indicadores" className="text-emerald-400 whitespace-nowrap">BI</Link>
              </>
            ) : (
              <>
                <Link href="/fornecedor" className="text-gray-300 whitespace-nowrap">Cotações</Link>
                <Link href="/fornecedor/contratos" className="text-gray-300 whitespace-nowrap">Meus Contratos</Link>
              </>
            )}
        </div>
      </div>
    </header>
  )
}