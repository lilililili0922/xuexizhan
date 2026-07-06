export type CourseStatus = "current" | "future" | "past";

export type CommentStatus = "pending" | "approved" | "hidden" | "deleted";

export type SignInStatus = "on_time" | "late" | "leave" | "absent" | "not_signed";

export type Student = {
  id: string;
  name: string;
  classGroup: string;
  wechatOpenIdHash: string;
  active: boolean;
};

export type Course = {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  teacher: string;
  audience: string;
  room: string;
  meetingUrl: string;
  replayUrl: string;
  isNew: boolean;
  enabled: boolean;
};

export type CourseWithStatus = Course & {
  status: CourseStatus;
  actionLabel: string;
  actionUrl: string;
};

export type DailyContent = {
  date: string;
  readerName: string;
  notice: string;
  pinnedMessage: string;
  signInCutoff: string;
  signInLocationName: string;
  signInLatitude: number;
  signInLongitude: number;
  signInRadiusMeters: number;
};

export type QuickLink = {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  type: "homework" | "resource" | "material" | "replay" | "leave" | string;
  enabled: boolean;
  sortOrder: number;
};

export type StudentComment = {
  id: string;
  parentId?: string | null;
  content: string;
  anonymousName: string;
  status: CommentStatus;
  likeCount: number;
  reportCount: number;
  studentOpenIdHash: string;
  createdAt: string;
};

export type SignInRecord = {
  id: string;
  date: string;
  studentId: string;
  arrivedAt: string;
  status: Exclude<SignInStatus, "not_signed">;
  note: string;
  source: "teacher_admin" | "student_wechat" | string;
};

export type SignInRow = {
  studentId: string;
  studentName: string;
  classGroup: string;
  status: SignInStatus;
  arrivedAt: string | null;
  note: string;
};

export type SignInSummary = {
  date: string;
  cutoff: string;
  total: number;
  arrived: number;
  onTime: number;
  late: number;
  leave: number;
  absent: number;
  notSigned: number;
  lateStudents: SignInRow[];
  rows: SignInRow[];
};

export type WeeklyLateRow = {
  studentId: string;
  studentName: string;
  classGroup: string;
  count: number;
  dates: string[];
  latestArrivedAt: string;
  latestNote: string;
};

export type WeeklyLateSummary = {
  weekNumber: number;
  totalLateRecords: number;
  rows: WeeklyLateRow[];
};

export type StoreData = {
  students: Student[];
  courses: Course[];
  dailyContents: DailyContent[];
  quickLinks: QuickLink[];
  comments: StudentComment[];
  signInRecords: SignInRecord[];
};

export type HomePayload = {
  today: string;
  weekday: string;
  weekNumber: number;
  dailyContent: DailyContent;
  todayCourses: CourseWithStatus[];
  weekCourses: CourseWithStatus[];
  quickLinks: QuickLink[];
  comments: StudentComment[];
  signIn: SignInSummary;
  weeklyLate: WeeklyLateSummary;
};
