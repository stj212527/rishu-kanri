'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Course, Category } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [credits, setCredits] = useState(2)
  const [categoryId, setCategoryId] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const [coursesRes, categoriesRes] = await Promise.all([
      supabase.from('courses').select('*, category:categories(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('user_id', user.id),
    ])
    setCourses(coursesRes.data || [])
    setCategories(categoriesRes.data || [])
  }

  useEffect(() => { fetchData() }, [])

  const handleAdd = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('courses').insert({
        user_id: user.id,
        course_name: courseName,
        course_code: courseCode || null,
        credits,
        category_id: categoryId || null,
        is_required: isRequired,
        note: note || null,
      })
      setCourseName(''); setCourseCode(''); setCredits(2); setCategoryId(''); setIsRequired(false); setNote('')
      setShowForm(false)
      fetchData()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この科目を削除しますか？')) return
    await supabase.from('courses').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">科目管理</h1>
        <Link href="/dashboard" className="text-base text-blue-500 hover:text-blue-700 font-medium">
          ← ホームに戻る
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-base text-gray-500">{courses.length}件の科目</p>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 科目を追加
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
            <h2 className="text-base font-semibold text-gray-700 mb-4">新しい科目</h2>
            <div className="space-y-3">
              <input type="text" placeholder="科目名 *" value={courseName} onChange={e => setCourseName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="科目コード（任意）" value={courseCode} onChange={e => setCourseCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">単位数</label>
                  <select value={credits} onChange={e => setCredits(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}単位</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">区分</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">未分類</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-base text-gray-700">必修科目</span>
              </label>
              <textarea placeholder="備考（任意）" value={note} onChange={e => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
              <div className="flex gap-3">
                <button onClick={handleAdd} disabled={loading || !courseName}
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
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base text-gray-400">科目がまだ登録されていません</p>
            </div>
          ) : (
            courses.map(course => (
              <div key={course.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-gray-800">{course.course_name}</span>
                    {course.is_required && (
                      <span className="text-sm bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-400">{course.credits}単位</span>
                    {course.category && <span className="text-sm text-blue-500">{(course.category as { name: string }).name}</span>}
                    {course.course_code && <span className="text-sm text-gray-400">{course.course_code}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(course.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}