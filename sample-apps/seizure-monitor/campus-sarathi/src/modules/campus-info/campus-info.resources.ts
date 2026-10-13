import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

// Data inlined to avoid missing file errors in production builds
// (TypeScript build only compiles .ts files; JSON data files are not copied to dist/)
const announcements = [
  { "id": "a1", "title": "Library Hours Extended During Finals", "date": "2025-07-25", "priority": "high", "content": "The central library will be open 24/7 from July 28 through August 5 during finals week. Additional study pods have been reserved on floors 2 and 3." },
  { "id": "a2", "title": "Campus Network Maintenance — Thursday Night", "date": "2025-07-24", "priority": "high", "content": "Expect intermittent Wi-Fi outages across campus this Thursday between 11 PM and 3 AM. Plan offline study sessions accordingly." },
  { "id": "a3", "title": "Fall Career Fair Registration Now Open", "date": "2025-07-22", "priority": "normal", "content": "Register now for the Fall Career Fair on August 15. Over 80 companies are attending, including Google, Microsoft, and several top research labs. Early registration ends July 30." },
  { "id": "a4", "title": "New Vegan Options in South Dining Hall", "date": "2025-07-23", "priority": "low", "content": "Expanded plant-based menu options are now available daily at the South Dining Hall. A full allergen guide is posted at the entrance." },
  { "id": "a5", "title": "Security Alert: Phishing Emails Targeting Students", "date": "2025-07-25", "priority": "high", "content": "IT Security has flagged a wave of phishing emails claiming your tuition is overdue. Do not click any links — forward suspicious emails to security@university.edu." },
  { "id": "a6", "title": "Academic Integrity Workshop — Mandatory for Freshmen", "date": "2025-07-21", "priority": "normal", "content": "All first-year students must attend one Academic Integrity Workshop session before August 1. Sessions run daily at 10 AM and 2 PM in the Student Union." },
  { "id": "a7", "title": "Scholarships Deadline Extended to August 5", "date": "2025-07-20", "priority": "normal", "content": "The deadline for the Merit Excellence Scholarship and the STEM Research Grant has been extended to August 5. Submit applications via the Student Portal." },
  { "id": "a8", "title": "Parking Permit Renewals Open", "date": "2025-07-19", "priority": "low", "content": "Annual parking permits for the 2025–26 academic year are now available for renewal online. Permits not renewed by August 20 will be invalidated." }
];

const events = [
  { "id": "e1", "title": "Hackathon Kickoff & Team Formation", "date": "2025-08-01", "location": "Student Union Ballroom", "type": "academic", "description": "24-hour hackathon open to all students. Prizes up to $2,000. Form teams of 2–4 and register by July 31." },
  { "id": "e2", "title": "Guest Lecture: AI in Healthcare", "date": "2025-08-03", "location": "Science Building Room 101", "type": "academic", "description": "Dr. Priya Nair from Stanford Medicine discusses how large language models are reshaping clinical diagnostics." },
  { "id": "e3", "title": "Intramural Basketball Finals", "date": "2025-08-10", "location": "Main Gymnasium", "type": "sports", "description": "Cheer on your classmates in the semester-end intramural basketball championship. Free entry for all students." },
  { "id": "e4", "title": "Winter Concert — Student Orchestra", "date": "2025-12-05", "location": "Performing Arts Auditorium", "type": "social", "description": "Annual winter showcase featuring the University Orchestra and Jazz Ensemble. Tickets free with student ID." },
  { "id": "e5", "title": "Study Abroad Information Session", "date": "2025-08-15", "location": "Library Conference Room 2B", "type": "academic", "description": "Learn about semester and year-long programs in Europe, Asia, and Latin America. Financial aid is available." },
  { "id": "e6", "title": "Mental Health & Wellness Fair", "date": "2025-08-05", "location": "Campus Quad", "type": "wellness", "description": "Free counseling consultations, mindfulness workshops, and stress-relief activities ahead of finals. Open 10 AM–4 PM." },
  { "id": "e7", "title": "Professor Q&A: Research Opportunities for Undergrads", "date": "2025-07-30", "location": "Engineering Building 204", "type": "academic", "description": "Meet faculty members looking for undergraduate research assistants for the fall semester. Bring your CV." },
  { "id": "e8", "title": "Club Fair — Find Your Community", "date": "2025-08-20", "location": "Main Campus Plaza", "type": "social", "description": "Over 120 student clubs and organizations will be tabling. Great opportunity for new students to get involved." }
];

export class CampusInfoResources {
  @Resource({
    uri: 'campus://announcements',
    name: 'Campus Announcements',
    description: 'Latest university announcements',
    mimeType: 'application/json',
    examples: { response: { announcements } }
  })
  async getAnnouncements(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(announcements) }]
    };
  }

  @Resource({
    uri: 'campus://events',
    name: 'Campus Events',
    description: 'Upcoming university events',
    mimeType: 'application/json',
    examples: { response: { events } }
  })
  async getEvents(uri: string, ctx: ExecutionContext) {
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(events) }]
    };
  }
}

