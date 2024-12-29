import React from "react";
import SectionTitle from "../SectionTitle";
import Reveal from "../../framer-effects/Reveal";
import Medias from "../Medias";

const Contact = () => {
  return (
    <div id="contact" className="">
      <SectionTitle title="Contact" />
      <div className="flex flex-col items-center gap-4 mt-20 text-lg">
        <Reveal>
          <div className="text-primary text-3xl font-bold">Reach out</div>
        </Reveal>
        <Reveal>
          <div>You can reach me via the following methods</div>
        </Reveal>
        <Reveal>
          <div>
            Email:{" "}
            <span className="text-primary">brucebpeters12@gmail.com</span>
          </div>
        </Reveal>
        <Reveal>
          <Medias />
        </Reveal>
        <br />
        <Reveal>
          <button
            className="bg-slate-900 text-xl p-4 border-2 border-secondary rounded-lg hover:bg-secondary hover:text-slate-900 hover:scale-110 hover:drop-shadow-lg transition-all duration-200"
            onClick={() => (window.location = "mailto:bruce@example.com")}
          >
            Email Me
          </button>
        </Reveal>
      </div>
    </div>
  );
};

export default Contact;
