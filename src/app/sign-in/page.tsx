import { CalendarDays, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { StudentCheckIn } from "@/components/StudentCheckIn";
import { formatChinaDate } from "@/lib/date";
import { getHomePayload } from "@/lib/store";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams?: Promise<{ date?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = searchParams ? await searchParams : {};
  const payload = await getHomePayload(params.date);
  const displayDate = new Date(`${payload.today}T09:00:00+08:00`);

  return (
    <main className="signin-shell">
      <header className="signin-header">
        <Link className="brand-lockup" href={`/?date=${payload.today}`}>
          <Image
            alt="像素100&奇点同行"
            className="brand-logo-image"
            height={32}
            priority
            src="/brand-logo.svg"
            width={288}
          />
        </Link>
        <Link className="admin-button secondary" href={`/?date=${payload.today}`}>
          返回学习站
        </Link>
      </header>

      <section className="signin-card">
        <div className="signin-title">
          <p className="eyebrow-text">MORNING CHECK-IN</p>
          <h1>今日签到</h1>
          <div className="signin-meta-row">
            <span>
              <CalendarDays size={17} />
              {formatChinaDate(displayDate)} · {payload.weekday}
            </span>
            <span>
              <MapPin size={17} />
              {payload.dailyContent.signInLocationName}
            </span>
          </div>
        </div>

        <StudentCheckIn
          className="standalone-checkin"
          date={payload.today}
          locationName={payload.dailyContent.signInLocationName}
          radiusMeters={payload.dailyContent.signInRadiusMeters}
          students={payload.signIn.rows.map((row) => ({
            id: row.studentId,
            name: row.studentName,
            classGroup: row.classGroup,
            status: row.status
          }))}
        />
      </section>
    </main>
  );
}
