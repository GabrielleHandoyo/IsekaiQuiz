import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReincarnationQuiz from "./components/ReincarnationQuiz";
import AdminDashboard from "./components/AdminDashboard";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <div className="App">
              <main>
                <div className="phone-wrapper">
                  <div className="phone-button-left"></div>
                  <div className="phone-button-left-2"></div>
                  <div className="phone-button-right"></div>
                  <ReincarnationQuiz />
                </div>
              </main>
            </div>
          }
        />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
