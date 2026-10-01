import React from 'react';
import { LogoLoop } from './LogoLoop';

const TechLogoLoop = () => {
  const technologies = [
    { node: <span className="text-light font-medium">React</span>, title: 'React' },
    { node: <span className="text-light font-medium">JavaScript</span>, title: 'JavaScript' },
    { node: <span className="text-light font-medium">Python</span>, title: 'Python' },
    { node: <span className="text-light font-medium">TypeScript</span>, title: 'TypeScript' },
    { node: <span className="text-light font-medium">Java</span>, title: 'Java' },
    { node: <span className="text-light font-medium">C++</span>, title: 'C++' },
    { node: <span className="text-light font-medium">C#</span>, title: 'C#' },
    { node: <span className="text-light font-medium">Tailwind CSS</span>, title: 'Tailwind CSS' },
    { node: <span className="text-light font-medium">Node.js</span>, title: 'Node.js' },
    { node: <span className="text-light font-medium">Git</span>, title: 'Git' },
    { node: <span className="text-light font-medium">Docker</span>, title: 'Docker' },
    { node: <span className="text-light font-medium">AWS</span>, title: 'AWS' },
    { node: <span className="text-light font-medium">MySQL</span>, title: 'MySQL' },
    { node: <span className="text-light font-medium">Firebase</span>, title: 'Firebase' },
    { node: <span className="text-light font-medium">TensorFlow</span>, title: 'TensorFlow' },
    { node: <span className="text-light font-medium">OpenCV</span>, title: 'OpenCV' },
    { node: <span className="text-light font-medium">Unity</span>, title: 'Unity' },
    { node: <span className="text-light font-medium">Nginx</span>, title: 'Nginx' },
    { node: <span className="text-light font-medium">Linux</span>, title: 'Linux' },
    { node: <span className="text-light font-medium">VS Code</span>, title: 'VS Code' },
  ];

  return (
    <div className="w-full py-8">
      <LogoLoop
        logos={technologies}
        speed={50}
        direction="left"
        logoHeight={32}
        gap={48}
        pauseOnHover={true}
        scaleOnHover={true}
        fadeOut={true}
        fadeOutColor="rgb(15, 23, 42)"
        ariaLabel="Technologies I use"
        className="tech-logo-loop"
      />
    </div>
  );
};

export default TechLogoLoop;
