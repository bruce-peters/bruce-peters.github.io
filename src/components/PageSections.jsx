import React from "react";
import About from "./sections/About";
import Projects from "./sections/Projects";
import Contact from "./sections/Contact";

const PageSections = () => {
  return (
    <div className="flex flex-col gap-y-60 max-w-[65rem] p-12 mx-auto">
      <About />
      <Projects />
      <Contact />
    </div>
  );
};

export default PageSections;
