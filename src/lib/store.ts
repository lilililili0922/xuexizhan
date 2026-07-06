import { promises as fs } from "fs";
import path from "path";
import {
  Course,
  CourseStatus,
  CourseWithStatus,
  DailyContent,
  HomePayload,
  SignInRecord,
  SignInRow,
  SignInStatus,
  StoreData,
  StudentComment,
  WeeklyLateRow
} from "@/types/domain";
import {
  buildArrivalTime,
  getMonday,
  getSundayEnd,
  getWeekNumber,
  getWeekdayFull,
  isSameChinaDay,
  parseDateParam,
  toDateKey
} from "./date";

const BASE_STORE_PATH = path.join(process.cwd(), "data", "store.json");
const IS_SERVERLESS_RUNTIME =
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.cwd().startsWith("/var/task");
const RUNTIME_STORE_PATH = IS_SERVERLESS_RUNTIME
  ? path.join("/tmp", "student-learning-store.json")
  : BASE_STORE_PATH;
const DEFAULT_DAILY_CONTENT: DailyContent = {
  date: "",
  readerName: "待安排",
  notice: "今天暂无特别注意事项。",
  pinnedMessage: "把今天这一步走稳，答案会在路上出现。",
  signInCutoff: "09:00",
  signInLocationName: "未来之光·光之塔签到点",
  signInLatitude: 30.363014228816304,
  signInLongitude: 120.04919058502497,
  signInRadiusMeters: 250
};
const SENSITIVE_WORDS = ["广告", "辱骂", "作弊"];

async function ensureRuntimeStore() {
  if (RUNTIME_STORE_PATH === BASE_STORE_PATH) return;
  try {
    await fs.access(RUNTIME_STORE_PATH);
  } catch {
    await fs.copyFile(BASE_STORE_PATH, RUNTIME_STORE_PATH);
  }
}

export async function readStore(): Promise<StoreData> {
  await ensureRuntimeStore();
  const raw = await fs.readFile(RUNTIME_STORE_PATH, "utf8");
  return JSON.parse(raw) as StoreData;
}

export async function writeStore(data: StoreData) {
  await ensureRuntimeStore();
  await fs.writeFile(RUNTIME_STORE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function getCourseStatus(course: Course, now = new Date()): CourseStatus {
  const start = new Date(course.startsAt);
  const end = new Date(course.endsAt);
  if (now >= start && now < end) return "current";
  if (now < start) return "future";
  return "past";
}

export function enrichCourse(course: Course, now = new Date()): CourseWithStatus {
  const status = getCourseStatus(course, now);
  if (status === "past" && course.replayUrl) {
    return {
      ...course,
      status,
      actionLabel: "看回放",
      actionUrl: course.replayUrl
    };
  }
  return {
    ...course,
    status,
    actionLabel:
      status === "current" ? "进入会议" : status === "future" ? "加入会议列表" : "已结束",
    actionUrl: course.meetingUrl
  };
}

function sortCoursesByTime(courses: Course[]) {
  return [...courses].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );
}

function sortCoursesForWeek(courses: CourseWithStatus[]) {
  const order: Record<CourseStatus, number> = { current: 0, future: 1, past: 2 };
  return [...courses].sort((left, right) => {
    if (left.status !== right.status) return order[left.status] - order[right.status];
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
}

export function getVisibleComments(data: StoreData) {
  return data.comments
    .filter((comment) => comment.status === "approved")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function getDailyContent(data: StoreData, dateKey: string): DailyContent {
  return (
    data.dailyContents.find((item) => item.date === dateKey) ?? {
      ...DEFAULT_DAILY_CONTENT,
      date: dateKey
    }
  );
}

function deriveSignInStatus(record: SignInRecord, cutoff: string) {
  if (record.status !== "on_time" && record.status !== "late") return record.status;
  if (!record.arrivedAt) return record.status;
  const arrivedAt = new Date(record.arrivedAt);
  const cutoffAt = new Date(`${record.date}T${cutoff}:00+08:00`);
  return arrivedAt > cutoffAt ? "late" : "on_time";
}

export function getSignInSummary(data: StoreData, dateKey: string, cutoff = "09:00") {
  const records = data.signInRecords.filter((record) => record.date === dateKey);
  const activeStudents = data.students.filter((student) => student.active);
  const rows: SignInRow[] = activeStudents.map((student) => {
    const record = records.find((item) => item.studentId === student.id);
    if (!record) {
      return {
        studentId: student.id,
        studentName: student.name,
        classGroup: student.classGroup,
        status: "not_signed",
        arrivedAt: null,
        note: ""
      };
    }
    const status = deriveSignInStatus(record, cutoff);
    return {
      studentId: student.id,
      studentName: student.name,
      classGroup: student.classGroup,
      status,
      arrivedAt: record.arrivedAt,
      note: record.note
    };
  });
  const lateStudents = rows.filter((row) => row.status === "late");
  return {
    date: dateKey,
    cutoff,
    total: rows.length,
    arrived: rows.filter((row) => row.status === "on_time" || row.status === "late").length,
    onTime: rows.filter((row) => row.status === "on_time").length,
    late: lateStudents.length,
    leave: rows.filter((row) => row.status === "leave").length,
    absent: rows.filter((row) => row.status === "absent").length,
    notSigned: rows.filter((row) => row.status === "not_signed").length,
    lateStudents,
    rows
  };
}

export function getWeeklyLateSummary(data: StoreData, targetDate: Date) {
  const monday = getMonday(targetDate);
  const sunday = getSundayEnd(targetDate);
  const lateMap = new Map<string, WeeklyLateRow>();

  data.signInRecords
    .filter((record) => {
      const arrived = new Date(record.arrivedAt);
      const daily = getDailyContent(data, record.date);
      return deriveSignInStatus(record, daily.signInCutoff) === "late" && arrived >= monday && arrived <= sunday;
    })
    .forEach((record) => {
      const student = data.students.find((item) => item.id === record.studentId);
      if (!student) return;
      const date = record.date;
      const existing = lateMap.get(student.id);
      if (!existing) {
        lateMap.set(student.id, {
          studentId: student.id,
          studentName: student.name,
          classGroup: student.classGroup,
          count: 1,
          dates: [date],
          latestArrivedAt: record.arrivedAt,
          latestNote: record.note
        });
        return;
      }
      existing.count += 1;
      if (!existing.dates.includes(date)) existing.dates.push(date);
      if (new Date(record.arrivedAt) > new Date(existing.latestArrivedAt)) {
        existing.latestArrivedAt = record.arrivedAt;
        existing.latestNote = record.note;
      }
    });

  const rows = [...lateMap.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return new Date(right.latestArrivedAt).getTime() - new Date(left.latestArrivedAt).getTime();
  });

  return {
    weekNumber: getWeekNumber(targetDate),
    totalLateRecords: rows.reduce((sum, row) => sum + row.count, 0),
    rows
  };
}

export async function getHomePayload(date?: string | null): Promise<HomePayload> {
  const data = await readStore();
  const now = parseDateParam(date);
  const dateKey = toDateKey(now);
  const dailyContent = getDailyContent(data, dateKey);
  const monday = getMonday(now);
  const sunday = getSundayEnd(now);
  const courses = sortCoursesByTime(data.courses.filter((course) => course.enabled));
  const weekCourses = sortCoursesForWeek(
    courses
      .filter((course) => {
        const start = new Date(course.startsAt);
        return start >= monday && start <= sunday;
      })
      .map((course) => enrichCourse(course, now))
  );
  const todayCourses = weekCourses.filter((course) => isSameChinaDay(new Date(course.startsAt), now));

  return {
    today: dateKey,
    weekday: getWeekdayFull(now),
    weekNumber: getWeekNumber(now),
    dailyContent,
    todayCourses,
    weekCourses,
    quickLinks: data.quickLinks
      .filter((link) => link.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder),
    comments: getVisibleComments(data),
    signIn: getSignInSummary(data, dateKey, dailyContent.signInCutoff),
    weeklyLate: getWeeklyLateSummary(data, now)
  };
}

export function shouldModerateComment(content: string) {
  return SENSITIVE_WORDS.some((word) => content.includes(word));
}

export function createAnonymousName(seed: string) {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return `同学 ${String((hash % 89) + 10).padStart(2, "0")}`;
}

export function upsertSignInRecord(
  data: StoreData,
  input: {
    date: string;
    studentId: string;
    status: SignInStatus;
    arrivedAt?: string;
    note?: string;
    source?: SignInRecord["source"];
  }
) {
  const existing = data.signInRecords.find(
    (record) => record.date === input.date && record.studentId === input.studentId
  );
  const arrivedAt =
    input.arrivedAt ||
    (input.status === "not_signed" || input.status === "absent" || input.status === "leave"
      ? ""
      : buildArrivalTime(input.date, input.status === "late" ? "09:45" : "09:10"));

  if (input.status === "not_signed") {
    data.signInRecords = data.signInRecords.filter(
      (record) => !(record.date === input.date && record.studentId === input.studentId)
    );
    return;
  }

  const nextRecord: SignInRecord = {
    id: existing?.id ?? `sign-${Date.now()}`,
    date: input.date,
    studentId: input.studentId,
    arrivedAt,
    status: input.status,
    note: input.note ?? existing?.note ?? "",
    source: input.source ?? "teacher_admin"
  };

  if (existing) {
    Object.assign(existing, nextRecord);
  } else {
    data.signInRecords.push(nextRecord);
  }
}

export function findActiveStudentByOpenIdHash(data: StoreData, openIdHash: string) {
  return data.students.find(
    (student) => student.active && student.wechatOpenIdHash === openIdHash
  );
}

export function isPlaceholderOpenIdHash(openIdHash: string) {
  return !openIdHash || openIdHash.startsWith("hash_sheet_") || openIdHash.startsWith("hash_mock_");
}

export function resolveStudentForWechat(
  data: StoreData,
  openIdHash: string,
  requestedStudentId?: string
) {
  if (!openIdHash) {
    return { error: "请先完成微信验证后再签到。", status: 401 as const };
  }

  const boundStudent = findActiveStudentByOpenIdHash(data, openIdHash);
  if (boundStudent && requestedStudentId && boundStudent.id !== requestedStudentId) {
    return {
      error: `当前微信已绑定「${boundStudent.name}」，不能选择其他同学。`,
      status: 409 as const
    };
  }
  if (boundStudent) return { student: boundStudent, boundNow: false };

  if (!requestedStudentId) {
    return {
      error: "首次签到需要先选择自己的姓名，系统会绑定当前微信身份。",
      status: 400 as const
    };
  }

  const student = data.students.find((item) => item.active && item.id === requestedStudentId);
  if (!student) {
    return { error: "未找到对应的学生档案，请重新选择姓名。", status: 404 as const };
  }
  if (student.wechatOpenIdHash === openIdHash) {
    return { student, boundNow: false };
  }
  if (!isPlaceholderOpenIdHash(student.wechatOpenIdHash)) {
    return {
      error: `「${student.name}」已经绑定过微信，请联系老师处理。`,
      status: 409 as const
    };
  }

  student.wechatOpenIdHash = openIdHash;
  return { student, boundNow: true };
}

export function createComment(input: {
  content: string;
  openIdHash: string;
  parentId?: string | null;
}): StudentComment {
  const status = shouldModerateComment(input.content) ? "pending" : "approved";
  return {
    id: `comment-${Date.now()}`,
    parentId: input.parentId ?? null,
    content: input.content,
    anonymousName: createAnonymousName(input.openIdHash),
    status,
    likeCount: 0,
    reportCount: 0,
    studentOpenIdHash: input.openIdHash,
    createdAt: new Date().toISOString()
  };
}
