import pb from '@/lib/pocketbase/client'
import type { RoleUsuario, UsuarioCRM } from '@/types/crm'

export interface UsuarioAutenticadoInfo {
  id: string
  email: string
  name: string
  role: RoleUsuario | null
  loja: string
  ativo: boolean
  isGestor: boolean
  isAtendente: boolean
  isComercial: boolean
  isSac: boolean
  isDiretoria: boolean
}

export function getUsuarioAtualInfo(): UsuarioAutenticadoInfo {
  const user = pb.authStore.record as unknown as UsuarioCRM | null

  if (!user) {
    return {
      id: '',
      email: '',
      name: '',
      role: null,
      loja: '',
      ativo: false,
      isGestor: false,
      isAtendente: false,
      isComercial: false,
      isSac: false,
      isDiretoria: false,
    }
  }

  const role = user.role || 'atendente'
  const loja = user.loja || ''
  const ativo = user.ativo !== false

  return {
    id: user.id,
    email: user.email,
    name: user.name || user.email || 'Usuário',
    role,
    loja,
    ativo,
    isGestor: role === 'gestor',
    isAtendente: role === 'atendente',
    isComercial: role === 'comercial',
    isSac: role === 'sac',
    isDiretoria: role === 'diretoria',
  }
}
