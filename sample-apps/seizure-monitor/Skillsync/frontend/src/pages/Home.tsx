import { Link } from "react-router-dom";
import { Users, Search, BrainCircuit } from "lucide-react";

export default function Home() {
  return (
    <div className="home">

      <section className="hero">

        <h1>SkillSync AI</h1>

        <p>
          Connect with students based on skills,
          interests and learning goals.
        </p>

        <Link to="/register" className="hero-btn">
          Get Started
        </Link>

      </section>

      <section className="features">

        <div className="feature">

          <Users size={50} />

          <h3>Register</h3>

          <p>Create your student profile.</p>

        </div>

        <div className="feature">

          <Search size={50} />

          <h3>Search Students</h3>

          <p>Find peers with similar interests.</p>

        </div>

        <div className="feature">

          <BrainCircuit size={50} />

          <h3>AI Matching</h3>

          <p>Find the best peer automatically.</p>

        </div>

      </section>

    </div>
  );
}