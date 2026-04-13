'use client'

import Link from 'next/link'

const NAV_TABS = [
  { href: '/dashboard', label: 'ホーム' },
  { href: '/courses', label: '科目・履修' },
  { href: '/rules', label: 'ルール管理' },
  { href: '/setup', label: '基本情報' },
]

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
    <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    {children}
  </div>
)

const Step = ({ num, title, desc }: { num: number; title: string; desc: string }) => (
  <div className="flex gap-3">
    <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{num}</div>
    <div>
      <p className="text-base font-medium text-gray-800">{title}</p>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </div>
  </div>
)

const QA = ({ q, a }: { q: string; a: string }) => (
  <div className="border border-gray-100 rounded-lg p-4">
    <p className="text-base font-medium text-gray-800 mb-1">Q. {q}</p>
    <p className="text-sm text-gray-600">A. {a}</p>
  </div>
)

const Tag = ({ text, color }: { text: string; color: string }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{text}</span>
)

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 修正7・9: 統一ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-blue-600 tracking-tight">Rism</span>
              <span className="hidden sm:inline text-xs text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">履修ナビ</span>
            </div>
          </div>
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {NAV_TABS.map(tab => (
              <Link key={tab.href} href={tab.href}
                className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors whitespace-nowrap">
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ヒーロー */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-1">使い方ガイド</h2>
          <p className="text-blue-100 text-base">Rismは大学の卒業要件・進級要件を自分でルール登録して、履修状況を可視化するツールです。</p>
        </div>

        {/* 修正5: 各ページ詳細ボタン */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-600 mb-3">各ページの詳しい説明を見る</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '#page-dashboard', label: '🏠 ホーム（ダッシュボード）', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { href: '#page-courses', label: '📝 科目・履修管理', color: 'bg-green-50 text-green-700 border-green-200' },
              { href: '#page-rules', label: '⚙️ ルール管理', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { href: '#page-setup', label: '👤 基本情報', color: 'bg-purple-50 text-purple-700 border-purple-200' },
            ].map(btn => (
              <a key={btn.href} href={btn.href}
                className={'border rounded-xl px-4 py-3 text-sm font-medium text-center hover:opacity-80 transition-opacity ' + btn.color}>
                {btn.label}
              </a>
            ))}
          </div>
        </div>

        {/* はじめ方 */}
        <Section title="📋 はじめ方（4ステップ）">
          <div className="space-y-4">
            <Step num={1} title="基本情報を設定する" desc="「基本情報」タブから大学名・学部名・学科名・入学年度・現在の学年・学期を入力します。" />
            <Step num={2} title="ルールセットを作成する" desc="「ルール管理」タブで「+ 新規作成」を押します。大学・学部情報は基本情報から自動入力されます。" />
            <Step num={3} title="区分・科目・ルールを登録する" desc="ルールセットを編集して、区分（専門必修・外国語など）、科目、卒業要件のルールを登録します。" />
            <Step num={4} title="履修記録を入力する" desc="「科目・履修」タブで履修済みの科目を記録します。ダッシュボードに進捗が自動表示されます。" />
          </div>
        </Section>

        {/* ルール管理 */}
        <Section title="⚙️ ルール管理ページの使い方">
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">ルールセットの構造</p>
              <div className="text-sm text-gray-600 space-y-1">
                <p>📁 <span className="font-medium">ルールセット</span>（例：2024年度 〇〇大学 〇〇学部 〇〇学科）</p>
                <p className="ml-4">📂 <span className="font-medium">区分</span>（例：専門必修・外国語・A群）</p>
                <p className="ml-8">📄 <span className="font-medium">科目</span>（例：線形代数学・経営学概論）</p>
                <p className="ml-4">📏 <span className="font-medium">ルール</span>（例：総124単位以上・外国語4単位以上）</p>
                <p className="ml-4">📅 <span className="font-medium">進級条件</span>（例：2年生への進級条件：累積30単位以上）</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">登録できる5種類のルール</p>
              <div className="space-y-2">
                {[
                  { label: '総取得単位の最低条件', desc: '卒業に必要な合計単位数を設定します。例：124単位以上' },
                  { label: '区分別の最低単位', desc: '特定の区分で最低限取得が必要な単位数を設定します。例：外国語4単位以上' },
                  { label: '区分別の上限単位', desc: '特定の区分で算入できる単位の上限を設定します。例：自由科目は10単位まで' },
                  { label: '必修科目を指定', desc: '必ず取得しなければならない科目を指定します。未取得だとダッシュボードで警告が出ます。' },
                  { label: '選択必修グループ', desc: '複数の科目から一定単位を取得する必要がある場合に使います。例：A群から6単位以上' },
                ].map(r => (
                  <div key={r.label} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{r.label}</p>
                      <p className="text-xs text-gray-500">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-700 mb-1">💡 ドラッグで並び替え</p>
              <p className="text-sm text-blue-600">区分は左端の「⠿」マークをドラッグして並び替えができます。</p>
            </div>
          </div>
        </Section>

        {/* 履修記録 */}
        <Section title="📝 履修記録の入力方法">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">「科目・履修」ページの「+ 履修を記録する」から入力できます。3つの入力モードがあります。</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: 'ルール内の科目', desc: 'ルールセットに登録した科目から選択。最も正確に単位が計算されます。', color: 'bg-blue-50 border-blue-200' },
                { mode: '共有科目から', desc: '他のユーザーが公開した科目から選択します。', color: 'bg-green-50 border-green-200' },
                { mode: '自由入力', desc: 'ルールに登録されていない科目（他学科履修・集中講義など）を手入力します。', color: 'bg-orange-50 border-orange-200' },
              ].map(m => (
                <div key={m.mode} className={`border rounded-lg p-3 ${m.color}`}>
                  <p className="text-sm font-medium text-gray-700 mb-1">{m.mode}</p>
                  <p className="text-xs text-gray-500">{m.desc}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">履修状態の意味</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '取得済み', color: 'bg-green-100 text-green-700', desc: '単位取得確定。卒業判定に算入されます。' },
                  { label: '履修中', color: 'bg-blue-100 text-blue-700', desc: '現在受講中。判定には算入されません。' },
                  { label: '履修予定', color: 'bg-gray-100 text-gray-600', desc: '将来取る予定。判定には算入されません。' },
                  { label: '不合格', color: 'bg-red-100 text-red-600', desc: '不合格・未修得。履歴として残ります。' },
                ].map(s => (
                  <div key={s.label} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                    <Tag text={s.label} color={s.color} />
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ダッシュボード */}
        <Section title="🏠 ダッシュボードの見方">
          <div className="space-y-2">
            {[
              { icon: '📊', title: '卒業進捗バー', desc: '取得済み単位 ÷ 必要単位（total_credits_minルール）で計算されます。' },
              { icon: '🔴', title: '未履修の必修科目', desc: 'is_required=trueの科目で未取得のものを表示します。最優先で履修しましょう。' },
              { icon: '❌', title: '不足している条件', desc: '達成できていないルールを表示します。あと何単位必要かが分かります。' },
              { icon: '✅', title: '達成済みの条件', desc: '要件を満たしているルールを表示します。' },
              { icon: '📅', title: 'セメスタータイムライン', desc: '学期ごとの取得単位数と累積単位数を確認できます。進級条件の達成状況も表示されます。' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 共有機能 */}
        <Section title="🤝 共有機能について">
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ 注意事項</p>
              <p className="text-sm text-yellow-700">共有されたルールセット・科目の内容は参考情報です。正確な内容は必ず大学公式の履修要覧でご確認ください。</p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-base">📤</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">ルールセットを公開する</p>
                  <p className="text-xs text-gray-500">ルール管理ページでルールセットを編集し、「公開する」チェックをオンにすると同大学のユーザーが閲覧・コピーできます。</p>
                </div>
              </div>
              <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-base">📥</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">他のユーザーのルールセットをコピーする</p>
                  <p className="text-xs text-gray-500">「同大学の公開ルールセット」セクションから「コピーして使う」で自分のルールセットとして複製できます。コピー後は自由に編集できます。</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* よくある質問 */}
        <Section title="❓ よくある質問">
          <div className="space-y-3">
            <QA
              q="取得済み単位の数が合わない"
              a="アクティブなルールセットに登録されている科目の「取得済み」記録のみが計算対象です。自由入力の科目は総単位数にのみ算入され、区分別ルールには反映されません。"
            />
            <QA
              q="必修科目が「未履修」と表示されるが、取得済みに設定している"
              a="科目は「ルール内の科目」モードで登録する必要があります。自由入力や共有科目モードで登録した場合、必修チェックはルールエンジンに反映されません。"
            />
            <QA
              q="TOEIC等の特例単位はどう入力する？"
              a="「自由入力」モードで科目名に「英語免除」などと記入し、対応する区分名を入力してください。総単位数には算入されますが、区分別ルールへの反映は自動ではありません。"
            />
            <QA
              q="公開ルールセットが表示されない"
              a="「基本情報」で大学名を設定すると、同じ大学名のルールセットが表示されます。大学名の表記が完全一致する必要があります。"
            />
            <QA
              q="ルールセットを削除できない"
              a="他のユーザーがそのルールセットを使用中の場合、削除に制限がかかることがあります。先に「使用する」で別のルールセットに切り替えてから削除してください。"
            />
          </div>
        </Section>

        {/* 修正5: 各ページ詳細説明 */}
        <div id="page-dashboard" className="bg-white rounded-xl border border-blue-100 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-blue-700">🏠 ホーム（ダッシュボード）</h2>
          <p className="text-sm text-gray-600">履修状況の全体像を確認するメイン画面です。</p>
          <div className="space-y-2">
            {[
              { t: '卒業進捗バー', d: 'total_credits_minルールに設定した総必要単位に対する取得済み単位の割合を表示します。' },
              { t: '未履修の必修科目', d: 'ルールセットで「必修」に設定した科目のうち、未取得のものを赤枠で表示します。' },
              { t: '不足している条件', d: '達成できていないルールを一覧表示します。あと何単位必要かが分かります。' },
              { t: '達成済みの条件', d: '要件を満たしたルールを緑で表示します。' },
              { t: 'セメスタータイムライン', d: '学期ごとの取得単位・累積単位・進級条件の達成状況を確認できます。「全学期を見る」で全期間を表示できます。' },
              { t: '学年・学期の変更', d: 'ヘッダーの学年表示（例: 2年前期）をタップすると、現在の学年・学期をその場で変更できます。' },
            ].map(item => (
              <div key={item.t} className="flex gap-2 p-2 bg-blue-50 rounded-lg">
                <span className="text-blue-400 font-bold text-sm min-w-fit">▸</span>
                <div><span className="text-sm font-medium text-gray-700">{item.t}：</span><span className="text-sm text-gray-600">{item.d}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div id="page-courses" className="bg-white rounded-xl border border-green-100 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-green-700">📝 科目・履修管理</h2>
          <p className="text-sm text-gray-600">履修記録の登録・管理と科目の共有を行うページです。</p>
          <div className="space-y-2">
            {[
              { t: 'ルール内の科目から登録', d: 'ルールセットに登録された科目から選択します。区分別・必修の判定が正確に反映されます。' },
              { t: '共有科目から登録', d: '他のユーザーが公開した科目を選んで記録できます。' },
              { t: '自由入力で登録', d: 'ルールに登録されていない科目（他学科履修・集中講義など）を手入力できます。ルールセットに区分がある場合は区分も選択でき、区分別の計算にも反映されます。' },
              { t: '曜日・時限の入力', d: '将来の時間割機能に対応するため、履修科目の曜日と時限を記録できます。' },
              { t: '自分の共有科目', d: '自分が登録した科目を他のユーザーに公開できます。同大学のユーザーが活用できます。' },
            ].map(item => (
              <div key={item.t} className="flex gap-2 p-2 bg-green-50 rounded-lg">
                <span className="text-green-400 font-bold text-sm min-w-fit">▸</span>
                <div><span className="text-sm font-medium text-gray-700">{item.t}：</span><span className="text-sm text-gray-600">{item.d}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div id="page-rules" className="bg-white rounded-xl border border-emerald-100 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-emerald-700">⚙️ ルール管理</h2>
          <p className="text-sm text-gray-600">ルールセット（卒業要件）の作成・編集・共有を行うページです。</p>
          <div className="space-y-2">
            {[
              { t: '新規作成', d: '「+ 新規作成」ボタンで作成します。基本情報の大学名等が自動入力されます。在籍年数と学期制（2学期制／4学期制など）を選択してください。' },
              { t: '編集', d: '「編集」ボタンで基本情報・区分・科目・ルール・進級条件をまとめて編集できます。' },
              { t: '複製', d: '自分のルールセットを「複製」ボタンでコピーして別の学科用ルールセットを効率よく作れます。' },
              { t: '区分の並び替え', d: '区分カードを左端の「⠿」マークでドラッグして順序を変更できます。' },
              { t: '複数区分の超過単位ルール', d: '例：A群・B群・C群で各8単位が前提の場合、3区分の超過単位合計が6単位以上という条件を設定できます。' },
              { t: '進級条件', d: '学期終了時点での累積単位数や必須科目の条件を設定します。ダッシュボードのタイムラインに反映されます。' },
              { t: '公開・コピー', d: '「公開する」にすると同大学のユーザーが閲覧・コピーできます。コピー数が多いルールセットが上位表示されます。' },
            ].map(item => (
              <div key={item.t} className="flex gap-2 p-2 bg-emerald-50 rounded-lg">
                <span className="text-emerald-400 font-bold text-sm min-w-fit">▸</span>
                <div><span className="text-sm font-medium text-gray-700">{item.t}：</span><span className="text-sm text-gray-600">{item.d}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div id="page-setup" className="bg-white rounded-xl border border-purple-100 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-purple-700">👤 基本情報</h2>
          <p className="text-sm text-gray-600">大学・学部・学科・入学年度・現在の学年・学期を設定するページです。</p>
          <div className="space-y-2">
            {[
              { t: '大学名・学部名・学科名', d: 'ルールセット作成時の自動入力と、公開ルールセットの絞り込みに使われます。正確に入力してください。' },
              { t: '入学年度', d: 'ダッシュボードの学期タイムラインで「何年生か」を計算するために使います。' },
              { t: '現在の学年・学期', d: 'ダッシュボードのデフォルト表示学期と、履修登録時の「未来学期」バリデーションに使います。ダッシュボードのヘッダーからも変更できます。' },
            ].map(item => (
              <div key={item.t} className="flex gap-2 p-2 bg-purple-50 rounded-lg">
                <span className="text-purple-400 font-bold text-sm min-w-fit">▸</span>
                <div><span className="text-sm font-medium text-gray-700">{item.t}：</span><span className="text-sm text-gray-600">{item.d}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-gray-100 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-2">⚠️ 免責事項</h2>
          <p className="text-sm text-gray-600">
            本ツールは履修管理を補助するためのものであり、正式な卒業判定・進級判定を行うものではありません。
            卒業要件・進級要件は年度・コースによって異なる場合があります。
            必ず最新の履修要覧・シラバス・大学公式案内を併せてご確認ください。
            本ツールの利用によって生じた不利益について、開発者は一切の責任を負いません。
          </p>
        </div>

        <div className="text-center pb-4 space-y-1">
          <p className="text-xs text-gray-400">Rism - 履修ナビ</p>
          <a href="https://forms.gle/YOUR_FORM_ID" target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-600 underline">
            お問い合わせ・バグ報告はこちら
          </a>
        </div>
      </main>
    </div>
  )
}