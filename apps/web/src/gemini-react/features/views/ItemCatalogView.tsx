import React, { useState } from 'react';
import { Card, CardContent } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { LayoutGrid, X, Image as ImageIcon, Package, Building, ShoppingCart } from 'lucide-react';

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: string;
  supplier: string;
  sku: string;
  spec: string;
  stock: string;
  imageTone: string;
  description: string;
};

const catalogItems: CatalogItem[] = [
  {
    id: 'ITM-001',
    name: '高级纯棉白毛巾',
    category: '客房耗材',
    unit: '条',
    price: '¥15.00',
    supplier: '江苏布草织造',
    sku: 'SKU-TOWEL-80S',
    spec: '80S 全棉 / 34cm x 75cm / 白色',
    stock: '框架协议在架',
    imageTone: 'from-cyan-50 to-slate-200',
    description: '适用于 G-Hotel 客房标准配置，支持批量下单、封样比对和历史价格追踪。'
  },
  {
    id: 'ITM-002',
    name: '大堂皮质沙发',
    category: '家具',
    unit: '套',
    price: '¥8,500.00',
    supplier: '南通家纺集采',
    sku: 'SKU-SOFA-LOBBY',
    spec: '三人位 / 深灰色 / 防污皮革',
    stock: '待补充报价',
    imageTone: 'from-amber-50 to-slate-200',
    description: '适用于酒店大堂、公区休息区改造项目，需根据现场尺寸确认最终配置。'
  }
];

export function ItemCatalogView() {
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const addToCart = (item: CatalogItem) => {
    setCartCount((count) => count + 1);
    setSelected(item);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-[#006666]" />
          商品目录
        </h2>
        <Button variant="outline" className="gap-2">
          <ShoppingCart className="w-4 h-4" />
          采购清单 {cartCount > 0 ? `(${cartCount})` : ''}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">商品</th>
                <th className="px-6 py-4">分类</th>
                <th className="px-6 py-4">供应商</th>
                <th className="px-6 py-4">单位</th>
                <th className="px-6 py-4">参考价</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {catalogItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 group cursor-pointer" onClick={() => setSelected(item)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${item.imageTone} flex items-center justify-center border border-slate-200`}>
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-1">{item.id} / {item.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4">{item.supplier}</td>
                  <td className="px-6 py-4">{item.unit}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{item.price}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="text-[#006666] text-xs font-medium" onClick={(event) => { event.stopPropagation(); setSelected(item); }}>商品详情</button>
                      <button className="text-slate-500 text-xs font-medium" onClick={(event) => { event.stopPropagation(); addToCart(item); }}>加入清单</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-[560px] bg-white h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-semibold text-lg text-slate-900">{selected.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{selected.id} / {selected.sku}</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setSelected(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className={`h-56 rounded-xl bg-gradient-to-br ${selected.imageTone} border border-slate-200 flex items-center justify-center`}>
                <ImageIcon className="w-16 h-16 text-slate-400" />
              </div>
              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">分类 / 单位</p>
                  <p className="font-medium text-slate-900 mt-1">{selected.category} / {selected.unit}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">参考价</p>
                  <p className="font-medium text-slate-900 mt-1">{selected.price}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 col-span-2">
                  <p className="text-xs text-slate-500">规格参数</p>
                  <p className="font-medium text-slate-900 mt-1">{selected.spec}</p>
                </div>
              </section>
              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <Building className="w-5 h-5 text-[#006666]" />
                  供应商信息
                </h4>
                <p className="text-sm text-slate-700">{selected.supplier}</p>
                <p className="text-xs text-slate-500 mt-2">状态：{selected.stock}；支持查看资质、封样图片和历史履约评价。</p>
              </section>
              <section className="rounded-lg border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-[#006666]" />
                  商品说明
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">{selected.description}</p>
              </section>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelected(null)}>关闭</Button>
              <Button className="bg-[#006666] text-white" onClick={() => addToCart(selected)}>加入采购清单</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
