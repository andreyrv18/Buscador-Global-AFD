import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// Arte da 3.8 publicada: 48 e 128 px originais; 16 e 32 px reduzidos do de 128.
const icones = {
  16: 'public/icons/icon16.png',
  32: 'public/icons/icon32.png',
  48: 'public/icons/icon48.png',
  128: 'public/icons/icon128.png',
}

export default defineManifest({
  manifest_version: 3,
  name: 'Buscador Global AFD',
  description: 'Lê e analisa localmente arquivos AFD (Portarias 595, 1510 e 671).',
  version: pkg.version,
  icons: icones,
  action: {
    default_icon: icones,
    default_title: 'Abrir Buscador Global',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  // Apenas notifications, como na 3.8 publicada: permissão nova faz o
  // Chrome desativar a extensão até o usuário aceitar.
  permissions: ['notifications'],
})
