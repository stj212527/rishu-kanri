'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="inline-flex w-7 h-7 rounded-lg bg-blue-600 text-white text-sm items-center justify-center font-bold">R</span>
            <span>履修ナビ</span>
            <span className="text-slate-300 font-normal">|</span>
            <span className="text-slate-400 font-normal text-base">Rism</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">
              ログイン
            </Link>
            <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95">
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 to-white">
        <div className="pointer-events-none absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-20 w-80 h-80 rounded-full bg-indigo-100/40 blur-2xl" />
        <div className="relative mx-auto max-w-5xl px-6 py-20 md:py-32">
          <div className="grid items-center gap-14 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-6">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                β版公開中
              </span>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
                複雑な履修ルールを、<br />
                <span className="text-blue-600">もっとわかりやすく。</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                大学ごとに異なる履修ルールを整理し、<br className="hidden sm:block" />
                不足単位や必修漏れを確認できる履修管理ツールです。
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Link href="/login"
                  className="rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-95">
                  無料で始める →
                </Link>
                <span className="text-sm text-slate-400">登録無料・メールアドレスのみ</span>
              </div>
            </div>

            {/* ダミーダッシュボード */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-slate-400 font-medium">Rism – ダッシュボード</span>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700">卒業要件の進捗</span>
                    <span className="text-xs text-blue-600 font-bold">68 / 124 単位</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full w-[55%] rounded-full bg-blue-500" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-right">55% 達成 / あと56単位</p>
                </div>
                {[
                  { label: '不足単位を見える化', sub: 'あと 56 単位必要', color: 'text-blue-800 bg-blue-50 border-blue-100', dot: 'bg-blue-500' },
                  { label: '必修漏れをチェック', sub: '英語II・基礎演習 が未登録', color: 'text-amber-800 bg-amber-50 border-amber-100', dot: 'bg-amber-500' },
                  { label: '進級条件の達成状況', sub: '1年終了時：条件達成 ✓', color: 'text-emerald-800 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' },
                ].map(item => (
                  <div key={item.label} className={`flex items-center gap-3 rounded-xl p-3.5 border ${item.color}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
                    <div>
                      <p className="text-xs font-semibold leading-none">{item.label}</p>
                      <p className="text-xs mt-1 opacity-70">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Rismでできること</h2>
            <p className="mt-4 text-slate-500 text-base leading-relaxed">
              履修の悩みを、できるだけシンプルに整理できるよう設計しています。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: '不足単位を見える化', desc: '卒業要件や区分ごとの必要単位に対して、あと何単位必要かをひと目で確認できます。', accent: 'border-t-blue-500' },
              { title: '必修漏れをチェック', desc: '取り忘れている必修科目を一覧で確認。うっかり取り逃しを防ぎます。', accent: 'border-t-amber-500' },
              { title: '進級条件を管理', desc: '学期ごとの進級要件（累積単位・必須科目）を設定し、達成状況を確認できます。', accent: 'border-t-emerald-500' },
              { title: 'ルールをみんなで共有', desc: '同じ大学・学部のルールセットを他の学生と共有。自分でゼロから作る必要がありません。', accent: 'border-t-purple-500' },
              { title: '科目をみんなで共有', desc: '履修した科目を他の学生と共有。同じ大学の情報を活用できます。', accent: 'border-t-pink-500' },
              { title: '自分だけのルールも作れる', desc: 'テンプレートがなくても、自分で区分・科目・ルールを自由に登録できます。', accent: 'border-t-slate-400' },
            ].map(f => (
              <div key={f.title} className={`rounded-2xl border-t-4 border border-slate-100 bg-white p-7 shadow-sm hover:shadow-md transition-shadow ${f.accent}`}>
                <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-slate-50 border-t border-slate-100 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">使い方はシンプルです</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', title: 'ルールセットを選ぶ', desc: '同じ大学・学部のテンプレートを使うか、自分で履修ルールを登録します。' },
              { step: '02', title: '履修済み科目を登録する', desc: 'これまでに修得した科目を入力します。共有科目から選ぶこともできます。' },
              { step: '03', title: '進捗を確認する', desc: '不足単位・必修漏れ・進級条件の達成状況をダッシュボードで確認できます。' },
            ].map(s => (
              <div key={s.step} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="text-4xl font-black text-slate-100 leading-none select-none">{s.step}</div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta Notice */}
      <section className="border-t border-slate-100 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-12">
            <div className="flex items-center gap-2 mb-4">
              <span className="rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold text-white">β</span>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">β版公開中</h2>
            </div>
            <p className="text-base leading-8 text-slate-600">
              Rismは現在β版として公開中です。<br />
              内容の改善を続けているため、気づいた点があればぜひフィードバックをお寄せください。
            </p>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
              ⚠️ 本ツールは履修管理を補助するためのものであり、正式な卒業判定を行うものではありません。
              最終確認は必ず大学公式の履修要覧でご確認ください。
            </div>
            <div className="mt-8">
              <Link href="/login"
                className="inline-flex rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-95">
                無料で始める →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="inline-flex w-5 h-5 rounded bg-blue-600 text-white text-xs items-center justify-center font-bold">R</span>
              履修ナビ | Rism
            </div>
            <p className="mt-1 text-xs text-slate-400">© Rism</p>
          </div>
          <nav className="flex flex-wrap gap-5 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-900 transition-colors">ログイン</Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">新規登録</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}