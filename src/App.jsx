import { Route, BrowserRouter as Router, Routes } from "react-router";
import Home from "./components/sections/Home";
import Layout from "./hoc/Layout";
import About from "./components/sections/About";
import Contact from "./components/sections/Contact";
import CursorFollower from "./framer-effects/CursorFollower";
import Projects from "./components/sections/Projects";
import PageSections from "./components/PageSections";

function App() {
  return (
    // <Router>
    //   <Layout>
    //     <Routes>
    //       <Route path="/" element={<Home />} />
    //       <Route path="/projects" element={<Projects />} />
    //       <Route path="/skills" element={<Skills />} />
    //       <Route path="/contact" element={<Contact />} />
    //     </Routes>
    //   </Layout>
    // </Router>
    <Router>
      <Layout>
        <CursorFollower />
        <Home id="home" />
        <PageSections />
      </Layout>
    </Router>
  );
}

export default App;
