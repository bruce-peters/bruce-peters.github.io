import React from "react";
import Navigation from "./Navigation";
import { motion } from "framer-motion";

const Layout = ({ children }) => {
  return (
    <div className="bg-dark text-light flex flex-col justify-start font-mono pb-[50vh] scroll-smooth">
      <Navigation />
      {children}
    </div>
  );
};

export default Layout;
