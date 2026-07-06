import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useApp, type SupplierRecord } from '../context/AppContext';
import {
  Building2,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Star,
  Users,
  X
} from 'lucide-react';

function statusClass(status: string) {
  if (status === '正常') return 'bg-emerald-50 text-emerald-700';
  if (status === '冻结') return 'bg-rose-50 text-rose-700';
  if (status === '考察中') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 bg-white">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="font-medium text-slate-900 mt-1 leading-relaxed">{value}</div>
    </div>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
        {icon}
        {title}
      </h4>
      {children}
    </section>
  );
}

function SupplierDetailDrawer({
  supplier,
  onClose,
  onToggleStatus
}: {
  supplier: SupplierRecord;
  onClose: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[720px] bg-white h-full shadow-2xl flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-semibold text-lg text-slate-900">{supplier.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{supplier.id} / {supplier.creditCode}</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-7 bg-slate-50/40">
          <div className="grid grid-cols-4 gap-3">
            <InfoCard label="库级别" value={supplier.level} />
            <InfoCard label="准入状态" value={<span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusClass(supplier.status)}`}>{supplier.status}</span>} />
            <InfoCard label="综合评分" value={<span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500" />{supplier.score}</span>} />
            <InfoCard label="服务区域" value={supplier.region} />
          </div>

          <DetailSection title="账号注册" icon={<CheckCircle2 className="w-5 h-5 text-[#006666]" />}>
            <div className="grid grid-cols-3 gap-3">
              <InfoCard label="注册手机号" value={supplier.account.mobile} />
              <InfoCard label="注册邮箱" value={supplier.account.email} />
              <InfoCard label="账号状态" value={supplier.account.smsVerified ? `${supplier.account.accountStatus} / 已验证` : supplier.account.accountStatus} />
            </div>
          </DetailSection>

          <DetailSection title="企业基础信息" icon={<Building2 className="w-5 h-5 text-[#006666]" />}>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="企业全称" value={supplier.name} />
              <InfoCard label="统一社会信用代码" value={supplier.creditCode} />
              <InfoCard label="法人代表" value={supplier.legalRepresentative} />
              <InfoCard label="注册资本" value={supplier.registeredCapital} />
              <InfoCard label="成立日期" value={supplier.foundedDate} />
              <InfoCard label="注册地址" value={supplier.registeredAddress} />
              <div className="col-span-2">
                <InfoCard label="经营范围" value={supplier.businessScope} />
              </div>
            </div>
          </DetailSection>

          <DetailSection title="联系人信息" icon={<Users className="w-5 h-5 text-[#006666]" />}>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard
                label="业务联系人"
                value={`${supplier.contacts.business.name} / ${supplier.contacts.business.title} / ${supplier.contacts.business.phone}`}
              />
              <InfoCard label="业务联系邮箱" value={supplier.contacts.business.email} />
              <InfoCard
                label="财务联系人"
                value={`${supplier.contacts.finance.name} / ${supplier.contacts.finance.title} / ${supplier.contacts.finance.phone}`}
              />
              <InfoCard label="财务联系邮箱" value={supplier.contacts.finance.email} />
            </div>
          </DetailSection>

          <DetailSection title="主营产品" icon={<Package className="w-5 h-5 text-[#006666]" />}>
            <div className="flex flex-wrap gap-2">
              {supplier.categories.map((category) => (
                <Badge key={category} variant="info">{category}</Badge>
              ))}
            </div>
            <div className="space-y-3">
              {supplier.products.map((product) => (
                <div key={`${product.category}-${product.productName}`} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{product.productName}</p>
                      <p className="text-xs text-slate-500 mt-1">{product.category} / {product.brand}</p>
                    </div>
                    <Badge variant="success">{product.annualCapacity}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-3">酒店案例：{product.hotelCases}</p>
                  <p className="text-sm text-slate-600 mt-1">资质认证：{product.certifications.join('、')}</p>
                </div>
              ))}
            </div>
          </DetailSection>

          <DetailSection title="办公室、工厂及展厅" icon={<MapPin className="w-5 h-5 text-[#006666]" />}>
            <div className="space-y-3">
              {supplier.sites.map((site) => (
                <div key={`${site.type}-${site.address}`} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{site.type}</p>
                    <span className="text-xs text-slate-500">{site.area} / {site.ownership}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{site.address}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {site.photos.map((photo) => (
                      <span key={photo} className="inline-flex items-center gap-1 rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                        <ImageIcon className="w-3 h-3" />
                        {photo}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>

          <DetailSection title="企业资料与资质图片" icon={<ShieldCheck className="w-5 h-5 text-[#006666]" />}>
            <div className="grid grid-cols-2 gap-3">
              {supplier.materials.map((material) => (
                <div key={material.name} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="h-20 rounded border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center mb-3">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">{material.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{material.status} / 有效期：{material.expiresAt}</p>
                </div>
              ))}
            </div>
          </DetailSection>

          <DetailSection title="入驻问卷" icon={<FileText className="w-5 h-5 text-[#006666]" />}>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="服务覆盖" value={supplier.questionnaire.serviceCoverage} />
              <InfoCard label="交付周期" value={supplier.questionnaire.deliveryCycle} />
              <InfoCard label="售后机制" value={supplier.questionnaire.afterSales} />
              <InfoCard label="应急保障" value={supplier.questionnaire.emergencySupport} />
              <InfoCard label="数据合规" value={supplier.questionnaire.dataCompliance} />
              <InfoCard label="廉洁与真实性承诺" value={supplier.questionnaire.commitment} />
            </div>
          </DetailSection>

          <DetailSection title="封样图片" icon={<ImageIcon className="w-5 h-5 text-[#006666]" />}>
            <div className="grid grid-cols-3 gap-3">
              {supplier.samples.map((name, index) => (
                <div key={name} className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                  <div className="h-24 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <ImageIcon className="w-9 h-9 text-slate-400" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500 mt-1">封样编号 SAMPLE-2026-00{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>关闭</Button>
          <Button className="bg-[#006666] text-white" onClick={onToggleStatus}>
            {supplier.status === '正常' ? '冻结该供应商' : '恢复正常'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SupplierManagementView() {
  const { suppliers, updateSupplierStatus } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  const filteredSuppliers = useMemo(() => {
    const text = keyword.trim();
    if (!text) return suppliers;
    return suppliers.filter((item) =>
      [item.id, item.name, item.creditCode, item.contacts.business.name, item.categories.join('、'), item.region]
        .join(' ')
        .includes(text)
    );
  }, [keyword, suppliers]);

  const selected = selectedId ? suppliers.find((item) => item.id === selectedId) ?? null : null;

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6 text-[#006666]" />
            供应商管理
          </h2>
          <p className="text-sm text-slate-500 mt-1">查看供应商注册资料、资质图片、主营产品、场地和准入状态。</p>
        </div>
        <Button variant="outline" onClick={() => setSelectedId(suppliers[0]?.id ?? null)}>查看核心供应商</Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索供应商名称、编号、联系人、品类"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
            />
          </div>
          <div className="text-sm text-slate-500">共 {filteredSuppliers.length} 家供应商</div>
        </div>
        <CardContent className="p-0">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4">供应商编号</th>
                <th className="px-6 py-4">企业名称 / 信用代码</th>
                <th className="px-6 py-4">注册联系人</th>
                <th className="px-6 py-4">主营品类</th>
                <th className="px-6 py-4">场地资料</th>
                <th className="px-6 py-4">资质资料</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSuppliers.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedId(item.id)}>
                  <td className="px-6 py-4 font-mono">{item.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.creditCode}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{item.contacts.business.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.contacts.business.phone}</div>
                  </td>
                  <td className="px-6 py-4 max-w-[220px] text-slate-600">{item.categories.join('、')}</td>
                  <td className="px-6 py-4 text-slate-600">{item.sites.length} 处</td>
                  <td className="px-6 py-4 text-slate-600">{item.materials.length} 份</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button className="text-[#006666] text-xs font-medium" onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}>查看详情</button>
                      <button className="text-slate-500 text-xs font-medium" onClick={(event) => { event.stopPropagation(); updateSupplierStatus(item.id); }}>管理状态</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">未找到匹配供应商</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {selected && (
        <SupplierDetailDrawer
          supplier={selected}
          onClose={() => setSelectedId(null)}
          onToggleStatus={() => updateSupplierStatus(selected.id)}
        />
      )}
    </div>
  );
}
