import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./component/sidebar";
import Header from "./component/Header";

import Dashboard from "./pages/Dashboard";
import Chief from "./pages/Chief";
import Inbox from "./pages/Inbox";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";

export default function App() {

  return (

    <BrowserRouter>

      <div className="flex h-screen bg-slate-950 text-white">

        <Sidebar />

        <div className="flex-1 flex flex-col">

          <Header />

          <main className="flex-1 overflow-y-auto p-6">

            <Routes>

              <Route
                path="/"
                element={<Dashboard />}
              />

              <Route
                path="/chief"
                element={<Chief />}
              />

              <Route
                path="/inbox"
                element={<Inbox />}
              />

              <Route
                path="/calendar"
                element={<Calendar />}
              />

              <Route
                path="/tasks"
                element={<Tasks />}
              />

            </Routes>

          </main>

        </div>

      </div>

    </BrowserRouter>

  );

}