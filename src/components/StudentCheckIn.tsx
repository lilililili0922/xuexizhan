"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePenLine, MapPin, Navigation, UserCheck } from "lucide-react";

const PREFERRED_SIGN_IN_GROUPS = ["小包", "nika", "sandy", "喜糖"];
const ALL_STUDENTS_GROUP = "全部学生";
const STUDENT_GROUP_STORAGE_KEY = "demo_signin_group";
const STUDENT_STORAGE_KEY = "demo_signin_student_id";

type StudentCheckInProps = {
  date: string;
  locationName: string;
  radiusMeters: number;
  className?: string;
  students: {
    id: string;
    name: string;
    classGroup: string;
    status: string;
  }[];
};

type CheckInResult = {
  error?: string;
  status?: "on_time" | "late";
  distanceMeters?: number;
};

type LeaveResult = {
  error?: string;
  note?: string;
};

function getGroupOptions(students: StudentCheckInProps["students"]) {
  const groupSet = new Set(students.map((student, index) => getStudentSignInGroup(student, index, students.length)));
  const preferred = PREFERRED_SIGN_IN_GROUPS.filter((group) => groupSet.has(group));
  const rest = [...groupSet].filter((group) => !preferred.includes(group));
  const groups = [...preferred, ...rest];
  return groups.length > 1 ? groups : [ALL_STUDENTS_GROUP];
}

function getStudentSignInGroup(student: StudentCheckInProps["students"][number], index: number, total: number) {
  if (PREFERRED_SIGN_IN_GROUPS.includes(student.classGroup)) return student.classGroup;
  if (student.classGroup && student.classGroup !== "2607 暑期集训") return student.classGroup;
  const groupIndex = Math.min(
    PREFERRED_SIGN_IN_GROUPS.length - 1,
    Math.floor(index / Math.ceil(total / PREFERRED_SIGN_IN_GROUPS.length))
  );
  return PREFERRED_SIGN_IN_GROUPS[groupIndex];
}

export function StudentCheckIn({ date, locationName, radiusMeters, className = "", students }: StudentCheckInProps) {
  const router = useRouter();
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") return "";
    return "请先选择分组和姓名，再允许定位完成签到。";
  });
  const [reason, setReason] = useState("");
  const groupOptions = useMemo(() => getGroupOptions(students), [students]);
  const [selectedGroup, setSelectedGroup] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(STUDENT_GROUP_STORAGE_KEY) || "";
  });
  const [studentId, setStudentId] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(STUDENT_STORAGE_KEY) || "";
  });
  const [checkingIn, setCheckingIn] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // 自动识别微信已绑定的学生，跳过选分组和姓名
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(res => res.json())
      .then(session => {
        if (cancelled) return;
        if (session.authenticated && session.student) {
          const { id } = session.student;
          const match = students.find(s => s.id === id);
          if (!match) return;
          const idx = students.indexOf(match);
          const group = getStudentSignInGroup(match, idx, students.length);
          if (!groupOptions.includes(group)) return;
          try { window.localStorage.setItem(STUDENT_GROUP_STORAGE_KEY, group); } catch {}
          try { window.localStorage.setItem(STUDENT_STORAGE_KEY, id); } catch {}
          setSelectedGroup(group);
          setStudentId(id);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const currentGroup = groupOptions.includes(selectedGroup) ? selectedGroup : "";
  const studentsInGroup = useMemo(() => {
    if (!currentGroup || currentGroup === ALL_STUDENTS_GROUP) return students;
    return students.filter((student, index) => getStudentSignInGroup(student, index, students.length) === currentGroup);
  }, [currentGroup, students]);
  const selectedStudent = useMemo(
    () => studentsInGroup.find((student) => student.id === studentId),
    [studentId, studentsInGroup]
  );
  const selectValue = selectedStudent ? studentId : "";

  function handleGroupChange(nextGroup: string, e?: React.MouseEvent | React.PointerEvent) {
    if (e) { e.preventDefault(); }
    setSelectedGroup(nextGroup);
    setStudentId("");
    try { window.localStorage.setItem(STUDENT_GROUP_STORAGE_KEY, nextGroup); } catch {}
    try { window.localStorage.removeItem(STUDENT_STORAGE_KEY); } catch {}
    setMessage(nextGroup ? "请选择自己的姓名。" : "请先选择分组。");
  }

  function handleStudentChange(nextStudentId: string) {
    setStudentId(nextStudentId);
    if (nextStudentId) {
      try { window.localStorage.setItem(STUDENT_STORAGE_KEY, nextStudentId); } catch {}
    } else {
      try { window.localStorage.removeItem(STUDENT_STORAGE_KEY); } catch {}
    }
  }

  async function submitLocation(latitude: number, longitude: number) {
    if (!currentGroup) {
      setMessage("请先选择自己的分组。");
      return;
    }
    if (!selectedStudent) {
      setMessage("请先选择自己的姓名。");
      return;
    }

    const response = await fetch("/api/check-in", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ date, studentId: selectedStudent.id, latitude, longitude })
    });
    const result = (await response.json()) as CheckInResult;
    if (!response.ok) {
      setMessage(result.error || "签到失败，请联系老师。");
      return;
    }

    setMessage(
      result.status === "late"
        ? `签到成功，系统已记录为迟到。距离签到点约 ${result.distanceMeters} 米。`
        : `签到成功。距离签到点约 ${result.distanceMeters} 米。`
    );
    router.refresh();
  }

  async function handleCheckIn() {
    if (!currentGroup) {
      setMessage("请先选择自己的分组。");
      return;
    }
    if (!selectedStudent) {
      setMessage("请先选择自己的姓名。");
      return;
    }
    if (!navigator.geolocation) {
      setMessage("当前浏览器不支持定位签到，请联系老师处理。");
      return;
    }

    setCheckingIn(true);
    setMessage("正在获取当前位置...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await submitLocation(position.coords.latitude, position.coords.longitude);
        setCheckingIn(false);
      },
      () => {
        setCheckingIn(false);
        setMessage("定位授权失败，请允许浏览器访问当前位置后再签到。");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    );
  }

  async function handleLeave() {
    if (!currentGroup) {
      setMessage("请先选择自己的分组。");
      return;
    }
    if (!selectedStudent) {
      setMessage("请先选择自己的姓名。");
      return;
    }

    setSubmittingLeave(true);
    const response = await fetch("/api/leave", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ date, studentId: selectedStudent.id, reason })
    });
    const result = (await response.json()) as LeaveResult;
    setSubmittingLeave(false);
    if (!response.ok) {
      setMessage(result.error || "请假提交失败，请联系老师。");
      return;
    }

    setReason("");
    setMessage(`请假已提交：${result.note || "已提交请假"}`);
    router.refresh();
  }

  return (
    <div className={`student-checkin-tools ${className}`.trim()}>
      <div className="wechat-status wechat-status-verified">
        <UserCheck size={17} />
        <span>
          {selectedStudent ? `当前姓名：${selectedStudent.name}` : "扫码后确认分组和姓名，再定位签到"}
        </span>
      </div>

      <div className="checkin-group-field">
        <span>选择分组</span>
        <div className="checkin-group-list">
          {groupOptions.map((group) => (
            <button
              className={currentGroup === group ? "active" : ""}
              key={group}
              onPointerDown={(e) => handleGroupChange(group, e)}
              type="button"
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      <label className="checkin-student-field">
        <span>选择姓名</span>
        <select
          disabled={!currentGroup}
          value={selectValue}
          onChange={(event) => handleStudentChange(event.target.value)}
        >
          <option value="">{currentGroup ? "请选择自己的姓名" : "请先选择分组"}</option>
          {studentsInGroup.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
              {student.status === "on_time" || student.status === "late" ? "（已签到）" : ""}
              {student.status === "leave" ? "（已请假）" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="checkin-location">
        <MapPin size={18} />
        <div>
          <strong>指定地点签到</strong>
          <span>
            {locationName} · {radiusMeters} 米内有效
          </span>
        </div>
      </div>

      <div className="checkin-actions">
        <button className="command-button checkin-primary" disabled={checkingIn} onClick={handleCheckIn} type="button">
          <Navigation size={17} />
          {checkingIn ? "定位中" : "定位签到"}
        </button>
        <div className="leave-inline">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="请假原因"
          />
          <button className="command-button checkin-secondary" disabled={submittingLeave} onClick={handleLeave} type="button">
            <FilePenLine size={17} />
            {submittingLeave ? "提交中" : "请假"}
          </button>
        </div>
      </div>

      {message ? <p className="inline-message">{message}</p> : null}
    </div>
  );
}
