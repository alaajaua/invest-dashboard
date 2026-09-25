import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto mt-24 w-full max-w-sm">
      <h1 className="mb-6 text-2xl font-bold">투자 대시보드</h1>
      <form action={login} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="이메일" required className="rounded border px-3 py-2" />
        <input name="password" type="password" placeholder="비밀번호" required className="rounded border px-3 py-2" />
        {error && <p className="text-sm text-red-600">이메일 또는 비밀번호가 올바르지 않습니다.</p>}
        <button className="rounded bg-foreground px-3 py-2 text-background">로그인</button>
      </form>
    </div>
  );
}
