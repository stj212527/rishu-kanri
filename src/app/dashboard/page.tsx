'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { evaluateRules } from '@/lib/ruleEngine'
import { UserProfile, Course, RuleSet, CompletedCourse, RuleResult, RuleSetNotification } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [activeRuleSet, setActiveRuleSet] = useState<RuleSet | null>(null)
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([])
  const [results, setResults] = useState<RuleResult[]>([])
  const [notifications, setNotifications] = useState<RuleSetNotification[]>([])
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

      const [coursesRes, completedRes, notifRes] = await Promise.all([
        supabase.from('courses').select('*').eq('user_id', user.id),
        supabase.from('completed_courses').select('*').eq('user_id', user.id),
        supabase.from('rule_set_notifications').select('*').eq('user_id', user.id).eq('is_read', false),
      ])
      setCourses(coursesRes.data || [])
      setCompletedCourses(completedRes.data || [])
      setNotifications(notifRes.data || [])

      if (prof.active_rule_set_id) {
        const ruleSetRes = await supabase
          .from('rule_sets')
          .select('*, rules(*)')
          .eq('id', prof.active_rule_set_id)
          .single()
        if (ruleSetRes.data) {
          setActiveRuleSet(ruleSetRes.data)
          setResults(evaluateRules(ruleSetRes.data.rules || [], coursesRes.data || [], completedRes.data || []))
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const totalCredits = courses
    .filter(c => completedCourses.some(cc => cc.course_id === c.id))
    .reduce((sum, c) => sum + c.credits, 0)

  const requiredCourses = courses.filter(c => c.is_required)
  const completedIds = new Set(completedCourses.map(cc => cc.course_id))
  const missingRequired = requiredCourses.filter(c => !completedIds.has(c.id))
  const passedCount = results.filter(r => r.passed).length

  const handleDismissNotification = async (id: string) => {
    await supabase.from('rule_set_notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-lg">読み込み中...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">履修管理ツール</h1>
          {profile && (
            <p className="text-base text-gray-500 mt-1">
              {profile.university_name} {profile.faculty_name} {profile.entry_year}年度入学
            </p>
          )}
        </div>
        <button onClick={handleSignOut} className="text-base text-gray-400 hover:text-gray-600">
          ログアウト
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 更新通知バナー */}
        {notifications.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5">
            <h2 className="text-base font-semibold text-yellow-800 mb-3">
              ⚠ 利用中のルールセットに更新があります
            </h2>
            {notifications.map(n => (
              <div key={n.id} className="flex items-center justify-between py-2">
                <p className="text-base text-yellow-800">
                  バージョン {n.old_version} → {n.new_version} に更新されました
                </p>
                <div className="flex gap-2">
                  <Link href="/rules" className="bg-yellow-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-yellow-600">
                    確認する
                  </Link>
                  <button onClick={() => handleDismissNotification(n.id)}
                    className="border border-yellow-400 text-yellow-700 text-sm px-3 py-1.5 rounded-lg hover:bg-yellow-100">
                    後で
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 現在のルールセット */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">現在のルールセット</p>
              {activeRuleSet ? (
                <p className="text-lg font-semibold text-gray-800 mt-0.5">{activeRuleSet.title}</p>
              ) : (
                <p className="text-base text-orange-500 mt-0.5">ルールセットが未設定です</p>
              )}
            </div>
            <Link href="/rules" className="text-base text-blue-500 hover:text-blue-700">
              変更する
            </Link>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-5xl font-bold text-blue-600">{totalCredits}</p>
            <p className="text-base text-gray-500 mt-2">取得済み単位</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-5xl font-bold text-orange-500">{missingRequired.length}</p>
            <p className="text-base text-gray-500 mt-2">未履修必修</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-5xl font-bold text-green-600">{passedCount}/{results.length}</p>
            <p className="text-base text-gray-500 mt-2">条件達成</p>
          </div>
        </div>

        {/* 卒業要件チェック */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">卒業要件チェック</h2>
          {!activeRuleSet ? (
            <div className="text-center py-8">
              <p className="text-base text-gray-400 mb-4">ルールセットが設定されていません</p>
              <Link href="/rules" className="text-base text-blue-600 hover:underline">
                ルールセットを設定する →
              </Link>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base text-gray-400 mb-4">ルールがまだ登録されていません</p>
              <Link href="/rules" className="text-base text-blue-600 hover:underline">
                ルールを登録する →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(result => (
                <div key={result.rule_id} className={
                  'flex items-start gap-3 p-4 rounded-lg ' +
                  (result.passed ? 'bg-green-50' : 'bg-red-50')
                }>
                  <span className={'text-xl ' + (result.passed ? 'text-green-500' : 'text-red-500')}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <p className={'text-base ' + (result.passed ? 'text-green-700' : 'text-red-700')}>
                    {result.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 未履修必修 */}
        {missingRequired.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 p-6">
            <h2 className="text-lg font-semibold text-orange-700 mb-4">⚠ 未履修の必修科目</h2>
            <div className="space-y-2">
              {missingRequired.map(course => (
                <div key={course.id} className="flex justify-between items-center py-3 border-b border-orange-100 last:border-0">
                  <span className="text-base text-gray-700">{course.course_name}</span>
                  <span className="text-base text-gray-400">{course.credits}単位</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ナビゲーション */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { href: '/courses', label: '科目管理', desc: '科目の登録・編集' },
            { href: '/completed', label: '履修済み登録', desc: '取得済み科目を記録' },
            { href: '/rules', label: 'ルール管理', desc: '卒業要件セットの設定' },
            { href: '/setup', label: '基本情報', desc: '大学・学部情報の変更' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <p className="text-lg font-semibold text-gray-800">{item.label}</p>
              <p className="text-base text-gray-400 mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>

        <p className="text-sm text-gray-400 text-center">
          本ツールは補助ツールです。必ず大学公式の履修要覧をご確認ください。
        </p>
      </main>
    </div>
  )
}