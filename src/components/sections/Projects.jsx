import React from "react";
import { projects } from "../../constants";
import ProjectCard from "../ProjectCard";
import SectionTitle from "../SectionTitle";
import FeaturedProjectCard from "../FeaturedProjectCard";

const Projects = () => {
  return (
    <div id="projects" className="flex flex-col text-center gap-5 align-middle">
      <SectionTitle title="Projects" />
      {/* <p>Here are some of my projects</p>
      <div className="mt-4 grid grid-cols-3 gap-4 justify-center align-middle w-1/2 mx-auto">
        {projects.map((project, index) => (
          <ProjectCard key={index} projectData={project} />
        ))}
      </div> */}
      {/* Featured Projects */}
      <div className="flex flex-col gap-20">
        {projects
          .filter((project) => project.featured === true)
          .map((project, index) => (
            <FeaturedProjectCard
              key={index}
              projectData={project}
              reverse={index % 2 != 0}
            />
          ))}
      </div>
      {/* Other Projects */}
      <div className="text-3xl font-bold text-primary mt-9">
        Other Noteworthy Projects
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {projects
          .filter((project) => project.featured !== true)
          .map((project, index) => (
            <ProjectCard key={index} projectData={project} />
          ))}
      </div>
    </div>
  );
};

export default Projects;
