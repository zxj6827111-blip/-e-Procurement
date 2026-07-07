import React, { useState } from 'react';
import { Button } from '../../shared/ui/Button';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Landmark,
  MapPin,
  Package,
  Send,
  ShieldCheck,
  Upload,
  UserRound
} from 'lucide-react';

const steps = [
  { title: '账号注册', icon: <UserRound className="w-4 h-4" /> },
  { title: '基础信息', icon: <Building2 className="w-4 h-4" /> },
  { title: '联系人信息', icon: <FileText className="w-4 h-4" /> },
  { title: '主营产品', icon: <Package className="w-4 h-4" /> },
  { title: '办公室、工厂及展厅', icon: <MapPin className="w-4 h-4" /> },
  { title: '企业资料', icon: <ShieldCheck className="w-4 h-4" /> },
  { title: '入驻问卷', icon: <ClipboardCheck className="w-4 h-4" /> }
];

function Field({
  label,
  placeholder,
  type = 'text',
  className = '',
  defaultValue
}: {
  label: string;
  placeholder?: string;
  type?: string;
  className?: string;
  defaultValue?: string;
}) {
  return (
    <label className={className}>
      <span className="block text-sm font-medium text-slate-700 mb-2">{label}</span>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full h-11 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
      />
    </label>
  );
}

function TextArea({ label, placeholder, rows = 4 }: { label: string; placeholder?: string; rows?: number }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-2">{label}</span>
      <textarea
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006666]/20 focus:border-[#006666]"
      />
    </label>
  );
}

function UploadBox({ title, note }: { title: string; note: string }) {
  return (
    <button type="button" className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:border-[#006666] hover:bg-[#006666]/5 transition">
      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{note}</p>
    </button>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-5">
      <span className="text-[#006666]">{icon}</span>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    </div>
  );
}

export function SupplierOnboardingRegisterView() {
  const [stepIndex, setStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const renderStep = () => {
    if (stepIndex === 0) {
      return (
        <div className="space-y-6">
          <SectionTitle icon={<UserRound className="w-5 h-5" />} title="账号注册" />
          <div className="grid grid-cols-4 gap-4">
            <Field label="手机号" placeholder="用于接收注册验证码" />
            <Field label="验证码" placeholder="请输入验证码" />
            <Field label="密码" type="password" />
            <Field label="确认密码" type="password" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" defaultChecked className="rounded text-[#006666] focus:ring-[#006666]" />
            同意《供应链平台注册协议》和《供应商廉洁承诺书》
          </label>
        </div>
      );
    }

    if (stepIndex === 1) {
      return (
        <div className="space-y-6">
          <SectionTitle icon={<Building2 className="w-5 h-5" />} title="企业基础信息" />
          <div className="grid grid-cols-2 gap-4">
            <Field className="col-span-2" label="企业全称 *" placeholder="须与营业执照一致" />
            <Field label="统一社会信用代码 *" placeholder="18 位代码" />
            <Field label="法人代表 *" />
            <Field label="注册资本 *" placeholder="例如：5,000 万元" />
            <Field label="成立日期 *" type="date" />
            <Field className="col-span-2" label="注册地址 *" placeholder="省 / 市 / 区 / 详细地址" />
            <div className="col-span-2">
              <TextArea label="经营范围 *" placeholder="请填写营业执照载明的经营范围，以及与酒店采购相关的主营能力。" />
            </div>
          </div>
        </div>
      );
    }

    if (stepIndex === 2) {
      return (
        <div className="space-y-8">
          <div>
            <SectionTitle icon={<FileText className="w-5 h-5" />} title="业务联系人信息" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="业务联系人姓名 *" />
              <Field label="联系人职务 *" placeholder="例如：大客户经理" />
              <Field label="联系人手机 *" placeholder="接收验证码及审核通知" />
              <Field label="业务联系邮箱 *" type="email" />
            </div>
          </div>
          <div>
            <SectionTitle icon={<Landmark className="w-5 h-5" />} title="财务联系人信息" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="财务联系人姓名 *" />
              <Field label="财务联系人职务 *" placeholder="例如：结算专员" />
              <Field label="财务联系人手机 *" />
              <Field label="财务联系邮箱 *" type="email" />
            </div>
          </div>
        </div>
      );
    }

    if (stepIndex === 3) {
      return (
        <div className="space-y-6">
          <SectionTitle icon={<Package className="w-5 h-5" />} title="主营产品与意向品类" />
          <div className="grid grid-cols-4 gap-3">
            {['客房布草', '餐饮用具', '生鲜食品', '酒水饮料', '工程五金', 'IT弱电', '保洁服务', '家具软装'].map((item, index) => (
              <label key={item} className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm hover:border-[#006666]">
                <input type="checkbox" defaultChecked={index < 3} className="rounded text-[#006666] focus:ring-[#006666]" />
                {item}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="主推产品名称 *" placeholder="例如：80S 全棉贡缎被套" />
            <Field label="自有或代理品牌 *" placeholder="例如：云柔 / 自有品牌" />
            <Field label="年供货能力 *" placeholder="例如：120 万套/年" />
            <Field label="已服务酒店案例 *" placeholder="填写酒店名称或集团案例" />
            <div className="col-span-2">
              <TextArea label="产品认证与质量说明" placeholder="填写检测报告、质量体系、环保认证、样品一致性等说明。" />
            </div>
          </div>
        </div>
      );
    }

    if (stepIndex === 4) {
      return (
        <div className="space-y-6">
          <SectionTitle icon={<MapPin className="w-5 h-5" />} title="办公室、工厂及展厅" />
          {['办公室', '工厂', '展厅'].map((site) => (
            <div key={site} className="rounded-lg border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-900 mb-4">{site}信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label={`${site}地址`} placeholder="省 / 市 / 区 / 详细地址" />
                <Field label={`${site}面积`} placeholder="例如：620 平方米" />
                <Field label="产权或租赁情况" placeholder="自有 / 租赁 / 合作工厂" />
                <Field label="现场负责人" placeholder="姓名及联系方式" />
                <div className="col-span-2">
                  <UploadBox title={`上传${site}照片或租赁/产权证明`} note="支持 JPG/PNG/PDF，可上传多份材料" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (stepIndex === 5) {
      return (
        <div className="space-y-6">
          <SectionTitle icon={<ShieldCheck className="w-5 h-5" />} title="企业资料与资质证照上传" />
          <div className="grid grid-cols-2 gap-5">
            <UploadBox title="营业执照原件扫描件 *" note="支持 JPG/PNG/PDF，加盖公章更佳" />
            <UploadBox title="法人授权书或法定代表人证明 *" note="需加盖企业公章" />
            <UploadBox title="开户许可证或银行账户证明" note="用于后续结算资料校验" />
            <UploadBox title="税务登记或一般纳税人证明" note="用于发票及税务信息核验" />
            <UploadBox title="质量体系、检测报告或行业资质" note="如 ISO、CMA、食品经营许可证等" />
            <UploadBox title="近一年审计报告或财务报表" note="如暂无法提供，可上传情况说明" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <SectionTitle icon={<ClipboardCheck className="w-5 h-5" />} title="入驻问卷与承诺" />
        <div className="grid grid-cols-2 gap-4">
          <TextArea label="服务覆盖区域 *" placeholder="说明可服务的城市、门店范围、直营网点或合作仓。" rows={3} />
          <TextArea label="交付周期与应急保障 *" placeholder="说明常规交付周期、加急订单响应时间和备用产能。" rows={3} />
          <TextArea label="售后与退换货机制 *" placeholder="说明质保、投诉响应、退换货和现场支持机制。" rows={3} />
          <TextArea label="数据合规与平台协同能力 *" placeholder="说明是否可接受订单、履约、结算全流程数据留痕。" rows={3} />
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <input type="checkbox" defaultChecked className="mt-1 rounded text-[#006666] focus:ring-[#006666]" />
          <span>
            我司郑重承诺：以上填报信息及上传材料均真实、合法、有效；不存在围标串标、商业贿赂或虚假样品行为；同意遵守 G-Hotel 集团供应商准入、履约、廉洁与审计要求。
          </span>
        </label>
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b3b4a] via-[#1f5b64] to-[#2d827d] p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-10 text-center">
          <CheckCircle2 className="w-14 h-14 text-[#006666] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">入驻申请已提交</h1>
          <p className="text-slate-500 mt-3">申请编号：SUP-APPLY-2026-026。集团采购中心将在 3-5 个工作日内完成资质初审。</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="outline" onClick={() => setSubmitted(false)}>返回修改</Button>
            <Button variant="brand" onClick={() => { window.location.href = '/login'; }}>返回登录</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b3b4a] via-[#1f5b64] to-[#2d827d] px-8 py-8">
      <div className="max-w-[1440px] mx-auto">
        <div className="rounded-lg bg-[#07354a] text-white px-10 py-9 mb-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-sm font-medium text-cyan-100 mb-2">供应商入驻</p>
            <h1 className="text-4xl font-bold tracking-tight">供应商注册</h1>
            <p className="mt-4 text-cyan-50 text-base">
              按集团准入要求提交企业、联系人、主营产品、场所和资质资料。提交后由集团进行资质初审和准入审批。
            </p>
          </div>
          <Button variant="outline" className="bg-white/90 text-[#07354a] hover:bg-white" onClick={() => { window.location.href = '/login'; }}>
            返回登录
          </Button>
        </div>

        <div className="grid grid-cols-[320px_1fr] gap-5">
          <aside className="bg-white rounded-lg shadow-lg p-4 h-fit">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const active = index === stepIndex;
                const done = index < stepIndex;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={`w-full flex items-center gap-4 rounded-md px-4 py-3 text-left transition ${active ? 'bg-[#e7f4f3] text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center border text-sm ${active ? 'bg-[#006666] border-[#006666] text-white' : done ? 'bg-[#006666]/10 border-[#006666] text-[#006666]' : 'border-slate-300 text-slate-600'}`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                    </span>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {step.icon}
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="bg-white rounded-lg shadow-lg min-h-[620px] p-7">
            <div className="mb-7">
              <p className="text-sm text-slate-500">第 {stepIndex + 1} / {steps.length} 步</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">{steps[stepIndex].title}</h2>
            </div>

            {renderStep()}

            <div className="mt-10 flex justify-end gap-3">
              <Button variant="outline" disabled={isFirst} onClick={() => setStepIndex((value) => Math.max(0, value - 1))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              {isLast ? (
                <Button variant="brand" onClick={() => setSubmitted(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  提交入驻申请
                </Button>
              ) : (
                <Button variant="brand" onClick={() => setStepIndex((value) => Math.min(steps.length - 1, value + 1))}>
                  下一步
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
