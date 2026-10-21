import { useContext } from 'react'
import { AfdContext } from './AfdContext'
import type { ValorAfdContext } from './AfdContext'

/** Estado do arquivo AFD. Precisa estar dentro de `<AfdProvider>`. */
export function useAfd(): ValorAfdContext {
  const valor = useContext(AfdContext)
  if (valor === null) {
    throw new Error('useAfd precisa ser usado dentro de <AfdProvider>')
  }
  return valor
}
