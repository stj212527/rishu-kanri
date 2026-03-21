import { RuleSetRule, RuleSetCourse, UserCourseRecord, RuleResult } from '@/types'

export function evaluateRules(rules: RuleSetRule[], courses: RuleSetCourse[], records: UserCourseRecord[]): RuleResult[] {
  const completedIds = new Set(records.filter(r => r.status === 'completed').map(r => r.template_course_id).filter(Boolean) as string[])
  return rules.map(rule => {
    const p = rule.rule_payload as Record<string, unknown>
    if (rule.rule_type === 'total_credits_min') {
      const req = p.min_credits as number
      const cur = courses.filter(c => completedIds.has(c.id)).reduce((s,c)=>s+c.credits,0)
      const ok = cur >= req
      return { rule_id: rule.id, rule_type: rule.rule_type, status: ok?'pass':'fail', current_value: cur, required_value: req, shortage: Math.max(0,req-cur), message: ok ? 'Total: OK ('+cur+' credits)' : 'Total: '+cur+' / '+req+' (need '+Math.max(0,req-cur)+' more)' } as RuleResult
    }
    if (rule.rule_type === 'category_credits_min') {
      const cid = p.category_id as string; const req = p.min_credits as number; const name = p.category_name as string
      const cur = courses.filter(c=>c.category_id===cid&&completedIds.has(c.id)).reduce((s,c)=>s+c.credits,0)
      const ok = cur >= req
      return { rule_id: rule.id, rule_type: rule.rule_type, status: ok?'pass':'fail', current_value: cur, required_value: req, shortage: Math.max(0,req-cur), message: ok ? name+': OK ('+cur+')' : name+': '+cur+' / '+req+' (need '+Math.max(0,req-cur)+' more)' } as RuleResult
    }
    if (rule.rule_type === 'category_credits_max') {
      const cid = p.category_id as string; const max = p.max_credits as number; const name = p.category_name as string
      const cur = courses.filter(c=>c.category_id===cid&&completedIds.has(c.id)).reduce((s,c)=>s+c.credits,0)
      const ok = cur <= max
      return { rule_id: rule.id, rule_type: rule.rule_type, status: ok?'pass':'fail', current_value: cur, required_value: max, shortage: 0, message: ok ? name+': within limit ('+cur+'/'+max+')' : name+': over limit ('+cur+'/'+max+')' } as RuleResult
    }
    if (rule.rule_type === 'required_courses_all') {
      const cids = p.course_ids as string[]
      const missing = courses.filter(c=>cids.includes(c.id)&&!completedIds.has(c.id))
      const ok = missing.length === 0
      return { rule_id: rule.id, rule_type: rule.rule_type, status: ok?'pass':'fail', current_value: cids.length-missing.length, required_value: cids.length, shortage: missing.length, message: ok ? 'Required: all done' : 'Missing: '+missing.map(c=>c.course_name).join(', ') } as RuleResult
    }
    if (rule.rule_type === 'elective_group_credits_min') {
      const cids = p.course_ids as string[]; const req = p.min_credits as number; const gname = p.group_name as string
      const cur = courses.filter(c=>cids.includes(c.id)&&completedIds.has(c.id)).reduce((s,c)=>s+c.credits,0)
      const ok = cur >= req
      return { rule_id: rule.id, rule_type: rule.rule_type, status: ok?'pass':'fail', current_value: cur, required_value: req, shortage: Math.max(0,req-cur), message: ok ? gname+': OK ('+cur+')' : gname+': '+cur+' / '+req+' (need '+Math.max(0,req-cur)+' more)' } as RuleResult
    }
    return { rule_id: rule.id, rule_type: rule.rule_type, status: 'warning', current_value: 0, required_value: 0, shortage: 0, message: 'unknown rule type' } as RuleResult
  })
}