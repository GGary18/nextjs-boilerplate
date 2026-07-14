import Link from "next/link";
import AuthNav from "@/app/components/AuthNav";
import RequireLoginLink from "@/app/components/RequireLoginLink";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            Campus Market
          </Link>

          <AuthNav />
        </nav>

        <section className="flex flex-1 items-center py-8">
          <div className="grid w-full gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm text-neutral-400">
                留学生二手商品与短租信息平台
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
                找二手，找短租，
                <br />
                更简单一点。
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-400">
                Campus Market 帮留学生浏览二手商品、短租房源、求购需求和求租需求。
                发布和联系前需要登录，平台会围绕学校邮箱与 CSA/ CSSA 认证建立基础信任。
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/listings"
                  className="rounded-full bg-white px-7 py-3 text-center font-medium text-black hover:bg-neutral-200"
                >
                  浏览二手商品
                </Link>

                <Link
                  href="/housing"
                  className="rounded-full border border-neutral-700 px-7 py-3 text-center font-medium text-white hover:border-neutral-400"
                >
                  浏览短租房源
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-neutral-400">发布</p>

                  <h2 className="mt-2 text-2xl font-bold">
                    发布你的需求或资源
                  </h2>
                </div>

                <p className="hidden max-w-xs text-right text-sm leading-6 text-neutral-500 sm:block">
                  发布前需要登录。
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <RequireLoginLink
                  href="/sell"
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-left transition hover:border-neutral-500"
                  message="发布二手商品需要先登录。"
                >
                  <span className="block text-xs text-neutral-500">
                    Sell Product
                  </span>

                  <span className="mt-1 block text-lg font-semibold">
                    发布商品
                  </span>

                  <span className="mt-2 block text-sm leading-5 text-neutral-400">
                    出售家具、电子产品、生活用品等。
                  </span>
                </RequireLoginLink>

                <RequireLoginLink
                  href="/request-item"
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-left transition hover:border-neutral-500"
                  message="发布求购需求需要先登录。"
                >
                  <span className="block text-xs text-neutral-500">
                    Request Product
                  </span>

                  <span className="mt-1 block text-lg font-semibold">
                    求好物
                  </span>

                  <span className="mt-2 block text-sm leading-5 text-neutral-400">
                    发布想收的东西和预算上限。
                  </span>
                </RequireLoginLink>

                <RequireLoginLink
                  href="/post-housing"
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-left transition hover:border-neutral-500"
                  message="发布短租房源需要先登录。"
                >
                  <span className="block text-xs text-neutral-500">
                    Post Housing
                  </span>

                  <span className="mt-1 block text-lg font-semibold">
                    发布房源
                  </span>

                  <span className="mt-2 block text-sm leading-5 text-neutral-400">
                    发布短租、转租、暑期房源。
                  </span>
                </RequireLoginLink>

                <RequireLoginLink
                  href="/request-housing"
                  className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-left transition hover:border-neutral-500"
                  message="发布求租需求需要先登录。"
                >
                  <span className="block text-xs text-neutral-500">
                    Request Housing
                  </span>

                  <span className="mt-1 block text-lg font-semibold">
                    求短租
                  </span>

                  <span className="mt-2 block text-sm leading-5 text-neutral-400">
                    发布想找的房型、区域和预算。
                  </span>
                </RequireLoginLink>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-neutral-900 py-4 text-sm text-neutral-500">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>© Campus Market</p>

            <p>
              合作、遇 Bug 请联系邮箱{" "}
              <a
                href="mailto:gary_guoyili@outlook.com?subject=CampusMarket"
                className="text-neutral-300 hover:text-white"
              >
                gary_guoyili@outlook.com
              </a>
              ，主题添加 CampusMarket
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}