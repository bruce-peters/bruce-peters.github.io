import React from "react";
import { Tilt } from "react-tilt";

const ProjectCard = ({ projectData }) => {
  // Use a placeholder image if projectImage is not provided
  const projectImage =
    projectData.projectImage ||
    `https://picsum.photos/200?random=${projectData.id}`;

  return (
    <Tilt
      options={{ max: 10 }}
      className="bg-slate-700 bg-opacity-50 text-white w-fit p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex flex-row justify-end align-top w-full"></div>
      <div className="flex flex-col items-center">
        <h1 className="text-xl font-bold mb-2">{projectData.name}</h1>
        <p className="text-center text-md">{projectData.description}</p>
      </div>
    </Tilt>
    // <div className="h-20 bg-slate-600"></div>
  );
};

export default ProjectCard;
