import { useState } from 'react'
import './App.css'
import DataDisplay from './components/Datadisplay'
import SearchForm from './components/SearchForm'

function App() {
  const [count, setCount] = useState(0);

  const fullScreenStyle = {
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f4f4f9',
        overflowY: 'auto',
    };

  return (
    <>
       <div style={fullScreenStyle} className="App overflow-x-hidden">
            <SearchForm />
            {/* <DataDisplay/> */}
        </div>
    </>
  )
}

export default App
