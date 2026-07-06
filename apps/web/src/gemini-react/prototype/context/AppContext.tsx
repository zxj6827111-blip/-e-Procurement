import { createContext, useContext, useState, type ReactNode } from 'react';
import { User, ViewState } from '../types';
import { DEMO_USERS } from '../data';

export interface NotificationMessage {
  id: number;
  type: string;
  content: string;
  time: string;
  read: boolean;
}

export type TodoPriority = 'URGENT' | 'HIGH' | 'NORMAL';

export interface TodoItem {
  id: string;
  type: string;
  statusLabel: string;
  title: string;
  target: string;
  sender: string;
  time: string;
  deadline: string;
  priority: TodoPriority;
  nextView: ViewState;
}

export interface SupplierContact {
  name: string;
  title: string;
  phone: string;
  email: string;
}

export interface SupplierProduct {
  category: string;
  productName: string;
  brand: string;
  annualCapacity: string;
  hotelCases: string;
  certifications: string[];
}

export interface SupplierSite {
  type: string;
  address: string;
  area: string;
  ownership: string;
  photos: string[];
}

export interface SupplierMaterial {
  name: string;
  status: string;
  expiresAt: string;
}

export interface SupplierRecord {
  id: string;
  name: string;
  level: string;
  status: string;
  score: number;
  creditCode: string;
  legalRepresentative: string;
  registeredCapital: string;
  foundedDate: string;
  registeredAddress: string;
  businessScope: string;
  region: string;
  account: {
    mobile: string;
    email: string;
    smsVerified: boolean;
    accountStatus: string;
  };
  contacts: {
    business: SupplierContact;
    finance: SupplierContact;
  };
  categories: string[];
  products: SupplierProduct[];
  sites: SupplierSite[];
  materials: SupplierMaterial[];
  questionnaire: {
    serviceCoverage: string;
    deliveryCycle: string;
    afterSales: string;
    emergencySupport: string;
    dataCompliance: string;
    commitment: string;
  };
  samples: string[];
}

export interface RatingTemplateItem {
  name: string;
  score: number;
  note: string;
}

export interface RatingTemplate {
  id: string;
  name: string;
  category: string;
  total: number;
  itemCount: number;
  techRatio: string;
  status: string;
  items: RatingTemplateItem[];
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  notifications: NotificationMessage[];
  unreadNotifications: NotificationMessage[];
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
  todos: TodoItem[];
  completeTodo: (id: string) => void;
  rejectTodo: (id: string) => void;
  suppliers: SupplierRecord[];
  updateSupplierStatus: (id: string, nextStatus?: string) => void;
  ratingTemplates: RatingTemplate[];
  addRatingTemplate: (template: Omit<RatingTemplate, 'id' | 'itemCount'>) => void;
  cloneRatingTemplate: (id: string) => void;
  loginAs: (role: keyof typeof DEMO_USERS) => void;
  logout: () => void;
}

interface AppProviderProps {
  children: ReactNode;
  user?: User | null;
  view?: ViewState;
  projectId?: string | null;
  onViewChange?: (view: ViewState) => void;
  onProjectIdChange?: (id: string | null) => void;
  onLogout?: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialNotifications: NotificationMessage[] = [
  { id: 1, type: '审批提醒', content: '您有一个新的采购需求 [REQ-202607-091] 待审批，请及时处理。', time: '10分钟前', read: false },
  { id: 2, type: '任务超期预警', content: '客房毛巾年度采购公告发布任务即将截止，请尽快完成。', time: '2小时前', read: false },
  { id: 3, type: '系统通知', content: '系统将于本周六凌晨 2 点进行升级维护。', time: '1天前', read: true }
];

const initialTodos: TodoItem[] = [
  { id: 'T001', type: 'APPROVAL', statusLabel: '待审批', title: '审批：客房布草集中采购项目定标结果', target: 'PROJ-2026-002', sender: '李经办', time: '10分钟前', deadline: '2026/07/21 17:30', priority: 'URGENT', nextView: 'AWARD_APPROVE' },
  { id: 'T002', type: 'REVIEW', statusLabel: '待评审', title: '专家评审：上海滨江酒店食材供应商比选', target: 'PROJ-2026-003', sender: '系统通知', time: '2小时前', deadline: '2026/07/21 18:00', priority: 'NORMAL', nextView: 'REVIEW_AWARD' },
  { id: 'T003', type: 'UPLOAD', statusLabel: '待上传', title: '上传：客房一次性用品采购项目响应文件', target: 'PROJ-2026-001', sender: '采购助手', time: '1天前', deadline: '2026/07/22 10:00', priority: 'URGENT', nextView: 'PROCUREMENT_DOCUMENT' },
  { id: 'T004', type: 'EXCEPTION', statusLabel: '待处理', title: '处理：收货异常（数量不符）', target: 'ORDER-2026-0892', sender: '上海滨江酒店', time: '1天前', deadline: '2026/07/20 12:00', priority: 'HIGH', nextView: 'ORDER_FULFILLMENT' },
  { id: 'T005', type: 'AUDIT', statusLabel: '待审批', title: '审批：异常查看申请（PROJ-2026-009）', target: 'APP-2026-002', sender: '王经办', time: '2天前', deadline: '2026/07/23 10:00', priority: 'HIGH', nextView: 'AUDIT_LOG' },
  { id: 'T006', type: 'SUPPLIER', statusLabel: '待初审', title: '准入：南京清洁用品供应商入驻初审', target: 'SUP-APPLY-2026-018', sender: '平台运营', time: '2天前', deadline: '2026/07/24 18:00', priority: 'NORMAL', nextView: 'REGISTRATION' },
  { id: 'T007', type: 'DOCUMENT', statusLabel: '待确认', title: '确认：客房耗材采购文件锁定', target: 'DOC-2026-021', sender: '采购经办', time: '3天前', deadline: '2026/07/25 12:00', priority: 'NORMAL', nextView: 'PROCUREMENT_DOCUMENT' },
  { id: 'T008', type: 'SETTLEMENT', statusLabel: '待复核', title: '复核：布草洗涤服务月度结算材料', target: 'SET-2026-017', sender: '酒店财务', time: '3天前', deadline: '2026/07/26 12:00', priority: 'HIGH', nextView: 'SETTLEMENT_MATS' }
];

const initialSuppliers: SupplierRecord[] = [
  {
    id: 'SUP-001',
    name: '江苏布草织造有限公司',
    level: '核心库',
    status: '正常',
    score: 96,
    creditCode: '91320600MA1T8G2026',
    legalRepresentative: '张建国',
    registeredCapital: '5,000 万元',
    foundedDate: '2016-05-18',
    registeredAddress: '江苏省南通市通州区川姜镇纺织产业园 8 号',
    businessScope: '酒店布草、毛巾、床上用品、一次性客用品的研发、生产、销售及售后服务。',
    region: '华东区 / 上海滨江酒店、苏州泊雅酒店',
    account: { mobile: '13800000000', email: 'service@jstextile.example', smsVerified: true, accountStatus: '已开通' },
    contacts: {
      business: { name: '张建国', title: '大客户经理', phone: '13800000000', email: 'zhangjg@jstextile.example' },
      finance: { name: '王丽', title: '财务主管', phone: '13800000001', email: 'finance@jstextile.example' }
    },
    categories: ['客房布草', '一次性用品', '洗涤服务'],
    products: [
      { category: '客房布草', productName: '80S 全棉贡缎被套', brand: '云柔', annualCapacity: '120 万套/年', hotelCases: 'G-Hotel 上海滨江店、苏州泊雅店', certifications: ['OEKO-TEX 认证', 'ISO9001 质量体系'] },
      { category: '一次性用品', productName: '环保牙具与梳洗包', brand: '旅悦', annualCapacity: '800 万套/年', hotelCases: '华东 12 家门店', certifications: ['可降解材料检测报告'] }
    ],
    sites: [
      { type: '办公室', address: '上海市浦东新区世纪大道 1200 号 18 层', area: '620 平方米', ownership: '租赁', photos: ['办公前台', '样品间'] },
      { type: '工厂', address: '江苏省南通市通州区川姜镇纺织产业园 8 号', area: '18,000 平方米', ownership: '自有', photos: ['生产车间', '仓储区', '质检室'] },
      { type: '展厅', address: '上海市青浦区酒店用品展示中心 B 区 302', area: '420 平方米', ownership: '租赁', photos: ['布草展区', '客用品展区'] }
    ],
    materials: [
      { name: '营业执照原件扫描件', status: '已通过', expiresAt: '长期有效' },
      { name: '法人授权书或法定代表人证明', status: '已通过', expiresAt: '2027-12-31' },
      { name: 'ISO9001 质量管理体系证书', status: '已通过', expiresAt: '2027-06-30' },
      { name: '纺织品检测报告', status: '已通过', expiresAt: '2026-12-31' }
    ],
    questionnaire: {
      serviceCoverage: '华东、华南区域可直营配送，其他区域通过合作仓覆盖。',
      deliveryCycle: '常规布草 7 天交付，加急订单 72 小时响应。',
      afterSales: '质量问题 24 小时内响应，7 天内完成换货或补货。',
      emergencySupport: '旺季可启动 30% 备用产能，并提供临时仓调拨。',
      dataCompliance: '接受集团供应链平台订单、履约、结算数据留痕和审计。',
      commitment: '承诺不围标串标、不商业贿赂、不提供虚假样品和资质。'
    },
    samples: ['80S 全棉贡缎被套', '高支纯棉白毛巾', '环保牙具套装']
  },
  {
    id: 'SUP-002',
    name: '南通家纺集采有限公司',
    level: '标准库',
    status: '考察中',
    score: 88,
    creditCode: '91320611MA2B9H2026',
    legalRepresentative: '李明',
    registeredCapital: '1,200 万元',
    foundedDate: '2019-09-03',
    registeredAddress: '江苏省南通市崇川区青年中路 99 号',
    businessScope: '家纺产品、家具软装、布草洗涤外包服务及配套物流服务。',
    region: '华东区 / 苏州泊雅酒店',
    account: { mobile: '13900000000', email: 'contact@ntjf.example', smsVerified: true, accountStatus: '待准入复核' },
    contacts: {
      business: { name: '李明', title: '销售总监', phone: '13900000000', email: 'liming@ntjf.example' },
      finance: { name: '陈晓', title: '结算专员', phone: '13900000002', email: 'settle@ntjf.example' }
    },
    categories: ['床品', '家具软装', '布草洗涤'],
    products: [
      { category: '床品', productName: '酒店床品四件套', brand: '南通优眠', annualCapacity: '60 万套/年', hotelCases: '苏州泊雅酒店试供', certifications: ['纺织品甲醛检测报告'] },
      { category: '家具软装', productName: '大堂皮质沙发', brand: '泊雅定制', annualCapacity: '3,000 套/年', hotelCases: '高支纱酒店公区改造', certifications: ['阻燃检测报告'] }
    ],
    sites: [
      { type: '办公室', address: '南通市崇川区青年中路 99 号 5 层', area: '360 平方米', ownership: '租赁', photos: ['办公区', '会议室'] },
      { type: '工厂', address: '南通市通州区兴东街道工业园 12 号', area: '8,600 平方米', ownership: '合作工厂', photos: ['缝制车间', '成品库'] }
    ],
    materials: [
      { name: '营业执照原件扫描件', status: '已通过', expiresAt: '长期有效' },
      { name: '法人授权书', status: '待复核', expiresAt: '2026-11-30' },
      { name: '质量抽检报告', status: '已通过', expiresAt: '2026-09-30' }
    ],
    questionnaire: {
      serviceCoverage: '华东区域配送，重点覆盖江苏、上海、浙江。',
      deliveryCycle: '常规床品 10 天交付，家具软装按项目排产。',
      afterSales: '提供门店驻场安装和 48 小时售后响应。',
      emergencySupport: '具备节假日前备货能力，需提前 5 天确认。',
      dataCompliance: '同意接入平台订单与结算协同。',
      commitment: '承诺按集团验收标准交付，不使用未经确认的替代材料。'
    },
    samples: ['大堂皮质沙发样册', '床品面料样卡']
  }
];

const initialRatingTemplates: RatingTemplate[] = [
  {
    id: 'tpl-goods',
    name: '通用货物类综合评标法',
    category: '货物类',
    total: 100,
    itemCount: 8,
    techRatio: '40% / 60%',
    status: '启用',
    items: [
      { name: '报价合理性', score: 35, note: '报价与预算、历史采购价、市场价对比' },
      { name: '产品质量与参数响应', score: 25, note: '规格、材质、检测报告、样品一致性' },
      { name: '交付与售后保障', score: 20, note: '交期、质保、退换货与应急响应' },
      { name: '供应商履约评价', score: 20, note: '历史履约、投诉、风险与合规记录' }
    ]
  },
  {
    id: 'tpl-service',
    name: 'IT服务类综合评标法',
    category: '服务类',
    total: 100,
    itemCount: 12,
    techRatio: '60% / 40%',
    status: '启用',
    items: [
      { name: '服务方案完整性', score: 30, note: '实施计划、人员配置、服务边界' },
      { name: '技术能力与案例', score: 30, note: '团队资质、成功案例、技术响应' },
      { name: '价格与付款条件', score: 25, note: '总价、分项报价、付款节点' },
      { name: '风险控制与安全', score: 15, note: '数据安全、应急预案、审计配合' }
    ]
  }
];

export function AppProvider({ children, user, view, projectId, onViewChange, onProjectIdChange, onLogout }: AppProviderProps) {
  const [internalUser, setInternalUser] = useState<User | null>(null);
  const [internalView, setInternalView] = useState<ViewState>('LOGIN');
  const [internalProjectId, setInternalProjectId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>(initialNotifications);
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [ratingTemplates, setRatingTemplates] = useState<RatingTemplate[]>(initialRatingTemplates);

  const currentUser = user !== undefined ? user : internalUser;
  const currentView = view ?? internalView;
  const currentProjectId = projectId !== undefined ? projectId : internalProjectId;
  const unreadNotifications = notifications.filter((item) => !item.read);

  const setCurrentUser = (nextUser: User | null) => {
    if (user !== undefined) return;
    setInternalUser(nextUser);
  };

  const setCurrentView = (nextView: ViewState) => {
    if (onViewChange) {
      onViewChange(nextView);
      return;
    }
    setInternalView(nextView);
  };

  const setCurrentProjectId = (nextProjectId: string | null) => {
    if (onProjectIdChange) {
      onProjectIdChange(nextProjectId);
      return;
    }
    setInternalProjectId(nextProjectId);
  };

  const markNotificationRead = (id: number) => {
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  };

  const completeTodo = (id: string) => {
    setTodos((items) => items.filter((item) => item.id !== id));
  };

  const rejectTodo = (id: string) => {
    setTodos((items) => items.filter((item) => item.id !== id));
  };

  const updateSupplierStatus = (id: string, nextStatus?: string) => {
    setSuppliers((items) =>
      items.map((item) =>
        item.id === id ? { ...item, status: nextStatus ?? (item.status === '正常' ? '冻结' : '正常') } : item
      )
    );
  };

  const addRatingTemplate = (template: Omit<RatingTemplate, 'id' | 'itemCount'>) => {
    setRatingTemplates((items) => [
      ...items,
      {
        ...template,
        id: `tpl-${Date.now()}`,
        itemCount: template.items.length
      }
    ]);
  };

  const cloneRatingTemplate = (id: string) => {
    setRatingTemplates((items) => {
      const source = items.find((item) => item.id === id);
      if (!source) return items;
      return [
        ...items,
        {
          ...source,
          id: `tpl-copy-${Date.now()}`,
          name: `${source.name}（副本）`,
          status: '停用'
        }
      ];
    });
  };

  const loginAs = (role: keyof typeof DEMO_USERS) => {
    if (user === undefined) setInternalUser(DEMO_USERS[role]);
    switch (role) {
      case 'HOTEL_PROCUREMENT':
        setCurrentView('PURCHASE_REQUEST');
        break;
      case 'SUPPLIER_BIDDER':
        setCurrentView('QUOTE_RESPONSE');
        break;
      case 'EXPERT':
        setCurrentView('EXPERT_RATING');
        break;
      case 'SYSTEM_ADMIN':
        setCurrentView('SYSTEM_SETTINGS');
        break;
      default:
        setCurrentView('DASHBOARD');
    }
  };

  const logout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    setInternalUser(null);
    setInternalView('LOGIN');
    setInternalProjectId(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentView,
        setCurrentView,
        currentProjectId,
        setCurrentProjectId,
        notifications,
        unreadNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        todos,
        completeTodo,
        rejectTodo,
        suppliers,
        updateSupplierStatus,
        ratingTemplates,
        addRatingTemplate,
        cloneRatingTemplate,
        loginAs,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
