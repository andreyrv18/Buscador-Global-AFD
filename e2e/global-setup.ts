// e2e/global-setup.ts
import { execSync } from 'node:child_process';

async function globalSetup() {
  console.log('\n📦 Gerando a build da extensão para os testes E2E...');
  // Compila o TypeScript e roda o Vite para gerar a pasta /dist com os manifestos
  execSync('npm run build', { stdio: 'inherit' });
}

export default globalSetup;