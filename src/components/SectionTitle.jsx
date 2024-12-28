import React from "react";
import Reveal from "../framer-effects/Reveal";

const SectionTitle = ({ title }) => {
  return (
    <div className="flex flex-row text-5xl my-8 font-extrabold">
      <Reveal width="">
        {/* Title */}
        <span className="text-primary">{title}</span>
        <span className="text-secondary">.</span>
      </Reveal>
      {/* Line */}
      <div className="grow border-b-4 border-slate-700 my-auto ml-4 rounded-full"></div>
    </div>
  );
};

export default SectionTitle;
