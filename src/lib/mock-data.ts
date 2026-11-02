// Demo data shaped exactly like the CUET_Portal_Backend Mongo documents.
// Used whenever the backend at VITE_API_URL can't be reached.
import type { Course, Cutoff, EventItem, Notification, Programme, University, Update, User } from "./types";

export const mockCourses: Course[] = [
  { _id: "c1", name: "MCA", slug: "mca", category: "Computer Applications", cuetPaperCode: "SCQP09", isActive: true },
  { _id: "c2", name: "M.Sc. Computer Science", slug: "m-sc-computer-science", category: "Science", cuetPaperCode: "SCQP09", isActive: true },
  { _id: "c3", name: "M.A. English", slug: "m-a-english", category: "Humanities", cuetPaperCode: "HUQP06", isActive: true },
  { _id: "c4", name: "M.Sc. Mathematics", slug: "m-sc-mathematics", category: "Science", cuetPaperCode: "SCQP19", isActive: true },
  { _id: "c5", name: "M.Sc. Biotechnology", slug: "m-sc-biotechnology", category: "Science", cuetPaperCode: "SCQP05", isActive: true },
  { _id: "c6", name: "MBA", slug: "mba", category: "Management", cuetPaperCode: "MBQP01", isActive: true },
  { _id: "c7", name: "M.A. Political Science", slug: "m-a-political-science", category: "Humanities", cuetPaperCode: "HUQP21", isActive: true },
  { _id: "c8", name: "M.Com", slug: "m-com", category: "Commerce", cuetPaperCode: "COQP01", isActive: true },
];

const u = (o: Partial<University> & Pick<University, "_id" | "name" | "state">): University => ({
  slug: o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  type: "CENTRAL",
  admissionStatus: "OPEN",
  verified: true,
  isArchived: false,
  lastVerifiedAt: "2026-10-27",
  ...o,
});

export const mockUniversities: University[] = [
  u({ _id: "u1", name: "Pondicherry University", shortName: "PU", state: "Puducherry", city: "Puducherry", websiteUrl: "https://www.pondiuni.edu.in/", admissionUrl: "https://www.pondiuni.edu.in/admissions/" }),
  u({ _id: "u2", name: "Jawaharlal Nehru University", shortName: "JNU", state: "Delhi", city: "New Delhi", admissionStatus: "MERIT_LIST_RELEASED", websiteUrl: "https://www.jnu.ac.in/", admissionUrl: "https://jnuee.jnu.ac.in/" }),
  u({ _id: "u3", name: "Banaras Hindu University", shortName: "BHU", state: "Uttar Pradesh", city: "Varanasi", websiteUrl: "https://www.bhu.ac.in/", admissionUrl: "https://bhuonline.in/" }),
  u({ _id: "u4", name: "Aligarh Muslim University", shortName: "AMU", state: "Uttar Pradesh", city: "Aligarh", websiteUrl: "https://www.amu.ac.in/", admissionUrl: "https://amucontrollerexams.com/" }),
  u({ _id: "u5", name: "University of Hyderabad", shortName: "UoH", state: "Telangana", city: "Hyderabad", admissionStatus: "NOT_STARTED", websiteUrl: "https://uohyd.ac.in/", admissionUrl: "https://acad.uohyd.ac.in/" }),
  u({ _id: "u6", name: "Tezpur University", shortName: "TU", state: "Assam", city: "Tezpur", websiteUrl: "https://www.tezu.ernet.in/", admissionUrl: "https://www.tezu.ernet.in/admission/" }),
  u({ _id: "u7", name: "University of Delhi", shortName: "DU", state: "Delhi", city: "Delhi", admissionStatus: "CLOSED", websiteUrl: "https://www.du.ac.in/", admissionUrl: "https://admission.uod.ac.in/" }),
  u({ _id: "u8", name: "Babasaheb Bhimrao Ambedkar University", shortName: "BBAU", state: "Uttar Pradesh", city: "Lucknow", websiteUrl: "https://www.bbau.ac.in/", admissionUrl: "https://www.bbau.ac.in/admissionspg.aspx" }),
  u({ _id: "u9", name: "Central University of Rajasthan", shortName: "CURAJ", state: "Rajasthan", city: "Ajmer", admissionStatus: "MERIT_LIST_RELEASED", websiteUrl: "https://www.curaj.ac.in/" }),
  u({ _id: "u10", name: "Visva-Bharati University", shortName: "VBU", state: "West Bengal", city: "Santiniketan", type: "CENTRAL", websiteUrl: "https://www.visvabharati.ac.in/" }),
];

const programmeSeeds: Array<[string, string, number, number, number]> = [
  // university, course, seats, fee, base GEN cutoff
  ["u1", "c1", 60, 28000, 182], ["u1", "c2", 40, 26000, 175], ["u1", "c3", 45, 12000, 150],
  ["u2", "c1", 50, 18000, 205], ["u2", "c2", 35, 18000, 198], ["u2", "c7", 60, 900, 210],
  ["u3", "c1", 55, 22000, 190], ["u3", "c2", 40, 20000, 184], ["u3", "c3", 70, 8000, 162], ["u3", "c4", 50, 9000, 170],
  ["u4", "c1", 45, 25000, 172], ["u4", "c6", 60, 60000, 168], ["u4", "c8", 80, 15000, 155],
  ["u5", "c2", 30, 15000, 215], ["u5", "c4", 40, 15000, 200], ["u5", "c5", 25, 18000, 196],
  ["u6", "c1", 40, 30000, 160], ["u6", "c5", 30, 28000, 150],
  ["u7", "c3", 120, 10000, 220], ["u7", "c8", 150, 12000, 212], ["u7", "c4", 80, 11000, 205],
  ["u8", "c4", 40, 14000, 150], ["u8", "c5", 30, 20000, 150],
  ["u9", "c1", 35, 24000, 165], ["u9", "c6", 40, 45000, 158],
  ["u10", "c3", 50, 6000, 140], ["u10", "c7", 45, 6000, 145],
];

export const mockProgrammes: Programme[] = programmeSeeds.map(([uid, cid, seats, fee], i) => {
  const course = mockCourses.find((c) => c._id === cid)!;
  return {
    _id: `p${i + 1}`,
    university: uid,
    course: cid,
    programmeName: course.name,
    durationYears: course.slug === "mca" || course.slug === "mba" ? 2 : 2,
    totalSeats: seats,
    seatsAvailable: Math.round(seats * 0.4),
    annualFee: fee,
    eligibility: `Bachelor's degree in a relevant discipline with at least 50% marks (45% for SC/ST/PwD). Valid CUET PG ${new Date().getFullYear()} score in ${course.cuetPaperCode}.`,
    sourceUrl: mockUniversities.find((x) => x._id === uid)?.admissionUrl,
    verified: true,
    isArchived: false,
    lastVerifiedAt: "2026-10-27",
  };
});

const catOffset: Record<string, number> = { GEN: 0, EWS: -8, OBC: -14, SC: -38, ST: -48, PWD: -55 };

export const mockCutoffs: Cutoff[] = programmeSeeds.flatMap(([, , , , base], i) =>
  [2025, 2024].flatMap((year) =>
    [1, 2].flatMap((round) =>
      Object.entries(catOffset).map(([category, off]) => ({
        _id: `co-${i + 1}-${year}-${round}-${category}`,
        programme: `p${i + 1}`,
        year,
        round,
        category,
        closingScore: Math.max(40, base + off - (2025 - year) * 4 - (round - 1) * 6),
        verified: true,
      })),
    ),
  ),
);

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString();

export const mockEvents: EventItem[] = [
  { _id: "e1", university: "u1", type: "APPLICATION_CLOSE", title: "PG application window closes", startsAt: day(8), verified: true, sourceUrl: mockUniversities[0].admissionUrl },
  { _id: "e2", university: "u6", type: "COUNSELLING_ROUND", title: "Counselling round 1", startsAt: day(12), endsAt: day(14), verified: true },
  { _id: "e3", university: "u3", type: "MERIT_LIST", title: "First merit list for MCA & M.Sc.", startsAt: day(5), verified: true },
  { _id: "e4", university: "u2", type: "DOCUMENT_VERIFICATION", title: "Document verification (online)", startsAt: day(3), endsAt: day(6), verified: true },
  { _id: "e5", university: "u4", type: "APPLICATION_OPEN", title: "Admission portal opens", startsAt: day(-4), verified: true },
  { _id: "e6", university: "u5", type: "APPLICATION_OPEN", title: "Application window opens", startsAt: day(20), verified: true },
  { _id: "e7", university: "u9", type: "ADMISSION_LAST_DATE", title: "Last date to confirm admission", startsAt: day(17), verified: true },
  { _id: "e8", university: "u1", type: "OTHER", title: "Webinar: Choosing your PG programme", description: "Live Q&A with faculty.", startsAt: day(2), verified: true },
];

const hrs = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

export const mockUpdates: Update[] = [
  { _id: "up1", university: "u2", course: "c1", type: "MERIT_LIST", title: "Provisional merit list released for MCA", summary: "JNU has released a provisional merit list for MCA.", publishedAt: hrs(2), origin: "MANUAL", notificationsQueued: true },
  { _id: "up2", university: "u1", type: "DATE_CHANGE", title: "Application deadline extended", summary: "Pondicherry University closes applications in 8 days.", publishedAt: hrs(6), origin: "MANUAL", notificationsQueued: true },
  { _id: "up3", university: "u6", type: "NOTICE", title: "Admission status updated", summary: "Tezpur University admission status is now Open.", publishedAt: hrs(26), origin: "SCRAPER", notificationsQueued: true },
  { _id: "up4", university: "u9", type: "PROVISIONAL_LIST", title: "Provisional list – MBA", summary: "Round 1 provisional list published on the portal.", publishedAt: hrs(50), origin: "MANUAL", notificationsQueued: false },
  { _id: "up5", university: "u3", type: "NOTICE", title: "Fee payment instructions", summary: "Selected candidates must pay fees within 3 days of allotment.", publishedAt: hrs(80), origin: "MANUAL", notificationsQueued: true },
];

export const mockNotifications: Notification[] = [
  { _id: "n1", university: "u2", update: "up1", title: "Merit list released", message: "JNU has released a provisional merit list for MCA.", createdAt: hrs(2) },
  { _id: "n2", university: "u1", update: "up2", title: "Application deadline approaching", message: "Pondicherry University closes applications in 8 days.", createdAt: hrs(6) },
  { _id: "n3", university: "u6", update: "up3", title: "Admission status updated", message: "Tezpur University admission status is now Open.", createdAt: hrs(26), readAt: hrs(20) },
  { _id: "n4", university: "u3", update: "up5", title: "Fee payment instructions", message: "BHU: selected candidates must pay fees within 3 days.", createdAt: hrs(80), readAt: hrs(70) },
];

export const mockUser: User = {
  id: "demo-student",
  name: "Aarav Sharma",
  email: "student@demo.in",
  role: "student",
  category: "OBC",
  preferredStates: ["Uttar Pradesh", "Delhi"],
  interestedCourses: [mockCourses[0], mockCourses[1]],
  cuetYear: 2026,
  cuetScores: [
    { course: mockCourses[0], score: 188, isExpected: false },
    { course: mockCourses[1], score: 176, isExpected: true },
  ],
  emailNotifications: true,
  emailVerified: true,
  createdAt: "2026-06-01",
};

export const mockFollowing: string[] = ["u1", "u2", "u6"];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Haryana", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Tamil Nadu",
  "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
