import React from "react";
import { GithubIcon, LinkIcon } from "../assets";

// type: "github" | "external"

const ExternalLink = ({ link, type }) => {
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="">
      {type === "github" ? <GithubIcon /> : <LinkIcon />}
    </a>
  );
};

export default ExternalLink;
