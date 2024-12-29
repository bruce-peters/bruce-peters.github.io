import React, { useEffect } from "react";
import { scroller } from "react-scroll";
import Navigation from "./Navigation";
import Footer from "../components/sections/Footer";
import { useNavigate } from "react-router";

const Layout = ({ children }) => {
  const location = useNavigate();

  useEffect(() => {
    if (location.hash) {
      scroller.scrollTo(location.hash.substring(1), {
        duration: 800,
        delay: 0,
        smooth: "easeInOutQuart",
        offset: -50, // Adjust this value to stop before the section title
      });
    }
  }, [location]);

  return (
    <div className="bg-dark text-light flex flex-col justify-start font-mono scroll-smooth">
      <Navigation />
      {children}
      <Footer />
    </div>
  );
};

export default Layout;
