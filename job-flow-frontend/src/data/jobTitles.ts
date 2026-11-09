const JOB_TITLES = [
  // Software / IT
  'Software Engineer',
  'Senior Software Engineer',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Engineer',
  'Data Scientist',
  'Data Analyst',
  'Machine Learning Engineer',
  'QA Engineer',
  'Security Engineer',
  'Cloud Engineer',
  'Systems Administrator',
  'IT Support Specialist',

  // Product / Design
  'Product Manager',
  'Product Designer',
  'UX Designer',
  'UI/UX Designer',
  'Graphic Designer',
  'UX Researcher',

  // Business / Operations
  'Business Analyst',
  'Project Manager',
  'Program Manager',
  'Operations Manager',
  'Supply Chain Manager',
  'Logistics Coordinator',

  // Marketing / Sales
  'Marketing Manager',
  'Digital Marketing Manager',
  'Content Strategist',
  'SEO Specialist',
  'Sales Representative',
  'Account Executive',
  'Account Manager',
  'Customer Success Manager',

  // Finance / Accounting
  'Financial Analyst',
  'Accountant',
  'Auditor',
  'Investment Analyst',
  'Financial Advisor',
  'Controller',

  // HR / Recruiting
  'HR Manager',
  'Recruiter',
  'HR Coordinator',
  'Training Manager',

  // Healthcare
  'Registered Nurse',
  'Physician',
  'Pharmacist',
  'Physical Therapist',
  'Medical Assistant',
  'Healthcare Administrator',

  // Education
  'Teacher',
  'Professor',
  'Academic Advisor',
  'Instructional Designer',
  'Research Assistant',

  // Legal
  'Attorney',
  'Paralegal',
  'Legal Assistant',
  'Compliance Officer',

  // Engineering (non-software)
  'Mechanical Engineer',
  'Electrical Engineer',
  'Civil Engineer',
  'Chemical Engineer',
  'Industrial Engineer',

  // Creative / Media
  'Content Writer',
  'Copywriter',
  'Video Editor',
  'Photographer',
  'Social Media Manager',

  // Consulting
  'Consultant',
  'Management Consultant',

  // Administrative
  'Administrative Assistant',
  'Executive Assistant',
  'Office Manager',
  'Receptionist',

  // Trades / Other
  'Electrician',
  'Technician',
  'Warehouse Associate',
  'Customer Service Representative',
];

// Common titles on Chinese job boards
export const CN_JOB_TITLES = [
  '后端开发工程师', 'Java 开发工程师', 'Go 开发工程师', '前端开发工程师', '全栈工程师',
  '客户端开发工程师', 'iOS 开发工程师', 'Android 开发工程师', '测试开发工程师', '运维工程师',
  '算法工程师', '机器学习工程师', '大模型算法工程师', '数据分析师', '数据开发工程师',
  '产品经理', '产品运营', 'UI 设计师', '交互设计师', '项目经理', '技术经理',
  '嵌入式软件工程师', '硬件工程师', '网络安全工程师', '管培生', '实习生',
];

// English for the Chinese titles and Chinese for the English ones, so either
// way of typing finds both: "后端" finds Backend Developer, "pm" finds 产品经理
export const JOB_TITLE_ALIASES: Record<string, string[]> = {
  '后端开发工程师': ['backend', 'back end'], 'Java 开发工程师': ['backend'], 'Go 开发工程师': ['golang', 'backend'],
  '前端开发工程师': ['frontend', 'front end'], '全栈工程师': ['full stack'],
  '客户端开发工程师': ['client', 'mobile'], 'iOS 开发工程师': ['mobile'], 'Android 开发工程师': ['mobile'],
  '测试开发工程师': ['qa', 'sdet', 'test'], '运维工程师': ['devops', 'sre', 'ops'],
  '算法工程师': ['algorithm', 'ml'], '机器学习工程师': ['machine learning', 'ml'],
  '大模型算法工程师': ['llm', 'ai'], '数据分析师': ['data analyst'], '数据开发工程师': ['data engineer', 'big data'],
  '产品经理': ['pm', 'product manager'], '产品运营': ['operations'], 'UI 设计师': ['ui', 'designer'],
  '交互设计师': ['ux', 'designer'], '项目经理': ['project manager'], '技术经理': ['engineering manager'],
  '嵌入式软件工程师': ['embedded'], '硬件工程师': ['hardware'], '网络安全工程师': ['security'],
  '管培生': ['management trainee'], '实习生': ['intern'],
  'Software Engineer': ['软件工程师', '开发'], 'Senior Software Engineer': ['高级', '软件工程师'],
  'Full Stack Developer': ['全栈'], 'Frontend Developer': ['前端'], 'Backend Developer': ['后端'],
  'Mobile Developer': ['移动', '客户端'], 'DevOps Engineer': ['运维'], 'Data Engineer': ['数据'],
  'Data Scientist': ['数据科学'], 'Data Analyst': ['数据分析'], 'Machine Learning Engineer': ['机器学习', '算法'],
  'QA Engineer': ['测试'], 'Security Engineer': ['安全'], 'Product Manager': ['产品经理', 'pm'],
};

export default JOB_TITLES;
