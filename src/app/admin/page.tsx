import Link from "next/link";
import { headers } from "next/headers";
import { AdminConsole } from "@/components/AdminConsole";
import { getHomePayload, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const DEPLOYED_SITE_URL = "https://student-learning-hub-baokeni-20260703.netlify.app";

type AdminPageProps = {
  searchParams?: Promise<{ date?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = searchParams ? await searchParams : {};
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const requestBaseUrl = host ? `${protocol}://${host}` : "";
  const configuredBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const baseUrl =
    configuredBaseUrl || (host.includes("localhost") ? DEPLOYED_SITE_URL : requestBaseUrl);
  const [store, home] = await Promise.all([readStore(), getHomePayload(params.date)]);

  return (
    <main className="admin-shell">
      <header className="admin-hero">
        <div>
          <p className="eyebrow-text">TEACHER ADMIN</p>
          <h1>学习站老师后台</h1>
        </div>
        <Link className="command-button" href="/">
          返回学生端
        </Link>
      </header>
      <AdminConsole baseUrl={baseUrl} initialHome={home} initialStore={store} />
    </main>
  );
}
