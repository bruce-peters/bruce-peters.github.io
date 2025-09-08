import {
  chatAppScreenshot,
  notesReviewAppScreenshot,
  portfolioAppScreenshot,
  scoutingAppScreenshot,
  wordleCloneScreenshot,
  wordWizAIScreenshot,
} from "../assets";

const sections = [
  { name: "Home", id: "home", path: "/" },
  { name: "About", id: "about", path: "/#about" },
  { name: "Projects", path: "/#projects", id: "projects" },
  { name: "Contact", path: "/#contact", id: "contact" },
];

const projects = [
  {
    name: "Word Wiz AI",
    description:
      "This is an AI EdTech Startup that I am working on. It allows kids to learn how to read faster and easier with ai and phonics. Using both advanced audio transcription techniques, and large language models it provides quality feedback and new tailored reading content for early readers, allowing them to quickly improve.",
    github: "https://github.com/wordwizai/word-wiz-ai",
    url: "https://wordwizai.com",
    id: "word-wiz-ai",
    tools: [
      "React",
      "AWS EC2",
      "AWS RDS",
      "MySQL",
      "Torch",
      "Python",
      "Tailwind CSS",
      "Nginx",
      "Google Cloud",
    ],
    image: wordWizAIScreenshot,
    featured: true,
  },
  {
    name: "Iron Panthers Scouting app",
    description:
      "This is an app that I made for my robotics team to help us scout other teams at competitions. It allows users to enter data about the teams and then view the data in a table.",
    github: "https://github.com/Iron-Panthers/2025-scout.git",
    image: scoutingAppScreenshot,
    url: "https://scout.ironpanthers.com",
    id: "scouting-app",
    tools: ["React", "Tailwind CSS", "Vite"],
    featured: true,
  },
  {
    name: "This website",
    description:
      "This portfolio website required a lot of graphics design tools as well as front end development frameworks",
    github: "https://github.com/bruce-peters/portfolio.git",
    url: "https://bruce-peters.github.io",
    id: "portfolio-website",
    image: portfolioAppScreenshot,
    tools: ["React", "Tailwind CSS", "Vite", "Figma"],
    featured: true,
  },
  {
    name: "Notes Review App",
    description:
      "This is a notes review application that I built using React, Tailwind CSS, Gemini, and Firebase. It allows users to upload their notes, get them summarized into bite sized facts and then enter a typing console to repeatedly type out and memorize them.",
    github: "https://github.com/bruce-peters/notes-review-app",
    url: "https://bruce-peters.github.io/notes-review-app/",
    id: "notes-review-app",
    tools: ["React", "Tailwind CSS", "Firebase", "Gemini"],
    image: notesReviewAppScreenshot,
    featured: true,
  },
  {
    name: "Facial Emotion Detection",
    description:
      "This is a facial emotion detection project that I built using Python, OpenCV, TensorFlow, and Kaggle. It detects emotions in real-time.",
    github: "https://github.com/bruce-peters/facial-emotion-detection",
    url: "https://facial-emotion-app.web.app/",
    id: "facial-emotion-detection",
    tools: ["Python", "OpenCV", "Tensorflow", "Kaggle"],
  },
  {
    name: "Wordle Clone",
    description:
      "This is a clone of the popular game Wordle. I built this project using React to practice my skills.",
    github: "https://github.com/bruce-peters/wordle-app",
    url: "https://wordle-app-i.web.app/",
    id: "wordle-clone",
    tools: ["React", "Firebase"],
    image: wordleCloneScreenshot,
  },
  {
    name: "Chat App",
    description:
      "This is a chat application that I built using React and Firebase. It was one of the first things I made using react. The design isn't very good but it functions well. It allows users to send messages in real-time in private chat rooms.",
    github: "https://github.com/bruce-peters/chat-react-app",
    url: "https://chat-react-app-feb57.web.app/",
    id: "chat-app",
    tools: ["React", "Firebase"],
    image: chatAppScreenshot,
  },
  {
    name: "Scuffed Platformer",
    description:
      "This is a scuffed platformer game that I built using Unity. It is one of the first things I have ever done in using Unity. It is a simple platformer game where the player can jump and move a couple of levels. It features many good game design practices and is a challenge to complete",
    url: "https://bobcat9.itch.io/scuffed-platformer",
    tools: ["Unity"],
    id: "scuffed-platformer",
  },
  {
    name: "Survival Game",
    description:
      "This is a survival game that I built using Unity. It's a simple survival game where the player must survive in a forest by collecting resources. It features a day-night cycle, crafting, and a procedurally generated world.",
    github: "https://github.com/bruce-peters/SurvivalGame",
    url: "https://bobcat9.itch.io/survival-2d",
    tools: ["Unity", "C#"],
    id: "survival-game",
  },
  {
    name: "Non-euclidean Escape",
    description:
      "This is a non-euclidean escape game that I built using Unity. This game took me around a year to develop but I wasn't able to finish it due to a corruption of the files (it kindof fits with the theme ig). It features a non-euclidean world with portals making the levels very confusing where the player must escape. It was inspired by games like Portal and Antichamber. The game is still playable and has a descent amount of polish. All of the content is done except for the very final level.",
    url: "https://bobcat9.itch.io/non-euclidean-escape",
    tools: ["Unity", "C#", "Blender"],
    id: "non-euclidean-escape",
  },
  {
    name: "Marshmallow Simulator",
    description:
      "This is a multiplayer shooter game that I built using Unity. It allows players to join a lobby and compete against eachother. It features a variety of weapons and a few simple maps.",
    url: "https://bobcat9.itch.io/marshmallow-simulator",
    tools: ["Unity"],
    id: "marshmallow-simulator",
  },
  {
    name: "Quizlet Solver Extension",
    description:
      "This is a browser extension that I built using JavaScript. It allows users to automatically solve Quizlet write and learn modes.",
    github: "github.com",
    tools: ["JavaScript"],
    id: "quizlet-solver-extension",
  },
];

const skills = [
  "Java",
  "JavaScript",
  "Python",
  "C#",
  "C++",
  "HTML",
  "CSS",
  "React",
  "Unity",
  "Firebase",
  "Tailwind CSS",
  "Figma",
  "WPILib",
  "OpenCV",
  "Tensorflow",
  "Git",
  "GitHub",
  "GitKraken",
  "Windows",
  "Linux",
  "Visual Studio Code",
  "Neovim",
  "Docker",
  "Nginx",
  "AWS EC2",
  "AWS RDS",
  "MySQL",
  "Desmos",
];

export { projects, sections, skills };
