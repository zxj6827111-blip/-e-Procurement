import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AlertCircle, CheckCircle2, FileText, Info, Send, UserX } from 'lucide-react';
import { cn } from '../lib/utils';

export function ExpertRatingView() {
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [recusalSubmitted, setRecusalSubmitted] = useState(false);

  const criteria = [
    { id: 'c1', name: '商务部分 (30%)', items: [
      { id: 'c1-1', name: '注册资本与财务状况', weight: 10, maxScore: 10, desc: '考察近三年审计报告与流动比率' },
      { id: 'c1-2', name: '同类项目业绩', weight: 20, maxScore: 20, desc: '考察近三年三甲酒店类似成功案例，每个案例4分' }
    ]},
    { id: 'c2', name: '技术部分 (50%)', items: [
      { id: 'c2-1', name: '技术方案科学性', weight: 25, maxScore: 25, desc: '方案是否满足采购需求，技术架构是否先进合理' },
      { id: 'c2-2', name: '实施与交付计划', weight: 15, maxScore: 15, desc: '进度安排是否紧凑、人员配置是否充足' },
      { id: 'c2-3', name: '售后服务承诺', weight: 10, maxScore: 10, desc: '响应时间、备件支持、免费维保期限' }
    ]},
    { id: 'c3', name: '报价得分 (20%)', items: [
      { id: 'c3-1', name: '客观分计算', weight: 20, maxScore: 20, desc: '系统根据基准价自动测算，专家无需手填', auto: true }
    ]}
  ];

  const suppliers = [
    { id: 's1', name: '上海网智科技有限公司' },
    { id: 's2', name: '北京星云数智集团' },
    { id: 's3', name: '杭州绿谷智能系统' },
  ];

  if (recusalSubmitted) {
    return (
      <div data-ui-check="expert-recusal-submitted" className="max-w-3xl mx-auto mt-20">
        <Card className="text-center py-16 shadow-lg border-emerald-100">
          <CardContent className="space-y-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">回避申请已提交</h2>
            <p className="text-slate-600 text-lg max-w-md mx-auto">
              您的回避申请已成功提交，正在等待平台重新分配专家。感谢您对采购合规工作的支持。
            </p>
            <div className="pt-6">
              <Button 
                className="bg-[#006666] hover:bg-[#005252] text-white px-8 py-2 h-11 text-base font-medium"
                onClick={() => window.location.reload()}
              >
                返回工作台
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasConfirmed) {
    return (
      <div data-ui-check="expert-recusal-view" className="max-w-4xl mx-auto mt-8">
        <Card className="shadow-2xl border-rose-100 overflow-hidden">
          <div className="bg-rose-600 p-6 text-white flex items-start gap-4">
            <AlertCircle className="w-8 h-8 shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-2">专家回避制度确认书</h2>
              <p className="text-rose-100 text-sm">PROJ-2026-0034 大堂智能机器人采购项目</p>
            </div>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <p className="text-slate-700 leading-relaxed font-medium text-base">
              尊敬的评标专家：<br/><br/>
              您好！根据《中华人民共和国招标投标法》及集团采购管理规定，如果您与本项目以下投标供应商存在利益冲突或利害关系（包括但不限于近三年内曾在该单位任职、担任顾问、有股权关系或存在直系亲属关系），请务必主动申请回避。
            </p>
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-800 mb-3 text-base">本项目投标供应商名单：</h3>
              <ul className="grid grid-cols-2 gap-3 text-sm text-slate-600 list-disc list-inside">
                <li>上海网智科技有限公司</li>
                <li>北京星云数智集团</li>
                <li>杭州绿谷智能系统</li>
              </ul>
            </div>
            <div className="flex gap-4 pt-6">
              <Button 
                variant="outline" 
                data-ui-check="expert-recusal-submit"
                className="flex-1 h-14 text-lg font-bold border-rose-200 text-rose-700 hover:bg-rose-50" 
                onClick={() => setRecusalSubmitted(true)}
              >
                <UserX className="w-5 h-5 mr-2" />
                我存在利害关系，申请回避
              </Button>
              <Button 
                data-ui-check="expert-confirm-participation"
                className="flex-1 h-14 text-lg font-bold bg-[#006666] text-white hover:bg-[#005252]" 
                onClick={() => setHasConfirmed(true)}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                无利害关系，确认参与评审
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div data-ui-check="expert-scoring-view" className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#006666]" />
            专家评审打分台
          </h2>
          <p className="text-sm text-slate-500 mt-1">PROJ-2026-0034 | 大堂智能机器人采购项目综合打分</p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="bg-white">查看招标文件</Button>
           <Button variant="outline" className="bg-white">查看所有投标文件</Button>
        </div>
      </div>

      <Card className="shadow-md border-t-4 border-t-[#006666]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="p-4 text-left font-medium text-slate-700 w-48 border-r border-slate-200">评分维度</th>
                <th className="p-4 text-left font-medium text-slate-700 w-64 border-r border-slate-200">打分项及标准</th>
                <th className="p-4 text-center font-medium text-slate-700 w-24 border-r border-slate-200">满分</th>
                {suppliers.map(s => (
                  <th key={s.id} className="p-4 text-center font-bold text-[#006666] bg-slate-50 min-w-[160px] border-r border-slate-200 last:border-0">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {criteria.map((cat, i) => (
                <React.Fragment key={cat.id}>
                  {cat.items.map((item, j) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                      {j === 0 && (
                        <td rowSpan={cat.items.length} className="p-4 font-semibold text-slate-800 bg-white border-r border-slate-200 align-top">
                          {cat.name}
                        </td>
                      )}
                      <td className="p-4 border-r border-slate-200 align-top">
                        <div className="font-medium text-slate-900 mb-1">{item.name}</div>
                        <div className="text-xs text-slate-500 leading-relaxed">{item.desc}</div>
                      </td>
                      <td className="p-4 text-center font-medium text-slate-700 border-r border-slate-200 bg-slate-50/50 align-top">
                        {item.maxScore}
                      </td>
                      {suppliers.map(s => (
                        <td key={s.id} className="p-4 border-r border-slate-200 last:border-0 align-top bg-white">
                          {"auto" in item && item.auto ? (
                            <div className="w-full h-10 flex items-center justify-center bg-slate-100 border border-slate-200 rounded text-slate-400 font-mono text-sm cursor-not-allowed">
                              系统自动计算
                            </div>
                          ) : (
                            <div>
                              <input 
                                type="number" 
                                min="0" 
                                max={item.maxScore} 
                                className="w-full text-center border border-slate-300 rounded px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-[#FFC107] focus:border-[#FFC107] bg-amber-50/30 transition-shadow"
                                placeholder={`0-${item.maxScore}`}
                              />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              
              {/* 总分行 */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td colSpan={2} className="p-4 text-right text-slate-800 border-r border-slate-200">
                  专家主观评分小计 (不含系统客观分)
                </td>
                <td className="p-4 text-center text-slate-800 border-r border-slate-200">
                  80
                </td>
                {suppliers.map(s => (
                  <td key={s.id} className="p-4 text-center text-2xl text-[#006666] border-r border-slate-200 last:border-0 bg-white">
                    0.0
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p>请注意：每项得分不得超过该项满分。评分一旦【提交签名】，将采用区块链技术上链固化，无法进行任何修改。</p>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-[220px] right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex justify-end gap-4 pr-12">
        <Button variant="outline" className="px-6 h-11 text-base font-medium min-w-[140px] border-[#006666] text-[#006666]">
          保存评分进度
        </Button>
        <Button variant="primary" className="px-8 h-11 text-base font-bold min-w-[180px] bg-[#006666] text-white hover:bg-[#005252]">
          <Send className="w-5 h-5 mr-2" />
          确认无误，提交签名
        </Button>
      </div>
    </div>
  );
}
