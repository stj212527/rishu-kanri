'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Course, CompletedCourse } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CompletedPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [acquiredYear, setAcquiredYear] = useState(new Date().getFullYear())
  const [acquiredTerm, setAcquiredTerm] = useState('前期')
  const [grade, setGrade] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const [coursesRes, completedRes] = await Promise.all([
      supabase.from('courses').select('*, category:categories(*)').eq('user_id', user.id),
      supabase.from('completed_courses').select('*, course:courses(*, category:categories(*))').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setCourses(coursesRes.data || [])
    setCompletedCourses(completedRes.data || [])
  }

  useEffect(() => { fetchData() }, [])

  const completedIds = new Set(completedCourses.map(cc => cc.course_id))
  const availableCourses = courses.filter(c => !completedIds.has(c.id))
  const totalCredits = courses
    .filter(c => completedIds.has(c.id))
    .reduce((sum, c) => sum + c.credits, 0)

  const handleAdd = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('completed_courses').insert({
        user_id: user.id,
        course_id: selectedCourseId,
        acquired_year: acquiredYear,
        acquired_term: acquiredTerm,
        grade: grade || null,
      })
      setSelectedCourseId(''); setGrade('')
      setShowForm(false)
      fetchData()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('履修記録を削除しますか？')) return
    await supabase.from('completed_courses').delete().eq('id', id)
    fetchData()
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">履修済み登録</h1>
          <p className="text-base text-gray-500 mt-1">合計取得単位：{totalCredits}単位</p>
        </div>
        <Link href="/dashboard" className="text-base text-blue-500 hover:text-blue-700 font-medium">
          ← ホームに戻る
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-base text-gray-500">{completedCourses.length}件の履修記録</p>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={availableCourses.length === 0}
            className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            + 履修済みを追加
          </button>
        </div>

        {courses.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p className="text-base text-yellow-700">先に<Link href="/courses" className="underline">科目管理</Link>で科目を登録してください。</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">履修済み科目を追加</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">科目を選択 *</label>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">選択してください</option>
                  {availableCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.course_name}（{c.credits}単位）</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">修得年度</label>
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
              <input type="text" placeholder="成績（任意）例：A、B、優、良" value={grade} onChange={e => setGrade(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={loading || !selectedCourseId}
                  className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {loading ? '追加中...' : '追加する'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {completedCourses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base text-gray-400">履修記録がまだありません</p>
            </div>
          ) : (
            completedCourses.map(cc => (
              <div key={cc.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-800">{cc.course?.course_name}</span>
                    {cc.grade && <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{cc.grade}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-400">{cc.course?.credits}単位</span>
                    {cc.acquired_year && <span className="text-sm text-gray-400">{cc.acquired_year}年度 {cc.acquired_term}</span>}
                    {cc.course?.category && <span className="text-sm text-blue-500">{(cc.course.category as { name: string }).name}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(cc.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}