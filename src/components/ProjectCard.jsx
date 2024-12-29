import React from "react";
import { Tilt } from "react-tilt";
import Reveal from "../framer-effects/Reveal";
import ExternalLink from "./ExternalLink";

const ProjectCard = ({ projectData }) => {
  // Use a placeholder image if projectImage is not provided
  const projectImage =
    projectData.projectImage ||
    `https://picsum.photos/200?random=${projectData.id}`;

  return (
    <div
      onClick={() => {
        window.open(projectData.url ?? projectData.github ?? "");
      }}
    >
      <Tilt
        options={{ max: 10 }}
        className="bg-slate-700 bg-opacity-50 text-white w-fit p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col gap-2 group"
      >
        <div className="flex flex-row justify-end align-top w-full">
          <div className="flex flex-row gap-4 mt-4">
            {projectData.github && (
              <Reveal>
                <ExternalLink link={projectData.github} type={"github"} />
              </Reveal>
            )}

            {projectData.url && (
              <Reveal>
                <ExternalLink link={projectData.url} type={"external"} />
              </Reveal>
            )}
          </div>
        </div>
        <div className="flex flex-col items-left text-left">
          <Reveal>
            <h1 className="text-lg text-primary font-bold mb-2 group-hover:text-secondary group-hover:border-b group-hover:border-b-secondary w-fit transition-all duration-500">
              {projectData.name}
            </h1>
          </Reveal>
          <Reveal>
            <p className="text-sm text-light">{projectData.description}</p>
          </Reveal>
        </div>
        {/* Tools */}
        <Reveal>
          <div className="flex flex-row gap-4">
            {projectData.tools?.map((tool, index) => (
              <div
                key={index}
                className="bg-slate-700 px-2 rounded-full cursor-default"
              >
                {tool}
              </div>
            ))}
          </div>
        </Reveal>
      </Tilt>
    </div>

    // <div className="h-20 bg-slate-600"></div>
  );
};

export default ProjectCard;
