import { BrowserRouter, Routes, Route } from "react-router-dom";
import Game from "./screens/Game";
import Duel from "./screens/Duel";
import NotFound from "./screens/NotFound";

export default function App() {
    return (
        <BrowserRouter basename="/shikaku">
            <Routes>
                <Route path="/" element={<Game />} />
                <Route path="/duel/" element={<Duel />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}