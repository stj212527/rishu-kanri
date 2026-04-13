import { RuleSetRule, RuleSetCourse, UserCourseRecord, RuleResult } from '@/types'

export function evaluateRules(
  rules: RuleSetRule[],
  courses: RuleSetCourse[],
  records: UserCourseRecord[]
): RuleResult[] {
  const completedRecords = records.filter(r => r.status === 'completed')

  // テンプレート科目のcompletedなID
  const completedTemplateIds = new Set(
    completedRecords.map(r => r.template_course_id).filter(Boolean) as string[]
  )

  // 総取得単位（テンプレート科目 + カスタム科目）
  const totalCompletedCredits = completedRecords.reduce((sum, r) => {
    const credits = r.course?.credits ?? r.custom_credits ?? 0
    return sum + credits
  }, 0)

  /**
   * 区分IDごとの取得単位を計算する
   * - テンプレート科目: course.category_id で判定
   * - カスタム科目:    record.rule_category_id で判定（修正1: 自由入力の区分を反映）
   */
  const getCreditsByCategory = (categoryId: string): number => {
    // テンプレート科目
    const templateCredits = courses
      .filter(c => c.category_id === categoryId && completedTemplateIds.has(c.id))
      .reduce((s, c) => s + c.credits, 0)
    // カスタム科目（rule_category_id が一致するもの）
    const customCredits = completedRecords
      .filter(r => !r.template_course_id && r.rule_category_id === categoryId)
      .reduce((s, r) => s + (r.custom_credits ?? 0), 0)
    return templateCredits + customCredits
  }

  return rules.map(rule => {
    const p = rule.rule_payload as Record<string, unknown>

    // ── 総取得単位の最低条件 ──────────────────────────────
    if (rule.rule_type === 'total_credits_min') {
      const req = p.min_credits as number
      const cur = totalCompletedCredits
      const ok = cur >= req
      return {
        rule_id: rule.id, rule_type: rule.rule_type,
        status: ok ? 'pass' : 'fail',
        current_value: cur, required_value: req, shortage: Math.max(0, req - cur),
        message: ok
          ? '総単位数：条件達成（' + cur + '単位）'
          : '総単位数：' + cur + '単位 / ' + req + '単位必要（あと' + Math.max(0, req - cur) + '単位不足）'
      } as RuleResult
    }

    // ── 区分別の最低単位 ─────────────────────────────────
    if (rule.rule_type === 'category_credits_min') {
      const cid = p.category_id as string
      const req = p.min_credits as number
      const name = p.category_name as string
      // カスタム科目も含めてカウント
      const cur = getCreditsByCategory(cid)
      const ok = cur >= req
      return {
        rule_id: rule.id, rule_type: rule.rule_type,
        status: ok ? 'pass' : 'fail',
        current_value: cur, required_value: req, shortage: Math.max(0, req - cur),
        message: ok
          ? name + '：条件達成（' + cur + '単位）'
          : name + '：' + cur + '単位 / ' + req + '単位必要（あと' + Math.max(0, req - cur) + '単位不足）'
      } as RuleResult
    }

    // ── 区分別の上限単位 ─────────────────────────────────
    if (rule.rule_type === 'category_credits_max') {
      const cid = p.category_id as string
      const max = p.max_credits as number
      const name = p.category_name as string
      const cur = getCreditsByCategory(cid)
      const ok = cur <= max
      return {
        rule_id: rule.id, rule_type: rule.rule_type,
        status: ok ? 'pass' : 'fail',
        current_value: cur, required_value: max, shortage: 0,
        message: ok
          ? name + '：上限以内（' + cur + '/' + max + '単位）'
          : name + '：上限超過（' + cur + '/' + max + '単位、' + (cur - max) + '単位は算入対象外）'
      } as RuleResult
    }

    // ── 必修科目を指定 ────────────────────────────────────
    if (rule.rule_type === 'required_courses_all') {
      const cids = p.course_ids as string[]
      const missing = courses.filter(c => cids.includes(c.id) && !completedTemplateIds.has(c.id))
      const ok = missing.length === 0
      return {
        rule_id: rule.id, rule_type: rule.rule_type,
        status: ok ? 'pass' : 'fail',
        current_value: cids.length - missing.length, required_value: cids.length, shortage: missing.length,
        message: ok
          ? '必修科目：すべて取得済み'
          : '必修科目 未取得：' + missing.map(c => c.course_name).join('、')
      } as RuleResult
    }

    // ── 選択必修グループ ──────────────────────────────────
    if (rule.rule_type === 'elective_group_credits_min') {
      const cids = p.course_ids as string[]
      const req = p.min_credits as number
      const gname = p.group_name as string
      const cur = courses
        .filter(c => cids.includes(c.id) && completedTemplateIds.has(c.id))
        .reduce((s, c) => s + c.credits, 0)
      const ok = cur >= req
      return {
        rule_id: rule.id, rule_type: rule.rule_type,
        status: ok ? 'pass' : 'fail',
        current_value: cur, required_value: req, shortage: Math.max(0, req - cur),
        message: ok
          ? gname + '：条件達成（' + cur + '単位）'
          : gname + '：' + cur + '単位 / ' + req + '単位必要（あと' + Math.max(0, req - cur) + '単位不足）'
      } as RuleResult
    }

    // ── 【修正2】複数区分の超過単位ルール ──────────────────
    // 各区分で必要単位を超えた分の合計がexcess_credits以上であること
    // payload: { category_ids: string[], category_min_credits: number[], group_name: string, excess_credits: number }
    if (rule.rule_type === 'multi_category_excess_min') {
      const catIds = p.category_ids as string[]
      const catMins = p.category_min_credits as number[] // 各区分の最低単位（前提条件）
      const gname = p.group_name as string
      const req = p.excess_credits as number

      let totalExcess = 0
      const details: string[] = []

      catIds.forEach((cid, i) => {
        const min = catMins?.[i] ?? 0
        const cur = getCreditsByCategory(cid)
        const excess = Math.max(0, cur - min)
        totalExcess += excess
        const catName = courses.find(c => c.category_id === cid)?.course_name
          ?? (p.category_names as string[])?.[i]
          ?? ('区分' + (i + 1))
        details.push(catName + ':超過' + excess + '単位')
      })

      const ok = totalExcess >= req
      return {
        rule_id: rule.id, rule_type: rule.rule_type,
        status: ok ? 'pass' : 'fail',
        current_value: totalExcess, required_value: req, shortage: Math.max(0, req - totalExcess),
        message: ok
          ? gname + '：条件達成（超過合計' + totalExcess + '単位）'
          : gname + '：超過合計' + totalExcess + '単位 / ' + req + '単位必要（あと' + Math.max(0, req - totalExcess) + '単位不足）'
      } as RuleResult
    }

    return {
      rule_id: rule.id, rule_type: rule.rule_type,
      status: 'warning', current_value: 0, required_value: 0, shortage: 0,
      message: '不明なルール種別です'
    } as RuleResult
  })
}