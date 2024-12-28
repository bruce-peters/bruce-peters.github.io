import React, { useState, useEffect } from "react";
import { bgVector } from "../../assets";
import { motion } from "framer-motion";
import Reveal from "../../framer-effects/Reveal";

const Home = () => {
  const [text, setText] = useState("");
  const fullText =
    "student - web dev - robotics enthusiast - game dev - teacher";
  const typingSpeed = 100; // milliseconds
  const pauseDuration = 500; // milliseconds
  const onEndPause = 3000; // milliseconds

  useEffect(() => {
    let index = 0;
    let isPaused = false;
    let isDeleting = false;

    const interval = setInterval(() => {
      if (index === 0) isDeleting = false;
      if (!isPaused) {
        if (isDeleting) {
          setText(fullText.slice(0, index));
          index--;
        } else {
          setText(fullText.slice(0, index));
          if (fullText[index + 1] === "-") {
            isPaused = true;
            setTimeout(() => {
              isPaused = false;
            }, pauseDuration);
          }
          if (index === fullText.length) {
            setTimeout(() => {
              isDeleting = true;
            }, onEndPause);
          }
          index++;
        }
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col justify-center h-screen relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-dark to-transparent z-10"></div>
      <div className="flex flex-col gap-4 pl-16">
        <Reveal>
          <h1 className="text-6xl lg:text-7xl">
            Hi, I'm <span className="text-primary">Bruce</span>
          </h1>
        </Reveal>
        <Reveal>
          <p className="text-xl">
            {text}
            <span className="animate-pulse">|</span>
          </p>
        </Reveal>
      </div>
      <img
        src={bgVector}
        alt="Vector"
        className="absolute left-2/3 bottom-0 w-1/3 h-full"
      />
      <motion.div
        className="absolute size-[30vw] rounded-full opacity-30 blur-[10rem] bottom-1/3 right-0 bg-white"
        animate={{ y: [100, -100, 100] }}
        transition={{ duration: 8, repeat: Infinity }}
      ></motion.div>
    </div>
  );
};

export default Home;
