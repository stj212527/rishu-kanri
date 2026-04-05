'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async () => {
    setLoading(true)
    setMessage('')
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('確認メールを送信しました。メールを確認してください。')
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAuth()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Rism</h1>
        <p className="text-base text-gray-500 mb-8">卒業要件を可視化して、履修漏れを防ごう</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="example@email.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6文字以上"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>
          {message && (
            <p className="text-base text-blue-600 bg-blue-50 rounded-lg px-4 py-2">{message}</p>
          )}
          <button
            onClick={handleAuth}
            disabled={loading || !email || !password}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-base font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '処理中...' : isLogin ? 'ログイン' : '新規登録'}
          </button>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-base text-gray-500 hover:text-gray-700"
          >
            {isLogin ? 'アカウントをお持ちでない方はこちら' : 'すでにアカウントをお持ちの方はこちら'}
          </button>
          {/* ヘルプページへのリンク */}
          <div className="text-center">
            <Link href="/help" className="text-sm text-blue-400 hover:text-blue-600">
              使い方ガイドを見る →
            </Link>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-8 text-center">
          本ツールは履修管理を補助するためのものであり、正式な卒業判定を行うものではありません。
          必ず大学公式の履修要覧をご確認ください。
        </p>
      </div>
    </div>
  )
}