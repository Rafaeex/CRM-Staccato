import pb from '@/lib/pocketbase/client'
import type { RoleUsuario, UsuarioCRM } from '@/types/crm'

export interface UsuarioAutenticadoInfo {
  id: string
  email: string
  name: string
  role: RoleUsuario
  loja: string
  isGestor: boolean
  isAtendente: boolean
}

export function getUsuarioAtualInfo(): UsuarioAutenticadoInfo {
  const user = pb.authStore.record as unknown as UsuarioCRM | null

  if (!user) {
    return {
      id: '',
      email: '',
      name: 'Visitante',
      role: 'gestor',
      loja: '',
      isGestor: true,
      isAtendente: false,
    }
  }

  const role: RoleUsuario = user.role === 'atendente' ? 'atendente' : 'gestor'
  const loja = user.loja || ''

  return {
    id: user.id,
    email: user.email,
    name: user.name || (role === 'atendente' ? 'Atendente' : 'Gestor'),
    role,
    loja,
    isGestor: role === 'gestor',
    isAtendente: role === 'atendente',
  }
}
