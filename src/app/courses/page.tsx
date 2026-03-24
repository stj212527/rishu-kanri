'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { RuleSetCourse, RuleSetCategory, UserCourseRecord, SharedCourse } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const NAV_TABS = [
  { href: '/dashboard', label: 'ホーム' },
  { href: '/courses', label: '科目・履修' },
  { href: '/rules', label: 'ルール管理' },
  { href: '/setup', label: '基本情報' },
]

const STATUS_OPTIONS = [
  { value: 'completed', label: '取得済み', color: 'bg-green-100 text-green-700' },
  { value: 'in_progress', label: '履修中', color: 'bg-blue-100 text-blue-700' },
  { value: 'planned', label: '履修予定', color: 'bg-gray-100 text-gray-600' },
  { value: 'failed', label: '不合格', color: 'bg-red-100 text-red-600' },
]

type InputMode = 'template' | 'shared' | 'free'

export default function CoursesPage() {
  const [courses, setCourses] = useState<RuleSetCourse[]>([])
  const [categories, setCategories] = useState<RuleSetCategory[]>([])
  const [records, setRecords] = useState<UserCourseRecord[]>([])
  const [sharedCourses, setSharedCourses] = useState<SharedCourse[]>([])
  const [mySharedCourses, setMySharedCourses] = useState<SharedCourse[]>([])
  const [activeRuleSetId, setActiveRuleSetId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'record' | 'template'>('record')
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('template')

  // テンプレート入力
  const [selectedCourseId, setSelectedCourseId] = useState('')
  // 共有科目入力
  const [selectedSharedCourseId, setSelectedSharedCourseId] = useState('')
  const [sharedSearchKeyword, setSharedSearchKeyword] = useState('')
  const [sharedSearchUniversity, setSharedSearchUniversity] = useState('')
  const [showSharedDetail, setShowSharedDetail] = useState<string | null>(null)
  // 自由入力
  const [freeName, setFreeName] = useState('')
  const [freeCredits, setFreeCredits] = useState(2)
  const [freeCategoryName, setFreeCategoryName] = useState('')
  const [freeIsRequired, setFreeIsRequired] = useState(false)
  const [freeIsPublic, setFreeIsPublic] = useState(false)
  // 共通
  const [status, setStatus] = useState('completed')
  const [acquiredYear, setAcquiredYear] = useState(new Date().getFullYear())
  const [acquiredTerm, setAcquiredTerm] = useState('前期')
  const [grade, setGrade] = useState('')
  const [memo, setMemo] = useState('')

  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState('')
  const [userProfile, setUserProfile] = useState<{university_name: string, faculty_name: string} | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUserId(user.id)

    const profileRes = await supabase.from('user_profiles').select('active_rule_set_id, university_name, faculty_name').eq('user_id', user.id).single()
    const ruleSetId = profileRes.data?.active_rule_set_id
    setActiveRuleSetId(ruleSetId || null)
    setUserProfile(profileRes.data ? { university_name: profileRes.data.university_name, faculty_name: profileRes.data.faculty_name } : null)

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

    // 共有科目取得
    const [sharedRes, mySharedRes] = await Promise.all([
      supabase.from('shared_courses').select('*').eq('is_public', true).neq('created_by', user.id).order('created_at', { ascending: false }),
      supabase.from('shared_courses').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
    ])
    setSharedCourses(sharedRes.data || [])
    setMySharedCourses(mySharedRes.data || [])
  }

  useEffect(() => { fetchData() }, [])

  const recordedCourseIds = new Set(records.map(r => r.template_course_id).filter(Boolean))
  const unrecordedCourses = courses.filter(c => !recordedCourseIds.has(c.id))
  const totalCredits = records.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.course?.credits || r.custom_credits || 0), 0)

  const filteredSharedCourses = sharedCourses.filter(c => {
    const kMatch = !sharedSearchKeyword || c.course_name.includes(sharedSearchKeyword)
    const uMatch = !sharedSearchUniversity || (c.university_name || '').includes(sharedSearchUniversity)
    return kMatch && uMatch
  })

  const handleAddRecord = async () => {
    if (!activeRuleSetId) return
    setLoading(true)
    try {
      if (inputMode === 'template') {
        if (!selectedCourseId) return
        await supabase.from('user_course_records').insert({
          user_id: userId, rule_set_id: activeRuleSetId,
          template_course_id: selectedCourseId,
          status, acquired_year: acquiredYear, acquired_term: acquiredTerm,
          grade: grade || null, memo: memo || null,
        })
      } else if (inputMode === 'shared') {
        if (!selectedSharedCourseId) return
        const sc = sharedCourses.find(c => c.id === selectedSharedCourseId)
        if (!sc) return
        await supabase.from('user_course_records').insert({
          user_id: userId, rule_set_id: activeRuleSetId,
          shared_course_id: selectedSharedCourseId,
          custom_course_name: sc.course_name,
          custom_credits: sc.credits,
          status, acquired_year: acquiredYear, acquired_term: acquiredTerm,
          grade: grade || null, memo: memo || null,
        })
      } else {
        if (!freeName) return
        // 自由入力の場合、公開設定があれば共有科目テーブルにも登録
        if (freeIsPublic) {
          await supabase.from('shared_courses').insert({
            created_by: userId, course_name: freeName, credits: freeCredits,
            category_name: freeCategoryName || null,
            university_name: userProfile?.university_name || null,
            faculty_name: userProfile?.faculty_name || null,
            is_required: freeIsRequired, is_public: true,
          })
        }
        await supabase.from('user_course_records').insert({
          user_id: userId, rule_set_id: activeRuleSetId,
          custom_course_name: freeName, custom_credits: freeCredits,
          status, acquired_year: acquiredYear, acquired_term: acquiredTerm,
          grade: grade || null, memo: memo || null,
        })
      }
      // フォームリセット
      setSelectedCourseId(''); setSelectedSharedCourseId(''); setFreeName('')
      setFreeCredits(2); setFreeCategoryName(''); setFreeIsRequired(false); setFreeIsPublic(false)
      setGrade(''); setMemo(''); setStatus('completed')
      setShowAddRecord(false)
      fetchData()
    } finally { setLoading(false) }
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

  const handleToggleSharedCoursePublic = async (id: string, currentPublic: boolean) => {
    await supabase.from('shared_courses').update({ is_public: !currentPublic }).eq('id', id)
    fetchData()
  }

  const handleDeleteSharedCourse = async (id: string) => {
    if (!confirm('この共有科目を削除しますか？')) return
    await supabase.from('shared_courses').delete().eq('id', id)
    fetchData()
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  const getCourseName = (record: UserCourseRecord) => record.course?.course_name || record.custom_course_name || '不明'
  const getCourseCredits = (record: UserCourseRecord) => record.course?.credits || record.custom_credits || 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">履修管理ツール</h1>
              <p className="text-sm text-gray-500">取得済み単位：{totalCredits}単位</p>
            </div>
          </div>
          <div className="flex gap-1 -mb-px">
            {NAV_TABS.map(tab => (
              <Link key={tab.href} href={tab.href}
                className={'px-4 py-2.5 text-base font-medium border-b-2 transition-colors ' +
                  (tab.href === '/courses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {!activeRuleSetId ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-base text-gray-400 mb-4">先にルールセットを設定してください</p>
            <Link href="/rules" className="text-base text-blue-600 hover:underline">ルール管理へ →</Link>
          </div>
        ) : (
          <>
            {/* タブ */}
            <div className="flex gap-2 mb-5">
              <button onClick={() => setActiveTab('record')}
                className={'flex-1 py-3 rounded-xl text-base font-medium transition-colors ' +
                  (activeTab === 'record' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300')}>
                履修記録
              </button>
              <button onClick={() => setActiveTab('template')}
                className={'flex-1 py-3 rounded-xl text-base font-medium transition-colors ' +
                  (activeTab === 'template' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300')}>
                科目一覧
              </button>
            </div>

            {/* 履修記録タブ */}
            {activeTab === 'record' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-base text-gray-500">{records.length}件の履修記録</p>
                  <button onClick={() => setShowAddRecord(!showAddRecord)}
                    className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
                    + 履修を記録する
                  </button>
                </div>

                {showAddRecord && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                    <h2 className="text-base font-semibold text-gray-700">履修を記録する</h2>

                    {/* 入力モード選択 */}
                    <div className="flex gap-2">
                      {[
                        { mode: 'template' as InputMode, label: 'ルール内の科目' },
                        { mode: 'shared' as InputMode, label: '共有科目から選ぶ' },
                        { mode: 'free' as InputMode, label: '自由入力' },
                      ].map(({ mode, label }) => (
                        <button key={mode} onClick={() => setInputMode(mode)}
                          className={'flex-1 py-2 text-sm rounded-lg font-medium transition-colors ' +
                            (inputMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* テンプレート入力 */}
                    {inputMode === 'template' && (
                      <div>
                        <label className="block text-sm text-gray-500 mb-1">科目を選択 *</label>
                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">選択してください</option>
                          {unrecordedCourses.map(c => (
                            <option key={c.id} value={c.id}>{c.course_name}（{c.credits}単位）</option>
                          ))}
                        </select>
                        {unrecordedCourses.length === 0 && (
                          <p className="text-sm text-gray-400 mt-1">すべての科目が記録済みです</p>
                        )}
                      </div>
                    )}

                    {/* 共有科目入力 */}
                    {inputMode === 'shared' && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input type="text" placeholder="大学名で絞り込み" value={sharedSearchUniversity} onChange={e => setSharedSearchUniversity(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          <input type="text" placeholder="科目名で検索" value={sharedSearchKeyword} onChange={e => setSharedSearchKeyword(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <p className="text-sm text-gray-400">{filteredSharedCourses.length}件</p>
                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                          {filteredSharedCourses.length === 0 ? (
                            <p className="text-base text-gray-400 p-4 text-center">共有科目がありません</p>
                          ) : (
                            filteredSharedCourses.map(c => (
                              <div key={c.id}>
                                <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                                  <input type="radio" name="sharedCourse" value={c.id}
                                    checked={selectedSharedCourseId === c.id}
                                    onChange={() => setSelectedSharedCourseId(c.id)}
                                    className="mt-1 w-4 h-4" />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-base text-gray-800 font-medium">{c.course_name}</span>
                                      <span className="text-sm text-gray-400">{c.credits}単位</span>
                                      {c.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>}
                                    </div>
                                    {(c.university_name || c.category_name) && (
                                      <p className="text-sm text-gray-400 mt-0.5">{c.university_name} {c.faculty_name} {c.category_name && '/ ' + c.category_name}</p>
                                    )}
                                    {c.note && <p className="text-sm text-gray-500 mt-0.5">{c.note}</p>}
                                  </div>
                                  <button onClick={e => { e.preventDefault(); setShowSharedDetail(showSharedDetail === c.id ? null : c.id) }}
                                    className="text-sm text-blue-400 hover:text-blue-600 whitespace-nowrap">
                                    {showSharedDetail === c.id ? '閉じる' : '詳細'}
                                  </button>
                                </label>
                                {showSharedDetail === c.id && (
                                  <div className="bg-blue-50 px-4 py-3 text-sm text-gray-600 space-y-1">
                                    <p>科目名：{c.course_name}</p>
                                    <p>単位数：{c.credits}単位</p>
                                    {c.category_name && <p>区分：{c.category_name}</p>}
                                    {c.university_name && <p>大学：{c.university_name} {c.faculty_name}</p>}
                                    {c.is_required && <p>必修：あり</p>}
                                    {c.note && <p>備考：{c.note}</p>}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* 自由入力 */}
                    {inputMode === 'free' && (
                      <div className="space-y-3">
                        <input type="text" placeholder="科目名 *" value={freeName} onChange={e => setFreeName(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-sm text-gray-500 mb-1">単位数</label>
                            <select value={freeCredits} onChange={e => setFreeCredits(Number(e.target.value))}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}単位</option>)}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm text-gray-500 mb-1">区分名（任意）</label>
                            <input type="text" placeholder="例：専門必修" value={freeCategoryName} onChange={e => setFreeCategoryName(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={freeIsRequired} onChange={e => setFreeIsRequired(e.target.checked)} className="w-4 h-4 rounded" />
                          <span className="text-base text-gray-700">必修科目</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={freeIsPublic} onChange={e => setFreeIsPublic(e.target.checked)} className="w-4 h-4 rounded" />
                          <span className="text-base text-gray-700">この科目を他のユーザーと共有する</span>
                        </label>
                        {freeIsPublic && (
                          <p className="text-sm text-blue-500 bg-blue-50 rounded-lg px-3 py-2">
                            あなたの大学・学部情報とともに公開されます
                          </p>
                        )}
                      </div>
                    )}

                    {/* 共通入力フィールド */}
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
                    <textarea placeholder="備考（任意）" value={memo} onChange={e => setMemo(e.target.value)} rows={2}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-3">
                      <button onClick={handleAddRecord} disabled={loading || (inputMode === 'template' && !selectedCourseId) || (inputMode === 'shared' && !selectedSharedCourseId) || (inputMode === 'free' && !freeName)}
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

                {/* 履修記録一覧 */}
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {records.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-base text-gray-400">履修記録がまだありません</p>
                    </div>
                  ) : (
                    records.map(record => {
                      const statusOption = STATUS_OPTIONS.find(s => s.value === record.status)
                      return (
                        <div key={record.id} className="px-4 py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-base font-medium text-gray-800">{getCourseName(record)}</span>
                                <span className={`text-sm px-2 py-0.5 rounded-full ${statusOption?.color}`}>{statusOption?.label}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-sm text-gray-400">{getCourseCredits(record)}単位</span>
                                {record.acquired_year && <span className="text-sm text-gray-400">{record.acquired_year}年度 {record.acquired_term}</span>}
                                {record.grade && <span className="text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{record.grade}</span>}
                              </div>
                              {record.memo && <p className="text-sm text-gray-500 mt-1">{record.memo}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <select value={record.status} onChange={e => handleUpdateStatus(record.id, e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              <button onClick={() => handleDeleteRecord(record.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* 自分の共有科目管理 */}
                {mySharedCourses.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-base font-semibold text-gray-700 mb-3">自分が共有した科目</h3>
                    <div className="divide-y divide-gray-100">
                      {mySharedCourses.map(c => (
                        <div key={c.id} className="flex items-center justify-between py-3">
                          <div>
                            <span className="text-base text-gray-800">{c.course_name}</span>
                            <span className="text-sm text-gray-400 ml-2">{c.credits}単位</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.is_public ? '公開中' : '非公開'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleToggleSharedCoursePublic(c.id, c.is_public)}
                              className="text-sm text-blue-500 hover:text-blue-700">
                              {c.is_public ? '非公開にする' : '公開する'}
                            </button>
                            <button onClick={() => handleDeleteSharedCourse(c.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 科目一覧タブ */}
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
                                  {course.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-400">{course.credits}単位</span>
                                  {record ? (
                                    <span className={`text-sm px-2 py-0.5 rounded-full ${statusOption?.color}`}>{statusOption?.label}</span>
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