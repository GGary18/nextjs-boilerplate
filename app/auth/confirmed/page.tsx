import Link from "next/link";

export default function AuthConfirmedPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <Link href="/" className="text-xl font-bold">
          Campus Market
        </Link>

        <div className="mt-10 w-full rounded-3xl border border-neutral-800 bg-neutral-900/40 p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-800 bg-emerald-950/40 text-2xl text-emerald-300">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-bold">邮箱认证成功</h1>

          <p className="mt-4 text-sm leading-7 text-neutral-400">
            你的 Campus Market 账号已经完成邮箱确认。现在可以登录、发布商品、发布房源，或者管理你的个人主页联系方式。
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-neutral-200"
            >
              去登录
            </Link>

            <Link
              href="/"
              className="rounded-full border border-neutral-700 px-6 py-3 font-medium text-white hover:border-neutral-400"
            >
              返回首页
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}