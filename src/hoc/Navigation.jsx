import React from "react";
import { sections } from "../constants";
import { motion } from "framer-motion";
import { Link } from "react-scroll";

const Navigation = () => {
  return (
    <div className="sticky top-0 z-40 flex flex-row h-16 w-full justify-between align-middle backdrop-blur-md pr-20">
      <a
        href="/portfolio"
        className="text-3xl justify-self-start my-auto px-10"
      >
        <span className="text-primary">BP</span>
        <span className="text-secondary">Dev</span>
      </a>
      <div className="flex flex-row space-x-20">
        {sections.map(
          (page, index) =>
            page.path !== "/" && (
              <motion.div
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
                key={index}
                className="text-xl text-primary my-auto"
              >
                <Link to={page.id} smooth={true} duration={800} offset={-50}>
                  ./{page.name}
                </Link>
              </motion.div>
            )
        )}
      </div>
    </div>
  );
};

export default Navigation;
