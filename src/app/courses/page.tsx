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

// 【改善5】単位数の選択肢を拡張（0.5〜8単位）
const CREDIT_OPTIONS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8]

type InputMode = 'template' | 'shared' | 'free'

export default function CoursesPage() {
  const [courses, setCourses] = useState<RuleSetCourse[]>([])
  const [categories, setCategories] = useState<RuleSetCategory[]>([])
  const [records, setRecords] = useState<UserCourseRecord[]>([])
  const [sharedCourses, setSharedCourses] = useState<SharedCourse[]>([])
  const [mySharedCourses, setMySharedCourses] = useState<SharedCourse[]>([])
  const [activeRuleSetId, setActiveRuleSetId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<{ university_name: string, faculty_name: string } | null>(null)
  // 【バグ3修正】current_year / current_term を取得するために型を拡張
  const [currentYear, setCurrentYear] = useState<number>(1)
  const [currentTerm, setCurrentTerm] = useState<number>(1)
  const [entryYear, setEntryYear] = useState<number>(new Date().getFullYear())
  const [userId, setUserId] = useState('')

  const [showAddRecord, setShowAddRecord] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('template')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedSharedCourseId, setSelectedSharedCourseId] = useState('')
  const [freeName, setFreeName] = useState('')
  const [freeCredits, setFreeCredits] = useState(2)
  const [freeCategoryName, setFreeCategoryName] = useState('')
  const [freeIsRequired, setFreeIsRequired] = useState(false)
  const [freeNote, setFreeNote] = useState('')
  const [freeIsPublic, setFreeIsPublic] = useState(false)
  const [status, setStatus] = useState('completed')
  const [acquiredYear, setAcquiredYear] = useState(new Date().getFullYear())
  const [acquiredTerm, setAcquiredTerm] = useState('前期')
  const [grade, setGrade] = useState('')
  const [memo, setMemo] = useState('')
  const [sharedSearchKeyword, setSharedSearchKeyword] = useState('')
  const [sharedSearchUniversity, setSharedSearchUniversity] = useState('')
  const [showSharedDetail, setShowSharedDetail] = useState<string | null>(null)

  const [showMySharedForm, setShowMySharedForm] = useState(false)
  const [myCourseName, setMyCourseName] = useState('')
  const [myCourseCredits, setMyCourseCredits] = useState(2)
  const [myCourseCategoryName, setMyCourseCategoryName] = useState('')
  const [myCourseIsRequired, setMyCourseIsRequired] = useState(false)
  const [myCourseNote, setMyCourseNote] = useState('')
  const [myCourseIsPublic, setMyCourseIsPublic] = useState(false)

  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchUniversity, setSearchUniversity] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [showAllPublic, setShowAllPublic] = useState(false)
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUserId(user.id)
    // 【バグ3修正】current_year, current_term, entry_year も取得
    const profileRes = await supabase
      .from('user_profiles')
      .select('active_rule_set_id, university_name, faculty_name, current_year, current_term, entry_year')
      .eq('user_id', user.id)
      .single()
    const ruleSetId = profileRes.data?.active_rule_set_id
    setActiveRuleSetId(ruleSetId || null)
    setUserProfile(profileRes.data ? { university_name: profileRes.data.university_name, faculty_name: profileRes.data.faculty_name } : null)
    setCurrentYear(profileRes.data?.current_year || 1)
    setCurrentTerm(profileRes.data?.current_term || 1)
    setEntryYear(profileRes.data?.entry_year || new Date().getFullYear())

    if (ruleSetId) {
      const [coursesRes, categoriesRes, recordsRes] = await Promise.all([
        supabase.from('rule_set_courses').select('*, category:rule_set_categories(*)').eq('rule_set_id', ruleSetId).order('course_name'),
        supabase.from('rule_set_categories').select('*').eq('rule_set_id', ruleSetId).order('sort_order'),
        // 【バグ1修正（dashboard側）】rule_set_id 条件を追加して他ルールセットのrecordを除外
        supabase.from('user_course_records').select('*, course:rule_set_courses(*)')
          .eq('user_id', user.id)
          .eq('rule_set_id', ruleSetId)
          .order('created_at', { ascending: false }),
      ])
      setCourses(coursesRes.data || [])
      setCategories(categoriesRes.data || [])
      setRecords(recordsRes.data || [])
    }

    // 【バグ1修正】共有科目: 他ユーザーの公開 + 自分のものも含めて取得
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

  const filteredPublicCourses = sharedCourses.filter(c => {
    const kMatch = !searchKeyword || c.course_name.includes(searchKeyword)
    const uMatch = !searchUniversity || (c.university_name || '').includes(searchUniversity)
    const cMatch = !searchCategory || (c.category_name || '').includes(searchCategory)
    return kMatch && uMatch && cMatch
  })
  const displayedPublicCourses = showAllPublic ? filteredPublicCourses : filteredPublicCourses.slice(0, 3)

  // 【バグ1修正】filteredSharedForRecord: sharedCourses に加えて mySharedCourses も含める
  const allSharedForRecord = [...sharedCourses, ...mySharedCourses]
  const filteredSharedForRecord = allSharedForRecord.filter(c => {
    const kMatch = !sharedSearchKeyword || c.course_name.includes(sharedSearchKeyword)
    const uMatch = !sharedSearchUniversity || (c.university_name || '').includes(sharedSearchUniversity)
    return kMatch && uMatch
  })

  // 【バグ3修正】acquiredYear/Term が現在より未来かどうか判定
  const isFutureTerm = () => {
    const termToNum = (t: string) => {
      if (t === '前期') return 1
      if (t === '後期') return 2
      if (t === '3学期') return 3
      return 4
    }
    const yearDiff = acquiredYear - entryYear + 1
    const termNum = termToNum(acquiredTerm)
    if (yearDiff > currentYear) return true
    if (yearDiff === currentYear && termNum > currentTerm) return true
    return false
  }

  const handleAddRecord = async () => {
    if (!activeRuleSetId) return
    setLoading(true)
    try {
      if (inputMode === 'template') {
        if (!selectedCourseId) return

        // 【バグ2修正】同じ template_course_id の重複チェック
        const duplicate = records.find(r => r.template_course_id === selectedCourseId)
        if (duplicate) {
          alert('この科目はすでに履修記録に登録されています。ステータスを変更する場合は一覧から変更してください。')
          return
        }

        await supabase.from('user_course_records').insert({
          user_id: userId, rule_set_id: activeRuleSetId,
          template_course_id: selectedCourseId, status,
          acquired_year: acquiredYear, acquired_term: acquiredTerm,
          grade: grade || null, memo: memo || null
        })
      } else if (inputMode === 'shared') {
        if (!selectedSharedCourseId) return
        const sc = allSharedForRecord.find(c => c.id === selectedSharedCourseId)
        if (!sc) return
        await supabase.from('user_course_records').insert({
          user_id: userId, rule_set_id: activeRuleSetId,
          shared_course_id: selectedSharedCourseId,
          custom_course_name: sc.course_name, custom_credits: sc.credits,
          status, acquired_year: acquiredYear, acquired_term: acquiredTerm,
          grade: grade || null, memo: memo || null
        })
      } else {
        if (!freeName) return
        if (freeIsPublic) {
          await supabase.from('shared_courses').insert({
            created_by: userId, course_name: freeName, credits: freeCredits,
            category_name: freeCategoryName || null,
            university_name: userProfile?.university_name || null,
            faculty_name: userProfile?.faculty_name || null,
            is_required: freeIsRequired, note: freeNote || null, is_public: true
          })
        }
        await supabase.from('user_course_records').insert({
          user_id: userId, rule_set_id: activeRuleSetId,
          custom_course_name: freeName, custom_credits: freeCredits,
          status, acquired_year: acquiredYear, acquired_term: acquiredTerm,
          grade: grade || null, memo: memo || null
        })
      }
      setSelectedCourseId(''); setSelectedSharedCourseId(''); setFreeName(''); setFreeCredits(2)
      setFreeCategoryName(''); setFreeIsRequired(false); setFreeNote(''); setFreeIsPublic(false)
      setGrade(''); setMemo(''); setStatus('completed'); setShowAddRecord(false)
      fetchData()
    } finally { setLoading(false) }
  }

  const handleAddMySharedCourse = async () => {
    if (!myCourseName) return
    setLoading(true)
    try {
      await supabase.from('shared_courses').insert({
        created_by: userId, course_name: myCourseName, credits: myCourseCredits,
        category_name: myCourseCategoryName || null,
        university_name: userProfile?.university_name || null,
        faculty_name: userProfile?.faculty_name || null,
        is_required: myCourseIsRequired, note: myCourseNote || null, is_public: myCourseIsPublic
      })
      setMyCourseName(''); setMyCourseCredits(2); setMyCourseCategoryName('')
      setMyCourseIsRequired(false); setMyCourseNote(''); setMyCourseIsPublic(false)
      setShowMySharedForm(false)
      fetchData()
    } finally { setLoading(false) }
  }

  // 【改善6】コピー時「（コピー）」を削除
  const handleCopyCourse = async (course: SharedCourse) => {
    setLoading(true)
    try {
      await supabase.from('shared_courses').insert({
        created_by: userId,
        course_name: course.course_name, // ← ' (コピー)' を削除
        credits: course.credits, category_name: course.category_name,
        university_name: course.university_name, faculty_name: course.faculty_name,
        is_required: course.is_required, note: course.note, is_public: false
      })
      alert('科目をコピーしました')
      fetchData()
    } finally { setLoading(false) }
  }

  const handleUpdateStatus = async (id: string, s: string) => {
    await supabase.from('user_course_records').update({ status: s }).eq('id', id)
    fetchData()
  }
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('user_course_records').delete().eq('id', id)
    fetchData()
  }
  const handleTogglePublic = async (id: string, cur: boolean) => {
    await supabase.from('shared_courses').update({ is_public: !cur }).eq('id', id)
    fetchData()
  }
  const handleDeleteMyShared = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('shared_courses').delete().eq('id', id)
    fetchData()
  }

  const getCourseName = (r: UserCourseRecord) => r.course?.course_name || r.custom_course_name || '不明'
  const getCourseCredits = (r: UserCourseRecord) => r.course?.credits || r.custom_credits || 0
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  // 【バグ3修正】completedが選択不可かどうかを判定
  const isCompletedDisabled = status === 'completed' && isFutureTerm()

  return (
    <div className="min-h-screen bg-gray-50">
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
                  (tab.href === '/courses' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* 履修記録 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">履修記録</h2>
            <button onClick={() => setShowAddRecord(!showAddRecord)}
              className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              + 履修を記録する
            </button>
          </div>

          {showAddRecord && (
            <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
              <h3 className="text-base font-semibold text-gray-700">履修を記録する</h3>
              <div className="flex gap-2">
                {([{ mode: 'template' as InputMode, label: 'ルール内の科目' }, { mode: 'shared' as InputMode, label: '共有科目から' }, { mode: 'free' as InputMode, label: '自由入力' }]).map(({ mode, label }) => (
                  <button key={mode} onClick={() => setInputMode(mode)}
                    className={'flex-1 py-2 text-sm rounded-lg font-medium transition-colors ' + (inputMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                    {label}
                  </button>
                ))}
              </div>

              {inputMode === 'template' && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">科目を選択 *</label>
                  <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">選択してください</option>
                    {unrecordedCourses.map(c => <option key={c.id} value={c.id}>{c.course_name}（{c.credits}単位）</option>)}
                  </select>
                </div>
              )}

              {inputMode === 'shared' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input type="text" placeholder="大学名" value={sharedSearchUniversity} onChange={e => setSharedSearchUniversity(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="text" placeholder="科目名で検索" value={sharedSearchKeyword} onChange={e => setSharedSearchKeyword(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  {/* 【バグ1修正】filteredSharedForRecord（自分の科目も含む）を表示 */}
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {filteredSharedForRecord.length === 0 ? (
                      <p className="text-base text-gray-400 p-4 text-center">共有科目がありません</p>
                    ) : filteredSharedForRecord.map(c => (
                      <div key={c.id}>
                        <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="sharedCourse" value={c.id} checked={selectedSharedCourseId === c.id} onChange={() => setSelectedSharedCourseId(c.id)} className="mt-1 w-4 h-4" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-base font-medium text-gray-800">{c.course_name}</span>
                              <span className="text-sm text-gray-400">{c.credits}単位</span>
                              {c.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">必修</span>}
                              {c.category_name && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{c.category_name}</span>}
                            </div>
                            {c.university_name && <p className="text-sm text-gray-400 mt-0.5">{c.university_name} {c.faculty_name}</p>}
                          </div>
                          <button onClick={e => { e.preventDefault(); setShowSharedDetail(showSharedDetail === c.id ? null : c.id) }}
                            className="text-sm text-blue-400 hover:text-blue-600 whitespace-nowrap">
                            {showSharedDetail === c.id ? '閉じる' : '詳細'}
                          </button>
                        </label>
                        {showSharedDetail === c.id && (
                          <div className="bg-blue-50 px-5 py-3 text-sm text-gray-600 space-y-1">
                            <p>単位数：{c.credits}単位</p>
                            {c.category_name && <p>区分：{c.category_name}</p>}
                            {c.university_name && <p>大学：{c.university_name} {c.faculty_name}</p>}
                            <p>必修：{c.is_required ? 'あり' : 'なし'}</p>
                            {c.note && <p>備考：{c.note}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inputMode === 'free' && (
                <div className="space-y-3">
                  <input type="text" placeholder="科目名 *" value={freeName} onChange={e => setFreeName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500 mb-1">単位数</label>
                      {/* 【改善5】単位数の選択肢を拡張 */}
                      <select value={freeCredits} onChange={e => setFreeCredits(Number(e.target.value))}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {CREDIT_OPTIONS.map(n => <option key={n} value={n}>{n}単位</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500 mb-1">区分名（任意）</label>
                      <input type="text" placeholder="例：専門必修" value={freeCategoryName} onChange={e => setFreeCategoryName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">※ TOEICなどの特例単位は科目名に「英語免除」などと記入し、該当区分を入力してください</p>
                  <input type="text" placeholder="備考（任意）" value={freeNote} onChange={e => setFreeNote(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={freeIsRequired} onChange={e => setFreeIsRequired(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-base text-gray-700">必修科目</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={freeIsPublic} onChange={e => setFreeIsPublic(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-base text-gray-700">他のユーザーと共有する</span>
                  </label>
                  {freeIsPublic && <p className="text-sm text-blue-500 bg-blue-50 rounded-lg px-3 py-2">あなたの大学・学部情報とともに公開されます</p>}
                </div>
              )}

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

              {/* 【バグ3修正】未来学期で「取得済み」を選択している場合に警告表示 */}
              {isCompletedDisabled && (
                <p className="text-sm text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                  ⚠ 未来の学期では「取得済み」は選択できません。「履修予定」または「履修中」に変更してください。
                </p>
              )}

              <input type="text" placeholder="成績（任意）例：A、優" value={grade} onChange={e => setGrade(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <textarea placeholder="備考（任意）" value={memo} onChange={e => setMemo(e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-3">
                <button onClick={handleAddRecord}
                  disabled={
                    loading ||
                    isCompletedDisabled || // 【バグ3修正】未来の取得済みは保存不可
                    (inputMode === 'template' && !selectedCourseId) ||
                    (inputMode === 'shared' && !selectedSharedCourseId) ||
                    (inputMode === 'free' && !freeName)
                  }
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

          <div className="divide-y divide-gray-100">
            {records.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-base text-gray-400 mb-3">履修記録がまだありません</p>
                <button onClick={() => setShowAddRecord(true)} className="text-base text-blue-500 hover:underline">+ 最初の履修を記録する</button>
              </div>
            ) : records.map(record => {
              const statusOption = STATUS_OPTIONS.find(s => s.value === record.status)
              return (
                <div key={record.id} className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
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
                    <div className="flex items-center gap-2 ml-2">
                      <select value={record.status} onChange={e => handleUpdateStatus(record.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <button onClick={() => handleDeleteRecord(record.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ルールセット内の科目一覧 */}
        {categories.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">ルールセット内の科目一覧</h2>
            <div className="space-y-4">
              {categories.map(cat => {
                const catCourses = courses.filter(c => c.category_id === cat.id)
                if (catCourses.length === 0) return null
                return (
                  <div key={cat.id}>
                    <p className="text-sm font-medium text-gray-500 mb-2">{cat.name}</p>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                      {catCourses.map(course => {
                        const record = records.find(r => r.template_course_id === course.id)
                        const statusOption = STATUS_OPTIONS.find(s => s.value === record?.status)
                        return (
                          <div key={course.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base text-gray-800">{course.course_name}</span>
                              {course.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-400">{course.credits}単位</span>
                              {record ? <span className={`text-sm px-2 py-0.5 rounded-full ${statusOption?.color}`}>{statusOption?.label}</span> : <span className="text-sm text-gray-300">未記録</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 自分の共有科目 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">自分の共有科目</h2>
            <button onClick={() => setShowMySharedForm(!showMySharedForm)}
              className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              + 科目を登録する
            </button>
          </div>

          {showMySharedForm && (
            <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-3">
              <h3 className="text-base font-semibold text-gray-700">科目を登録する</h3>
              <input type="text" placeholder="科目名 *" value={myCourseName} onChange={e => setMyCourseName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">単位数</label>
                  {/* 【改善5】単位数の選択肢を拡張 */}
                  <select value={myCourseCredits} onChange={e => setMyCourseCredits(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CREDIT_OPTIONS.map(n => <option key={n} value={n}>{n}単位</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">区分名（任意）</label>
                  <input type="text" placeholder="例：専門必修・A群" value={myCourseCategoryName} onChange={e => setMyCourseCategoryName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <input type="text" placeholder="備考（任意）" value={myCourseNote} onChange={e => setMyCourseNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={myCourseIsRequired} onChange={e => setMyCourseIsRequired(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-base text-gray-700">必修科目</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={myCourseIsPublic} onChange={e => setMyCourseIsPublic(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-base text-gray-700">他のユーザーに公開する</span>
              </label>
              {myCourseIsPublic && <p className="text-sm text-blue-500 bg-blue-50 rounded-lg px-3 py-2">{userProfile?.university_name} {userProfile?.faculty_name} の科目として公開されます</p>}
              <div className="flex gap-3">
                <button onClick={handleAddMySharedCourse} disabled={loading || !myCourseName}
                  className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {loading ? '登録中...' : '登録する'}
                </button>
                <button onClick={() => setShowMySharedForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {mySharedCourses.length === 0 ? (
            <p className="text-base text-gray-400 text-center py-6">登録した科目がまだありません</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {mySharedCourses.map(c => (
                <div key={c.id} className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-medium text-gray-800">{c.course_name}</span>
                        <span className="text-sm text-gray-400">{c.credits}単位</span>
                        {c.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>}
                        {c.category_name && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{c.category_name}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.is_public ? '公開中' : '非公開'}
                        </span>
                      </div>
                      {c.note && <p className="text-sm text-gray-500 mt-1">{c.note}</p>}
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button onClick={() => handleTogglePublic(c.id, c.is_public)} className="text-sm text-blue-500 hover:text-blue-700 whitespace-nowrap">
                        {c.is_public ? '非公開にする' : '公開する'}
                      </button>
                      <button onClick={() => handleDeleteMyShared(c.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* みんなの公開科目 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">みんなの公開科目</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input type="text" placeholder="大学名で絞り込み" value={searchUniversity} onChange={e => setSearchUniversity(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="区分名で絞り込み" value={searchCategory} onChange={e => setSearchCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="科目名で検索" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
          </div>
          <p className="text-sm text-gray-400 mb-3">{filteredPublicCourses.length}件</p>

          {filteredPublicCourses.length === 0 ? (
            <p className="text-base text-gray-400 text-center py-8">
              {sharedCourses.length === 0 ? 'まだ公開された科目がありません' : '条件に一致する科目がありません'}
            </p>
          ) : (
            <div className="space-y-3">
              {displayedPublicCourses.map(c => (
                <div key={c.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-gray-800">{c.course_name}</span>
                          <span className="text-sm text-gray-400">{c.credits}単位</span>
                          {c.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>}
                          {c.category_name && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{c.category_name}</span>}
                        </div>
                        {(c.university_name || c.faculty_name) && <p className="text-sm text-gray-400 mt-0.5">{c.university_name} {c.faculty_name}</p>}
                      </div>
                      <div className="flex flex-col gap-2 ml-3">
                        <button onClick={() => handleCopyCourse(c)} disabled={loading}
                          className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
                          コピーする
                        </button>
                        <button onClick={() => setExpandedCourseId(expandedCourseId === c.id ? null : c.id)}
                          className="border border-gray-300 text-gray-600 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                          {expandedCourseId === c.id ? '閉じる' : '詳細を見る'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {expandedCourseId === c.id && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
                      <p className="text-sm text-gray-600">単位数：{c.credits}単位</p>
                      {c.category_name && <p className="text-sm text-gray-600">区分：{c.category_name}</p>}
                      {c.university_name && <p className="text-sm text-gray-600">大学：{c.university_name} {c.faculty_name}</p>}
                      <p className="text-sm text-gray-600">必修：{c.is_required ? 'あり' : 'なし'}</p>
                      {c.note && <p className="text-sm text-gray-600">備考：{c.note}</p>}
                    </div>
                  )}
                </div>
              ))}
              {filteredPublicCourses.length > 3 && (
                <button onClick={() => setShowAllPublic(!showAllPublic)}
                  className="w-full py-3 text-base text-blue-500 hover:text-blue-700 border border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors">
                  {showAllPublic ? '閉じる' : `残り${filteredPublicCourses.length - 3}件を見る`}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">本ツールは補助ツールです。必ず大学公式の履修要覧をご確認ください。</p>
      </main>
    </div>
  )
}