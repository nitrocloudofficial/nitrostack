import { useState } from "react";

export default function Register() {
  const [student, setStudent] = useState({
    fullName: "",
    email: "",
    department: "",
    semester: "",
    skillsKnown: "",
    skillsToLearn: "",
    availability: "",
    bio: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setStudent({
      ...student,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log(student);

    alert("Registration Successful!");
  };

  return (
    <div className="page">

      <h1>Student Registration</h1>

      <form className="form" onSubmit={handleSubmit}>

        <input
          name="fullName"
          placeholder="Full Name"
          onChange={handleChange}
          required
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          required
        />

        <input
          name="department"
          placeholder="Department"
          onChange={handleChange}
        />

        <select
          name="semester"
          onChange={handleChange}
          defaultValue=""
        >
          <option value="" disabled>
            Select Semester
          </option>

          {[1,2,3,4,5,6,7,8].map((sem)=>(
            <option key={sem}>{sem}</option>
          ))}

        </select>

        <input
          name="skillsKnown"
          placeholder="Python, React, Java"
          onChange={handleChange}
        />

        <input
          name="skillsToLearn"
          placeholder="Machine Learning, Node.js"
          onChange={handleChange}
        />

        <input
          name="availability"
          placeholder="Weekdays Evening"
          onChange={handleChange}
        />

        <textarea
          rows={5}
          name="bio"
          placeholder="Tell us about yourself..."
          onChange={handleChange}
        />

        <button type="submit">
          Register
        </button>

      </form>

    </div>
  );
}