import React, { useMemo, useState } from 'react';
import { apiPost, uploadFile, type UploadedFileMetadata } from '../../../api/http';
import { useApp } from '../../core/AppContext';
import { Button } from '../../shared/ui/Button';
import { Card, CardContent } from '../../shared/ui/Card';
import { FileText, Save, Send, ShieldAlert, Upload } from 'lucide-react';

interface SupplierAccessAccount {
  username: string;
  initialPassword?: string;
}

interface SupplierCreateResult {
  supplier?: { id: string; name?: string };
  accounts?: {
    admin?: SupplierAccessAccount;
    quotation?: SupplierAccessAccount;
  };
  auditLogId?: string;
}

interface SupplierCreateForm {
  name: string;
  category: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  region: string;
  storeName: string;
  supplierType: string;
  socialCreditCode: string;
}

const initialForm: SupplierCreateForm = {
  name: '',
  category: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  region: '',
  storeName: '',
  supplierType: 'manufacturer',
  socialCreditCode: ''
};

export function SupplierCreateView() {
  const { currentUser, navigateToPath, setCurrentView } = useApp();
  const [form, setForm] = useState<SupplierCreateForm>(initialForm);
  const [qualificationFiles, setQualificationFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createdAccounts, setCreatedAccounts] = useState<SupplierCreateResult['accounts'] | null>(null);

  const fileSummary = useMemo(() => qualificationFiles.map((file) => file.name).join('、'), [qualificationFiles]);

  const updateField = <K extends keyof SupplierCreateForm>(key: K, value: SupplierCreateForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadList = async (files: File[], objectId: string): Promise<UploadedFileMetadata[]> => {
    const uploaded = await Promise.all(
      files.map((file) =>
        uploadFile(
          file,
          {
            attachmentKind: 'supplier_qualification',
            objectType: 'supplier',
            objectId
          },
          currentUser?.id
        )
      )
    );
    return uploaded.map((item) => item.file);
  };

  const createSupplier = async () => {
    if (!currentUser?.id) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const draftId = `supplier-draft-${Date.now()}`;
      const result = await apiPost<SupplierCreateResult>(
        '/api/suppliers/admissions',
        {
          name: form.name.trim(),
          category: form.category.trim(),
          contactName: form.contactName.trim(),
          contactPhone: form.contactPhone.trim(),
          contactEmail: form.contactEmail.trim(),
          supplierType: form.supplierType,
          socialCreditCode: form.socialCreditCode.trim(),
          serviceRegions: [
            {
              region: form.region.trim(),
              storeName: form.storeName.trim(),
              category: form.category.trim()
            }
          ],
          qualificationAttachments: await uploadList(qualificationFiles, draftId)
        },
        currentUser.id
      );
      setCreatedAccounts(result.accounts ?? null);
      setMessage(`供应商已创建，审计记录 ${result.auditLogId ?? '-'}。`);
      if (result.supplier?.id) {
        navigateToPath(`/suppliers/${encodeURIComponent(result.supplier.id)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增供应商失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">新增供应商</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCurrentView('SUPPLIERS')}>
            返回列表
          </Button>
          <Button
            className="bg-yellow-500 text-white hover:bg-yellow-600"
            disabled={busy || !form.name.trim() || !form.category.trim() || qualificationFiles.length === 0}
            onClick={() => void createSupplier()}
          >
            <Send className="mr-2 h-4 w-4" />
            {busy ? '提交中...' : '提交建档'}
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-medium">
                <FileText className="h-5 w-5 text-[#006666]" />
                基础信息
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2">
                  <span className="mb-1 block text-sm text-gray-500">企业全称 *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                    placeholder="请输入企业全称"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-500">业务品类 *</span>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) => updateField('category', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                    placeholder="例如：客房布草"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-500">供应商类型</span>
                  <select
                    value={form.supplierType}
                    onChange={(event) => updateField('supplierType', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                  >
                    <option value="manufacturer">制造商 / 生产商</option>
                    <option value="distributor">代理商 / 经销商</option>
                    <option value="service_provider">服务商</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-500">统一社会信用代码</span>
                  <input
                    type="text"
                    value={form.socialCreditCode}
                    onChange={(event) => updateField('socialCreditCode', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                    placeholder="18 位信用代码"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-500">联系人</span>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(event) => updateField('contactName', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-500">联系电话</span>
                  <input
                    type="text"
                    value={form.contactPhone}
                    onChange={(event) => updateField('contactPhone', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-500">联系邮箱</span>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => updateField('contactEmail', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 font-medium">服务范围</h3>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className="mb-1 block text-sm text-gray-500">服务区域</span>
                  <input
                    type="text"
                    value={form.region}
                    onChange={(event) => updateField('region', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                    placeholder="例如：上海"
                  />
                </label>
                <label>
                  <span className="mb-1 block text-sm text-gray-500">门店 / 服务点</span>
                  <input
                    type="text"
                    value={form.storeName}
                    onChange={(event) => updateField('storeName', event.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#006666]"
                    placeholder="例如：滨江店"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-medium">
                  <Upload className="h-5 w-5 text-[#006666]" />
                  资质附件
                </h3>
                <label className="cursor-pointer text-sm text-[#006666] hover:underline">
                  选择文件
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => setQualificationFiles(Array.from(event.target.files ?? []))}
                  />
                </label>
              </div>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                {fileSummary || '请至少上传一份真实资质附件。后端已禁止自动生成假附件。'}
              </div>
            </CardContent>
          </Card>

          {createdAccounts ? (
            <Card>
              <CardContent className="space-y-3 p-6 text-sm text-slate-700">
                <h3 className="font-medium text-slate-900">账号开通结果</h3>
                {createdAccounts.admin ? (
                  <div>
                    管理员账号：{createdAccounts.admin.username}
                    {createdAccounts.admin.initialPassword ? ` / 初始密码：${createdAccounts.admin.initialPassword}` : ''}
                  </div>
                ) : null}
                {createdAccounts.quotation ? (
                  <div>
                    报价员账号：{createdAccounts.quotation.username}
                    {createdAccounts.quotation.initialPassword ? ` / 初始密码：${createdAccounts.quotation.initialPassword}` : ''}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-medium">
                <ShieldAlert className="h-5 w-5 text-[#006666]" />
                建档要求
              </h3>
              <div className="space-y-3 text-sm text-slate-600">
                <p>1. 企业名称和业务品类不能为空。</p>
                <p>2. 必须上传至少一份真实资质附件。</p>
                <p>3. 提交后会在后端真实创建供应商档案和登录账号。</p>
                <p>4. 创建完成后可在供应商详情页查看账号、项目参与和资质记录。</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
