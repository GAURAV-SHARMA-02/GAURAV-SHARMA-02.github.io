/**
 * Single source of truth for every piece of content on the site.
 *
 * Kept separate from presentation so the copy can be edited without touching
 * rendering code — and so the 3D scene and the DOM stay describing the same
 * career rather than drifting apart.
 */

export const profile = {
  name: 'Gaurav Sharma',
  role: 'Software Engineer',
  tagline: 'I build systems that stay up, stay fast, and fix themselves.',
  location: 'Hyderabad, India',
  email: 'gaurav.029.sharma@gmail.com',
  links: {
    github: 'https://github.com/GAURAV-SHARMA-02',
    linkedin: 'https://www.linkedin.com/in/gaurav-sharma-a9b9b8162',
    resume: './Gaurav-Sharma-Resume.pdf',
  },

  intro:
    'Five years across the stack — distributed backends in Java, Kotlin and .NET, ' +
    'React and Node on the front, and most recently an autonomous AI agent that ' +
    'finds and fixes production bugs on its own. Deepest in backend and ' +
    'distributed systems; comfortable owning a feature end to end.',

  /** Headline numbers. Each one maps to a real bullet on the resume. */
  metrics: [
    { value: 93, suffix: '%', label: 'faster integrations', detail: '30 days → 2 days' },
    { value: 3, suffix: '×', label: 'throughput gain', detail: 'Akka actor model in .NET' },
    { value: 99.5, suffix: '%', label: 'uptime held', decimals: 1, detail: '10,000+ daily users' },
    { value: 40, suffix: '%', label: 'lower API latency', detail: 'query optimisation' },
  ],

  /**
   * Career timeline. `nodes` names the services each role revolved around —
   * the 3D scene uses these to build that era's constellation, so the
   * visualisation is literally describing the work.
   */
  timeline: [
    {
      id: 'saras',
      company: 'Saras Analytics',
      role: 'Software Engineer',
      period: 'Nov 2022 — Present',
      location: 'Hyderabad',
      summary:
        'Unified data platform for global commerce. I work on the connector ' +
        'platform that ingests from any source, and on the AI agent that keeps it healthy.',
      highlights: [
        'Built an autonomous AI agent (LangGraph, MCP, Claude) that reads production telemetry, does root-cause analysis and automates remediation — bug resolution went from 15–20 days to a few hours.',
        'Automated connector integration end to end: 30 days of manual work became 2 days.',
        'Cut average API response time 40% by reworking PostgreSQL and MongoDB query paths.',
        'Designed generic connector-management entities so every new integration reuses one consistent core.',
        'Resolved 50+ critical production issues, holding 99.5% uptime for 10,000+ daily active users.',
      ],
      stack: ['Java', 'Kotlin', 'Spring Boot', 'Kafka', 'GCP', 'PostgreSQL', 'MongoDB', 'Kubernetes', 'LangGraph', 'Claude'],
      nodes: ['ingest', 'connector-core', 'kafka', 'postgres', 'mongo', 'bigquery', 'ai-agent', 'grafana'],
      accent: '#5EE7C6',
    },
    {
      id: 'mystifly',
      company: 'Mystifly Consulting',
      role: 'Software Developer',
      period: 'Sep 2021 — Nov 2022',
      location: 'Bangalore',
      summary:
        'Airfare distribution and payments platform. High request volume, real money, ' +
        'and very little tolerance for being wrong.',
      highlights: [
        'Rebuilt the hot path on the Akka actor model in .NET — 3× throughput under concurrent load.',
        'Shipped a card payment system that streamlined processing end to end.',
        'Tracked down a defect quietly leaking roughly $10K/month in revenue, and closed it for good.',
        'Designed the APIs behind multiple travel-industry integrations.',
      ],
      stack: ['C#', '.NET', 'Akka.NET', 'Go', 'Kafka', 'MySQL', 'Azure', 'Elasticsearch'],
      nodes: ['gateway', 'pricing', 'akka-cluster', 'payments', 'mysql', 'elastic', 'datadog'],
      accent: '#F0A868',
    },
    {
      id: 'flipshope',
      company: 'Flipshope',
      role: 'Full Stack Developer',
      period: 'May 2021 — Sep 2021',
      location: 'Jaipur',
      summary:
        'E-commerce platform and browser extension. Where I learned that the frontend ' +
        'is where users actually feel your backend decisions.',
      highlights: [
        'Built end-to-end commerce features in Node.js and React for 15,000+ active users.',
        'Halved page load time — measurable gains in SEO and retention.',
        'Lifted mobile engagement 35% with a mobile-first rebuild.',
        'Added JWT authentication and encryption across the data layer.',
      ],
      stack: ['JavaScript', 'Node.js', 'React', 'MySQL', 'JWT'],
      nodes: ['web', 'api', 'auth', 'mysql', 'cdn'],
      accent: '#8AB4F8',
    },
  ],

  /** Grouped for the capability section. Ordered strongest first. */
  skills: [
    { group: 'Languages', items: ['Java', 'Kotlin', 'C#', 'Go', 'Python', 'TypeScript', 'SQL'] },
    { group: 'Backend & Distributed', items: ['Spring Boot', 'Microservices', 'Apache Kafka', 'Event-Driven Architecture', 'Akka Actor Model', '.NET', 'REST APIs'] },
    { group: 'Data', items: ['PostgreSQL', 'MongoDB', 'MySQL', 'BigQuery', 'Elasticsearch'] },
    { group: 'Cloud & Platform', items: ['GCP', 'Azure', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD'] },
    { group: 'AI Engineering', items: ['LangGraph', 'MCP', 'Claude', 'LLM Integration', 'Autonomous Agents'] },
    { group: 'Frontend', items: ['React', 'Angular', 'Node.js', 'JavaScript', 'TypeScript', 'HTML/CSS', 'Responsive UI'] },
    { group: 'Operating', items: ['System Design', 'Performance Tuning', 'Production Debugging', 'Root Cause Analysis', 'Mentorship'] },
  ],

  education: {
    degree: 'B.Tech, Electronics & Communication Engineering',
    institution: 'National Institute of Technology, Uttarakhand',
    period: '2017 — 2021',
  },
};
