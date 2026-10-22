// Open Sans empacotada: a extensão precisa funcionar sem internet.
// O subconjunto latin cobre todo o ISO-8859-1 dos nomes do AFD.
import '@fontsource/open-sans/latin-400.css'
import '@fontsource/open-sans/latin-600.css'
import '@fontsource/open-sans/latin-700.css'
import Dashboard from './pages/Dashboard'
import { AfdProvider } from './state/AfdContext'
import './styles/index.css'

export default function App() {
  return (
    <AfdProvider>
      <Dashboard />
    </AfdProvider>
  )
}
