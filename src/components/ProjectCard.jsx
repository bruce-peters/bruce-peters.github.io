import React from "react";
import { Tilt } from "react-tilt";

const ProjectCard = ({ projectData }) => {
  // Use a placeholder image if projectImage is not provided
  const projectImage =
    projectData.projectImage ||
    `https://picsum.photos/200?random=${projectData.id}`;

  return (
    <Tilt
      options={{ max: 25 }}
      className="bg-primary text-white w-fit p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="flex flex-col items-center">
        {/* Add an image or icon */}
        <img
          src={projectImage}
          alt={projectData.name}
          className="size-20 mb-4"
        />
        <h1 className="text-xl font-bold mb-2">{projectData.name}</h1>
        <p className="text-center text-md">{projectData.description}</p>
      </div>
    </Tilt>
  );
};

export default ProjectCard;
