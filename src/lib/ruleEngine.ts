import { RuleSetRule, RuleSetCourse, UserCourseRecord, RuleResult } from '@/types'

export function evaluateRules(
  rules: RuleSetRule[],
  courses: RuleSetCourse[],
  records: UserCourseRecord[]
): RuleResult[] {
  // completedのみ判定対象
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

  return rules.map(rule => {
    const p = rule.rule_payload as Record<string, unknown>

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

    if (rule.rule_type === 'category_credits_min') {
      const cid = p.category_id as string
      const req = p.min_credits as number
      const name = p.category_name as string
      // その区分に属するテンプレート科目のみカウント
      const cur = courses
        .filter(c => c.category_id === cid && completedTemplateIds.has(c.id))
        .reduce((s, c) => s + c.credits, 0)
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

    if (rule.rule_type === 'category_credits_max') {
      const cid = p.category_id as string
      const max = p.max_credits as number
      const name = p.category_name as string
      const cur = courses
        .filter(c => c.category_id === cid && completedTemplateIds.has(c.id))
        .reduce((s, c) => s + c.credits, 0)
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

    return {
      rule_id: rule.id, rule_type: rule.rule_type,
      status: 'warning', current_value: 0, required_value: 0, shortage: 0,
      message: '不明なルール種別です'
    } as RuleResult
  })
}