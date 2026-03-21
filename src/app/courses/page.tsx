'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { RuleSetCourse, RuleSetCategory, UserCourseRecord } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_OPTIONS = [
  { value: 'completed', label: '取得済み', color: 'bg-green-100 text-green-700' },
  { value: 'in_progress', label: '履修中', color: 'bg-blue-100 text-blue-700' },
  { value: 'planned', label: '履修予定', color: 'bg-gray-100 text-gray-600' },
  { value: 'failed', label: '不合格', color: 'bg-red-100 text-red-600' },
]

export default function CoursesPage() {
  const [courses, setCourses] = useState<RuleSetCourse[]>([])
  const [categories, setCategories] = useState<RuleSetCategory[]>([])
  const [records, setRecords] = useState<UserCourseRecord[]>([])
  const [activeRuleSetId, setActiveRuleSetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'record' | 'template'>('record')
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [status, setStatus] = useState('completed')
  const [acquiredYear, setAcquiredYear] = useState(new Date().getFullYear())
  const [acquiredTerm, setAcquiredTerm] = useState('前期')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUserId(user.id)

    const profileRes = await supabase.from('user_profiles').select('active_rule_set_id').eq('user_id', user.id).single()
    const ruleSetId = profileRes.data?.active_rule_set_id
    setActiveRuleSetId(ruleSetId || null)

    if (ruleSetId) {
      const [coursesRes, categoriesRes, recordsRes] = await Promise.all([
        supabase.from('rule_set_courses').select('*, category:rule_set_categories(*)').eq('rule_set_id', ruleSetId).order('course_name'),
        supabase.from('rule_set_categories').select('*').eq('rule_set_id', ruleSetId).order('sort_order'),
        supabase.from('user_course_records').select('*, course:rule_set_courses(*)').eq('user_id', user.id).eq('rule_set_id', ruleSetId).order('created_at', { ascending: false }),
      ])
      setCourses(coursesRes.data || [])
      setCategories(categoriesRes.data || [])
      setRecords(recordsRes.data || [])
    }
  }

  useEffect(() => { fetchData() }, [])

  const recordedCourseIds = new Set(records.map(r => r.template_course_id).filter(Boolean))
  const unrecordedCourses = courses.filter(c => !recordedCourseIds.has(c.id))

  const totalCredits = records
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.course?.credits || r.custom_credits || 0), 0)

  const handleAddRecord = async () => {
    if (!selectedCourseId || !activeRuleSetId) return
    setLoading(true)
    try {
      await supabase.from('user_course_records').insert({
        user_id: userId,
        rule_set_id: activeRuleSetId,
        template_course_id: selectedCourseId,
        status,
        acquired_year: acquiredYear,
        acquired_term: acquiredTerm,
        grade: grade || null,
      })
      setSelectedCourseId(''); setGrade(''); setStatus('completed')
      setShowAddRecord(false)
      fetchData()
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (recordId: string, newStatus: string) => {
    await supabase.from('user_course_records').update({ status: newStatus }).eq('id', recordId)
    fetchData()
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('この履修記録を削除しますか？')) return
    await supabase.from('user_course_records').delete().eq('id', id)
    fetchData()
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">科目・履修管理</h1>
          <p className="text-base text-gray-500 mt-1">取得済み単位：{totalCredits}単位</p>
        </div>
        <Link href="/dashboard" className="text-base text-blue-500 hover:text-blue-700 font-medium">
          ← ホームに戻る
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!activeRuleSetId ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-base text-gray-400 mb-4">先にルールセットを設定してください</p>
            <Link href="/rules" className="text-base text-blue-600 hover:underline">ルール管理へ →</Link>
          </div>
        ) : (
          <>
            {/* タブ */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setActiveTab('record')}
                className={'flex-1 py-3 rounded-xl text-base font-medium transition-colors ' +
                  (activeTab === 'record' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300')}>
                履修記録
              </button>
              <button onClick={() => setActiveTab('template')}
                className={'flex-1 py-3 rounded-xl text-base font-medium transition-colors ' +
                  (activeTab === 'template' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300')}>
                科目一覧（テンプレート）
              </button>
            </div>

            {/* 履修記録タブ */}
            {activeTab === 'record' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-base text-gray-500">{records.length}件の履修記録</p>
                  <button onClick={() => setShowAddRecord(!showAddRecord)} disabled={unrecordedCourses.length === 0}
                    className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    + 履修を記録する
                  </button>
                </div>

                {showAddRecord && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-700">履修を記録する</h2>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">科目を選択 *</label>
                      <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">選択してください</option>
                        {unrecordedCourses.map(c => (
                          <option key={c.id} value={c.id}>{c.course_name}（{c.credits}単位）</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">履修状態 *</label>
                      <select value={status} onChange={e => setStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-sm text-gray-500 mb-1">年度</label>
                        <select value={acquiredYear} onChange={e => setAcquiredYear(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {years.map(y => <option key={y} value={y}>{y}年度</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm text-gray-500 mb-1">学期</label>
                        <select value={acquiredTerm} onChange={e => setAcquiredTerm(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {['前期', '後期', '通年', '集中'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <input type="text" placeholder="成績（任意）例：A、優" value={grade} onChange={e => setGrade(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-3">
                      <button onClick={handleAddRecord} disabled={loading || !selectedCourseId}
                        className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {loading ? '記録中...' : '記録する'}
                      </button>
                      <button onClick={() => setShowAddRecord(false)}
                        className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {records.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-base text-gray-400">履修記録がまだありません</p>
                    </div>
                  ) : (
                    records.map(record => {
                      const statusOption = STATUS_OPTIONS.find(s => s.value === record.status)
                      return (
                        <div key={record.id} className="flex items-center justify-between px-5 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-gray-800">
                                {record.course?.course_name || record.custom_course_name}
                              </span>
                              <span className={`text-sm px-2 py-0.5 rounded-full ${statusOption?.color}`}>
                                {statusOption?.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-400">
                                {record.course?.credits || record.custom_credits}単位
                              </span>
                              {record.acquired_year && (
                                <span className="text-sm text-gray-400">{record.acquired_year}年度 {record.acquired_term}</span>
                              )}
                              {record.grade && (
                                <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{record.grade}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select value={record.status} onChange={e => handleUpdateStatus(record.id, e.target.value)}
                              className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <button onClick={() => handleDeleteRecord(record.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* 科目テンプレートタブ */}
            {activeTab === 'template' && (
              <div className="space-y-4">
                <p className="text-base text-gray-500">ルールセットに含まれる科目一覧です</p>
                {categories.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <p className="text-base text-gray-400">科目がまだ登録されていません</p>
                    <Link href="/rules" className="text-base text-blue-600 hover:underline mt-2 block">ルール管理で科目を追加する →</Link>
                  </div>
                ) : (
                  categories.map(category => {
                    const categoryCourses = courses.filter(c => c.category_id === category.id)
                    if (categoryCourses.length === 0) return null
                    return (
                      <div key={category.id} className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-base font-semibold text-gray-700 mb-3">{category.name}</h3>
                        <div className="divide-y divide-gray-100">
                          {categoryCourses.map(course => {
                            const record = records.find(r => r.template_course_id === course.id)
                            const statusOption = STATUS_OPTIONS.find(s => s.value === record?.status)
                            return (
                              <div key={course.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base text-gray-800">{course.course_name}</span>
                                  {course.is_required && (
                                    <span className="text-sm bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-400">{course.credits}単位</span>
                                  {record ? (
                                    <span className={`text-sm px-2 py-0.5 rounded-full ${statusOption?.color}`}>
                                      {statusOption?.label}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-300">未記録</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}