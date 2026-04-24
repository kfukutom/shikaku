import { BrowserRouter, Routes, Route } from "react-router-dom";
import Game from "./screens/Game";
import Duel from "./screens/Duel";
import Battle from "./screens/Battle";
import NotFound from "./screens/NotFound";
import Learn from "./screens/Learn";

export default function App() {
    return (
        <BrowserRouter basename="/shikaku">
            <Routes>
                <Route path="/" element={<Game />} />
                <Route path="/duel/" element={<Duel />} />
                <Route path="/learn/" element={<Learn />} />
                <Route path="/duel/:sessionId" element={<Battle />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}