import Navbar from './components/navbar/NavBar'
import Showcase from './components/ShowCase'
import './styles/index.css'
import './styles/tipografia.module.css'

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Buscador Global</h1>
      <p>Bem-vindo à nova página da extensão!</p>
      <Navbar></Navbar>
      <Showcase></Showcase>
    </div>
  )
}
