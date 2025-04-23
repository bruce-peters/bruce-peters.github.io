import React from "react";
import Reveal from "../framer-effects/Reveal";
import ExternalLink from "./ExternalLink";

const FeaturedProjectCard = ({ projectData, reverse = false }) => {
  const placeholderImage =
    "https://blog.lipsumhub.com/wp-content/uploads/2024/09/what-does-lorem-ipsum-dolor-sit-amet-mean-and-why-is-it-used-as-text-in-web-development-lipsumhub.jpg";
  return (
    <div className="relative min-h-20 flex-row">
      <div
        className={
          "relative h-full w-3/4 rounded-lg " +
          (reverse ? "justify-self-end" : "justify-self-start")
        }
      >
        {projectData.image ? (
          <>
            <img
              src={projectData.image}
              className="inset-0 object-cover w-full h-full rounded-lg"
              loading="lazy"
            ></img>
            <div className="absolute inset-0 bg-blue-950 opacity-70 hover:opacity-0 transition-all duration-500"></div>
          </>
        ) : (
          <>
            <img
              src={placeholderImage}
              className="inset-0 object-cover w-full h-full rounded-lg opacity-0"
              loading="lazy"
            ></img>
          </>
        )}
      </div>
      {/* Other Stuff */}
      <div
        className={
          "absolute " +
          (reverse
            ? "left-0 items-start text-left"
            : "right-0 items-end text-right") +
          " top-0 h-full flex flex-col justify-center"
        }
      >
        <Reveal>
          <div className="text-md text-secondary">Featured Project</div>
        </Reveal>
        <Reveal>
          <div className="text-2xl text-primary font-bold">
            {projectData.name}
          </div>
        </Reveal>
        <Reveal>
          <div
            className={
              "text-sm text-light bg-slate-600 w-96 rounded-lg p-4 drop-shadow-lg my-4 " +
              (reverse ? "text-left" : "text-right")
            }
          >
            {projectData.description}
          </div>
        </Reveal>
        {/* Tools */}
        <Reveal>
          <div className="flex flex-row gap-4">
            {projectData.tools?.map((tool, index) => (
              <div
                key={index}
                className="bg-slate-700 px-2 rounded-full cursor-default hover:scale-110 transform transition-transform duration-200"
              >
                {tool}
              </div>
            ))}
          </div>
        </Reveal>
        {/* Buttons */}
        <div className="flex flex-row gap-4 mt-4">
          <Reveal>
            <ExternalLink link={projectData.github} type={"github"} />
          </Reveal>

          {projectData.url && (
            <Reveal>
              <ExternalLink link={projectData.url} type={"external"} />
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturedProjectCard;
