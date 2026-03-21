export type UserProfile = {
  id: string
  user_id: string
  university_name: string
  faculty_name: string
  department_name: string
  entry_year: number
  active_rule_set_id: string | null
  created_at: string
}

export type Category = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type Course = {
  id: string
  user_id: string
  course_name: string
  course_code: string | null
  credits: number
  category_id: string | null
  is_required: boolean
  note: string | null
  created_at: string
  category?: Category
}

export type RuleSet = {
  id: string
  created_by: string
  title: string
  university_name: string | null
  faculty_name: string | null
  department_name: string | null
  entry_year: number | null
  is_public: boolean
  version: number
  original_rule_set_id: string | null
  created_at: string
  updated_at: string
  rules?: Rule[]
}

export type Rule = {
  id: string
  rule_set_id: string
  rule_type: 'total_credits_min' | 'category_credits_min' | 'category_credits_max' | 'required_courses_all' | 'elective_group_credits_min'
  rule_payload: Record<string, unknown>
  created_at: string
}

export type CompletedCourse = {
  id: string
  user_id: string
  course_id: string
  acquired_year: number | null
  acquired_term: string | null
  grade: string | null
  created_at: string
  course?: Course
}

export type RuleSetNotification = {
  id: string
  user_id: string
  rule_set_id: string
  old_version: number
  new_version: number
  is_read: boolean
  created_at: string
}

export type RuleResult = {
  rule_id: string
  rule_type: string
  passed: boolean
  current_value: number
  required_value: number
  shortage: number
  message: string
}
