import React from 'react'
import SelectingPage from './selecting/App'
import OutputTable from './outputTable/App'
import FuzzyTable from './fuzzyTable/App'
import { BrowserRouter, Routes, Route} from 'react-router-dom';


const App = () => {
  return (
    <BrowserRouter>
    <Routes>
        <Route path="/selecting" element={<SelectingPage/>}/>
        <Route path='/outputTable' element={<OutputTable/>}/>
        <Route path='/fuzzyTable' element={<FuzzyTable/>}/> 


    </Routes>
    </BrowserRouter>
  )
}

export default App;
