import {
  notesReviewAppScreenshot,
  wordleCloneScreenshot,
  chatAppScreenshot,
} from "../assets";

const sections = [
  { name: "Home", id: "home", path: "/" },
  { name: "About", id: "about", path: "/#about" },
  { name: "Projects", path: "/#projects", id: "projects" },
  { name: "Contact", path: "/#contact", id: "contact" },
];

const projects = [
  {
    name: "Notes Review App",
    description:
      "This is a notes review application that I built using React, Tailwind CSS, Gemini, and Firebase. It allows users to upload their notes, get them summarized into bite sized facts and then enter a typing console to repeatedly type out and memorize them.",
    github: "https://github.com/Bobcat999/notes-review-app",
    url: "https://bobcat999.github.io/notes-review-app/",
    id: "notes-review-app",
    tools: ["React", "Tailwind CSS", "Firebase", "Gemini"],
    image: notesReviewAppScreenshot,
    featured: true,
  },
  {
    name: "Facial Emotion Detection",
    description:
      "This is a facial emotion detection project that I built using Python, OpenCV, TensorFlow, and Kaggle. It detects emotions in real-time.",
    github: "https://github.com/Bobcat999/facial-emotion-detection",
    url: "https://facial-emotion-app.web.app/",
    id: "facial-emotion-detection",
    tools: ["Python", "OpenCV", "Tensorflow", "Kaggle"],
    featured: true,
  },
  {
    name: "Wordle Clone",
    description:
      "This is a clone of the popular game Wordle. I built this project using React to practice my skills.",
    github: "https://github.com/Bobcat999/wordle-app",
    url: "https://wordle-app-i.web.app/",
    id: "wordle-clone",
    tools: ["React", "Firebase"],
    image: wordleCloneScreenshot,
    featured: true,
  },
  {
    name: "Chat App",
    description:
      "This is a chat application that I built using React and Firebase. It was one of the first things I made using react. The design isn't very good but it functions well. It allows users to send messages in real-time in private chat rooms.",
    github: "https://github.com/Bobcat999/chat-react-app",
    url: "https://chat-react-app-feb57.web.app/",
    id: "chat-app",
    tools: ["React", "Firebase"],
    image: chatAppScreenshot,
    featured: true,
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
    github: "https://github.com/Bobcat999/SurvivalGame",
    url: "https://bobcat9.itch.io/survival-2d",
    tools: ["Unity", "C#"],
    id: "survival-game",
  },
  {
    name: "Non-euclidean Escape",
    description:
      "This is a non-euclidean escape game that I built using Unity. This game took me around a year to develop but I wasn't able to finish it due to a corruption of the files (it kindof fits with the theme ig). It features a non-euclidean world with portals making the levels very confusing where the player must escape. It was inspired by games like Portal and Antichamber. The game is still playable and has a descent amount of polish. All of the content is done except for the very final level.",
    url: "https://bobcat9.itch.io/noneuclidianescapedebug",
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
];

export { sections, projects, skills };
