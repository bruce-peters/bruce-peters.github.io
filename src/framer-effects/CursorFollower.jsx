import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import React, { useEffect, useState } from "react";

const CursorFollower = () => {
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);

  useEffect(() => {
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      return;
    }
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  function handleMouseMove({ clientX, clientY }) {
    mouseX.set(clientX);
    mouseY.set(clientY);
  }

  return (
    <motion.div
      className="fixed -inset-px z-50 pointer-events-none"
      style={{
        background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(14, 165, 233, 0.05),
              transparent 60%
            )
          `,
      }}
    />
  );
};

export default CursorFollower;
