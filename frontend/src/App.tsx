import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Stock from "./pages/Game/Stock";
import Typing from "./pages/Game/Typing";
import Calculating from "./pages/Game/Calculating";
import FinanceChat from "./pages/Chat/FinanceChat";
import SurveyPage from "./pages/Survey/SurveyPage";
import SurveyResultPage from "./pages/Survey/SurveyResultPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game">
          <Route path="typing" element={<Typing />} />
          <Route path="calculating" element={<Calculating />} />
          <Route path="stock" element={<Stock />} />
        </Route>
        <Route path="/chat/finance" element={<FinanceChat />} />
        <Route path="/survey" element={<SurveyPage />} />
        <Route path="/survey/result" element={<SurveyResultPage />} />
      </Routes>
    </BrowserRouter>
  );
}
