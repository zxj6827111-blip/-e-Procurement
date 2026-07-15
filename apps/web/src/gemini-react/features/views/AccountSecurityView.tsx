import { useState } from 'react';
import { CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { apiPost } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';

export function AccountSecurityView() {
  const { currentUser } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function changePassword() {
    if (saving) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiPost('/api/me/change-password', { currentPassword, newPassword, confirmPassword }, currentUser?.id);
      setMessage('密码修改成功，正在注销当前会话。');
      await apiPost('/api/auth/logout', undefined, currentUser?.id).catch(() => undefined);
      window.location.assign('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" data-ui-check="account-security-view">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900"><ShieldCheck className="h-6 w-6 text-[#006666]" />账号安全</h2>
        <p className="mt-1 text-sm text-slate-500">修改当前登录账号的密码并使当前会话退出。</p>
      </div>
      {message ? <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</div> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <Card>
          <CardContent className="p-6">
            <h3 className="flex items-center gap-2 font-medium text-slate-900"><KeyRound className="h-5 w-5 text-[#006666]" />修改密码</h3>
            <div className="mt-5 max-w-lg space-y-4">
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                新密码至少 8 位，并且不能与当前密码相同。临时密码账号必须先完成此操作才能访问其他功能。
              </div>
              <label className="block text-sm font-medium text-slate-700">
                当前密码
                <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/15" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                新密码
                <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/15" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                确认新密码
                <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#006666] focus:ring-2 focus:ring-[#006666]/15" />
              </label>
              <Button
                variant="brand"
                className="w-full gap-2"
                data-ui-check="account-security-save"
                disabled={saving || !currentPassword || newPassword.length < 8 || !confirmPassword}
                onClick={() => void changePassword()}
              >
                <LockKeyhole className="h-4 w-4" />{saving ? '提交中...' : '保存并重新登录'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="border-l-4 border-[#006666] bg-slate-50 p-5">
          <h3 className="font-medium text-slate-900">会话处理</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">密码修改成功后，系统会注销当前会话并返回登录页。管理员重置密码时，也会立即注销该账号已有的全部会话。</p>
        </div>
      </div>
    </div>
  );
}
