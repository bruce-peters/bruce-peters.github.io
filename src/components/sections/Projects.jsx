import React from "react";
import { projects } from "../../constants";
import ProjectCard from "../ProjectCard";
import SectionTitle from "../SectionTitle";

const Projects = () => {
  return (
    <div className="flex flex-col text-center gap-5 align-middle w-3/4 mx-auto">
      <SectionTitle title="Projects" />
      {/* <p>Here are some of my projects</p>
      <div className="mt-4 grid grid-cols-3 gap-4 justify-center align-middle w-1/2 mx-auto">
        {projects.map((project, index) => (
          <ProjectCard key={index} projectData={project} />
        ))}
      </div> */}
    </div>
  );
};

export default Projects;
