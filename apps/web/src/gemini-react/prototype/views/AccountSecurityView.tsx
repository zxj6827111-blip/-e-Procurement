import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Shield, Key, Smartphone, History, CheckCircle } from 'lucide-react';

export function AccountSecurityView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">账号安全</h2>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-[#006666]" />修改密码</h3>
              <div className="space-y-4 max-w-md">
                <div className="p-3 bg-amber-50 rounded border border-amber-100 text-sm text-amber-800 mb-4">
                  为保障账号安全，建议定期修改密码。新密码长度不少于8位，且包含大小写字母、数字及特殊字符。
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">当前密码</label>
                  <input type="password" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="输入当前登录密码" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">新密码</label>
                  <input type="password" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="输入新密码" />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">确认新密码</label>
                  <input type="password" className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="再次输入新密码" />
                </div>
                <div className="pt-2">
                  <Button className="bg-[#006666] hover:bg-[#004d4d] text-white w-full">保存修改并重新登录</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium flex items-center gap-2"><History className="w-5 h-5 text-[#006666]" />近期登录记录</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">登录时间</th>
                      <th className="py-3 px-4 font-medium">IP地址</th>
                      <th className="py-3 px-4 font-medium">登录地点</th>
                      <th className="py-3 px-4 font-medium">登录方式</th>
                      <th className="py-3 px-4 font-medium">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">2026-07-06 09:12:45</td>
                      <td className="py-3 px-4">116.228.xx.xx</td>
                      <td className="py-3 px-4">上海市</td>
                      <td className="py-3 px-4">PC 网页端 (Chrome)</td>
                      <td className="py-3 px-4 text-green-600 text-xs flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3"/>成功</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">2026-07-05 14:30:11</td>
                      <td className="py-3 px-4">116.228.xx.xx</td>
                      <td className="py-3 px-4">上海市</td>
                      <td className="py-3 px-4">PC 网页端 (Edge)</td>
                      <td className="py-3 px-4 text-green-600 text-xs flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3"/>成功</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">2026-07-01 10:05:22</td>
                      <td className="py-3 px-4">220.181.xx.xx</td>
                      <td className="py-3 px-4">北京市</td>
                      <td className="py-3 px-4">移动端 APP</td>
                      <td className="py-3 px-4 text-red-600 text-xs flex items-center gap-1 mt-1">密码错误</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-[#006666]" />安全验证设置</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">手机号码绑定</p>
                      <p className="text-xs text-gray-500">已绑定：138****0000</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">修改</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-400">@</div>
                    <div>
                      <p className="text-sm font-medium">邮箱绑定</p>
                      <p className="text-xs text-red-500">未绑定</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">去绑定</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
