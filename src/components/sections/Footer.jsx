import React from "react";

const Footer = () => {
  return (
    <div className="text-center text-md text-light mt-[10rem] mb-36">
      This site was made using React, TailwindCSS, and Framer Motion by Bruce
      Peters
      <br />
      Checkout the{" "}
      <a
        href="https://github.com/Bobcat999/portfolio"
        className="text-secondary hover:border-b hover:border-b-secondary hover:font-bold"
      >
        Github
      </a>
    </div>
  );
};

export default Footer;
