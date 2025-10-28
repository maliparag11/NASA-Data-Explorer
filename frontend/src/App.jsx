import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppNavbar from './components/AppNavbar';
import Home from './pages/Home';
import Neo from './pages/Neo';
import ImageSearch from './pages/ImageSearch';
import Insight from './pages/Insight';


export default function App(){
  return (
    <>
      <AppNavbar />
      <div className="fullscreen">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/neo" element={<Neo/>} />
          <Route path="/imagesearch" element={<ImageSearch/>} />
          <Route path="/insight" element={<Insight/>} />
        </Routes>
      </div>
    </>
  );
}
