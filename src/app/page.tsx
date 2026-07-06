import {
  BookOpen,
  ExternalLink,
  FolderOpen,
  Megaphone,
  MonitorPlay,
  Plus,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { ElementType } from "react";
import { StudentVoice } from "@/components/StudentVoice";
import { formatChinaDate, formatTime, getWeekdayShort } from "@/lib/date";
import { getHomePayload } from "@/lib/store";
import { CourseWithStatus, QuickLink } from "@/types/domain";

export const dynamic = "force-dynamic";

const quickIconMap: Record<string, ElementType> = {
  BookOpen,
  FolderOpen,
  MonitorPlay
};

type PageProps = {
  searchParams?: Promise<{ date?: string }>;
};

function statusText(status: CourseWithStatus["status"]) {
  if (status === "current") return "正在进行";
  if (status === "future") return "未开始";
  return "已结束";
}

function formatCourseDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric"
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return {
    day: `${getWeekdayShort(date)} ${month}月${day}日`,
    time: formatTime(date)
  };
}

function CourseAction({ course }: { course: CourseWithStatus }) {
  if (course.status === "past" && course.actionLabel === "已结束") {
    return (
      <span
        className={`course-action course-action-${course.status}`}
      >
        {course.actionLabel}
      </span>
    );
  }
  return (
    <a
      className={`course-action course-action-${course.status}`}
      href={course.actionUrl}
      rel="noreferrer"
      target="_blank"
    >
      {course.status === "future" ? (
        <>
          <Plus size={15} />
          {course.actionLabel}
        </>
      ) : (
        <>
          {course.actionLabel}
          <ExternalLink size={15} />
        </>
      )}
    </a>
  );
}

function QuickLinkItem({ link }: { link: QuickLink }) {
  const Icon = quickIconMap[link.icon] ?? ExternalLink;
  return (
    <a className="shortcut-link" href={link.url} rel="noreferrer" target="_blank">
      <span className="shortcut-icon">
        <Icon size={21} />
      </span>
      <span>
        <strong>{link.title}</strong>
        <small>{link.description}</small>
      </span>
      <ExternalLink size={16} />
    </a>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const payload = await getHomePayload(params.date);
  const primaryCourse = payload.todayCourses[0] ?? payload.weekCourses.find((item) => item.status !== "past");
  const secondaryCourses = payload.todayCourses.length > 1 ? payload.todayCourses.slice(1) : payload.weekCourses.slice(0, 2);

  return (
    <main className="site-shell">
        <header className="topbar">
          <Link className="brand-lockup" href="/">
            <Image
              alt="像素100&奇点同行"
              className="brand-logo-image"
              height={32}
              priority
              src="/brand-logo.svg"
              width={288}
            />
          </Link>
          <nav className="top-nav" aria-label="主导航">
            <a href="#today">今日</a>
            <a href="#weekly">本周</a>
            <a href="#morning-sign-in">签到</a>
            <a href="#student-voice">心声</a>
            <a href="/admin">老师后台</a>
          </nav>
        </header>

        <section className="hero-band">
          <section className="top-info-card notice-top">
            <Megaphone size={21} />
            <div>
              <p>每日注意事项</p>
              <strong>{payload.dailyContent.notice}</strong>
            </div>
          </section>
          <section className="top-info-card reader-top">
            <UserCheck size={22} />
            <div>
              <p>今日阅读分享</p>
              <strong>{payload.dailyContent.readerName}</strong>
            </div>
          </section>
          <div className="date-block">
            <strong>{payload.weekday}</strong>
            <span>
              {formatChinaDate(new Date(`${payload.today}T09:00:00+08:00`))} · 第 {payload.weekNumber} 周
            </span>
          </div>
        </section>

        <div className="dashboard-grid">
          <div className="main-column">
            <section className="panel today-panel" id="today">
              <div className="section-title-row">
              <div>
                <p className="eyebrow-text">TODAY</p>
                <h2>今日课程</h2>
              </div>
              <span className="soft-pill">{payload.todayCourses.length} 节课程</span>
            </div>

            {primaryCourse ? (
              <article className="primary-course">
                <div className="course-copy">
                  <span className={`status-dot status-${primaryCourse.status}`}>
                    {statusText(primaryCourse.status)}
                  </span>
                  <h3>{primaryCourse.title}</h3>
                  <p>
                    {primaryCourse.teacher} · {primaryCourse.audience}
                    <br />
                    腾讯会议：{primaryCourse.room}
                  </p>
                </div>
                <div className="course-meta-stack">
                  <strong>{formatTime(primaryCourse.startsAt)}</strong>
                  <CourseAction course={primaryCourse} />
                </div>
              </article>
            ) : (
              <div className="empty-state">近期暂无已排课程。</div>
            )}

            <div className="mini-course-grid">
              {secondaryCourses.map((course) => (
                <article className="mini-course" key={course.id}>
                  <span>{formatTime(course.startsAt)}</span>
                  <strong>
                    {course.title}
                    {course.isNew ? <em>新增</em> : null}
                  </strong>
                  <small>{course.teacher} · {course.room}</small>
                  <CourseAction course={course} />
                </article>
              ))}
            </div>
            </section>

            <section className="panel weekly-panel" id="weekly">
              <div className="section-title-row">
              <div>
                <p className="eyebrow-text">WEEKLY PLAN</p>
                <h2>本周课程</h2>
              </div>
              <span className="soft-pill">第 {payload.weekNumber} 周 · {payload.weekCourses.length} 节</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>日期时间</th>
                    <th>课程</th>
                    <th>主讲</th>
                    <th>班型</th>
                    <th>会议号</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.weekCourses.map((course) => {
                    const dateTime = formatCourseDateTime(course.startsAt);
                    return (
                      <tr key={course.id}>
                        <td className="course-date-cell">
                          <span>{dateTime.time}</span>
                          <strong>{dateTime.day}</strong>
                        </td>
                        <td>
                          {course.title}
                          {course.isNew ? <span className="new-label">新增</span> : null}
                        </td>
                        <td>{course.teacher}</td>
                        <td>{course.audience}</td>
                        <td>{course.room}</td>
                        <td>
                          <CourseAction course={course} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </section>

            <StudentVoice initialComments={payload.comments} />
          </div>

          <aside className="side-column">
            <section className="panel sign-panel" id="morning-sign-in">
            <div className="section-title-row">
              <div>
                <p className="eyebrow-text">MORNING CHECK-IN</p>
                <h2>早上签到表</h2>
              </div>
              <span className="soft-pill">迟到线 {payload.signIn.cutoff}</span>
            </div>

            <div className="metric-grid sign-overview-grid">
              <div>
                <strong>{payload.signIn.arrived}</strong>
                <span>已到</span>
              </div>
              <div>
                <strong>{payload.signIn.late}</strong>
                <span>迟到</span>
              </div>
              <div>
                <strong>{payload.signIn.leave}</strong>
                <span>请假</span>
              </div>
            </div>

            <div className="late-summary">
              <strong>今日迟到</strong>
              <p>
                {payload.signIn.lateStudents.length > 0
                  ? `${payload.signIn.lateStudents.map((student) => student.studentName).join("、")} 迟到。`
                  : "今天暂未记录迟到同学。"}
              </p>
            </div>

            <Link className="command-button sign-page-link" href={`/sign-in?date=${payload.today}`}>
              打开签到页
            </Link>
            </section>

            <section className="panel shortcut-panel">
            <div className="section-title-row">
              <h2>快捷入口</h2>
            </div>
            <div className="shortcut-list">
              {payload.quickLinks.map((link) => (
                <QuickLinkItem key={link.id} link={link} />
              ))}
            </div>
            </section>
          </aside>
        </div>
    </main>
  );
}
