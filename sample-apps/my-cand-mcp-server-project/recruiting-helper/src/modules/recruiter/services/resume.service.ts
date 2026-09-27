import { RawCandidateData } from '../models/candidate.js';

export class ResumeService {
  /**
   * Processes structured resume data extracted by the LLM or automatically parsed from text. 
   */
  async processResumeData(data: any): Promise<RawCandidateData | null> {
    try {
      if (!data) return null;

      let name = data.name;
      let email = data.email;
      let phone = data.phone;
      let location = data.location;
      let bio = data.bio;
      let skills: string[] = data.skills || [];
      let links: string[] = data.links || [];

      // If raw resume text is provided, perform smart fallback extraction for missing fields or bad IDs
      if (data.resume_text && typeof data.resume_text === 'string') {
        const text = data.resume_text;
        const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);

        // Sanitize name if it was defaulted to an ID like "can1", "can2", "can3", "can4"
        if (!name || /^can\d+$/i.test(name.trim())) {
          for (const line of lines.slice(0, 5)) {
            if (!line.includes(':') && !/\d/.test(line) && line.length < 50 && !line.toLowerCase().includes('resume') && !line.toLowerCase().includes('curriculum')) {
              name = line;
              break;
            }
          }
        }

        // Email fallback
        if (!email) {
          const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (emails && emails.length > 0) email = emails[0];
        }

        // Phone fallback
        if (!phone) {
          const phones = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/g);
          if (phones && phones.length > 0) phone = phones[0];
        }

        // Links / LinkedIn fallback
        const linkMatches = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+|linkedin\.com\/in\/[^\s,]+|github\.com\/[^\s,]+)/gi) || [];
        const cleanedLinks = linkMatches.map((l: string) => l.replace(/[,);.]*$/, ''));
        links = Array.from(new Set([...links, ...cleanedLinks]));

        // Skills fallback dictionary
        if (skills.length === 0) {
          const skillDict = [
            'Python', 'Java', 'C++', 'C', 'C#', 'JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js',
            'HTML', 'CSS', 'Tailwind', 'SQL', 'MySQL', 'MongoDB', 'PostgreSQL', 'Express', 'Flask', 'Django',
            'Machine Learning', 'Deep Learning', 'NLP', 'Natural Language Processing', 'Data Science',
            'Git', 'GitHub', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'SAS', 'Matlab', 'Excel',
            'MERN', 'REST API', 'GraphQL', 'Next.js', 'Vite', 'Redux'
          ];
          for (const skill of skillDict) {
            const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(text)) {
              skills.push(skill);
            }
          }
        }

        // Bio fallback if default/dummy text
        if (!bio || bio.includes('Extracted from resume')) {
          const firstParagraph = lines.find((l: string) => l.length > 30 && !l.includes(':'));
          if (firstParagraph) bio = firstParagraph;
        }
      }

      return {
        source: 'uploaded_resume',
        tier: 'A',
        name,
        email,
        phone,
        location,
        skills,
        links,
        experience: data.experience || [],
        projects: data.projects || [],
        publications: data.publications || [],
        bio
      };
    } catch (error: any) {
      console.error(`Error processing structured resume data:`, error.message);
      return null;
    }
  }
}
