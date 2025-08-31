import React from "react";
import SectionTitle from "../SectionTitle";
import Reveal from "../../framer-effects/Reveal";
import { skills } from "../../constants";

const About = () => {
  return (
    <div className="flex flex-col" id="about">
      {/* Lets just get into the details */}
      <SectionTitle title="About" />
      <div className="relative flex flex-row gap-4">
        <Reveal width="w-full">
          <p className="text-light">
            I'm a high school student with a passion for coding and learning new
            things. I'm currently learning web development and I'm also
            interested in machine learning and artificial intelligence. I'm also
            part of a robotics team and where we just won the{" "}
            <strong className="text-secondary">FRC WORLD CHAMPIONSHIPS</strong>.
            In my robotics team, I program our robot and am currently working on
            a system that allows us to completely simulate our robot on a
            computer. This will effectively 5x our development speed by
            decreasing the amount of times each person has to interact with our
            physical robot.
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
