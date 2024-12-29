import React from "react";
import Navigation from "./Navigation";
import Footer from "../components/sections/Footer";

const Layout = ({ children }) => {
  return (
    <div className="bg-dark text-light flex flex-col justify-start font-mono scroll-smooth">
      <Navigation />
      {children}
      <Footer />
    </div>
  );
};

export default Layout;
