import React from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle, ShieldAlert, FileText, Users, Handshake } from 'lucide-react';

export function ProjectSourcingView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">项目招采执行</h2>
        <div className="flex gap-3">
          <Button variant="outline">生成评审报告</Button>
          <Button className="bg-[#006666] hover:bg-[#004d4d] text-white">进入定标阶段</Button>
        </div>
      </div>

      <Card className="bg-[#006666] text-white">
        <CardContent className="p-6">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">公开招标</span>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs font-medium border border-yellow-500/30">专家评审中</span>
              </div>
              <h3 className="text-2xl font-semibold mb-1">2026年Q3客房布草集中采购项目</h3>
              <p className="text-white/70 text-sm">项目编号：PROJ-202607-001 | 预算金额：¥ 150,000.00 | 截标时间：2026-07-20 18:00</p>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-between">
            {['采购文件', '公告邀请', '报名审核', '报价响应', '专家评审', '定标审批'].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 relative">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs z-10 ${idx < 4 ? 'bg-yellow-500 text-white' : idx === 4 ? 'bg-white text-[#006666] border-2 border-yellow-500' : 'bg-[#004d4d] text-white/50'}`}>
                  {idx < 4 ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-xs mt-2 ${idx === 4 ? 'font-medium text-white' : 'text-white/70'}`}>{step}</span>
                {idx < 5 && <div className={`absolute top-3 left-[50%] w-full h-[2px] ${idx < 4 ? 'bg-yellow-500' : 'bg-[#004d4d]'}`}></div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium flex items-center gap-2"><Users className="w-5 h-5 text-[#006666]" />报价响应与评审</h3>
                <Button variant="outline" size="sm">抽取评审专家</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b">
                    <tr>
                      <th className="py-3 px-4 font-medium">供应商名称</th>
                      <th className="py-3 px-4 font-medium">报价总金额(¥)</th>
                      <th className="py-3 px-4 font-medium">技术评分</th>
                      <th className="py-3 px-4 font-medium">商务评分</th>
                      <th className="py-3 px-4 font-medium">综合总分</th>
                      <th className="py-3 px-4 font-medium">排名</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-yellow-50/30">
                      <td className="py-3 px-4 font-medium">南通纺织供应链有限公司</td>
                      <td className="py-3 px-4 text-red-600 font-medium">138,500.00</td>
                      <td className="py-3 px-4">42.5 / 50</td>
                      <td className="py-3 px-4">45.0 / 50</td>
                      <td className="py-3 px-4 font-bold text-[#006666]">87.5</td>
                      <td className="py-3 px-4"><span className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs">1</span></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">江苏梦百合酒店用品</td>
                      <td className="py-3 px-4">142,000.00</td>
                      <td className="py-3 px-4">45.0 / 50</td>
                      <td className="py-3 px-4">40.0 / 50</td>
                      <td className="py-3 px-4 font-bold text-[#006666]">85.0</td>
                      <td className="py-3 px-4"><span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">2</span></td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">上海康乃馨布草制造</td>
                      <td className="py-3 px-4">135,000.00</td>
                      <td className="py-3 px-4">38.0 / 50</td>
                      <td className="py-3 px-4">46.0 / 50</td>
                      <td className="py-3 px-4 font-bold text-[#006666]">84.0</td>
                      <td className="py-3 px-4"><span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs">3</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-[#006666]" />采购文件与公告记录</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">公开招标采购文件_V1.pdf</p>
                      <p className="text-xs text-gray-500">发布时间：2026-07-05 10:00</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">已发布</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Handshake className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">招标公告（中国招标投标公共服务平台同步）</p>
                      <p className="text-xs text-gray-500">发布时间：2026-07-05 10:30</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">同步成功</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" />合规与风险提醒</h3>
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border rounded">
                  <p className="text-sm font-medium mb-1">围串标风险检测</p>
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> 未发现IP/MAC地址重合</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3"/> 报价呈合理正态分布</p>
                </div>
                <div className="p-3 bg-slate-50 border rounded">
                  <p className="text-sm font-medium mb-1">专家回避原则校验</p>
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> 评审组内无利益相关方</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
