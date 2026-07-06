"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Check, RotateCw, Save, ShieldCheck } from "lucide-react";
import { formatTime } from "@/lib/date";
import {
  CommentStatus,
  HomePayload,
  SignInRow,
  SignInStatus,
  StoreData,
  StudentComment
} from "@/types/domain";

type AdminConsoleProps = {
  initialStore: StoreData;
  initialHome: HomePayload;
  baseUrl: string;
};

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-admin-token": "teacher-demo"
};

function toDateTimeWithZone(date: string, time: string) {
  return `${date}T${time || "09:10"}:00+08:00`;
}

function fromDateTimeInput(value: string) {
  if (!value) return "";
  return value.length === 16 ? `${value}:00+08:00` : value;
}

function timeFromArrival(row: SignInRow) {
  if (!row.arrivedAt) return "";
  return formatTime(row.arrivedAt);
}

function signInStatusText(status: SignInRow["status"]) {
  const map = {
    on_time: "已到",
    late: "迟到",
    leave: "请假",
    absent: "缺勤",
    not_signed: "未到"
  };
  return map[status];
}

export function AdminConsole({ initialStore, initialHome, baseUrl }: AdminConsoleProps) {
  const [message, setMessage] = useState("");
  const [date, setDate] = useState(initialHome.today);
  const [signInRows, setSignInRows] = useState(initialHome.signIn.rows);
  const [comments, setComments] = useState(initialStore.comments);
  const [arrivalTimes, setArrivalTimes] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialHome.signIn.rows.map((row) => [row.studentId, timeFromArrival(row)]))
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialHome.signIn.rows.map((row) => [row.studentId, row.note]))
  );
  const [dailyForm, setDailyForm] = useState({
    readerName: initialHome.dailyContent.readerName,
    notice: initialHome.dailyContent.notice,
    pinnedMessage: initialHome.dailyContent.pinnedMessage,
    signInCutoff: initialHome.dailyContent.signInCutoff,
    signInLocationName: initialHome.dailyContent.signInLocationName,
    signInLatitude: String(initialHome.dailyContent.signInLatitude),
    signInLongitude: String(initialHome.dailyContent.signInLongitude),
    signInRadiusMeters: String(initialHome.dailyContent.signInRadiusMeters)
  });
  const [courseForm, setCourseForm] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    teacher: "",
    audience: "UX、视觉",
    room: "",
    meetingUrl: "",
    replayUrl: "",
    isNew: false
  });

  const lateNames = useMemo(
    () =>
      signInRows
        .filter((row) => row.status === "late")
        .map((row) => row.studentName)
        .join("、") || "暂无",
    [signInRows]
  );
  const studentNameByHash = useMemo(() => {
    const map = new Map<string, string>();
    initialStore.students.forEach(s => {
      if (s.wechatOpenIdHash) {
        map.set(s.wechatOpenIdHash, s.name);
      }
    });
    return map;
  }, [initialStore.students]);
  const signInUrl = useMemo(() => `${baseUrl}/sign-in?date=${date}`, [baseUrl, date]);
  const signInPageUrl = signInUrl;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(signInUrl)}`;

  async function refreshSignIn(nextDate = date) {
    const response = await fetch(`/api/sign-in?date=${nextDate}`);
    const result = (await response.json()) as { rows: SignInRow[] };
    setSignInRows(result.rows);
    setArrivalTimes(Object.fromEntries(result.rows.map((row) => [row.studentId, timeFromArrival(row)])));
    setNotes(Object.fromEntries(result.rows.map((row) => [row.studentId, row.note])));
  }

  async function markSignIn(row: SignInRow, status: SignInStatus) {
    const response = await fetch("/api/admin/sign-in", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        date,
        studentId: row.studentId,
        status,
        arrivedAt:
          status === "absent" || status === "leave" || status === "not_signed"
            ? ""
            : toDateTimeWithZone(date, arrivalTimes[row.studentId] || (status === "late" ? "09:45" : "09:10")),
        note: notes[row.studentId] || ""
      })
    });
    if (!response.ok) {
      setMessage("签到更新失败，请检查后台权限。");
      return;
    }
    setMessage(`${row.studentName} 的签到状态已更新。`);
    await refreshSignIn();
  }

  async function saveDaily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/daily", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        date,
        ...dailyForm,
        signInLatitude: Number(dailyForm.signInLatitude),
        signInLongitude: Number(dailyForm.signInLongitude),
        signInRadiusMeters: Number(dailyForm.signInRadiusMeters)
      })
    });
    setMessage(response.ok ? "今日阅读分享和注意事项已保存。" : "保存失败。");
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/courses", {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        ...courseForm,
        startsAt: fromDateTimeInput(courseForm.startsAt),
        endsAt: fromDateTimeInput(courseForm.endsAt)
      })
    });
    if (response.ok) {
      setMessage("课程已保存，学生端刷新后可见。");
      setCourseForm({
        title: "",
        startsAt: "",
        endsAt: "",
        teacher: "",
        audience: "UX、视觉",
        room: "",
        meetingUrl: "",
        replayUrl: "",
        isNew: false
      });
    } else {
      setMessage("课程保存失败，请检查必填项。");
    }
  }

  async function updateComment(comment: StudentComment, status: CommentStatus) {
    const response = await fetch(`/api/admin/comments/${comment.id}`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      setMessage("评论审核失败。");
      return;
    }
    setComments((current) =>
      current.map((item) => (item.id === comment.id ? { ...item, status } : item))
    );
    setMessage("评论状态已更新。");
  }

  return (
    <div className="admin-grid">
      <div className="main-column">
        <section className="panel admin-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow-text">MORNING CHECK-IN</p>
              <h2>早上签到表</h2>
            </div>
            <label className="admin-field">
              日期
              <input
                type="date"
                value={date}
                onChange={async (event) => {
                  setDate(event.target.value);
                  await refreshSignIn(event.target.value);
                }}
              />
            </label>
          </div>

          <div className="late-summary">
            <strong>迟到名单</strong>
            <p>{lateNames}</p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>学生</th>
                  <th>班型</th>
                  <th>到达时间</th>
                  <th>备注</th>
                  <th>当前状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {signInRows.map((row) => (
                  <tr key={row.studentId}>
                    <td>{row.studentName}</td>
                    <td>{row.classGroup}</td>
                    <td>
                      <input
                        aria-label={`${row.studentName} 到达时间`}
                        type="time"
                        value={arrivalTimes[row.studentId] || ""}
                        onChange={(event) =>
                          setArrivalTimes((current) => ({
                            ...current,
                            [row.studentId]: event.target.value
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${row.studentName} 备注`}
                        value={notes[row.studentId] || ""}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [row.studentId]: event.target.value }))
                        }
                        placeholder="原因/说明"
                      />
                    </td>
                    <td>
                      <span className={`sign-badge sign-${row.status}`}>{signInStatusText(row.status)}</span>
                    </td>
                    <td>
                      <div className="admin-status-row">
                        <button className="admin-button secondary" onClick={() => markSignIn(row, "on_time")}>
                          已到
                        </button>
                        <button className="admin-button secondary" onClick={() => markSignIn(row, "late")}>
                          迟到
                        </button>
                        <button className="admin-button secondary" onClick={() => markSignIn(row, "leave")}>
                          请假
                        </button>
                        <button className="admin-button secondary" onClick={() => markSignIn(row, "absent")}>
                          缺勤
                        </button>
                        <button className="admin-button secondary" onClick={() => markSignIn(row, "not_signed")}>
                          清除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel admin-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow-text">COMMENT REVIEW</p>
              <h2>学生心声审核</h2>
            </div>
            <ShieldCheck size={24} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>匿名名</th>
                  <th>内容</th>
                  <th>学生</th>
                  <th>状态</th>
                  <th>微信 hash</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((comment) => (
                  <tr key={comment.id}>
                    <td>{comment.anonymousName}</td>
                    <td>{comment.content}</td>
                    <td>{studentNameByHash.get(comment.studentOpenIdHash) || "-"}</td>
                    <td>{comment.status}</td>
                    <td>{comment.studentOpenIdHash}</td>
                    <td>
                      <div className="admin-status-row">
                        <button className="admin-button secondary" onClick={() => updateComment(comment, "approved")}>
                          通过
                        </button>
                        <button className="admin-button secondary" onClick={() => updateComment(comment, "hidden")}>
                          隐藏
                        </button>
                        <button className="admin-button secondary" onClick={() => updateComment(comment, "deleted")}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="side-column">
        <section className="panel admin-section qr-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow-text">SIGN-IN QR</p>
              <h2>今日签到二维码</h2>
            </div>
          </div>
          <div className="qr-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR code is generated from the current sign-in URL. */}
            <img alt={`${date} 签到二维码`} src={qrCodeUrl} />
            <small>扫码后确认分组和姓名，允许定位即可签到。</small>
            <p>{signInUrl}</p>
            <a className="admin-button secondary" href={signInPageUrl} target="_blank" rel="noreferrer">
              预览学生端
            </a>
            <button
              className="admin-button secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(signInUrl);
                setMessage("签到链接已复制。");
              }}
              type="button"
            >
              复制签到链接
            </button>
          </div>
        </section>

        <section className="panel admin-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow-text">DAILY CONTENT</p>
              <h2>今日内容维护</h2>
            </div>
            <Save size={22} />
          </div>
          <form className="admin-form" onSubmit={saveDaily}>
            <label>
              阅读分享人
              <input
                value={dailyForm.readerName}
                onChange={(event) => setDailyForm({ ...dailyForm, readerName: event.target.value })}
              />
            </label>
            <label>
              签到迟到线
              <input
                type="time"
                value={dailyForm.signInCutoff}
                onChange={(event) => setDailyForm({ ...dailyForm, signInCutoff: event.target.value })}
              />
            </label>
            <label>
              签到地点
              <input
                value={dailyForm.signInLocationName}
                onChange={(event) => setDailyForm({ ...dailyForm, signInLocationName: event.target.value })}
              />
            </label>
            <label>
              有效半径/米
              <input
                type="number"
                min="20"
                value={dailyForm.signInRadiusMeters}
                onChange={(event) => setDailyForm({ ...dailyForm, signInRadiusMeters: event.target.value })}
              />
            </label>
            <label>
              纬度
              <input
                type="number"
                step="0.000001"
                value={dailyForm.signInLatitude}
                onChange={(event) => setDailyForm({ ...dailyForm, signInLatitude: event.target.value })}
              />
            </label>
            <label>
              经度
              <input
                type="number"
                step="0.000001"
                value={dailyForm.signInLongitude}
                onChange={(event) => setDailyForm({ ...dailyForm, signInLongitude: event.target.value })}
              />
            </label>
            <label className="admin-wide">
              首页标语
              <input
                value={dailyForm.pinnedMessage}
                onChange={(event) => setDailyForm({ ...dailyForm, pinnedMessage: event.target.value })}
              />
            </label>
            <label className="admin-wide">
              每日注意事项
              <textarea
                value={dailyForm.notice}
                onChange={(event) => setDailyForm({ ...dailyForm, notice: event.target.value })}
              />
            </label>
            <button className="admin-button admin-wide" type="submit">
              <Save size={16} />
              保存今日内容
            </button>
          </form>
        </section>

        <section className="panel admin-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow-text">COURSE EDITOR</p>
              <h2>新增课程</h2>
            </div>
            <CalendarPlus size={22} />
          </div>
          <form className="admin-form" onSubmit={saveCourse}>
            <label className="admin-wide">
              课程标题
              <input
                required
                value={courseForm.title}
                onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
              />
            </label>
            <label>
              开始时间
              <input
                required
                type="datetime-local"
                value={courseForm.startsAt}
                onChange={(event) => setCourseForm({ ...courseForm, startsAt: event.target.value })}
              />
            </label>
            <label>
              结束时间
              <input
                required
                type="datetime-local"
                value={courseForm.endsAt}
                onChange={(event) => setCourseForm({ ...courseForm, endsAt: event.target.value })}
              />
            </label>
            <label>
              老师
              <input
                value={courseForm.teacher}
                onChange={(event) => setCourseForm({ ...courseForm, teacher: event.target.value })}
              />
            </label>
            <label>
              班型
              <input
                value={courseForm.audience}
                onChange={(event) => setCourseForm({ ...courseForm, audience: event.target.value })}
              />
            </label>
            <label>
              会议号
              <input
                value={courseForm.room}
                onChange={(event) => setCourseForm({ ...courseForm, room: event.target.value })}
              />
            </label>
            <label>
              新增标记
              <select
                value={courseForm.isNew ? "true" : "false"}
                onChange={(event) => setCourseForm({ ...courseForm, isNew: event.target.value === "true" })}
              >
                <option value="false">普通课程</option>
                <option value="true">新增课程</option>
              </select>
            </label>
            <label className="admin-wide">
              腾讯会议链接
              <input
                required
                value={courseForm.meetingUrl}
                onChange={(event) => setCourseForm({ ...courseForm, meetingUrl: event.target.value })}
              />
            </label>
            <label className="admin-wide">
              回放链接
              <input
                value={courseForm.replayUrl}
                onChange={(event) => setCourseForm({ ...courseForm, replayUrl: event.target.value })}
              />
            </label>
            <button className="admin-button admin-wide" type="submit">
              <CalendarPlus size={16} />
              保存课程
            </button>
          </form>
        </section>

        {message ? (
          <section className="notice-band">
            <Check size={21} />
            <strong>{message}</strong>
          </section>
        ) : (
          <section className="notice-band">
            <RotateCw size={21} />
            <strong>后台操作会写入本地 JSON 数据；接数据库后复用同一组 API。</strong>
          </section>
        )}
      </aside>
    </div>
  );
}
