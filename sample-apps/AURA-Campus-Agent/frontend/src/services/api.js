const BASE_URL = 'http://localhost:8000';

export async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Conversational Agent API
  queryAgent: (query, studentId) => 
    fetchJson('/agent/query', {
      method: 'POST',
      body: JSON.stringify({ query, student_id: studentId }),
    }),

  // Attendance
  getAttendance: (studentId) => fetchJson(`/api/attendance/${studentId}`),
  flagAttendance: (studentId, courseCode) =>
    fetchJson(`/api/attendance/${studentId}/flag?course_code=${encodeURIComponent(courseCode)}`, {
      method: 'POST',
    }),

  // Timetable
  getTimetable: (studentId) => fetchJson(`/api/timetable/${studentId}`),
  getAllTimetable: () => fetchJson('/api/timetable/'),

  // Complaints
  getComplaints: (studentId) => fetchJson(`/api/complaints/${studentId}`),
  fileComplaint: (studentId, category, description) =>
    fetchJson(`/api/complaints/${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ category, description }),
    }),
  resolveComplaint: (complaintId) =>
    fetchJson(`/api/complaints/${complaintId}/resolve`, {
      method: 'POST',
    }),

  // Hostel
  getHostel: (studentId) => fetchJson(`/api/hostel/${studentId}`),
  fileOutpass: (studentId, fromDate, toDate, reason) =>
    fetchJson(`/api/hostel/${studentId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ from_date: fromDate, to_date: toDate, reason }),
    }),

  // Library
  getLibrary: (studentId) => fetchJson(`/api/library/${studentId}`),
  issueBook: (studentId, bookId, bookTitle, dueDate) =>
    fetchJson(`/api/library/${studentId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId, book_title: bookTitle, due_date: dueDate }),
    }),
  returnBook: (studentId, bookId) =>
    fetchJson(`/api/library/${studentId}/return/${bookId}`, {
      method: 'POST',
    }),

  // Finance
  getFinance: (studentId) => fetchJson(`/api/finance/${studentId}`),
  payFees: (studentId, feeType, amount) =>
    fetchJson(`/api/finance/${studentId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ fee_type: feeType, amount }),
    }),

  // Placement
  getPlacement: (studentId) => fetchJson(`/api/placement/${studentId}`),
  applyPlacement: (studentId, companyName) =>
    fetchJson(`/api/placement/${studentId}/apply?company_name=${encodeURIComponent(companyName)}`, {
      method: 'POST',
    }),

  // Events
  getEvents: () => fetchJson('/api/events/'),
  registerEvent: (studentId, eventId) =>
    fetchJson(`/api/events/${studentId}/register/${eventId}`, {
      method: 'POST',
    }),

  // Profile
  getProfile: (studentId) => fetchJson(`/api/profile/${studentId}`),
  updateProfile: (studentId, profileData) =>
    fetchJson(`/api/profile/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
};
