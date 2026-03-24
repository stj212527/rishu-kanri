export type UserProfile = {
  id: string
  user_id: string
  university_name: string
  faculty_name: string
  department_name: string
  entry_year: number
  active_rule_set_id: string | null
  current_year: number
  current_term: number
  created_at: string
}

export type RuleSet = {
  id: string
  created_by: string
  title: string
  university_name: string | null
  faculty_name: string | null
  department_name: string | null
  entry_year: number | null
  description: string | null
  is_public: boolean
  version: number
  original_rule_set_id: string | null
  years_of_study: number
  terms_per_year: number
  created_at: string
  updated_at: string
}

export type RuleSetCategory = {
  id: string
  rule_set_id: string
  name: string
  sort_order: number
  created_at: string
}

export type RuleSetCourse = {
  id: string
  rule_set_id: string
  course_name: string
  course_code: string | null
  credits: number
  category_id: string | null
  is_required: boolean
  note: string | null
  created_at: string
  category?: RuleSetCategory
}

export type RuleSetRule = {
  id: string
  rule_set_id: string
  rule_type: 'total_credits_min' | 'category_credits_min' | 'category_credits_max' | 'required_courses_all' | 'elective_group_credits_min'
  rule_payload: Record<string, unknown>
  created_at: string
}

export type UserCourseRecord = {
  id: string
  user_id: string
  rule_set_id: string
  template_course_id: string | null
  custom_course_name: string | null
  custom_credits: number | null
  custom_category_id: string | null
  status: 'completed' | 'in_progress' | 'planned' | 'failed'
  acquired_year: number | null
  acquired_term: string | null
  grade: string | null
  note: string | null
  shared_course_id: string | null
  memo: string | null
  created_at: string
  updated_at: string
  course?: RuleSetCourse
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
  status: 'pass' | 'fail' | 'warning'
  current_value: number
  required_value: number
  shortage: number
  message: string
}

export type SemesterRule = {
  id: string
  rule_set_id: string
  year_num: number
  term_num: number
  label: string | null
  cumulative_min_credits: number | null
  required_course_ids: string[]
  created_at: string
}

export type SharedCourse = {
  id: string
  created_by: string
  course_name: string
  credits: number
  category_name: string | null
  university_name: string | null
  faculty_name: string | null
  is_required: boolean
  note: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}