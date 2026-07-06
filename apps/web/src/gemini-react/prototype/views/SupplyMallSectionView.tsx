import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ShoppingCart, Search, Filter, Package, Tag, Layers } from 'lucide-react';

export function SupplyMallSectionView() {
  const [activeTab, setActiveTab] = useState('catalog');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-gray-800">协议商品商城</h2>
        <div className="flex gap-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-gray-600 absolute left-3 top-2.5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">3</span>
            <Button variant="outline" className="pl-10">采购清单</Button>
          </div>
          <Button className="bg-[#006666] hover:bg-[#004d4d] text-white">结算下单</Button>
        </div>
      </div>

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
                <Button variant="outline">搜索</Button>
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
                        <Button size="sm" variant="outline" className="text-[#006666] border-[#006666] hover:bg-[#006666] hover:text-white transition-colors">加入清单</Button>
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
              <CardContent className="p-12 text-center text-gray-500">
                相关模块功能开发中，将继续沿用现有设计风格。
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
