'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { RuleSet, RuleSetCategory, RuleSetCourse, RuleSetRule, SemesterRule } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const NAV_TABS = [
  { href: '/dashboard', label: 'ホーム' },
  { href: '/courses', label: '科目・履修' },
  { href: '/rules', label: 'ルール管理' },
  { href: '/setup', label: '基本情報' },
]

const RULE_TYPE_LABELS: Record<string, string> = {
  total_credits_min: '総取得単位の最低条件',
  category_credits_min: '区分別の最低単位',
  category_credits_max: '区分別の上限単位',
  required_courses_all: '必修科目を指定（必ず取得が必要な科目）',
  elective_group_credits_min: '複数区分をまたぐ選択必修グループ',
}

type RuleSetFull = RuleSet & {
  categories: RuleSetCategory[]
  courses: RuleSetCourse[]
  rules: RuleSetRule[]
}

export default function RulesPage() {
  const [myRuleSets, setMyRuleSets] = useState<RuleSetFull[]>([])
  const [publicRuleSets, setPublicRuleSets] = useState<RuleSetFull[]>([])
  const [semesterRulesMap, setSemesterRulesMap] = useState<Record<string, SemesterRule[]>>({})
  const [activeRuleSetId, setActiveRuleSetId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [showAllPublic, setShowAllPublic] = useState(false)
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null)
  const [expandedPublicSetId, setExpandedPublicSetId] = useState<string | null>(null)
  const [activeInnerTab, setActiveInnerTab] = useState<Record<string, 'courses' | 'rules' | 'semester'>>({})
  const [searchUniversity, setSearchUniversity] = useState('')
  const [searchFaculty, setSearchFaculty] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [showSetForm, setShowSetForm] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [setTitle, setSetTitle] = useState('')
  const [setUniversity, setSetUniversity] = useState('')
  const [setFaculty, setSetFaculty] = useState('')
  const [setDepartment, setSetDepartment] = useState('')
  const [setEntryYear, setSetEntryYear] = useState(new Date().getFullYear())
  const [setDescription, setSetDescription] = useState('')
  const [setIsPublic, setSetIsPublic] = useState(false)
  const [setYears, setSetYears] = useState(4)
  const [setTerms, setSetTerms] = useState(2)

  const [showCategoryForm, setShowCategoryForm] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showCourseForm, setShowCourseForm] = useState<string | null>(null)
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseCredits, setCourseCredits] = useState(2)
  const [courseCategoryId, setCourseCategoryId] = useState('')
  const [courseIsRequired, setCourseIsRequired] = useState(false)
  const [showRuleForm, setShowRuleForm] = useState<string | null>(null)
  const [ruleType, setRuleType] = useState('total_credits_min')
  const [minCredits, setMinCredits] = useState(124)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [maxCredits, setMaxCredits] = useState(20)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const [showSemForm, setShowSemForm] = useState<string | null>(null)
  const [semYear, setSemYear] = useState(1)
  const [semTerm, setSemTerm] = useState(1)
  const [semLabel, setSemLabel] = useState('')
  const [semCredits, setSemCredits] = useState<number | null>(null)
  const [semCourseIds, setSemCourseIds] = useState<string[]>([])

  // 【バグ4修正】削除エラーを表示するためのstate
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // 【修正3・4】基本情報を保持するstate
  const [profileData, setProfileData] = useState<{ university_name: string, faculty_name: string, department_name: string, entry_year: number } | null>(null)

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setCurrentUserId(user.id)
    // 【修正3・4】基本情報を全取得
    const profileRes = await supabase.from('user_profiles').select('active_rule_set_id, university_name, faculty_name, department_name, entry_year').eq('user_id', user.id).single()
    setActiveRuleSetId(profileRes.data?.active_rule_set_id || null)
    if (profileRes.data) {
      setProfileData({
        university_name: profileRes.data.university_name || '',
        faculty_name: profileRes.data.faculty_name || '',
        department_name: profileRes.data.department_name || '',
        entry_year: profileRes.data.entry_year || new Date().getFullYear(),
      })
      // 【修正3】公開ルールセットの大学名絞り込みを自動入力（初回のみ）
      setSearchUniversity(prev => prev === '' ? (profileRes.data.university_name || '') : prev)
    }
    const myRes = await supabase.from('rule_sets').select('*').eq('created_by', user.id).order('created_at')
    const mySets = myRes.data || []
    const fullSets = await Promise.all(mySets.map(async (rs) => {
      const [catRes, courseRes, ruleRes] = await Promise.all([
        supabase.from('rule_set_categories').select('*').eq('rule_set_id', rs.id).order('sort_order'),
        supabase.from('rule_set_courses').select('*').eq('rule_set_id', rs.id).order('course_name'),
        supabase.from('rule_set_rules').select('*').eq('rule_set_id', rs.id),
      ])
      return { ...rs, categories: catRes.data || [], courses: courseRes.data || [], rules: ruleRes.data || [] }
    }))
    setMyRuleSets(fullSets)
    const semMap: Record<string, SemesterRule[]> = {}
    for (const rs of fullSets) {
      const semRes = await supabase.from('semester_rules').select('*').eq('rule_set_id', rs.id).order('year_num').order('term_num')
      semMap[rs.id] = semRes.data || []
    }
    setSemesterRulesMap(semMap)
    const pubRes = await supabase.from('rule_sets').select('*').eq('is_public', true).neq('created_by', user.id)
    const pubSets = pubRes.data || []
    const fullPubSets = await Promise.all(pubSets.map(async (rs) => {
      const [catRes, courseRes, ruleRes] = await Promise.all([
        supabase.from('rule_set_categories').select('*').eq('rule_set_id', rs.id).order('sort_order'),
        supabase.from('rule_set_courses').select('*').eq('rule_set_id', rs.id).order('course_name'),
        supabase.from('rule_set_rules').select('*').eq('rule_set_id', rs.id),
      ])
      return { ...rs, categories: catRes.data || [], courses: courseRes.data || [], rules: ruleRes.data || [] }
    }))
    setPublicRuleSets(fullPubSets)
  }

  useEffect(() => { fetchData() }, [])

  const filteredPublicRuleSets = publicRuleSets.filter(rs => {
    const uMatch = !searchUniversity || (rs.university_name || '').includes(searchUniversity)
    const fMatch = !searchFaculty || (rs.faculty_name || '').includes(searchFaculty)
    const kMatch = !searchKeyword || rs.title.includes(searchKeyword)
    return uMatch && fMatch && kMatch
  })

  const previewPublicRuleSets = filteredPublicRuleSets.slice(0, 3)
  const displayedPublicRuleSets = showAllPublic ? filteredPublicRuleSets : previewPublicRuleSets

  const handleActivate = async (ruleSetId: string) => {
    await supabase.from('user_profiles').update({ active_rule_set_id: ruleSetId }).eq('user_id', currentUserId)
    setActiveRuleSetId(ruleSetId)
    alert('ルールセットを設定しました')
  }

  const handleCreateSet = async () => {
    if (!setTitle) return
    setLoading(true)
    try {
      if (editingSetId) {
        const current = myRuleSets.find(s => s.id === editingSetId)
        const newVersion = (current?.version || 1) + 1
        await supabase.from('rule_sets').update({
          title: setTitle, university_name: setUniversity, faculty_name: setFaculty,
          department_name: setDepartment, entry_year: setEntryYear, description: setDescription,
          is_public: setIsPublic, version: newVersion, updated_at: new Date().toISOString(),
          years_of_study: setYears, terms_per_year: setTerms,
        }).eq('id', editingSetId)
        const usersRes = await supabase.from('user_profiles').select('user_id').eq('active_rule_set_id', editingSetId).neq('user_id', currentUserId)
        if (usersRes.data && usersRes.data.length > 0) {
          await supabase.from('rule_set_notifications').insert(
            usersRes.data.map(u => ({ user_id: u.user_id, rule_set_id: editingSetId, old_version: current?.version || 1, new_version: newVersion }))
          )
        }
      } else {
        await supabase.from('rule_sets').insert({
          created_by: currentUserId, title: setTitle, university_name: setUniversity || null,
          faculty_name: setFaculty || null, department_name: setDepartment || null,
          entry_year: setEntryYear || null, description: setDescription || null,
          is_public: setIsPublic, version: 1, years_of_study: setYears, terms_per_year: setTerms,
        })
      }
      setSetTitle(''); setSetUniversity(''); setSetFaculty(''); setSetDepartment('')
      setSetDescription(''); setSetIsPublic(false); setEditingSetId(null); setShowSetForm(false)
      setSetYears(4); setSetTerms(2)
      fetchData()
    } finally { setLoading(false) }
  }

  const handleEditSet = (rs: RuleSetFull) => {
    setEditingSetId(rs.id); setSetTitle(rs.title); setSetUniversity(rs.university_name || '')
    setSetFaculty(rs.faculty_name || ''); setSetDepartment(rs.department_name || '')
    setSetEntryYear(rs.entry_year || new Date().getFullYear()); setSetDescription(rs.description || '')
    setSetIsPublic(rs.is_public); setSetYears(rs.years_of_study || 4); setSetTerms(rs.terms_per_year || 2)
    setShowSetForm(true)
  }

  // 【バグ4修正】削除エラーをキャッチして表示
  const handleDeleteSet = async (id: string) => {
    if (!confirm('このルールセットを削除しますか？')) return
    setDeleteError(null)
    try {
      const { error } = await supabase.from('rule_sets').delete().eq('id', id)
      if (error) {
        console.error('Delete error:', error)
        setDeleteError('削除に失敗しました。このルールセットは使用中またはRLSポリシーにより削除できない可能性があります。（' + error.message + '）')
        return
      }
      fetchData()
    } catch (e) {
      setDeleteError('削除中に予期しないエラーが発生しました。')
      console.error(e)
    }
  }

  // 【改善6】コピー時「（コピー）」を削除
  const handleCopySet = async (rs: RuleSetFull) => {
    setLoading(true)
    try {
      const newSetRes = await supabase.from('rule_sets').insert({
        created_by: currentUserId,
        title: rs.title, // ← ' (コピー)' を削除
        is_public: false,
        version: 1, original_rule_set_id: rs.id,
        university_name: rs.university_name, faculty_name: rs.faculty_name,
        department_name: rs.department_name, entry_year: rs.entry_year,
        years_of_study: rs.years_of_study || 4, terms_per_year: rs.terms_per_year || 2,
      }).select().single()
      if (newSetRes.data) {
        const newSetId = newSetRes.data.id
        const catIdMap: Record<string, string> = {}
        if (rs.categories.length > 0) {
          for (const cat of rs.categories) {
            const catRes = await supabase.from('rule_set_categories').insert({
              rule_set_id: newSetId, name: cat.name, sort_order: cat.sort_order
            }).select().single()
            if (catRes.data) catIdMap[cat.id] = catRes.data.id
          }
        }
        if (rs.courses.length > 0) {
          await supabase.from('rule_set_courses').insert(rs.courses.map(c => ({
            rule_set_id: newSetId, course_name: c.course_name, course_code: c.course_code,
            credits: c.credits, category_id: c.category_id ? catIdMap[c.category_id] : null,
            is_required: c.is_required, note: c.note,
          })))
        }
        if (rs.rules.length > 0) {
          await supabase.from('rule_set_rules').insert(rs.rules.map(r => ({
            rule_set_id: newSetId, rule_type: r.rule_type, rule_payload: r.rule_payload,
          })))
        }
      }
      alert('ルールセットをコピーしました。')
      fetchData()
    } finally { setLoading(false) }
  }

  const handleAddCategory = async (ruleSetId: string) => {
    if (!newCategoryName) return
    await supabase.from('rule_set_categories').insert({ rule_set_id: ruleSetId, name: newCategoryName, sort_order: 0 })
    setNewCategoryName(''); setShowCategoryForm(null); fetchData()
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('この区分を削除しますか？')) return
    await supabase.from('rule_set_categories').delete().eq('id', id); fetchData()
  }

  const handleAddCourse = async (ruleSetId: string) => {
    if (!courseName) return
    setLoading(true)
    try {
      await supabase.from('rule_set_courses').insert({
        rule_set_id: ruleSetId, course_name: courseName, course_code: courseCode || null,
        credits: courseCredits, category_id: courseCategoryId || null, is_required: courseIsRequired,
      })
      setCourseName(''); setCourseCode(''); setCourseCredits(2); setCourseCategoryId(''); setCourseIsRequired(false)
      setShowCourseForm(null); fetchData()
    } finally { setLoading(false) }
  }

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('この科目を削除しますか？')) return
    await supabase.from('rule_set_courses').delete().eq('id', id); fetchData()
  }

  const buildPayload = (rs: RuleSetFull) => {
    const category = rs.categories.find(c => c.id === selectedCategoryId)
    switch (ruleType) {
      case 'total_credits_min': return { min_credits: minCredits }
      case 'category_credits_min': return { category_id: selectedCategoryId, category_name: category?.name, min_credits: minCredits }
      case 'category_credits_max': return { category_id: selectedCategoryId, category_name: category?.name, max_credits: maxCredits }
      case 'required_courses_all': return { course_ids: selectedCourseIds }
      case 'elective_group_credits_min': return { course_ids: selectedCourseIds, group_name: groupName, min_credits: minCredits }
      default: return {}
    }
  }

  const handleAddRule = async (rs: RuleSetFull) => {
    setLoading(true)
    try {
      await supabase.from('rule_set_rules').insert({ rule_set_id: rs.id, rule_type: ruleType, rule_payload: buildPayload(rs) })
      setRuleType('total_credits_min'); setMinCredits(124); setSelectedCategoryId('')
      setMaxCredits(20); setSelectedCourseIds([]); setGroupName('')
      setShowRuleForm(null); fetchData()
    } finally { setLoading(false) }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('このルールを削除しますか？')) return
    await supabase.from('rule_set_rules').delete().eq('id', id); fetchData()
  }

  const handleAddSemesterRule = async (ruleSetId: string) => {
    setLoading(true)
    try {
      await supabase.from('semester_rules').insert({
        rule_set_id: ruleSetId, year_num: semYear, term_num: semTerm,
        label: semLabel || null, cumulative_min_credits: semCredits || null,
        required_course_ids: semCourseIds.length > 0 ? semCourseIds : [],
      })
      setSemYear(1); setSemTerm(1); setSemLabel(''); setSemCredits(null); setSemCourseIds([])
      setShowSemForm(null); fetchData()
    } finally { setLoading(false) }
  }

  const handleDeleteSemesterRule = async (id: string) => {
    if (!confirm('この進級条件を削除しますか？')) return
    await supabase.from('semester_rules').delete().eq('id', id); fetchData()
  }

  const toggleCourseId = (id: string) => {
    setSelectedCourseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleSemCourseId = (id: string) => {
    setSemCourseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const getRuleSummary = (rule: RuleSetRule) => {
    const p = rule.rule_payload as Record<string, unknown>
    switch (rule.rule_type) {
      case 'total_credits_min': return String(p.min_credits) + ' 単位以上（合計）'
      case 'category_credits_min': return String(p.category_name) + '：' + String(p.min_credits) + ' 単位以上'
      case 'category_credits_max': return String(p.category_name) + '：上限 ' + String(p.max_credits) + ' 単位'
      case 'required_courses_all': return '必修 ' + String((p.course_ids as string[]).length) + ' 科目すべて取得'
      case 'elective_group_credits_min': return String(p.group_name) + '：' + String(p.min_credits) + ' 単位以上'
      default: return '不明なルール'
    }
  }

  const getInnerTab = (id: string) => activeInnerTab[id] || 'courses'
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  const PublicRuleSetCard = ({ rs, expanded, onToggle }: { rs: RuleSetFull, expanded: boolean, onToggle: () => void }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <p className="text-base font-semibold text-gray-800">{rs.title}</p>
            {(rs.university_name || rs.faculty_name) && (
              <p className="text-sm text-gray-400 mt-0.5">{rs.university_name} {rs.faculty_name} {rs.department_name} {rs.entry_year && rs.entry_year + '年度'}</p>
            )}
            <p className="text-sm text-gray-400 mt-0.5">v{rs.version} · {rs.years_of_study || 4}年制 · 科目{rs.courses.length}件 · ルール{rs.rules.length}個</p>
            {rs.description && <p className="text-sm text-gray-500 mt-1">{rs.description}</p>}
            {rs.categories.length > 0 && (
              <p className="text-sm text-gray-400 mt-1">区分：{rs.categories.map(c => c.name).join('、')}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-3">
            <button onClick={() => handleCopySet(rs)} disabled={loading}
              className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">
              コピーして使う
            </button>
            <button onClick={onToggle}
              className="border border-gray-300 text-gray-600 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              {expanded ? '詳細を閉じる' : '詳細を見る'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          {rs.courses.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">科目一覧（{rs.courses.length}件）</p>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {rs.courses.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">{c.course_name}</span>
                      {c.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">必修</span>}
                    </div>
                    <span className="text-xs text-gray-400">{c.credits}単位</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {rs.rules.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">ルール一覧（{rs.rules.length}件）</p>
              <div className="space-y-1">
                {rs.rules.map(rule => (
                  <div key={rule.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-400">{RULE_TYPE_LABELS[rule.rule_type]}</p>
                    <p className="text-sm text-gray-700">{getRuleSummary(rule)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-900">履修管理ツール</h1>
          </div>
          <div className="flex gap-1 -mb-px">
            {NAV_TABS.map(tab => (
              <Link key={tab.href} href={tab.href}
                className={'px-4 py-2.5 text-base font-medium border-b-2 transition-colors ' +
                  (tab.href === '/rules'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* 【バグ4修正】削除エラー表示 */}
        {deleteError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex justify-between items-start">
            <p className="text-sm text-red-700">{deleteError}</p>
            <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600 ml-3 text-sm">×</button>
          </div>
        )}

        {/* 自分のルールセット */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">自分のルールセット</h2>
            <button onClick={() => {
                // 【修正4】新規作成時に基本情報を自動入力
                setEditingSetId(null)
                setSetTitle('')
                setSetUniversity(profileData?.university_name || '')
                setSetFaculty(profileData?.faculty_name || '')
                setSetDepartment(profileData?.department_name || '')
                setSetEntryYear(profileData?.entry_year || new Date().getFullYear())
                setSetDescription(''); setSetIsPublic(false); setSetYears(4); setSetTerms(2)
                setShowSetForm(!showSetForm)
              }}
              className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              + 新規作成
            </button>
          </div>

          {/* 新規作成フォーム（新規のみ・編集は各カード内に統合） */}
          {showSetForm && !editingSetId && (
            <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-3">
              <h3 className="text-base font-semibold text-gray-700">新しいルールセット</h3>
              {/* 【修正4】基本情報から自動入力済み（後から変更可能） */}
              <input type="text" placeholder="ルールセット名 *" value={setTitle} onChange={e => setSetTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-3">
                <input type="text" placeholder="大学名" value={setUniversity} onChange={e => setSetUniversity(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="学部名" value={setFaculty} onChange={e => setSetFaculty(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3">
                <input type="text" placeholder="学科名" value={setDepartment} onChange={e => setSetDepartment(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={setEntryYear} onChange={e => setSetEntryYear(Number(e.target.value))}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {years.map(y => <option key={y} value={y}>{y}年度入学</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">在籍年数</label>
                  <select value={setYears} onChange={e => setSetYears(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {[2,3,4,6].map(y => <option key={y} value={y}>{y}年制</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">年間学期数</label>
                  <select value={setTerms} onChange={e => setSetTerms(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {[2,3,4].map(t => <option key={t} value={t}>{t}学期制</option>)}
                  </select>
                </div>
              </div>
              <textarea placeholder="説明（任意）" value={setDescription} onChange={e => setSetDescription(e.target.value)} rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={setIsPublic} onChange={e => setSetIsPublic(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-base text-gray-700">このルールセットを他のユーザーに公開する</span>
              </label>
              <div className="flex gap-3">
                <button onClick={handleCreateSet} disabled={loading || !setTitle}
                  className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {loading ? '保存中...' : '作成する'}
                </button>
                <button onClick={() => { setShowSetForm(false); setEditingSetId(null) }}
                  className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {myRuleSets.length === 0 ? (
            <p className="text-base text-gray-400 text-center py-8">ルールセットがまだありません</p>
          ) : (
            <div className="space-y-4">
              {myRuleSets.map(rs => (
                <div key={rs.id} className={'border rounded-xl p-5 ' + (activeRuleSetId === rs.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200')}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-semibold text-gray-800">{rs.title}</p>
                        {activeRuleSetId === rs.id && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">使用中</span>}
                        {rs.is_public && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">公開中</span>}
                      </div>
                      {(rs.university_name || rs.faculty_name) && (
                        <p className="text-sm text-gray-400 mt-0.5">{rs.university_name} {rs.faculty_name} {rs.department_name} {rs.entry_year && rs.entry_year + '年度'}</p>
                      )}
                      <p className="text-sm text-gray-400">v{rs.version} · {rs.years_of_study || 4}年制 · {rs.terms_per_year || 2}学期制 · 科目{rs.courses.length}件 · ルール{rs.rules.length}個</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {activeRuleSetId !== rs.id && (
                        <button onClick={() => handleActivate(rs.id)} className="text-sm text-blue-500 hover:text-blue-700">使用する</button>
                      )}
                      {/* 【修正5】「編集」1ボタンで基本情報フォーム＋3タブを一緒に展開。「詳細」ボタンは削除 */}
                      <button onClick={() => {
                        if (expandedSetId === rs.id) {
                          setExpandedSetId(null); setShowSetForm(false); setEditingSetId(null)
                        } else {
                          handleEditSet(rs); setExpandedSetId(rs.id)
                        }
                      }} className="text-sm text-gray-500 hover:text-gray-700">
                        {expandedSetId === rs.id ? '閉じる' : '編集'}
                      </button>
                      <button onClick={() => handleDeleteSet(rs.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                    </div>
                  </div>

                  {expandedSetId === rs.id && (
                    <div className="mt-4 space-y-4">

                      {/* 【修正5】基本情報フォームをここに統合 */}
                      <div className="border border-blue-100 rounded-xl p-4 bg-blue-50 space-y-3">
                        <h3 className="text-sm font-semibold text-blue-700">基本情報</h3>
                        <input type="text" placeholder="ルールセット名 *" value={setTitle} onChange={e => setSetTitle(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        <div className="flex gap-3">
                          <input type="text" placeholder="大学名" value={setUniversity} onChange={e => setSetUniversity(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                          <input type="text" placeholder="学部名" value={setFaculty} onChange={e => setSetFaculty(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        </div>
                        <div className="flex gap-3">
                          <input type="text" placeholder="学科名" value={setDepartment} onChange={e => setSetDepartment(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                          <select value={setEntryYear} onChange={e => setSetEntryYear(Number(e.target.value))}
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            {years.map(y => <option key={y} value={y}>{y}年度入学</option>)}
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">在籍年数</label>
                            <select value={setYears} onChange={e => setSetYears(Number(e.target.value))}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                              {[2,3,4,6].map(y => <option key={y} value={y}>{y}年制</option>)}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">年間学期数</label>
                            <select value={setTerms} onChange={e => setSetTerms(Number(e.target.value))}
                              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                              {[2,3,4].map(t => <option key={t} value={t}>{t}学期制</option>)}
                            </select>
                          </div>
                        </div>
                        <textarea placeholder="説明（任意）" value={setDescription} onChange={e => setSetDescription(e.target.value)} rows={2}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={setIsPublic} onChange={e => setSetIsPublic(e.target.checked)} className="w-4 h-4 rounded" />
                          <span className="text-sm text-gray-700">このルールセットを他のユーザーに公開する</span>
                        </label>
                        <button onClick={handleCreateSet} disabled={loading || !setTitle}
                          className="w-full bg-blue-600 text-white text-base py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          {loading ? '保存中...' : '基本情報を保存'}
                        </button>
                      </div>

                      {/* 区分・科目 / ルール / 進級条件 タブ */}
                      <div className="flex gap-2">
                        {(['courses', 'rules', 'semester'] as const).map(tab => (
                          <button key={tab} onClick={() => setActiveInnerTab(prev => ({ ...prev, [rs.id]: tab }))}
                            className={'flex-1 py-2 rounded-lg text-sm font-medium transition-colors ' +
                              (getInnerTab(rs.id) === tab
                                ? tab === 'semester' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                            {tab === 'courses' ? '区分・科目' : tab === 'rules' ? 'ルール' : '進級条件'}
                          </button>
                        ))}
                      </div>

                      {getInnerTab(rs.id) === 'courses' && (
                        <div className="space-y-3">
                          {rs.categories.map(cat => (
                            <div key={cat.id} className="bg-white rounded-lg border border-gray-100 p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-base font-medium text-gray-700">{cat.name}</span>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                              </div>
                              <div className="space-y-1">
                                {rs.courses.filter(c => c.category_id === cat.id).map(course => (
                                  <div key={course.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="text-base text-gray-700">{course.course_name}</span>
                                      {course.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-400">{course.credits}単位</span>
                                      <button onClick={() => handleDeleteCourse(course.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {rs.courses.filter(c => !c.category_id).length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-100 p-4">
                              <p className="text-base font-medium text-gray-400 mb-2">区分なし</p>
                              {rs.courses.filter(c => !c.category_id).map(course => (
                                <div key={course.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base text-gray-700">{course.course_name}</span>
                                    {course.is_required && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">必修</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-400">{course.credits}単位</span>
                                    <button onClick={() => handleDeleteCourse(course.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {showCategoryForm === rs.id ? (
                            <div className="flex gap-2">
                              <input type="text" placeholder="区分名（例：専門必修、外国語）" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <button onClick={() => handleAddCategory(rs.id)} disabled={!newCategoryName}
                                className="bg-blue-600 text-white text-base px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">追加</button>
                              <button onClick={() => { setShowCategoryForm(null); setNewCategoryName('') }}
                                className="border border-gray-300 text-gray-600 text-base px-4 py-2.5 rounded-lg hover:bg-gray-50">×</button>
                            </div>
                          ) : (
                            <button onClick={() => setShowCategoryForm(rs.id)}
                              className="w-full border border-dashed border-gray-300 text-gray-500 text-base py-2.5 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors">
                              + 区分を追加
                            </button>
                          )}
                          {showCourseForm === rs.id ? (
                            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                              <h4 className="text-base font-medium text-gray-700">科目を追加</h4>
                              <input type="text" placeholder="科目名 * （省略せず正式名称で入力してください）" value={courseName} onChange={e => setCourseName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <input type="text" placeholder="科目コード（任意）" value={courseCode} onChange={e => setCourseCode(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className="block text-sm text-gray-500 mb-1">単位数</label>
                                  <select value={courseCredits} onChange={e => setCourseCredits(Number(e.target.value))}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}単位</option>)}
                                  </select>
                                </div>
                                <div className="flex-1">
                                  <label className="block text-sm text-gray-500 mb-1">区分 *</label>
                                  <select value={courseCategoryId} onChange={e => setCourseCategoryId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">未分類</option>
                                    {rs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                </div>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={courseIsRequired} onChange={e => setCourseIsRequired(e.target.checked)} className="w-4 h-4 rounded" />
                                <span className="text-base text-gray-700">必修科目</span>
                              </label>
                              <div className="flex gap-3">
                                <button onClick={() => handleAddCourse(rs.id)} disabled={loading || !courseName}
                                  className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                  {loading ? '追加中...' : '追加する'}
                                </button>
                                <button onClick={() => { setShowCourseForm(null); setCourseName(''); setCourseCode('') }}
                                  className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setShowCourseForm(rs.id)}
                              className="w-full border border-dashed border-gray-300 text-gray-500 text-base py-2.5 rounded-lg hover:border-green-400 hover:text-green-500 transition-colors">
                              + 科目を追加
                            </button>
                          )}
                        </div>
                      )}

                      {getInnerTab(rs.id) === 'rules' && (
                        <div className="space-y-3">
                          {rs.rules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-4 py-3">
                              <div>
                                <p className="text-sm text-gray-400">{RULE_TYPE_LABELS[rule.rule_type]}</p>
                                <p className="text-base text-gray-700">{getRuleSummary(rule)}</p>
                              </div>
                              <button onClick={() => handleDeleteRule(rule.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                            </div>
                          ))}
                          {showRuleForm === rs.id ? (
                            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                              <h4 className="text-base font-medium text-gray-700">ルールを追加</h4>
                              <div>
                                <label className="block text-sm text-gray-500 mb-1">ルール種別</label>
                                <select value={ruleType} onChange={e => { setRuleType(e.target.value); setSelectedCourseIds([]) }}
                                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                                  {Object.entries(RULE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                              </div>
                              {ruleType === 'total_credits_min' && (
                                <div>
                                  <label className="block text-sm text-gray-500 mb-1">必要単位数</label>
                                  <input type="number" value={minCredits} onChange={e => setMinCredits(Number(e.target.value))} min={1}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                              )}
                              {(ruleType === 'category_credits_min' || ruleType === 'category_credits_max') && (
                                <>
                                  <div>
                                    <label className="block text-sm text-gray-500 mb-1">対象区分</label>
                                    <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}
                                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
                                      <option value="">選択してください</option>
                                      {rs.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm text-gray-500 mb-1">{ruleType === 'category_credits_min' ? '最低単位数' : '上限単位数'}</label>
                                    <input type="number" value={ruleType === 'category_credits_min' ? minCredits : maxCredits}
                                      onChange={e => ruleType === 'category_credits_min' ? setMinCredits(Number(e.target.value)) : setMaxCredits(Number(e.target.value))} min={1}
                                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                                </>
                              )}
                              {(ruleType === 'required_courses_all' || ruleType === 'elective_group_credits_min') && (
                                <>
                                  {ruleType === 'elective_group_credits_min' && (
                                    <>
                                      <div>
                                        <label className="block text-sm text-gray-500 mb-1">グループ名</label>
                                        <input type="text" placeholder="例：A群" value={groupName} onChange={e => setGroupName(e.target.value)}
                                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                      </div>
                                      <div>
                                        <label className="block text-sm text-gray-500 mb-1">最低単位数</label>
                                        <input type="number" value={minCredits} onChange={e => setMinCredits(Number(e.target.value))} min={1}
                                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    <label className="block text-sm text-gray-500 mb-2">対象科目を選択</label>
                                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                      {rs.courses.length === 0 ? (
                                        <p className="text-base text-gray-400 p-3">先に科目を登録してください</p>
                                      ) : (
                                        rs.courses.map(c => (
                                          <label key={c.id} className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50">
                                            <input type="checkbox" checked={selectedCourseIds.includes(c.id)} onChange={() => toggleCourseId(c.id)} className="w-4 h-4 rounded" />
                                            <span className="text-base text-gray-700">{c.course_name}</span>
                                            <span className="text-sm text-gray-400 ml-auto">{c.credits}単位</span>
                                          </label>
                                        ))
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">{selectedCourseIds.length}科目選択中</p>
                                  </div>
                                </>
                              )}
                              <div className="flex gap-3">
                                <button onClick={() => handleAddRule(rs)} disabled={loading}
                                  className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                  {loading ? '追加中...' : 'ルールを追加'}
                                </button>
                                <button onClick={() => setShowRuleForm(null)}
                                  className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setShowRuleForm(rs.id)}
                              className="w-full border border-dashed border-gray-300 text-gray-500 text-base py-2.5 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors">
                              + ルールを追加
                            </button>
                          )}
                        </div>
                      )}

                      {getInnerTab(rs.id) === 'semester' && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-400">進級条件を設定します。ダッシュボードのタイムラインに反映されます。</p>
                          {(semesterRulesMap[rs.id] || []).map(sem => {
                            const termsPerYear = rs.terms_per_year || 2
                            const isLastTerm = sem.term_num === termsPerYear
                            const nextYear = isLastTerm ? sem.year_num + 1 : sem.year_num
                            const autoLabel = isLastTerm ? nextYear + '年生への進級条件' : sem.year_num + '年' + (sem.term_num + 1) + '学期への進級条件'
                            const reqCourseIds = (sem.required_course_ids as string[]) || []
                            const reqCourseNames = reqCourseIds.map((id: string) => rs.courses.find(c => c.id === id)?.course_name).filter(Boolean)
                            return (
                              <div key={sem.id} className="bg-white rounded-lg border border-purple-100 px-4 py-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-base font-medium text-purple-700">{sem.label || autoLabel}</p>
                                    {sem.cumulative_min_credits && <p className="text-sm text-gray-600 mt-0.5">累積{sem.cumulative_min_credits}単位以上</p>}
                                    {reqCourseNames.length > 0 && <p className="text-sm text-gray-600 mt-0.5">必須科目：{reqCourseNames.join('、')}</p>}
                                  </div>
                                  <button onClick={() => handleDeleteSemesterRule(sem.id)} className="text-sm text-red-400 hover:text-red-600">削除</button>
                                </div>
                              </div>
                            )
                          })}
                          {showSemForm === rs.id ? (
                            <div className="border border-purple-200 rounded-xl p-4 space-y-3">
                              <h4 className="text-base font-medium text-gray-700">進級条件を追加</h4>
                              <div>
                                <label className="block text-sm text-gray-500 mb-1">どの学期終了時の条件ですか？</label>
                                <select value={semYear + '-' + semTerm}
                                  onChange={e => { const [y, t] = e.target.value.split('-').map(Number); setSemYear(y); setSemTerm(t) }}
                                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500">
                                  {Array.from({ length: rs.years_of_study || 4 }, (_, yi) => yi + 1).flatMap(y =>
                                    Array.from({ length: rs.terms_per_year || 2 }, (_, ti) => ti + 1).map(t => {
                                      const isLast = t === (rs.terms_per_year || 2)
                                      const nextY = isLast ? y + 1 : y
                                      const optLabel = isLast ? y + '年終了時（' + nextY + '年生への進級条件）' : y + '年' + t + '学期終了時'
                                      return <option key={y + '-' + t} value={y + '-' + t}>{optLabel}</option>
                                    })
                                  )}
                                </select>
                              </div>
                              <input type="text" value={semLabel} onChange={e => setSemLabel(e.target.value)} placeholder="条件名（任意・空白で自動生成）"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500" />
                              <input type="number" value={semCredits || ''} onChange={e => setSemCredits(e.target.value ? Number(e.target.value) : null)} placeholder="累積必要単位数（任意）"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500" />
                              <div>
                                <label className="block text-sm text-gray-500 mb-2">必須履修科目（任意）</label>
                                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                  {rs.courses.length === 0 ? (
                                    <p className="text-sm text-gray-400 p-3">先に科目を登録してください</p>
                                  ) : (
                                    rs.courses.map(c => (
                                      <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" checked={semCourseIds.includes(c.id)} onChange={() => toggleSemCourseId(c.id)} className="w-4 h-4 rounded" />
                                        <span className="text-base text-gray-700">{c.course_name}</span>
                                        <span className="text-sm text-gray-400 ml-auto">{c.credits}単位</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                                {semCourseIds.length > 0 && <p className="text-sm text-purple-600 mt-1">{semCourseIds.length}科目選択中</p>}
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => handleAddSemesterRule(rs.id)} disabled={loading}
                                  className="flex-1 bg-purple-600 text-white text-base py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                  {loading ? '追加中...' : '追加する'}
                                </button>
                                <button onClick={() => { setShowSemForm(null); setSemCourseIds([]) }}
                                  className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setShowSemForm(rs.id)}
                              className="w-full border border-dashed border-gray-300 text-gray-500 text-base py-2.5 rounded-lg hover:border-purple-400 hover:text-purple-500 transition-colors">
                              + 進級条件を追加
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 公開ルールセット */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">他のユーザーの公開ルールセット</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input type="text" placeholder="大学名で絞り込み" value={searchUniversity} onChange={e => setSearchUniversity(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="学部名で絞り込み" value={searchFaculty} onChange={e => setSearchFaculty(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="キーワード検索" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2" />
          </div>
          <p className="text-sm text-gray-400 mb-3">{filteredPublicRuleSets.length}件</p>

          {filteredPublicRuleSets.length === 0 ? (
            <p className="text-base text-gray-400 text-center py-8">条件に一致するルールセットがありません</p>
          ) : (
            <div className="space-y-3">
              {displayedPublicRuleSets.map(rs => (
                <PublicRuleSetCard key={rs.id} rs={rs}
                  expanded={expandedPublicSetId === rs.id}
                  onToggle={() => setExpandedPublicSetId(expandedPublicSetId === rs.id ? null : rs.id)} />
              ))}
              {filteredPublicRuleSets.length > 3 && (
                <button onClick={() => setShowAllPublic(!showAllPublic)}
                  className="w-full py-3 text-base text-blue-500 hover:text-blue-700 border border-dashed border-blue-300 rounded-xl hover:bg-blue-50 transition-colors">
                  {showAllPublic ? '閉じる' : `残り${filteredPublicRuleSets.length - 3}件を見る`}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}