const categories = require('./categories');

module.exports = {
  categories,
  users: [
    {
      id: 'u1',
      name: 'Dr. Admin Singh',
      email: 'admin@srit.edu',
      password: 'admin123',
      role: 'admin',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      id: 'u2',
      name: 'Priya Krishnan',
      email: 'student@srit.edu',
      password: 'student123',
      role: 'student',
      createdAt: '2026-04-01T00:00:00.000Z'
    }
  ],
  events: [
    { id: 'e1', title: 'Freshers Orientation Programme', date: '2026-07-01', end: '2026-07-05', cat: 'workshop', desc: 'Orientation and induction for newly admitted students.', rem: false },
    { id: 'e2', title: 'Classes Commence - Odd Semester', date: '2026-07-07', end: '', cat: 'exam', desc: 'Regular academic classes begin for all years.', rem: true },
    { id: 'e3', title: 'CIA - 1 (Odd Semester)', date: '2026-08-10', end: '2026-08-15', cat: 'exam', desc: 'Continuous Internal Assessment 1.', rem: true },
    { id: 'e4', title: 'TechSphere 2026 - National Symposium', date: '2026-09-05', end: '2026-09-06', cat: 'technical', desc: 'CSE national-level technical symposium.', rem: false },
    { id: 'e5', title: 'On-Campus Placement Drive - Batch 1', date: '2026-09-22', end: '2026-09-25', cat: 'placement', desc: 'IT and Core company campus recruitment.', rem: true },
    { id: 'e6', title: 'Annual Cultural Fest - Kaleidoscope', date: '2026-11-14', end: '2026-11-16', cat: 'cultural', desc: 'Annual cultural extravaganza.', rem: false },
    { id: 'e7', title: 'University Odd Semester Exams Begin', date: '2026-11-28', end: '2026-12-20', cat: 'univ', desc: 'Anna University end-semester examinations.', rem: true },
    { id: 'e8', title: 'Even Semester Commences', date: '2027-01-04', end: '', cat: 'exam', desc: 'Even semester classes begin.', rem: true },
    { id: 'e9', title: 'CIA - 2 (Even Semester)', date: '2027-03-08', end: '2027-03-13', cat: 'exam', desc: 'Continuous Internal Assessment 2.', rem: true },
    { id: 'e10', title: 'University Even Semester Exams Begin', date: '2027-04-28', end: '2027-05-24', cat: 'univ', desc: 'Anna University end-semester examinations.', rem: true }
  ]
};
