import React from "react";
import { GithubIcon, LinkIcon } from "../assets";

// type: "github" | "external"

const ExternalLink = ({ link, type, clickable = true }) => {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className=""
      onClick={
        clickable
          ? undefined
          : (e) => {
              e.preventDefault();
            }
      }
    >
      {type === "github" ? <GithubIcon /> : <LinkIcon />}
    </a>
  );
};

export default ExternalLink;
