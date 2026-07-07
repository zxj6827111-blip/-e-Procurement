import React, { useState } from 'react';
import { useApp } from '../../core/AppContext';
import { RoleNames, Role } from '../../shared/types';
import { DEMO_USERS } from '../reference-data';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Shield, Lock, User as UserIcon, Building, ArrowRight, Info } from 'lucide-react';
import { cn } from '../../shared/lib/utils';

const DEMO_ACCOUNTS = [
  { username: 'admin', role: 'SYSTEM_ADMIN', label: '系统管理员' },
  { username: 'manager', role: 'GROUP_PROCUREMENT_MANAGER', label: '集团管理' },
  { username: 'buyer', role: 'PROCUREMENT_AGENT', label: '采购经办' },
  { username: 'hotel', role: 'HOTEL_PROCUREMENT', label: '酒店采购' },
  { username: 'hotel_fin', role: 'HOTEL_FINANCE', label: '酒店财务' },
  { username: 'ops', role: 'PLATFORM_OPERATIONS', label: '平台运营' },
  { username: 'supplier', role: 'SUPPLIER', label: '供应商' },
  { username: 'supplier_adm', role: 'SUPPLIER_ADMIN', label: '供应商管理员' },
  { username: 'supplier_bid', role: 'SUPPLIER_BIDDER', label: '供应商报价员' },
  { username: 'expert', role: 'EXPERT', label: '专家' },
  { username: 'finance', role: 'FINANCE_REVIEWER', label: '财务审核' },
  { username: 'audit', role: 'DISCIPLINARY_AUDIT', label: '纪检审计' },
] as const;

// Helper to map any input username to a demo role
const getRoleFromUsername = (username: string): Role | null => {
  const account = DEMO_ACCOUNTS.find(a => a.username === username);
  if (account) return account.role as Role;

  // Fallbacks for other roles
  if (username === 'hotel_fin') return 'HOTEL_FINANCE';
  if (username === 'finance') return 'FINANCE_REVIEWER';
  if (username === 'audit') return 'DISCIPLINARY_AUDIT';

  return null;
};

export function LoginView() {
  const { loginAs } = useApp();
  const [username, setUsername] = useState('manager');
  const [password, setPassword] = useState('123456');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('请输入账号和密码');
      return;
    }

    const role = getRoleFromUsername(username.toLowerCase());
    if (!role) {
      setErrorMsg('账号不存在，请使用演示账号');
      return;
    }

    if (password !== '123456') {
      setErrorMsg('密码错误，演示密码统一为 123456');
      return;
    }

    setErrorMsg('');
    setIsLoggingIn(true);
    // Simulate network delay for realism
    setTimeout(() => {
      loginAs(role);
    }, 600);
  };

  const quickFill = (uname: string) => {
    setUsername(uname);
    setPassword('123456');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left side - Branding & Visual */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-[#005252] p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#006666] blur-3xl opacity-50"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#005252]">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-wider">G-HOTEL GROUP</span>
          </div>

          <div className="max-w-lg mt-20">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              数字驱动采购<br />
              阳光护航未来
            </h1>
            <p className="text-[#80b3b3] text-lg leading-relaxed">
              集团内部采购规范化平台，为您提供全流程、可追溯、安全高效的供应链管理与招标采购服务。
            </p>
          </div>
        </div>

        <div className="relative z-10 text-sm text-[#80b3b3]">
          &copy; {new Date().getFullYear()} G-Hotel Group. All rights reserved.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 bg-white relative z-20 shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-sm mx-auto">
          <div className="md:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#005252] rounded-lg flex items-center justify-center text-white">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-wider">G-HOTEL</span>
          </div>

          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">欢迎登录</h2>
            <p className="text-sm text-slate-500">请输入您的账号密码进入系统工作台</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">系统账号</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666] outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 block">登录密码</label>
                <a href="#" className="text-xs text-[#006666] hover:underline" onClick={(e) => e.preventDefault()}>忘记密码？</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666] outline-none transition-all"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-sm flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-6 text-base font-medium bg-[#006666] hover:bg-[#005252] text-white shadow-lg shadow-[#006666]/20 mt-4 transition-all"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  正在登录...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  安全登录系统 <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-3 text-center md:text-left">一键填充演示账号：</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.username}
                  onClick={() => quickFill(account.username)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-md transition-colors"
                >
                  {account.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center md:text-left">
              * 测试密码均为 123456
            </p>
          </div>

          <div className="mt-8 pt-6">
            <div className="flex justify-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-slate-600 transition-colors">平台操作手册</a>
              <a href="#" className="hover:text-slate-600 transition-colors">供应商入驻</a>
              <a href="#" className="hover:text-slate-600 transition-colors">联系技术支持</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
