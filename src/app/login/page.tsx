import { LockKeyhole } from "lucide-react";
import { loginAction } from "@/app/login/actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const hasError = resolvedSearchParams?.error === "1";

  return (
    <main className="login-page">
      <form className="login-box" action={loginAction}>
        <p className="eyebrow">WeChat Auto Ops</p>
        <h1>后台登录</h1>
        <p className="muted">输入管理员密码后进入 7 Agent 运营控制台。</p>
        <label className="field">
          <span>管理员密码</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {hasError ? <p style={{ color: "#b42318" }}>密码不正确。</p> : null}
        <button type="submit" aria-label="登录后台">
          <LockKeyhole size={18} />
          <span style={{ marginLeft: 8 }}>登录</span>
        </button>
      </form>
    </main>
  );
}
