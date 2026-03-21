'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [universityName, setUniversityName] = useState('')
  const [facultyName, setFacultyName] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [entryYear, setEntryYear] = useState(new Date().getFullYear())
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

      if (existing) {
        await supabase.from('user_profiles').update({
          university_name: universityName,
          faculty_name: facultyName,
          department_name: departmentName,
          entry_year: entryYear,
        }).eq('user_id', user.id)
      } else {
        await supabase.from('user_profiles').insert({
          user_id: user.id,
          university_name: universityName,
          faculty_name: facultyName,
          department_name: departmentName,
          entry_year: entryYear,
        })
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
        <h1 className="text-xl font-bold text-gray-900 mb-1">基本情報の設定</h1>
        <p className="text-sm text-gray-500 mb-6">あなたの大学・学部情報を入力してください</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">大学名</label>
            <input
              type="text"
              value={universityName}
              onChange={e => setUniversityName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="〇〇大学"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学部名</label>
            <input
              type="text"
              value={facultyName}
              onChange={e => setFacultyName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="〇〇学部"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学科名</label>
            <input
              type="text"
              value={departmentName}
              onChange={e => setDepartmentName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="〇〇学科"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">入学年度</label>
            <select
              value={entryYear}
              onChange={e => setEntryYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {years.map(y => <option key={y} value={y}>{y}年度</option>)}
            </select>
          </div>

          {message && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-2">{message}</p>
          )}

          <button
            onClick={handleSave}
            disabled={loading || !universityName || !facultyName || !departmentName}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '保存中...' : '保存してダッシュボードへ'}
          </button>
        </div>
      </div>
    </div>
  )
}
