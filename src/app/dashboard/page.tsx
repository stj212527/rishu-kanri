'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { evaluateRules } from '@/lib/ruleEngine'
import { UserProfile, RuleSet, RuleSetCourse, RuleSetRule, UserCourseRecord, RuleResult, RuleSetNotification, SemesterRule } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const NAV_TABS = [
  { href: '/dashboard', label: 'ホーム' },
  { href: '/courses', label: '科目・履修' },
  { href: '/rules', label: 'ルール管理' },
  { href: '/setup', label: '基本情報' },
]

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [activeRuleSet, setActiveRuleSet] = useState<RuleSet | null>(null)
  const [courses, setCourses] = useState<RuleSetCourse[]>([])
  const [rules, setRules] = useState<RuleSetRule[]>([])
  const [records, setRecords] = useState<UserCourseRecord[]>([])
  const [results, setResults] = useState<RuleResult[]>([])
  const [notifications, setNotifications] = useState<RuleSetNotification[]>([])
  const [semesterRules, setSemesterRules] = useState<SemesterRule[]>([])
  const [showAllSemesters, setShowAllSemesters] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const profileRes = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      if (!profileRes.data) { router.push('/setup'); return }
      const prof = profileRes.data
      setProfile(prof)
      const currentKey = prof.current_year + '-' + prof.current_term
      setExpandedCards(new Set([currentKey]))
      const [recordsRes, notifRes] = await Promise.all([
        supabase.from('user_course_records').select('*, course:rule_set_courses(*)').eq('user_id', user.id),
        supabase.from('rule_set_notifications').select('*').eq('user_id', user.id).eq('is_read', false),
      ])
      setRecords(recordsRes.data || [])
      setNotifications(notifRes.data || [])
      if (prof.active_rule_set_id) {
        const [ruleSetRes, coursesRes, rulesRes, semRes] = await Promise.all([
          supabase.from('rule_sets').select('*').eq('id', prof.active_rule_set_id).single(),
          supabase.from('rule_set_courses').select('*').eq('rule_set_id', prof.active_rule_set_id),
          supabase.from('rule_set_rules').select('*').eq('rule_set_id', prof.active_rule_set_id),
          supabase.from('semester_rules').select('*').eq('rule_set_id', prof.active_rule_set_id).order('year_num').order('term_num'),
        ])
        if (ruleSetRes.data) setActiveRuleSet(ruleSetRes.data)
        setCourses(coursesRes.data || [])
        setRules(rulesRes.data || [])
        setSemesterRules(semRes.data || [])
        setResults(evaluateRules(rulesRes.data || [], coursesRes.data || [], recordsRes.data || []))
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const completedRecords = records.filter(r => r.status === 'completed')
  const totalCredits = completedRecords.reduce((sum, r) => sum + (r.course?.credits || r.custom_credits || 0), 0)
  const requiredCourses = courses.filter(c => c.is_required)
  const completedIds = new Set(completedRecords.map(r => r.template_course_id).filter(Boolean) as string[])
  const missingRequired = requiredCourses.filter(c => !completedIds.has(c.id))
  const failResults = results.filter(r => r.status === 'fail')
  const passResults = results.filter(r => r.status === 'pass')
  const totalRequired = rules.find(r => r.rule_type === 'total_credits_min')
  const totalRequiredCredits = totalRequired ? (totalRequired.rule_payload as Record<string, number>).min_credits : null

  const handleDismissNotification = async (id: string) => {
    await supabase.from('rule_set_notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const toggleCard = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const getCreditsByTerm = (yearNum: number, termNum: number) => {
    return records.filter(r => r.status === 'completed' && r.acquired_year && r.acquired_term).filter(r => {
      const entryYear = profile?.entry_year || new Date().getFullYear()
      const yearDiff = r.acquired_year! - entryYear + 1
      const termMatch = r.acquired_term!.includes('前') || r.acquired_term!.includes('1') ? 1
        : r.acquired_term!.includes('後') || r.acquired_term!.includes('2') ? 2
        : r.acquired_term!.includes('3') ? 3 : 4
      return yearDiff === yearNum && termMatch === termNum
    }).reduce((sum, r) => sum + (r.course?.credits || r.custom_credits || 0), 0)
  }

  const getCumulativeCredits = (untilYear: number, untilTerm: number) => {
    const terms = activeRuleSet?.terms_per_year || 2
    let total = 0
    for (let y = 1; y <= untilYear; y++) {
      const maxTerm = y === untilYear ? untilTerm : terms
      for (let t = 1; t <= maxTerm; t++) total += getCreditsByTerm(y, t)
    }
    return total
  }

  const getSemesterStatus = (yearNum: number, termNum: number) => {
    const semRule = semesterRules.find(s => s.year_num === yearNum && s.term_num === termNum)
    if (!semRule) return null
    const cumCredits = getCumulativeCredits(yearNum, termNum)
    const creditOk = semRule.cumulative_min_credits === null || cumCredits >= (semRule.cumulative_min_credits || 0)
    const requiredIds = (semRule.required_course_ids as string[]) || []
    const requiredOk = requiredIds.length === 0 || requiredIds.every((id: string) => completedIds.has(id))
    return { passed: creditOk && requiredOk, semRule, cumCredits }
  }

  const getTermLabel = (termNum: number, termsPerYear: number) => {
    if (termsPerYear === 2) return termNum === 1 ? '前期' : '後期'
    if (termsPerYear === 3) return termNum === 1 ? '前期' : termNum === 2 ? '中期' : '後期'
    return termNum + '学期'
  }

  const isCurrentOrPast = (yearNum: number, termNum: number) => {
    const curYear = profile?.current_year || 1
    const curTerm = profile?.current_term || 1
    return yearNum < curYear || (yearNum === curYear && termNum <= curTerm)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-lg">読み込み中...</p>
    </div>
  )

  const yearsOfStudy = activeRuleSet?.years_of_study || 4
  const termsPerYear = activeRuleSet?.terms_per_year || 2
  const curYear = profile?.current_year || 1
  const curTerm = profile?.current_term || 1

  // 現在の学期だけ、またはすべての学期
  const semesterList: { year: number; term: number }[] = []
  for (let y = 1; y <= yearsOfStudy; y++) {
    for (let t = 1; t <= termsPerYear; t++) {
      semesterList.push({ year: y, term: t })
    }
  }
  const displayedSemesters = showAllSemesters
    ? semesterList
    : semesterList.filter(s => s.year === curYear && s.term === curTerm)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">履修管理ツール</h1>
              {profile && (
                <p className="text-sm text-gray-500">
                  {profile.university_name} {profile.faculty_name}
                  {profile.current_year && (
                    <span className="ml-2 text-blue-500">{profile.current_year}年{getTermLabel(profile.current_term, termsPerYear)}</span>
                  )}
                </p>
              )}
            </div>
            <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-gray-600">ログアウト</button>
          </div>
          {/* タブナビゲーション */}
          <div className="flex gap-1 -mb-px">
            {NAV_TABS.map(tab => (
              <Link key={tab.href} href={tab.href}
                className={'px-4 py-2.5 text-base font-medium border-b-2 transition-colors ' +
                  (tab.href === '/dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* 更新通知バナー */}
        {notifications.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
            <h2 className="text-base font-semibold text-yellow-800 mb-2">⚠ 利用中のルールセットに更新があります</h2>
            {notifications.map(n => (
              <div key={n.id} className="flex items-center justify-between py-1.5">
                <p className="text-base text-yellow-800">バージョン {n.old_version} → {n.new_version} に更新されました</p>
                <div className="flex gap-2">
                  <Link href="/rules" className="bg-yellow-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-yellow-600">確認する</Link>
                  <button onClick={() => handleDismissNotification(n.id)} className="border border-yellow-400 text-yellow-700 text-sm px-3 py-1.5 rounded-lg">後で</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 現在のルールセット */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-400">現在のルールセット</p>
            {activeRuleSet ? (
              <p className="text-base font-semibold text-gray-800 mt-0.5">{activeRuleSet.title}</p>
            ) : (
              <p className="text-base text-orange-500 mt-0.5">ルールセットが未設定です</p>
            )}
          </div>
          <Link href="/rules" className="text-base text-blue-500 hover:text-blue-700">変更する</Link>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-4xl font-bold text-blue-600">{totalCredits}</p>
            <p className="text-sm text-gray-500 mt-1">取得済み単位</p>
            {totalRequiredCredits && <p className="text-xs text-gray-400">/ {totalRequiredCredits}単位</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-4xl font-bold text-orange-500">{missingRequired.length}</p>
            <p className="text-sm text-gray-500 mt-1">未履修必修</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-4xl font-bold text-green-600">{passResults.length}/{results.length}</p>
            <p className="text-sm text-gray-500 mt-1">条件達成</p>
          </div>
        </div>

        {/* 卒業進捗バー */}
        {totalRequiredCredits && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-base font-semibold text-gray-700">卒業までの進捗</p>
              <p className="text-base text-gray-500">あと <span className="text-lg font-bold text-blue-600">{Math.max(0, totalRequiredCredits - totalCredits)}</span> 単位</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: Math.min(100, Math.round(totalCredits / totalRequiredCredits * 100)) + '%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{Math.min(100, Math.round(totalCredits / totalRequiredCredits * 100))}%</p>
          </div>
        )}

        {/* 未履修必修 */}
        {missingRequired.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <h2 className="text-base font-semibold text-red-600 mb-3">⚠ 未履修の必修科目</h2>
            <div className="space-y-2">
              {missingRequired.map(course => (
                <div key={course.id} className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                  <span className="text-base text-gray-700">{course.course_name}</span>
                  <span className="text-sm text-gray-400">{course.credits}単位</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 不足ルール */}
        {failResults.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-700 mb-3">不足している条件</h2>
            <div className="space-y-2">
              {failResults.map(result => (
                <div key={result.rule_id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50">
                  <span className="text-red-500">✗</span>
                  <p className="text-base text-red-700">{result.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 達成済みルール */}
        {passResults.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-700 mb-3">達成済みの条件</h2>
            <div className="space-y-2">
              {passResults.map(result => (
                <div key={result.rule_id} className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
                  <span className="text-green-500">✓</span>
                  <p className="text-base text-green-700">{result.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* セメスタータイムライン */}
        {activeRuleSet && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-700">学期ごとの進捗</h2>
              <button onClick={() => setShowAllSemesters(!showAllSemesters)}
                className="text-sm text-blue-500 hover:text-blue-700">
                {showAllSemesters ? '現在の学期のみ表示' : '全学期を見る'}
              </button>
            </div>
            <div className="space-y-2">
              {displayedSemesters.map(({ year, term }) => {
                const key = year + '-' + term
                const isExpanded = expandedCards.has(key)
                const isCurrent = year === curYear && term === curTerm
                const isPast = isCurrentOrPast(year, term) && !isCurrent
                const isFuture = !isCurrentOrPast(year, term)
                const termCredits = getCreditsByTerm(year, term)
                const cumCredits = getCumulativeCredits(year, term)
                const semStatus = getSemesterStatus(year, term)
                const termLabel = getTermLabel(term, termsPerYear)

                return (
                  <div key={key} className={
                    'border rounded-xl overflow-hidden transition-all ' +
                    (isCurrent ? 'border-blue-400' : 'border-gray-100')
                  }>
                    <button onClick={() => toggleCard(key)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={'w-2 h-2 rounded-full ' + (isCurrent ? 'bg-blue-500' : isPast ? 'bg-green-400' : 'bg-gray-200')} />
                        <span className={'text-base font-medium ' + (isCurrent ? 'text-blue-700' : isFuture ? 'text-gray-300' : 'text-gray-700')}>
                          {year}年{termLabel}
                          {isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">現在</span>}
                        </span>
                        {semStatus && (
                          <span className={'text-xs px-2 py-0.5 rounded-full ' + (semStatus.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                            {semStatus.passed ? '進級条件達成' : '進級条件未達成'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isFuture && <span className="text-sm text-gray-500">{termCredits}単位</span>}
                        <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
                        {isFuture ? (
                          <p className="text-sm text-gray-400 pt-3">まだ開始していない学期です</p>
                        ) : (
                          <>
                            <div className="pt-3 grid grid-cols-2 gap-3">
                              <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-gray-700">{termCredits}</p>
                                <p className="text-xs text-gray-400">この学期の取得単位</p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-600">{cumCredits}</p>
                                <p className="text-xs text-gray-400">累積取得単位</p>
                              </div>
                            </div>
                            {semStatus?.semRule && (
                              <div className={'rounded-lg p-3 ' + (semStatus.passed ? 'bg-green-50' : 'bg-red-50')}>
                                <p className="text-sm font-medium text-gray-600 mb-1">{semStatus.semRule.label || '進級要件'}</p>
                                {semStatus.semRule.cumulative_min_credits && (
                                  <p className={'text-sm ' + (cumCredits >= semStatus.semRule.cumulative_min_credits ? 'text-green-700' : 'text-red-600')}>
                                    累積単位：{cumCredits} / {semStatus.semRule.cumulative_min_credits}単位必要
                                    {cumCredits >= semStatus.semRule.cumulative_min_credits ? ' ✓' : '（あと' + (semStatus.semRule.cumulative_min_credits - cumCredits) + '単位）'}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {isCurrent && (
                          <Link href="/courses" className="block text-center text-sm text-blue-500 hover:text-blue-700 pt-1">
                            履修を記録する →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-4">
          本ツールは補助ツールです。必ず大学公式の履修要覧をご確認ください。
        </p>
      </main>
    </div>
  )
}