'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [universityName, setUniversityName] = useState('')
  const [facultyName, setFacultyName] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [entryYear, setEntryYear] = useState(new Date().getFullYear())
  const [currentYear, setCurrentYear] = useState(1)
  const [currentTerm, setCurrentTerm] = useState(1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      if (data) {
        setUniversityName(data.university_name)
        setFacultyName(data.faculty_name)
        setDepartmentName(data.department_name)
        setEntryYear(data.entry_year)
        setCurrentYear(data.current_year || 1)
        setCurrentTerm(data.current_term || 1)
      }
    }
    fetchProfile()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setMessage('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ログインが必要です')
      const { data: existing } = await supabase.from('user_profiles').select('id').eq('user_id', user.id).single()
      const payload = {
        university_name: universityName,
        faculty_name: facultyName,
        department_name: departmentName,
        entry_year: entryYear,
        current_year: currentYear,
        current_term: currentTerm,
      }
      if (existing) {
        await supabase.from('user_profiles').update(payload).eq('user_id', user.id)
      } else {
        await supabase.from('user_profiles').insert({ user_id: user.id, ...payload })
      }
      setMessage('保存しました')
      setTimeout(() => router.push('/dashboard'), 1000)
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">基本情報の設定</h1>
        <p className="text-base text-gray-500 mb-6">大学・学部情報と現在の学年を入力してください</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">大学名</label>
            <input type="text" value={universityName} onChange={e => setUniversityName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="〇〇大学" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学部名</label>
            <input type="text" value={facultyName} onChange={e => setFacultyName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="〇〇学部" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学科名</label>
            <input type="text" value={departmentName} onChange={e => setDepartmentName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="〇〇学科" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">入学年度</label>
            <select value={entryYear} onChange={e => setEntryYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
              {years.map(y => <option key={y} value={y}>{y}年度</option>)}
            </select>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">現在の学年・学期</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-500 mb-1">学年</label>
                <select value={currentYear} onChange={e => setCurrentYear(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[1,2,3,4,5,6].map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-500 mb-1">学期</label>
                <select value={currentTerm} onChange={e => setCurrentTerm(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[1,2,3,4].map(t => <option key={t} value={t}>{t}学期</option>)}
                </select>
              </div>
            </div>
          </div>

          {message && (
            <p className="text-base text-green-600 bg-green-50 rounded-lg px-4 py-2">{message}</p>
          )}
          <button onClick={handleSave} disabled={loading || !universityName || !facultyName || !departmentName}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-base font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? '保存中...' : '保存してダッシュボードへ'}
          </button>
          <button onClick={() => router.push('/dashboard')} className="w-full text-base text-gray-400 hover:text-gray-600">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}