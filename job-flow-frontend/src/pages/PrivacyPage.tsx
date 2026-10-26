import { Link } from 'react-router-dom'
import { useLanguage, type Language } from '../context/LanguageContext'
import './LoginPage.css'
import './PrivacyPage.css'

const CONTACT_EMAIL = 'a1206084539@gmail.com'
const GOOGLE_PERMISSIONS_URL = 'https://myaccount.google.com/permissions'
const GOOGLE_POLICY_URL = 'https://developers.google.com/terms/api-services-user-data-policy'
const LAST_UPDATED = '2026-10-22'

interface Section {
  title: string
  body: string[]
}

// Kept here rather than in en.ts/zh.ts: it's one long document, not UI labels
const content: Record<Language, { title: string; updated: string; back: string; sections: Section[] }> = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated',
    back: 'Back to sign in',
    sections: [
      {
        title: 'What JobFlow stores',
        body: [
          'Your account: email, name, and a hashed password. If you sign in with Google or GitHub, your name and profile picture from that account instead of a password.',
          'What you enter: job applications, companies, interviews, notes and settings such as your time zone.',
        ],
      },
      {
        title: 'Gmail import',
        body: [
          "Only if you link Gmail in Settings. JobFlow then asks Google for read-only access and, when you click Scan, looks for application confirmation emails from the last 90 days. It reads only each email's subject, sender and date, never the message body.",
          'Nothing is imported until you pick the emails yourself. For each one, JobFlow saves the company, position and date as a new application, plus the email\'s ID so it isn\'t imported twice. The access tokens Google issues are stored so scans keep working.',
          'You can remove the access at any time from your Google account permissions page.',
          "JobFlow's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
        ],
      },
      {
        title: 'How it is used',
        body: [
          'Only to run the app for you: show your data, send the interview reminder emails you turn on, and keep the service secure (for example, rate limiting by IP address).',
          'Your data is not sold, shared with advertisers, or used to train AI models. There are no ads or third-party analytics.',
        ],
      },
      {
        title: 'Where it lives',
        body: [
          'On a server in Amazon Web Services (US East). Traffic goes through Cloudflare, which protects the site and encrypts connections.',
          'Your browser keeps your sign-in token and preferences (language, theme) in local storage. No tracking cookies are used.',
        ],
      },
      {
        title: 'Deleting your data',
        body: [
          'You can delete your account at any time under Settings > Account. That removes your account and everything in it right away, and revokes Gmail access if you linked it.',
          `For any question about your data, email ${CONTACT_EMAIL} from the address you signed up with.`,
        ],
      },
    ],
  },
  zh: {
    title: '隐私政策',
    updated: '最后更新',
    back: '返回登录',
    sections: [
      {
        title: 'JobFlow 保存哪些数据',
        body: [
          '账号信息：邮箱、名字和加密后的密码。用 Google 或 GitHub 登录时，不保存密码，改为保存该账号的名字和头像。',
          '你填写的内容：求职申请、公司、面试、备注，以及时区等设置。',
        ],
      },
      {
        title: 'Gmail 导入',
        body: [
          '只有你在设置里关联 Gmail 后才会使用。JobFlow 会向 Google 申请只读权限，在你点击扫描时查找最近 90 天的申请确认邮件，只读取邮件的标题、发件人和日期，不读取正文。',
          '你亲自选择后才会导入。每封邮件只保存公司、职位和日期作为一条新申请，以及邮件 ID（防止重复导入）。Google 颁发的访问令牌会被保存，以便之后继续扫描。',
          '你可以随时在 Google 账号的权限页面撤销授权。',
          'JobFlow 对从 Google API 获取的信息的使用和传输，遵守 Google API 服务用户数据政策，包括其中的有限使用要求。',
        ],
      },
      {
        title: '数据的用途',
        body: [
          '只用于为你提供服务：显示你的数据、发送你开启的面试提醒邮件，以及保障服务安全（例如按 IP 地址限流）。',
          '不会出售你的数据，不会提供给广告商，也不会用来训练 AI 模型。没有广告和第三方统计。',
        ],
      },
      {
        title: '数据存放在哪里',
        body: [
          '存放在 Amazon Web Services（美国东部）的服务器上。访问经过 Cloudflare，由它保护网站并加密连接。',
          '浏览器会在本地存储中保存你的登录令牌和偏好设置（语言、主题），不使用追踪 Cookie。',
        ],
      },
      {
        title: '删除数据',
        body: [
          '你可以随时在「设置 > 账号」中注销账号。账号及其中的所有数据会立即删除；如果关联过 Gmail，授权也会一并撤销。',
          `对数据有任何疑问，请用注册时的邮箱发邮件到 ${CONTACT_EMAIL}。`,
        ],
      },
    ],
  },
}

export default function PrivacyPage() {
  const { lang } = useLanguage()
  const c = content[lang]

  return (
    <div className="auth-page">
      <div className="auth-card privacy-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">JF</div>
          <span className="auth-logo-text">JobFlow</span>
        </div>

        <h1 className="auth-title">{c.title}</h1>
        <p className="auth-subtitle">{c.updated}: {LAST_UPDATED}</p>

        {c.sections.map((section) => (
          <section key={section.title} className="privacy-section">
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}

        <p className="privacy-links">
          <a href={GOOGLE_PERMISSIONS_URL} target="_blank" rel="noreferrer">Google account permissions</a>
          {' · '}
          <a href={GOOGLE_POLICY_URL} target="_blank" rel="noreferrer">Google API Services User Data Policy</a>
          {' · '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>

        <p className="auth-footer">
          <Link to="/login">{c.back}</Link>
        </p>
      </div>
    </div>
  )
}
