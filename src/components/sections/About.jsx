import React from "react";
import SectionTitle from "../SectionTitle";
import Reveal from "../../framer-effects/Reveal";
import { skills } from "../../constants";

const About = () => {
  return (
    <div className="flex flex-col w-3/4 mx-auto">
      {/* Lets just get into the details */}
      <SectionTitle title="About" />
      <div className="relative flex flex-row gap-4">
        <Reveal width="w-full">
          <p className="text-light">
            I'm a high school student with a passion for coding and learning new
            things. I'm currently learning web development and I'm also
            interested in machine learning and artificial intelligence. I'm also
            part of a robotics team and I'm learning about robotics and
            electronics. In the robotics club, I teach the new freshmen how to
            program in java and how to use certain libraries to program our
            robot.
          </p>
        </Reveal>
        {/* Tools */}
        <div className="w-[100%]">
          <Reveal>
            <h3 className="text-primary font-extrabold text-xl mb-4">
              Tools I use
            </h3>
          </Reveal>
          <Reveal>
            <div className="flex flex-row flex-wrap gap-3 text-sm">
              {skills.map((skill, index) => (
                <div
                  key={index}
                  className="bg-slate-700 px-2 rounded-full cursor-default hover:scale-110 transform transition-transform duration-200"
                >
                  {skill}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

export default About;
