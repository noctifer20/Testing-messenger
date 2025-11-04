import { BrowserRouter, Route, Routes,  } from "react-router-dom";
import Main from "./Pages/Main";
import NotFound from "./Pages/NotFound"
import Room from "./Pages/Room";


function App() {
    return (
        <BrowserRouter>
        <Routes>
        <Route exact path='/room/:id' Component={Room}/>
        <Route exact path='/' Component={Main}/>
        <Route path="*" Component={NotFound}/>
        </Routes>
        </BrowserRouter>
    )
}

export default App;
