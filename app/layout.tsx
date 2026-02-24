import "./globals.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import UserMenu from "@/components/UserMenu";

export const metadata = {
  title: "航科AI教育",
  description: "小学课后辅导 MVP"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="zh-CN">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="brand">航科AI教育</div>
            <nav className="nav-links">
              <Link href="/student">学生端</Link>
              <Link href="/teacher">教师端</Link>
              <Link href="/diagnostic">诊断测评</Link>
              <Link href="/tutor">AI 辅导</Link>
              <Link href="/coach">学习陪练</Link>
              <Link href="/practice">练习</Link>
              <Link href="/focus">专注计时</Link>
              <Link href="/reading">朗读评分</Link>
              <Link href="/writing">写作批改</Link>
              <Link href="/challenge">挑战任务</Link>
              <Link href="/parent">家长端</Link>
              <Link href="/admin">管理端</Link>
            </nav>
            <UserMenu user={user} />
          </header>
          <main className="main">{children}</main>
          <footer className="site-footer">© 2026 航科AI教育 课程辅导 MVP</footer>
        </div>
      </body>
    </html>
  );
}
