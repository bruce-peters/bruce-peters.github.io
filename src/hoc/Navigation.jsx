import React from "react";
import { sections } from "../constants";
import { Link } from "react-router";
import { motion } from "framer-motion";

const Navigation = () => {
  return (
    <div className="sticky top-0 z-20 flex flex-row h-16 w-full justify-between align-middle backdrop-blur-md">
      <a href="/" className="text-3xl justify-self-start my-auto px-10">
        <span className="text-primary">BP</span>
        <span className="text-secondary">Dev</span>
      </a>
      <div className="flex flex-row space-x-20">
        {sections.map(
          (page, index) =>
            page.path !== "/" && (
              <motion.a
                initial={{
                  opacity: 0,
                  y: -20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: index * 0.1,
                }}
                href={page.path}
                key={index}
                className="text-xl text-primary my-auto"
              >
                ./{page.name}
              </motion.a>
            )
        )}
      </div>
    </div>
  );
};

export default Navigation;
