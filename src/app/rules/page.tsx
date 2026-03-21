'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { RuleSet, Rule, Category, Course } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const RULE_TYPE_LABELS: Record<string, string> = {
  total_credits_min: '総取得単位の最低条件',
  category_credits_min: '区分別の最低単位',
  category_credits_max: '区分別の上限単位',
  required_courses_all: '必修科目の全取得',
  elective_group_credits_min: '選択必修グループの最低単位',
}

type RuleSetWithRules = RuleSet & { rules: Rule[] }

export default function RulesPage() {
  const [myRuleSets, setMyRuleSets] = useState<RuleSetWithRules[]>([])
  const [publicRuleSets, setPublicRuleSets] = useState<RuleSetWithRules[]>([])
  const [activeRuleSetId, setActiveRuleSetId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [showPublic, setShowPublic] = useState(false)

  // ルールセット作成・編集フォーム
  const [showSetForm, setShowSetForm] = useState(false)
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [setTitle, setSetTitle] = useState('')
  const [setIsPublic, setSetIsPublic] = useState(false)

  // ルール追加フォーム
  const [activeSetForRule, setActiveSetForRule] = useState<string | null>(null)
  const [ruleType, setRuleType] = useState('total_credits_min')
  const [minCredits, setMinCredits] = useState(124)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [maxCredits, setMaxCredits] = useState(20)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setCurrentUserId(user.id)

    const [profileRes, myRuleSetsRes, categoriesRes, coursesRes] = await Promise.all([
      supabase.from('user_profiles').select('active_rule_set_id').eq('user_id', user.id).single(),
      supabase.from('rule_sets').select('*, rules(*)').eq('created_by', user.id).order('created_at'),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('courses').select('*').eq('user_id', user.id),
    ])

    setActiveRuleSetId(profileRes.data?.active_rule_set_id || null)
    setMyRuleSets(myRuleSetsRes.data || [])
    setCategories(categoriesRes.data || [])
    setCourses(coursesRes.data || [])

    const publicRes = await supabase
      .from('rule_sets')
      .select('*, rules(*)')
      .eq('is_public', true)
      .neq('created_by', user.id)
    setPublicRuleSets(publicRes.data || [])
  }

  useEffect(() => { fetchData() }, [])

  // ルールセットを使用中にする
  const handleActivate = async (ruleSetId: string) => {
    await supabase.from('user_profiles').update({ active_rule_set_id: ruleSetId }).eq('user_id', currentUserId)
    setActiveRuleSetId(ruleSetId)
    alert('ルールセットを設定しました')
  }

  // ルールセット新規作成
  const handleCreateSet = async () => {
    if (!setTitle) return
    setLoading(true)
    try {
      if (editingSetId) {
        const current = myRuleSets.find(s => s.id === editingSetId)
        const newVersion = (current?.version || 1) + 1
        await supabase.from('rule_sets').update({
          title: setTitle,
          is_public: setIsPublic,
          version: newVersion,
          updated_at: new Date().toISOString(),
        }).eq('id', editingSetId)

        // 他のユーザーへの更新通知
        const usersRes = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('active_rule_set_id', editingSetId)
          .neq('user_id', currentUserId)
        if (usersRes.data && usersRes.data.length > 0) {
          const notifications = usersRes.data.map(u => ({
            user_id: u.user_id,
            rule_set_id: editingSetId,
            old_version: current?.version || 1,
            new_version: newVersion,
          }))
          await supabase.from('rule_set_notifications').insert(notifications)
        }
      } else {
        await supabase.from('rule_sets').insert({
          created_by: currentUserId,
          title: setTitle,
          is_public: setIsPublic,
          version: 1,
        })
      }
      setSetTitle(''); setSetIsPublic(false); setEditingSetId(null); setShowSetForm(false)
      fetchData()
    } finally {
      setLoading(false)
    }
  }

  // ルールセット編集開始
  const handleEditSet = (ruleSet: RuleSetWithRules) => {
    setEditingSetId(ruleSet.id)
    setSetTitle(ruleSet.title)
    setSetIsPublic(ruleSet.is_public)
    setShowSetForm(true)
  }

  // ルールセット削除
  const handleDeleteSet = async (id: string) => {
    if (!confirm('このルールセットを削除しますか？中のルールもすべて削除されます。')) return
    await supabase.from('rule_sets').delete().eq('id', id)
    fetchData()
  }

  // 他ユーザーのルールセットをコピー
  const handleCopySet = async (ruleSet: RuleSetWithRules) => {
    setLoading(true)
    try {
      const newSetRes = await supabase.from('rule_sets').insert({
        created_by: currentUserId,
        title: ruleSet.title + ' (コピー)',
        is_public: false,
        version: 1,
        original_rule_set_id: ruleSet.id,
      }).select().single()

      if (newSetRes.data && ruleSet.rules.length > 0) {
        const copiedRules = ruleSet.rules.map(r => ({
          rule_set_id: newSetRes.data.id,
          rule_type: r.rule_type,
          rule_payload: r.rule_payload,
        }))
        await supabase.from('rules').insert(copiedRules)
      }
      alert('ルールセットをコピーしました。自分のルールセットから編集できます。')
      fetchData()
    } finally {
      setLoading(false)
    }
  }

  // ルール追加
  const buildPayload = () => {
    const category = categories.find(c => c.id === selectedCategoryId)
    switch (ruleType) {
      case 'total_credits_min': return { min_credits: minCredits }
      case 'category_credits_min': return { category_id: selectedCategoryId, category_name: category?.name, min_credits: minCredits }
      case 'category_credits_max': return { category_id: selectedCategoryId, category_name: category?.name, max_credits: maxCredits }
      case 'required_courses_all': return { course_ids: selectedCourseIds }
      case 'elective_group_credits_min': return { course_ids: selectedCourseIds, group_name: groupName, min_credits: minCredits }
      default: return {}
    }
  }

  const handleAddRule = async (ruleSetId: string) => {
    setLoading(true)
    try {
      await supabase.from('rules').insert({
        rule_set_id: ruleSetId,
        rule_type: ruleType,
        rule_payload: buildPayload(),
      })
      setRuleType('total_credits_min'); setMinCredits(124); setSelectedCategoryId('')
      setMaxCredits(20); setSelectedCourseIds([]); setGroupName('')
      setActiveSetForRule(null)
      fetchData()
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('このルールを削除しますか？')) return
    await supabase.from('rules').delete().eq('id', ruleId)
    fetchData()
  }

  const handleAddCategory = async () => {
    if (!newCategoryName) return
    await supabase.from('categories').insert({ user_id: currentUserId, name: newCategoryName })
    setNewCategoryName('')
    fetchData()
  }

  const toggleCourseId = (id: string) => {
    setSelectedCourseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const getRuleSummary = (rule: Rule) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">ルール管理</h1>
        <Link href="/dashboard" className="text-base text-blue-500 hover:text-blue-700 font-medium">
          ← ホームに戻る
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 区分管理 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">区分の管理</h2>
          <div className="flex gap-2 mb-3">
            <input type="text" placeholder="区分名（例：専門必修、外国語）" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleAddCategory} disabled={!newCategoryName}
              className="bg-blue-600 text-white text-base px-5 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              追加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <span key={c.id} className="bg-blue-50 text-blue-700 text-base px-3 py-1.5 rounded-full">{c.name}</span>
            ))}
            {categories.length === 0 && <p className="text-base text-gray-400">区分がまだありません</p>}
          </div>
        </div>

        {/* 自分のルールセット */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">自分のルールセット</h2>
            <button onClick={() => { setEditingSetId(null); setSetTitle(''); setSetIsPublic(false); setShowSetForm(!showSetForm) }}
              className="bg-blue-600 text-white text-base px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              + 新規作成
            </button>
          </div>

          {showSetForm && (
            <div className="border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
              <h3 className="text-base font-semibold text-gray-700">{editingSetId ? 'ルールセットを編集' : '新しいルールセット'}</h3>
              <div>
                <label className="block text-sm text-gray-500 mb-1">ルールセット名 *</label>
                <input type="text" placeholder="例：2024年度 情報学部 卒業要件" value={setTitle} onChange={e => setSetTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={setIsPublic} onChange={e => setSetIsPublic(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-base text-gray-700">このルールセットを他のユーザーに公開する</span>
              </label>
              <div className="flex gap-3">
                <button onClick={handleCreateSet} disabled={loading || !setTitle}
                  className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {loading ? '保存中...' : editingSetId ? '変更を保存' : '作成する'}
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
              {myRuleSets.map(ruleSet => (
                <div key={ruleSet.id} className={
                  'border rounded-xl p-5 ' +
                  (activeRuleSetId === ruleSet.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200')
                }>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-gray-800">{ruleSet.title}</p>
                        {activeRuleSetId === ruleSet.id && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">使用中</span>
                        )}
                        {ruleSet.is_public && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">公開中</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">v{ruleSet.version} · {ruleSet.rules.length}個のルール</p>
                    </div>
                    <div className="flex gap-3">
                      {activeRuleSetId !== ruleSet.id && (
                        <button onClick={() => handleActivate(ruleSet.id)}
                          className="text-sm text-blue-500 hover:text-blue-700">使用する</button>
                      )}
                      <button onClick={() => handleEditSet(ruleSet)}
                        className="text-sm text-gray-500 hover:text-gray-700">編集</button>
                      <button onClick={() => handleDeleteSet(ruleSet.id)}
                        className="text-sm text-red-400 hover:text-red-600">削除</button>
                    </div>
                  </div>

                  {/* ルール一覧 */}
                  {ruleSet.rules.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-100 mb-3">
                      {ruleSet.rules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-400">{RULE_TYPE_LABELS[rule.rule_type]}</p>
                            <p className="text-base text-gray-700">{getRuleSummary(rule)}</p>
                          </div>
                          <button onClick={() => handleDeleteRule(rule.id)}
                            className="text-sm text-red-400 hover:text-red-600">削除</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ルール追加ボタン */}
                  {activeSetForRule === ruleSet.id ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
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
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                              {courses.length === 0 ? (
                                <p className="text-base text-gray-400 p-3">先に科目を登録してください。</p>
                              ) : (
                                courses.map(c => (
                                  <label key={c.id} className="flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50">
                                    <input type="checkbox" checked={selectedCourseIds.includes(c.id)} onChange={() => toggleCourseId(c.id)} className="w-4 h-4 rounded" />
                                    <span className="text-base text-gray-700">{c.course_name}</span>
                                    <span className="text-sm text-gray-400 ml-auto">{c.credits}単位</span>
                                  </label>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                      <div className="flex gap-3">
                        <button onClick={() => handleAddRule(ruleSet.id)} disabled={loading}
                          className="flex-1 bg-blue-600 text-white text-base py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          {loading ? '追加中...' : 'ルールを追加'}
                        </button>
                        <button onClick={() => setActiveSetForRule(null)}
                          className="flex-1 border border-gray-300 text-gray-600 text-base py-3 rounded-lg hover:bg-gray-50 transition-colors">
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setActiveSetForRule(ruleSet.id)}
                      className="w-full border border-dashed border-gray-300 text-gray-500 text-base py-2.5 rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors">
                      + ルールを追加
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 公開ルールセット */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">他のユーザーの公開ルールセット</h2>
            <button onClick={() => setShowPublic(!showPublic)}
              className="text-base text-blue-500 hover:text-blue-700">
              {showPublic ? '閉じる' : '一覧を見る'}
            </button>
          </div>

          {showPublic && (
            <div className="space-y-4">
              {publicRuleSets.length === 0 ? (
                <p className="text-base text-gray-400 text-center py-8">公開されているルールセットがまだありません</p>
              ) : (
                publicRuleSets.map(ruleSet => (
                  <div key={ruleSet.id} className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-lg font-semibold text-gray-800">{ruleSet.title}</p>
                        <p className="text-sm text-gray-400 mt-0.5">v{ruleSet.version} · {ruleSet.rules.length}個のルール</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleActivate(ruleSet.id)}
                          className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                          使用する
                        </button>
                        <button onClick={() => handleCopySet(ruleSet)}
                          className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                          コピーして編集
                        </button>
                      </div>
                    </div>
                    {ruleSet.rules.length > 0 && (
                      <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                        {ruleSet.rules.map(rule => (
                          <div key={rule.id} className="px-4 py-2">
                            <p className="text-sm text-gray-400">{RULE_TYPE_LABELS[rule.rule_type]}</p>
                            <p className="text-base text-gray-700">{getRuleSummary(rule)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}