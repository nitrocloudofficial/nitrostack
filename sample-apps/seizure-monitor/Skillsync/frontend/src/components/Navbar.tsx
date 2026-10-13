import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="navbar">
      <h2>SkillSync AI</h2>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/register">Register</Link>
        <Link to="/search">Search</Link>
        <Link to="/matches">Matches</Link>
        <Link to="/about">About</Link>
      </div>
    </nav>
  );
}