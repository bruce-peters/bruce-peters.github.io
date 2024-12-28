import React from "react";
import About from "./sections/About";
import Projects from "./sections/Projects";
import Contact from "./sections/Contact";

const PageSections = () => {
  return (
    <div
      className="flex flex-col gap-y-60
    "
    >
      <About id="about" />
      <Projects id="projects" />
      <Contact id="contact" />
    </div>
  );
};

export default PageSections;
