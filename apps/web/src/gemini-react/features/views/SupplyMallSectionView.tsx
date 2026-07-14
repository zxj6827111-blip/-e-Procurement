import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { ShoppingCart, Search, Filter, Package, Tag, Layers } from 'lucide-react';

export function SupplyMallSectionView() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [cartCount, setCartCount] = useState(3);
  const [message, setMessage] = useState('');

  const addToCart = () => {
    setCartCount((count) => count + 1);
    setMessage('商品已加入采购清单，可继续比价或统一结算下单。');
  };

  const checkout = () => {
    setActiveTab('orders');
    setMessage(`已根据 ${cartCount} 项采购清单生成商城订单草稿。`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">协议商品商城</h2>
        <div className="flex gap-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-gray-600 absolute left-3 top-2.5" />
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">{cartCount}</span>
            <Button variant="outline" className="pl-10" onClick={() => { setActiveTab('orders'); setMessage('已打开采购清单与商城订单。'); }}>采购清单</Button>
          </div>
          <Button data-ui-check="mall-checkout" className="bg-[#006666] hover:bg-[#004d4d] text-white" onClick={checkout}>结算下单</Button>
        </div>
      </div>
      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="flex gap-4 border-b">
        {[
          { id: 'catalog', label: '商品目录', icon: Package },
          { id: 'packages', label: '开业/换新套餐', icon: Layers },
          { id: 'orders', label: '我的商城订单', icon: ShoppingCart },
          { id: 'pricing', label: '价格协议区', icon: Tag },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'border-[#006666] text-[#006666]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {activeTab === 'catalog' && (
          <>
            <div className="w-64 shrink-0 space-y-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2"><Filter className="w-4 h-4"/> 目录筛选</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-2">一级分类</p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded text-[#006666]" /> 客房布草 (120)</label>
                        <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666]" /> 客房易耗品 (85)</label>
                        <label className="flex items-center gap-2"><input type="checkbox" className="rounded text-[#006666]" /> 餐饮器皿 (210)</label>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-gray-500 mb-2">品牌馆</p>
                      <select className="w-full border rounded px-2 py-1 text-sm outline-none">
                        <option>全部合作品牌</option>
                        <option>康乃馨</option>
                        <option>雅兰</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input type="text" className="w-full border rounded px-10 py-2 text-sm focus:ring-1 focus:ring-[#006666] outline-none" placeholder="搜索商品名称、SKU、供应商..." />
                </div>
                <Button variant="outline" onClick={() => setMessage('已按商品名称、SKU 和供应商刷新筛选结果。')}>搜索</Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="hover:border-[#006666] transition-colors overflow-hidden group">
                    <div className="h-40 bg-slate-100 flex items-center justify-center relative">
                      <Package className="w-12 h-12 text-slate-300" />
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full">集采框架协议</div>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-medium text-gray-800 mb-1 line-clamp-1">80S高支全棉贡缎被套 白底提花</h4>
                      <p className="text-xs text-gray-500 mb-2">供应商: 南通纺织供应链 | 规格: 230*240cm</p>
                      <div className="flex items-end justify-between mt-4">
                        <div>
                          <span className="text-lg font-bold text-red-600">¥ 125.00</span>
                          <span className="text-xs text-gray-400 ml-1">/条</span>
                        </div>
                        <Button size="sm" variant="outline" className="text-[#006666] border-[#006666] hover:bg-[#006666] hover:text-white transition-colors" onClick={addToCart}>加入清单</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
        {activeTab !== 'catalog' && (
          <div className="flex-1">
            <Card>
              <CardContent className="p-0">
                {activeTab === 'packages' ? (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-6 py-4">套餐名称</th>
                        <th className="px-6 py-4">适用场景</th>
                        <th className="px-6 py-4">参考金额</th>
                        <th className="px-6 py-4">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {['客房布草开业包', '大堂家具焕新包'].map((name, index) => (
                        <tr key={name}>
                          <td className="px-6 py-4 font-medium">{name}</td>
                          <td className="px-6 py-4">{index === 0 ? '新店开业 / 换季补货' : '公区改造 / 家具换新'}</td>
                          <td className="px-6 py-4 text-red-600 font-medium">CNY {(index ? 86000 : 128000).toLocaleString('zh-CN')}</td>
                          <td className="px-6 py-4"><Button size="sm" variant="outline" onClick={addToCart}>加入清单</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {activeTab === 'orders' ? (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-6 py-4">订单/清单</th>
                        <th className="px-6 py-4">商品项</th>
                        <th className="px-6 py-4">状态</th>
                        <th className="px-6 py-4">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-6 py-4 font-medium">商城订单草稿</td>
                        <td className="px-6 py-4">{cartCount} 项</td>
                        <td className="px-6 py-4 text-amber-600">待提交</td>
                        <td className="px-6 py-4"><Button size="sm" className="bg-[#006666] text-white" onClick={() => setMessage('商城订单已提交，后续进入订单履约。')}>提交订单</Button></td>
                      </tr>
                    </tbody>
                  </table>
                ) : null}
                {activeTab === 'pricing' ? (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-6 py-4">协议编号</th>
                        <th className="px-6 py-4">供应商</th>
                        <th className="px-6 py-4">有效期</th>
                        <th className="px-6 py-4">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-6 py-4 font-medium">AGR-2026-001</td>
                        <td className="px-6 py-4">南通纺织供应链</td>
                        <td className="px-6 py-4">2026-01-01 至 2026-12-31</td>
                        <td className="px-6 py-4 text-emerald-600">生效中</td>
                      </tr>
                    </tbody>
                  </table>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
