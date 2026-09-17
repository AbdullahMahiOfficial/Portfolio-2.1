import React, { useState, useEffect, Component } from 'react';
import { Link } from 'react-scroll';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { 
  Menu, 
  X, 
  Linkedin, 
  Github, 
  Facebook, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Download, 
  ExternalLink,
  MessageCircle,
  Award,
  Briefcase,
  GraduationCap,
  Code2,
  User,
  CheckCircle2,
  ChevronRight,
  Send,
  Languages,
  Lock,
  AlertCircle,
  QrCode,
  Upload,
  Copy,
  Check,
  Coffee,
  Edit3,
  Trash2
} from 'lucide-react';
import { cn } from './lib/utils';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = "You don't have permission to perform this action. Please make sure you are logged in as an admin.";
        }
      } catch (e) {
        // Not a JSON error
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <X size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Application Error</h2>
            <p className="text-gray-600">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-sky-600 text-white py-3 rounded-xl font-bold hover:bg-sky-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Data ---

const NAV_ITEMS = [
  { name: 'HOME', to: 'home' },
  { name: 'CERTIFICATIONS', to: 'certifications' },
  { name: 'SKILLS', to: 'skills' },
  { name: 'EXPERIENCE', to: 'experience' },
  { name: 'EDUCATION', to: 'education' },
  { name: 'PORTFOLIO', to: 'portfolio' },
  { name: 'RESUME', to: 'resume' },
  { name: 'CONTACT', to: 'contact' },
];

const STATS = [
  { label: 'Years of Experience', value: '7+' },
  { label: 'Certifications', value: '50+' },
  { label: 'Happy Clients', value: '101+' },
];

const getColorByPercentage = (percentage: number, type: 'bg' | 'text' = 'bg') => {
  if (percentage >= 90) return type === 'bg' ? 'bg-green-900' : 'text-green-900';
  if (percentage >= 80) return type === 'bg' ? 'bg-green-500' : 'text-green-500';
  if (percentage >= 70) return type === 'bg' ? 'bg-blue-600' : 'text-blue-600';
  if (percentage >= 60) return type === 'bg' ? 'bg-sky-400' : 'text-sky-400';
  if (percentage >= 50) return type === 'bg' ? 'bg-orange-500' : 'text-orange-500';
  return type === 'bg' ? 'bg-yellow-400' : 'text-yellow-400';
};

const SKILLS_CLOUD = [
  { name: 'Microsoft Azure', level: 90 },
  { name: 'Amazon Web Services (AWS)', level: 75 },
  { name: 'Huawei Cloud', level: 60 },
];

const SKILLS_RELATED = [
  { name: 'Kubernetes (CKA)', level: 75 },
  { name: 'Docker & Containers', level: 80 },
  { name: 'Linux Administration', level: 80 },
  { name: 'DevOps & CI/CD', level: 85 },
  { name: 'Terraform (IaC)', level: 65 },
  { name: 'Ansible & Automation', level: 50 },
  { name: 'Network Security', level: 80 },
  { name: 'Microsoft 365 / Entra ID', level: 95 },
  { name: 'Intune & Defender', level: 90 },
  { name: 'GitHub Enterprise', level: 90 },
  { name: 'Cloud Migration', level: 95 },
  { name: 'Troubleshooting', level: 100 },
  { name: 'Git & Version Control', level: 85 },
  { name: 'Jenkins', level: 75 },
  { name: 'GitLab CI/CD', level: 85 },
  { name: 'Azure DevOps', level: 80 },
  { name: 'Helm', level: 40 },
  { name: 'Prometheus & Grafana', level: 85 },
  { name: 'ELK Stack', level: 70 },
  { name: 'Bash Scripting', level: 80 },
  { name: 'Python', level: 75 },
  { name: 'PowerShell', level: 90 },
  { name: 'SQL & NoSQL', level: 70 },
  { name: 'Nginx & Apache', level: 85 },
  { name: 'Load Balancing', level: 85 },
  { name: 'SSL/TLS Management', level: 80 },
  { name: 'IAM & Identity', level: 95 },
  { name: 'Zero Trust Security', level: 90 },
  { name: 'Disaster Recovery', level: 95 },
  { name: 'Cost Optimization', level: 100 },
  { name: 'Technical Leadership', level: 95 },
  { name: 'Project Management', level: 85 },
  { name: 'ITIL Framework', level: 80 },
  { name: 'Agile/Scrum', level: 90 },
  { name: 'Documentation', level: 95 },
  { name: 'API Management', level: 80 },
];

const LANGUAGES = [
  { name: 'Bengali', level: 100 },
  { name: 'English', level: 85 },
  { name: 'Hindi', level: 50 },
  { name: 'Germany', level: 30 },
];

const EXPERIENCE = [
  {
    company: 'ADN Technologies Limited',
    role: 'Solution Architect - Enterprise Business',
    period: 'October 2024 - Present',
    description: [
      'Lead end‑to‑end solution architecture for cloud and hybrid infrastructures on Azure and AWS supporting enterprise and banking environments.',
      'Design and standardize CI/CD automation using GitHub Actions, enabling DevOps, GitOps, and continuous delivery practices.',
      'Drive cloud transformation initiatives including migration, optimization, hardening, and high‑availability architecture.',
      'Act as technical authority for enterprise programs, ensuring compliance with security, governance, and regulatory frameworks.',
      'Implement SCM governance and identity integration, including GitHub Enterprise Server, Entra ID, and Active Directory.',
      'Define DevOps‑ready and cloud‑native architecture patterns to improve operational efficiency and release predictability.',
      'Collaborate with cross‑functional teams and vendors to align architecture with digital transformation roadmaps.'
    ],
    logo: 'https://picsum.photos/seed/adn/100/100',
    photo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    company: 'Corporate Projukti Limited',
    role: 'System Engineer - Cloud Infrastructure',
    period: 'Jan 2023 - Sep 2024 (1 Year 9 Months)',
    description: [
      'Designed and operated high‑availability cloud platforms on Azure and Huawei Cloud for enterprise workloads.',
      'Led cloud migration projects from on‑premises and AWS environments to Azure and Huawei Cloud.',
      'Implemented disaster recovery and business continuity solutions using Azure Site Recovery and HA patterns.',
      'Administered Linux systems, storage, networking, and virtualization to ensure platform reliability.',
      'Managed monitoring, alerting, and incident response to meet strict SLA and MOU requirements.',
      'Optimized cloud resource consumption and cost efficiency across hybrid cloud environments.',
      'Supported architecture decisions through operational insights and performance analysis.'
    ],
    logo: 'https://picsum.photos/seed/cp/100/100',
    photo: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    company: 'NASSA Group',
    role: 'Executive - Information Technology',
    period: 'Jul 2018 - Jun 2020 (2 Years)',
    description: [
      'Managed enterprise IT operations to ensure system availability and service continuity.',
      'Supported server infrastructure, endpoints, and business‑critical applications at enterprise scale.',
      'Coordinated external vendors and service providers to resolve high‑impact incidents.',
      'Led OS deployment, system standardization, and hardware lifecycle management.',
      'Monitored network performance and application health to prevent service degradation.',
      'Supported IT governance, compliance, and infrastructure planning initiatives.',
      'Resolved complex incidents and service requests within defined service‑level targets.'
    ],
    logo: 'https://picsum.photos/seed/nassa/100/100',
    photo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    company: 'Micro Fibre Group',
    role: 'Executive - Information Technology',
    period: 'May 2016 - Jun 2018 (2 Years 2 Months)',
    description: [
      'Supported enterprise IT operations and infrastructure services to maintain operational stability.',
      'Installed and maintained operating systems, hardware, and network components.',
      'Delivered cross‑department technical support to minimize downtime and improve productivity.',
      'Managed OS provisioning and software deployment following standardized IT policies.',
      'Improved infrastructure reliability through incident management and preventive maintenance.',
      'Assisted in LAN configuration, monitoring, and troubleshooting.',
      'Documented issues and resolutions to support knowledge management and process improvement.'
    ],
    logo: 'https://picsum.photos/seed/microfibre/100/100',
    photo: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&h=500&q=80'
  }
];

const EDUCATION = [
  {
    institution: 'Jahangirnagar University',
    degree: 'Master of Science in Information Technology',
    department: 'Institute of Information Technology',
    period: '2021 - 2023',
    logo: 'https://picsum.photos/seed/ju/150/150',
    photo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&h=500&q=80',
    description: [
      'The Master of Science in Information Technology (MSc in IT) is an advanced graduate program designed to build strong theoretical foundations and practical expertise in modern information technology. Offered by the Institute of Information Technology at Jahangirnagar University, the program emphasizes internationally aligned disciplines including software engineering and application development, data science, cloud computing, cybersecurity, and artificial intelligence.',
      'Structured to meet the evolving needs of the global ICT industry, the program equips graduates with the capability to design, implement, and manage complex, scalable, and secure information systems, preparing them for senior technical and leadership roles in technology‑driven organizations.'
    ]
  }
];

const PORTFOLIO = [
  {
    title: 'Email Infrastructure Modernization: Zimbra to Microsoft 365 Migration',
    category: 'Email Migration',
    description: 'Lead architect for full-scale email infrastructure modernization, successfully migrating 5,000+ enterprise mailboxes from Zimbra to Microsoft 365. Configured hybrid identity access management via Azure Entra ID Connect, engineered strict spam/phishing security policies using Exchange Online Protection (EOP), and preserved legacy archives with zero data loss or communication downtime.',
    logo: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Kubernetes Autoscaling System',
    category: 'Platform & DevOps',
    description: 'Designed and deployed an automated Kubernetes cluster architecture utilizing Horizontal Pod Autoscaler (HPA) and Cluster Autoscaler. Integrated Prometheus and Grafana telemetry dashboards to dynamically monitor CPU/Memory thresholds, resulting in a 40% reduction in cloud compute costs and guaranteeing high availability for core transactional microservices.',
    logo: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'GitHub Enterprise Server Deployment',
    category: 'Cloud & Infrastructure',
    description: 'Orchestrated the secure on-premises/cloud hybrid deployment of GitHub Enterprise Server. Formulated unified authorization schemes via SAML SSO and Azure Active Directory, set up highly restricted access controls (RBAC), and designed custom pre-receive hooks to strictly prevent sensitive API credential leaks across organizational repositories.',
    logo: 'https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Microsoft Cloud Deployment',
    category: 'Microsoft Services',
    description: 'Managed end-to-end cloud infrastructure configuration and deployment of Microsoft Azure resources. Provisions virtual networks, firewalls, resource groups, storage accounts, and VM scale sets utilizing declarative Terraform (IaC) templates for automated environment bootstrapping.',
    logo: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Enterprise Deployment',
    category: 'Microsoft Services',
    description: 'Formulated robust security strategies and deployed Enterprise Microsoft Intune and Microsoft Defender for Endpoint across 2,000+ corporate endpoints. Enforced strict Conditional Access policies, automated patch management, and established real-time threat detection workflows.',
    logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Microsoft Services Deployment',
    category: 'Microsoft Services',
    description: 'Designed secure configurations for Microsoft 365 applications, implementing cloud App Protection Policies, Information Protection labels (MIP), and unified messaging systems to safeguard intellectual property within banking systems.',
    logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Utkorsho Platform Implementation',
    category: 'Platform & DevOps',
    description: 'Successfully deployed and launched the Utkorsho digital platform. Configured automated delivery pipelines (CI/CD) on GitLab CI, set up Docker-based microservice clustering, and optimized SQL database indexes to withstand high concurrent traffic spikes during promotional events.',
    logo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Prohori GPS Tracker Migration',
    category: 'Cloud Migration',
    description: 'Led the digital migration of Prohori GPS Tracking Platform. Re-architected on-premises MongoDB clusters to scalable cloud-managed databases and introduced RabbitMQ messaging layers to process thousands of simultaneous telemetry data packets coming from vehicle GPS devices.',
    logo: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'TechShopBD Migration',
    category: 'Cloud Migration',
    description: 'Migrated TechShopBD eCommerce architecture from legacy local servers to highly responsive Cloud VMs. Set up global CDN caching rules, integrated automated SSL certifications, and established Redis-based caching layers to accelerate page response times under 1 second.',
    logo: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Rokomari Cloud Migration',
    category: 'Cloud Migration',
    description: 'Facilitated structural cloud migration and system optimization for Rokomari.com. Resolved severe bottleneck failures in API gateways, modernized the static asset distribution using Cloud storage, and configured auto-scaling node pools to effortlessly handle massive annual book fair traffic bursts.',
    logo: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Azure IaaS Infrastructure Deployment',
    category: 'Cloud Infrastructure',
    description: 'Designed and implemented high-security virtual networks, peerings, and network security groups (NSGs) in Azure. Standardized automated backups, cloud storage accounts, and custom monitoring metrics to assure 99.99% system uptime.',
    logo: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=800&h=500&q=80'
  },
  {
    title: 'Azure PaaS Web Solution Deployment',
    category: 'DevOps & PaaS',
    description: 'Deployed and maintained multi-tier business web solutions using Azure App Service and Azure SQL PaaS databases. Integrated automatic CI/CD deployment slots to secure risk-free staging deployments and live production hot-fixes.',
    logo: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=150&h=150&q=80',
    photo: 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=800&h=500&q=80'
  }
];

const CERTIFICATIONS = [
  { name: 'Certified Kubernetes Administrator', issuer: 'CNCF', logo: 'https://picsum.photos/seed/cka/150/150', photo: 'https://picsum.photos/seed/cka-full/800/600', landscape: true },
  { name: 'Red Hat Certified Engineer', issuer: 'Red Hat', logo: 'https://picsum.photos/seed/rhce/150/150', photo: 'https://picsum.photos/seed/rhce-full/800/600', landscape: true },
  { name: 'Azure Solutions Architect Expert', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/az305/150/150', photo: 'https://picsum.photos/seed/az305-full/800/600', landscape: true },
  { name: 'DevOps Engineer Expert', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/az400/150/150', photo: 'https://picsum.photos/seed/az400-full/800/600', landscape: true },
  { name: 'Cybersecurity Architect Expert', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/sc100/150/150', photo: 'https://picsum.photos/seed/sc100-full/800/600', landscape: true },
  { name: 'Power Platform Solutions Architect Expert', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/pl600/150/150', photo: 'https://picsum.photos/seed/pl600-full/800/600', landscape: true },
  { name: 'Red Hat Certified System Administrator', issuer: 'Red Hat', logo: 'https://picsum.photos/seed/rhcsa/150/150', photo: 'https://picsum.photos/seed/rhcsa-full/600/800', landscape: false },
  { name: 'Windows Server Hybrid Administrator Associate', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/az800/150/150', photo: 'https://picsum.photos/seed/az800-full/800/600', landscape: true },
  { name: 'Azure Administrator Associate', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/az104/150/150', photo: 'https://picsum.photos/seed/az104-full/800/600', landscape: true },
  { name: 'Security Operations Analyst Associate', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/sc200/150/150', photo: 'https://picsum.photos/seed/sc200-full/800/600', landscape: true },
  { name: 'Teams Administrator Associate', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/ms700/150/150', photo: 'https://picsum.photos/seed/ms700-full/800/600', landscape: true },
  { name: 'Power Platform Developer Associate', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/pl400/150/150', photo: 'https://picsum.photos/seed/pl400-full/800/600', landscape: true },
  { name: 'MTCNA', issuer: 'MikroTik', logo: 'https://picsum.photos/seed/mtcna/150/150', photo: 'https://picsum.photos/seed/mtcna-full/600/800', landscape: false },
  { name: 'Azure Fundamentals', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/az900/150/150', photo: 'https://picsum.photos/seed/az900-full/800/600', landscape: true },
  { name: 'Azure AI Fundamentals', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/ai900/150/150', photo: 'https://picsum.photos/seed/ai900-full/800/600', landscape: true },
  { name: 'Security, Compliance, and Identity Fundamentals', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/sc900/150/150', photo: 'https://picsum.photos/seed/sc900-full/800/600', landscape: true },
  { name: 'Azure Data Fundamentals', issuer: 'Microsoft', logo: 'https://picsum.photos/seed/dp900/150/150', photo: 'https://picsum.photos/seed/dp900-full/800/600', landscape: true },
  { name: 'Google IT Support Certificate', issuer: 'Google', logo: 'https://picsum.photos/seed/git/150/150', photo: 'https://picsum.photos/seed/git-full/800/600', landscape: true },
  { name: 'Google Cybersecurity Certificate', issuer: 'Google', logo: 'https://picsum.photos/seed/gcs/150/150', photo: 'https://picsum.photos/seed/gcs-full/800/600', landscape: true },
  ...Array.from({ length: 23 }).map((_, i) => ({
    name: `Professional Certification ${i + 20}`,
    issuer: i % 2 === 0 ? 'Microsoft' : 'Red Hat',
    logo: `https://picsum.photos/seed/cert-${i + 20}/150/150`,
    photo: `https://picsum.photos/seed/cert-photo-${i + 20}/800/600`,
    landscape: true
  }))
];

// --- Components ---

const SectionHeading = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: false }}
    transition={{ duration: 0.6 }}
    className="text-center mb-8"
  >
    <h2 className={cn("text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 relative pb-6 inline-block", className)}>
      {children}
      <motion.div 
        animate={{ width: ["0%", "100%", "0%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1.5 bg-sky-600 rounded-full" 
      />
    </h2>
  </motion.div>
);

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: false }}
    whileHover={{ y: -6, scale: 1.01 }}
    onClick={onClick}
    className={cn("bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md", className)}
  >
    {children}
  </motion.div>
);

const CircularProgress = ({ level, name }: { level: number; name: string }) => {
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0.1 });
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (level / 100) * circumference;
  const colorClass = getColorByPercentage(level, 'text');

  return (
    <div ref={ref} className="flex flex-col items-center gap-4">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-100"
          />
          <motion.circle
            cx="48"
            cy="48"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={colorClass}
          />
        </svg>
        <div className={cn("absolute inset-0 flex items-center justify-center font-black text-lg", colorClass)}>
          {level}%
        </div>
      </div>
      <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">{name}</span>
    </div>
  );
};

const Counter = ({ value, duration = 2 }: { value: string; duration?: number }) => {
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0.1 });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (inView) {
      const numericValue = parseInt(value.replace(/\D/g, ''));
      const controls = animate(count, numericValue, { 
        duration,
        ease: "easeOut"
      });
      return controls.stop;
    } else {
      count.set(0);
    }
  }, [inView, value, duration, count]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (value.includes('+')) {
        setDisplayValue(`${v}+`);
      } else {
        setDisplayValue(v.toString());
      }
    });
    return unsubscribe;
  }, [rounded, value]);

  return <span ref={ref}>{displayValue}</span>;
};

const getProjectImages = (project: any) => {
  if (project.images && project.images.length > 0) {
    return project.images;
  }
  
  const mainPhoto = project.photo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&h=500&q=80';
  
  let secondaryPhoto = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&h=500&q=80';
  let tertiaryPhoto = 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=800&h=500&q=80';
  
  if (project.category?.toLowerCase().includes('email') || project.title?.toLowerCase().includes('zimbra')) {
    secondaryPhoto = 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&w=800&h=500&q=80';
    tertiaryPhoto = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&h=500&q=80';
  } else if (project.category?.toLowerCase().includes('kubernetes') || project.category?.toLowerCase().includes('devops')) {
    secondaryPhoto = 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&h=500&q=80';
    tertiaryPhoto = 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?auto=format&fit=crop&w=800&h=500&q=80';
  } else if (project.category?.toLowerCase().includes('migration') || project.title?.toLowerCase().includes('rokomari') || project.title?.toLowerCase().includes('prohori') || project.title?.toLowerCase().includes('techshop')) {
    secondaryPhoto = 'https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=800&h=500&q=80';
    tertiaryPhoto = 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&h=500&q=80';
  } else if (project.category?.toLowerCase().includes('microsoft') || project.category?.toLowerCase().includes('azure') || project.category?.toLowerCase().includes('infrastructure')) {
    secondaryPhoto = 'https://images.unsplash.com/photo-1597839219216-a773cb2473e4?auto=format&fit=crop&w=800&h=500&q=80';
    tertiaryPhoto = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&h=500&q=80';
  }
  
  return [mainPhoto, secondaryPhoto, tertiaryPhoto];
};

const getExperiencePeriod = (periodText: string) => {
  if (periodText && periodText.toLowerCase().includes('present')) {
    // LinkedIn calculation method: inclusive of both the start month and current month
    const monthNames: Record<string, number> = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, september: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12
    };

    let startYear = 2024;
    let startMonth = 10; // Default October

    const match = periodText.match(/([a-zA-Z]+)\s+(\d{4})/i);
    if (match) {
      const parsedMonth = monthNames[match[1].toLowerCase()];
      if (parsedMonth) startMonth = parsedMonth;
      startYear = parseInt(match[2], 10);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // LinkedIn adds +1 to include both start and current month in the tenure calculation
    const totalMonths = Math.max(1, (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1);

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts: string[] = [];
    if (years > 0) {
      parts.push(`${years} ${years === 1 ? 'Year' : 'Years'}`);
    }
    if (months > 0) {
      parts.push(`${months} ${months === 1 ? 'Month' : 'Months'}`);
    }

    const durationStr = parts.length > 0 ? parts.join(' ') : '1 Month';
    return `October 2024 - Present (${durationStr})`;
  }
  return periodText;
};

const ExperienceScrollStack = ({ items }: { items: any[] }) => {
  return (
    <div className="relative w-full max-w-[1720px] mx-auto mt-12 pb-8 px-2 md:px-4 space-y-12">
      {items.map((item, idx) => {
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="sticky bg-white border border-slate-100 rounded-[2rem] p-8 md:p-12 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden min-h-[350px] flex flex-col justify-between transition-all duration-500"
            style={{
              top: `calc(7.5rem + ${idx * 24}px)`,
              zIndex: 10 + idx,
            }}
          >
            {/* Spine reflection line for visual realism */}
            <div className="absolute top-0 bottom-0 left-4 md:left-8 w-2.5 bg-gradient-to-r from-slate-200/40 via-transparent to-transparent pointer-events-none" />

            <div className="w-full text-left space-y-6">
              {/* Header section: 
                  1st Line: Company Name
                  2nd Line: Position/Role
                  3rd Line: Period
              */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-transparent p-1 flex items-center justify-center shrink-0">
                  <img 
                    src={item.logo} 
                    alt={item.company} 
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-1 text-left">
                  {/* 1st: Company name */}
                  <p className="text-sky-600 font-black text-base md:text-lg uppercase tracking-wider">
                    {item.company}
                  </p>
                  {/* 2nd: Position */}
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                    {item.role}
                  </h3>
                  {/* 3rd: Time period */}
                  <p className="text-slate-500 font-extrabold text-xs md:text-sm">
                    {getExperiencePeriod(item.period)}
                  </p>
                </div>
              </div>

              {/* Description lists */}
              <ul className="space-y-4">
                {item.description.map((bullet: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600 text-sm md:text-base leading-relaxed text-justify">
                    <div className="w-2 h-2 rounded-full bg-sky-500 mt-2 shrink-0" />
                    <span className="font-medium">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const EducationCard = ({ item }: { item: any }) => {
  return (
    <div className="relative w-full max-w-[1720px] mx-auto mt-12 pb-8 px-2 md:px-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false }}
        transition={{ duration: 0.6 }}
        className="bg-white border border-slate-100 rounded-[2rem] p-8 md:p-12 shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden min-h-[350px] flex flex-col justify-between transition-all duration-500"
      >
        <div className="absolute top-0 bottom-0 left-4 md:left-8 w-2.5 bg-gradient-to-r from-slate-200/40 via-transparent to-transparent pointer-events-none" />

        <div className="w-full text-left space-y-6">
          {/* Header section (No period, no footer, clean smart layout) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-slate-100 pb-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-transparent p-1 flex items-center justify-center shrink-0">
              <img 
                src={item.logo} 
                alt={item.institution} 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-1 text-left">
              {/* 1st: Institution Name */}
              <p className="text-sky-600 font-black text-base md:text-lg uppercase tracking-wider">
                {item.institution}
              </p>
              {/* 2nd: Degree/Program */}
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {item.degree}
              </h3>
              {/* 3rd: Department */}
              <p className="text-slate-500 font-extrabold text-xs md:text-sm">
                {item.department}
              </p>
            </div>
          </div>

          {/* Description Paragraphs */}
          <div className="space-y-4 md:space-y-5">
            {item.description.map((paragraph: string, i: number) => (
              <p key={i} className="text-slate-600 text-sm md:text-base leading-relaxed text-justify font-medium">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedCert, setSelectedCert] = useState<typeof CERTIFICATIONS[0] | null>(null);
  const [selectedProject, setSelectedProject] = useState<typeof PORTFOLIO[0] | null>(null);
  const [activeProjIdx, setActiveProjIdx] = useState(0);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'payment' | 'whatsapp'>('payment');
  const [customPaymentQr, setCustomPaymentQr] = useState<string>(() => {
    return localStorage.getItem('user_custom_payment_qr') || '';
  });
  const [paymentNote, setPaymentNote] = useState<string>(() => {
    return localStorage.getItem('user_payment_note') || 'bKash / Nagad / Bank / Card Scan to Pay';
  });
  const [isEditingQr, setIsEditingQr] = useState(false);
  const [tempNote, setTempNote] = useState(paymentNote);
  const [copiedNote, setCopiedNote] = useState(false);

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setCustomPaymentQr(result);
        localStorage.setItem('user_custom_payment_qr', result);
        setIsEditingQr(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNote = () => {
    localStorage.setItem('user_payment_note', tempNote.trim());
    setPaymentNote(tempNote.trim());
    setIsEditingQr(false);
  };

  const handleResetCustomQr = () => {
    setCustomPaymentQr('');
    localStorage.removeItem('user_custom_payment_qr');
    localStorage.removeItem('user_payment_note');
    setPaymentNote('bKash / Nagad / Bank / Card Scan to Pay');
    setTempNote('bKash / Nagad / Bank / Card Scan to Pay');
    setIsEditingQr(false);
  };
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submittedTicketRef, setSubmittedTicketRef] = useState<string | null>(null);
  const [smtpDiagnosticError, setSmtpDiagnosticError] = useState<string | null>(null);
  const [isCaptchaChecked, setIsCaptchaChecked] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState({ q: '', a: 0 });
  const [userCaptchaAnswer, setUserCaptchaAnswer] = useState('');

  useEffect(() => {
    setActiveImgIdx(0);
  }, [activeProjIdx]);
  
  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 1;
    const n2 = Math.floor(Math.random() * 9) + 1;
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let ans = 0;
    if (op === '+') ans = n1 + n2;
    else if (op === '-') ans = n1 - n2;
    else ans = n1 * n2;
    setCaptchaChallenge({ q: `${n1} ${op} ${n2} = ?`, a: ans });
    setUserCaptchaAnswer('');
  };

  useEffect(() => {
    if (showCaptcha) generateCaptcha();
  }, [showCaptcha]);
  
  const { ref: skillsRef, inView: skillsInView } = useInView({ triggerOnce: false, threshold: 0.1 });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);

      const sections = ['home', 'certifications', 'skills', 'experience', 'education', 'portfolio', 'resume', 'contact'];
      const scrollPos = window.scrollY + 180;

      for (let i = sections.length - 1; i >= 0; i--) {
        const secEl = document.getElementById(sections[i]);
        if (secEl) {
          const top = secEl.offsetTop;
          if (scrollPos >= top) {
            setActiveSection(sections[i]);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const whatsappLink = "https://wa.me/AbdullahMahiOfficial";
  const resumeLink = "https://drive.google.com/file/d/1YourResumeID/view?usp=sharing"; // Replace with actual link

  // --- Firestore Content State ---
  const [profileData, setProfileData] = useState<any>(null);
  const [dbCertifications, setDbCertifications] = useState<any[]>([]);
  const [dbSkills, setDbSkills] = useState<any[]>([]);
  const [dbLanguages, setDbLanguages] = useState<any[]>([]);
  const [dbExperience, setDbExperience] = useState<any[]>([]);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profSnap = await getDocs(collection(db, 'profile'));
        const profData = !profSnap.empty ? profSnap.docs[0].data() : null;
        setProfileData(profData);

        const [certSnap, skillSnap, langSnap, expSnap, projSnap] = await Promise.all([
          getDocs(collection(db, 'certifications')),
          getDocs(collection(db, 'skills')),
          getDocs(collection(db, 'languages')),
          getDocs(collection(db, 'experience')),
          getDocs(collection(db, 'projects'))
        ]);

        if (!profSnap.empty) setProfileData(profSnap.docs[0].data());
        setDbCertifications(certSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).sort((a, b) => (a.order || 0) - (b.order || 0)));
        setDbSkills(skillSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        setDbLanguages(langSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        setDbExperience(expSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        setDbProjects(projSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayCerts = dbCertifications.length > 0 ? dbCertifications.filter(c => c.visible !== false) : CERTIFICATIONS;
  const displayPortfolio = dbProjects.length > 0 ? dbProjects.filter(p => p.visible !== false) : PORTFOLIO;
  const displayExperience = dbExperience.length > 0 ? dbExperience.filter(e => e.visible !== false) : EXPERIENCE;
  const displaySkillsCloud = dbSkills.length > 0 ? dbSkills.filter(s => s.category === 'cloud' && s.visible !== false) : SKILLS_CLOUD;
  const displaySkillsRelated = dbSkills.length > 0 ? dbSkills.filter(s => s.category === 'related' && s.visible !== false) : SKILLS_RELATED;
  const displayLanguages = dbLanguages.length > 0 ? dbLanguages.filter(l => l.visible !== false) : LANGUAGES;

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    setSubmittedTicketRef(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message'),
      createdAt: serverTimestamp(),
    };

    const path = 'messages';
    
    // Calculate sequential ticket number starting at 260001 by counting current records in Firestore
    let calculatedTicketRef = '260001';
    try {
      const snapshot = await getDocs(collection(db, path));
      calculatedTicketRef = (260001 + snapshot.size).toString();
    } catch (countErr) {
      console.warn("Could not query Firestore collection size for ticket number sequence, using timestamp-based random fallback:", countErr);
      calculatedTicketRef = (260001 + Math.floor(Math.random() * 1000)).toString();
    }
    
    setSubmittedTicketRef(calculatedTicketRef);

    try {
      // 1. Store in Firestore (Wrapped in separate try-catch so failure does NOT block Google Sheets, Excel or Email integrations!)
      try {
        await addDoc(collection(db, path), {
          ...data,
          ticketRef: calculatedTicketRef,
          status: 'unread'
        });
        console.log("Transmission registered successfully in database (Firestore) with ticket:", calculatedTicketRef);
      } catch (firestoreErr: any) {
        console.warn("Firestore save skipped/failed, proceeding with external integrations:", firestoreErr);
      }
      
      // Helper function to safely validate HTTP/HTTPS URLs
      const isValidHttpUrl = (str: unknown): boolean => {
        if (!str || typeof str !== 'string') return false;
        const trimmed = str.trim();
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
        try {
          const parsed = new URL(trimmed);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      };

      // 2. Resolve target Webhook URLs from both client-side storage/variables and server-side configurations.
      let resolvedGoogleWebhookUrl = localStorage.getItem('VITE_GOOGLE_SHEET_WEBHOOK') || 
                                       (import.meta as any).env.VITE_GOOGLE_SHEET_WEBHOOK ||
                                       (profileData && profileData.googleSheetWebhook) || 
                                       '';

      let resolvedExcelWebhookUrl = localStorage.getItem('VITE_EXCEL_WEBHOOK_URL') || 
                                       (import.meta as any).env.VITE_EXCEL_WEBHOOK_URL || 
                                       '';

      // Purge corrupt or placeholder non-URL values from localStorage if present
      if (localStorage.getItem('VITE_GOOGLE_SHEET_WEBHOOK') && !isValidHttpUrl(localStorage.getItem('VITE_GOOGLE_SHEET_WEBHOOK') || '')) {
        localStorage.removeItem('VITE_GOOGLE_SHEET_WEBHOOK');
      }
      if (localStorage.getItem('VITE_EXCEL_WEBHOOK_URL') && !isValidHttpUrl(localStorage.getItem('VITE_EXCEL_WEBHOOK_URL') || '')) {
        localStorage.removeItem('VITE_EXCEL_WEBHOOK_URL');
      }

      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.googleSheetWebhook && isValidHttpUrl(configData.googleSheetWebhook)) {
            resolvedGoogleWebhookUrl = configData.googleSheetWebhook;
          }
          if (configData.excelWebhookUrl && isValidHttpUrl(configData.excelWebhookUrl)) {
            resolvedExcelWebhookUrl = configData.excelWebhookUrl;
          }
        }
      } catch (configErr) {
        console.warn("Could not retrieve secure webhook URLs from server, using local fallbacks:", configErr);
      }

      const validGoogleWebhookUrl = isValidHttpUrl(resolvedGoogleWebhookUrl) ? resolvedGoogleWebhookUrl.trim() : '';
      const validExcelWebhookUrl = isValidHttpUrl(resolvedExcelWebhookUrl) ? resolvedExcelWebhookUrl.trim() : '';

      // 3. Direct client-side sync to Google Sheets (if valid URL provided)
      // This is incredibly robust as it executes in the user's browser, bypassing Azure backend outbound network policies
      if (validGoogleWebhookUrl) {
        try {
          console.log("[Client Sync] Triggering direct browser sync to Google Sheets:", validGoogleWebhookUrl);
          await fetch(validGoogleWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: data.name,
              email: data.email,
              subject: data.subject,
              message: data.message,
              ticketRef: calculatedTicketRef,
              createdAt: new Date().toISOString()
            }),
          });
          console.log("[Client Sync] Direct Google Sheets browser request initiated successfully.");
        } catch (sheetErr) {
          console.error("[Client Sync] Direct Google Sheets browser sync failed:", sheetErr);
        }
      }

      // 4. Trigger Automatic SMTP Email Reply using Office 365 Account backend route
      setSmtpDiagnosticError(null);
      try {
        const mailResponse = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            subject: data.subject,
            message: data.message,
            ticketRef: calculatedTicketRef,
            googleSheetWebhook: validGoogleWebhookUrl || undefined,
            excelWebhookUrl: validExcelWebhookUrl || undefined
          })
        });
        const resBody = await mailResponse.json().catch(() => ({}));
        if (!mailResponse.ok) {
          const errMsg = resBody.error || `Error status: ${mailResponse.status}`;
          console.error("Office 365 Auto-Reply dispatch error:", errMsg);
          setSmtpDiagnosticError(errMsg);
        } else if (resBody.partialFailure) {
          console.warn("Office 365 Auto-Reply partial failure:", resBody.message);
          setSmtpDiagnosticError(resBody.message);
        }
      } catch (mailErr: any) {
        console.error("Office 365 Auto-Reply dispatch failed:", mailErr);
        setSmtpDiagnosticError(mailErr.message || "Network request failed");
      }

      setFormStatus('success');
      setIsCaptchaChecked(false);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setFormStatus('idle'), 5000);
    } catch (error) {
      console.error("Error adding document: ", error);
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch (e) {
        // Error already logged
      }
      setFormStatus('error');
      setTimeout(() => setFormStatus('idle'), 5000);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-sky-500/20 selection:text-sky-900 flex flex-col">
        {/* Fixed Top Navigation Bar with Deep Navy Background (#02152b) */}
        <header className="sticky top-0 z-50 w-full bg-[#02152b] text-white shadow-lg transition-all duration-300">
          <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 h-16 flex items-center justify-between">
            {/* Brand Logo / Identity */}
            <Link 
              to="home" 
              smooth={true} 
              duration={500}
              className="font-black text-lg md:text-xl tracking-tight text-white hover:text-sky-300 transition-colors cursor-pointer flex items-center gap-2.5 select-none"
            >
              <span className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                AM
              </span>
              <span className="tracking-wide uppercase font-bold text-sm md:text-base">
                Abdullah Mahi
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8 h-full">
              {[
                { name: 'HOME', to: 'home' },
                { name: 'CERTIFICATIONS', to: 'certifications' },
                { name: 'SKILLS', to: 'skills' },
                { name: 'EXPERIENCE', to: 'experience' },
                { name: 'EDUCATION', to: 'education' },
                { name: 'PORTFOLIO', to: 'portfolio' },
                { name: 'RESUME', to: 'resume' },
                { name: 'CONTACT', to: 'contact' },
              ].map((item) => {
                const isActive = activeSection === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    smooth={true}
                    duration={500}
                    offset={-70}
                    className="relative h-full flex items-center font-bold text-xs xl:text-sm tracking-wider uppercase text-slate-200 hover:text-white transition-colors cursor-pointer px-1 select-none"
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Menu Toggle (No Let's Talk button as per instructions) */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-slate-200 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="lg:hidden bg-[#02152b] border-t border-slate-800/80 px-6 py-4 space-y-2"
              >
                {[
                  { name: 'HOME', to: 'home' },
                  { name: 'CERTIFICATIONS', to: 'certifications' },
                  { name: 'SKILLS', to: 'skills' },
                  { name: 'EXPERIENCE', to: 'experience' },
                  { name: 'EDUCATION', to: 'education' },
                  { name: 'PORTFOLIO', to: 'portfolio' },
                  { name: 'RESUME', to: 'resume' },
                  { name: 'CONTACT', to: 'contact' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    smooth={true}
                    duration={500}
                    offset={-70}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "block py-2.5 px-3 rounded-lg text-xs font-black tracking-widest uppercase transition-colors cursor-pointer",
                      activeSection === item.to
                        ? "bg-white/10 text-white border-l-2 border-white pl-4"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Hero Section */}
        <section id="home" className="flex items-center pt-16 md:pt-20 pb-16 px-4 sm:px-6 md:px-8 lg:px-12 relative overflow-hidden bg-white">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-100/60 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/80 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="w-full max-w-[1720px] mx-auto grid lg:grid-cols-12 gap-12 xl:gap-16 items-center">
          <div className="lg:col-span-5 flex justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: false }}
              animate={{ 
                y: [0, -15, 0],
              }}
              transition={{ 
                opacity: { duration: 0.8, ease: "easeOut" },
                scale: { duration: 0.8, ease: "easeOut" },
                rotate: { duration: 0.8, ease: "easeOut" },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-sky-600 rounded-2xl rotate-6 group-hover:rotate-3 transition-transform duration-500 -z-10 opacity-20" />
              <div className="w-full max-w-[400px] aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative">
                <img 
                  src="https://picsum.photos/seed/abdullah-profile/800/1000" 
                  alt="Abdullah Al Mamun" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <motion.div 
                animate={{ 
                  scale: [1, 1.03, 1],
                  boxShadow: ["0px 1px 2px rgba(14, 165, 233, 0.1)", "0px 4px 12px rgba(14, 165, 233, 0.25)", "0px 1px 2px rgba(14, 165, 233, 0.1)"]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2.5, 
                  ease: "easeInOut" 
                }}
                className="inline-flex items-center gap-2.5 px-4 py-2 bg-sky-50 text-sky-700 border border-sky-200/80 rounded-full text-xs font-black uppercase tracking-widest cursor-text select-text"
              >
                <span className="relative flex h-2.5 w-2.5 select-none">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-600 animate-pulse"></span>
                </span>
                <span className="select-text cursor-text">Open for Projects & Full-Time Opportunities</span>
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                {profileData?.heroTitle || "Abdullah Al Mamun"}
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl font-bold text-sky-600 leading-tight">
                {profileData?.name || "Solution Architect | Cloud Strategist | DevOps Innovator"}
              </p>
              <div className="text-slate-600 text-lg leading-relaxed w-full space-y-4 text-justify">
                <p>
                  {profileData?.heroDescription || "I design and deliver secure, scalable, and high‑performance cloud solutions aligned with modern business needs. With hands‑on expertise across Azure, AWS, and Huawei Cloud, I help organizations modernize infrastructure, automate operations, strengthen security, and achieve operational excellence."}
                </p>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm font-medium text-slate-600">
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> Cloud & Hybrid Architecture Design</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> DevOps & CI/CD Automation</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> Kubernetes Administration</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> Microsoft 365 & Entra ID</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> Enterprise Endpoint Security</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> Seamless Cloud Migrations</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> Monitoring & Disaster Recovery</div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-sky-600" /> Business Alignment & Strategy</div>
                </div>
                <p className="text-sm italic border-l-4 border-sky-600 pl-4 py-2 bg-sky-50/70 text-justify text-slate-700 rounded-r-lg">
                  {profileData?.bio || "Certified in Azure Solutions Architecture, DevOps Engineering, Microsoft 365 Administration, and Kubernetes (CKA), I bring a strategic mindset with hands‑on technical leadership—ensuring every solution is secure, scalable, reliable, and aligned with business goals."}
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-4 pt-4"
            >
              <Link 
                to="contact" 
                smooth={true} 
                className="bg-sky-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-sky-700 transition-all shadow-md shadow-sky-600/20 cursor-pointer"
              >
                Hire Me Now
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-50/70 pt-10 pb-12 md:pb-16 px-4 sm:px-6 md:px-8 lg:px-12 border-y border-slate-100">
        <div className="w-full max-w-[1720px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {STATS.map((stat, idx) => (
            <div key={idx} className="text-center space-y-2">
              <p className="text-5xl font-black text-sky-600">
                <Counter value={stat.value} />
              </p>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Certifications Section */}
      <section id="certifications" className="py-12 md:py-16 px-4 sm:px-6 md:px-8 lg:px-12 bg-white">
        <div className="w-full max-w-[1720px] mx-auto">
          <SectionHeading>Certifications</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-center">
            {displayCerts.map((cert, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.08, y: -4 }}
                onClick={() => setSelectedCert(cert)}
                className="bg-transparent p-2 flex flex-col items-center justify-center cursor-pointer group transition-all"
              >
                <div className="relative overflow-hidden rounded-2xl w-full aspect-square flex items-center justify-center p-3">
                  <img 
                    src={cert.logo} 
                    alt={cert.name} 
                    className="w-full h-full object-contain transition-all duration-500 group-hover:scale-110 bg-transparent"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-sky-600/0 group-hover:bg-sky-500/5 transition-all flex items-center justify-center rounded-2xl">
                    <Award className="text-sky-600 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" size={32} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills & Languages Section */}
      <section id="skills" className="py-12 md:py-20 px-4 sm:px-6 md:px-8 lg:px-12 bg-white" ref={skillsRef}>
        <div className="w-full max-w-[1720px] mx-auto">
          <SectionHeading>Skills</SectionHeading>
          
          <div className="space-y-16">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-sky-600 text-white rounded-lg flex items-center justify-center text-xs">C</span>
                Cloud Architecture
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                {SKILLS_CLOUD.map((skill, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                      <span>{skill.name}</span>
                      <span className={getColorByPercentage(skill.level, 'text')}>{skill.level}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={skillsInView ? { width: `${skill.level}%` } : { width: 0 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className={cn("h-full rounded-full", getColorByPercentage(skill.level, 'bg'))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center text-xs">R</span>
                Related Technical Skills
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                {SKILLS_RELATED.map((skill, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                      <span>{skill.name}</span>
                      <span className={cn("font-black", getColorByPercentage(skill.level, 'text'))}>{skill.level}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={skillsInView ? { width: `${skill.level}%` } : { width: 0 }}
                        transition={{ duration: 1.5, ease: 'easeOut', delay: idx * 0.02 }}
                        className={cn("h-full rounded-full", getColorByPercentage(skill.level, 'bg'))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-12">
              <h3 className="text-2xl font-black text-slate-900 mb-16 text-center uppercase tracking-widest">Language Skills</h3>
              <div className="flex flex-wrap justify-center gap-12 md:gap-24">
                {LANGUAGES.map((lang, idx) => (
                  <CircularProgress key={idx} name={lang.name} level={lang.level} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section (Sticky Stack Style) */}
      <section id="experience" className="py-16 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 bg-white relative overflow-hidden">
        <div className="w-full max-w-[1720px] mx-auto text-center">
          <SectionHeading>Experience</SectionHeading>
          <ExperienceScrollStack items={displayExperience} />
        </div>
      </section>

      {/* Education Section (Smart Card Style) */}
      <section id="education" className="py-16 md:py-24 px-4 sm:px-6 md:px-8 lg:px-12 bg-white relative overflow-hidden">
        <div className="w-full max-w-[1720px] mx-auto text-center">
          <SectionHeading>Education</SectionHeading>
          {EDUCATION.length > 0 && <EducationCard item={EDUCATION[0]} />}
        </div>
      </section>

      {/* Portfolio Section (Interactive Showcase on White Theme) */}
      <section id="portfolio" className="py-20 md:py-28 px-4 sm:px-6 md:px-8 lg:px-12 bg-white relative overflow-hidden text-slate-900 border-t border-slate-100">
        {/* Ambient subtle light glow circles */}
        <div className="absolute top-1/4 left-10 w-96 h-96 rounded-full bg-sky-100/50 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-[1720px] mx-auto relative z-10">
          <SectionHeading>Portfolio</SectionHeading>
          <p className="text-center text-slate-500 -mt-8 mb-16 font-bold tracking-wide uppercase text-xs md:text-sm">My Recent Works</p>
          
          <div className="space-y-4">
            {displayPortfolio.map((project, idx) => {
              const isActive = idx === activeProjIdx;
              const projImages = getProjectImages(project);
              const activeImage = projImages[0] || project.logo; // Primary display photo

              return (
                <motion.div
                  key={idx}
                  layout
                  transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                  onClick={() => setActiveProjIdx(isActive ? -1 : idx)}
                  className={cn(
                    "group cursor-pointer transition-all duration-300 overflow-hidden",
                    isActive 
                      ? "bg-slate-50/90 p-6 md:p-8 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-slate-200/80" 
                      : "py-6 hover:bg-slate-50/50 px-4 rounded-2xl border-b border-slate-100"
                  )}
                >
                  {/* Collapsed/Header view of each item */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 md:gap-6">
                      <span className={cn(
                        "font-mono font-black text-sm md:text-base transition-colors",
                        isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-600"
                      )}>
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <h3 className={cn(
                        "text-base md:text-xl font-bold tracking-tight transition-colors text-left",
                        isActive ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                      )}>
                        {project.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className={cn(
                        "text-[9px] md:text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider transition-colors font-mono",
                        isActive 
                          ? "bg-sky-100 text-sky-700" 
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/70"
                      )}>
                        {project.category}
                      </span>

                      {/* Square shape company logo / thumbnail */}
                      {!isActive && (
                        <div className="w-14 h-14 md:w-16 md:h-16 aspect-square rounded-xl overflow-hidden shrink-0 transition-all duration-300 group-hover:scale-105 select-none relative hidden sm:flex items-center justify-center p-1 bg-transparent">
                          <img 
                            src={project.logo || activeImage} 
                            alt={project.title} 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded block view with smooth professional stagger */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0, y: 8 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ 
                          height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                          opacity: { duration: 0.28, ease: "easeInOut" },
                          y: { duration: 0.3 }
                        }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 pt-6 mt-6 border-t border-slate-200/70 items-center">
                          {/* Left contents */}
                          <div className="md:col-span-7 lg:col-span-8 space-y-5 text-left">
                            <p className="text-slate-600 text-sm md:text-base leading-relaxed text-justify font-medium">
                              {project.description}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project);
                              }}
                              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-6 py-3 rounded-full text-xs transition-all duration-300 shadow-md shadow-amber-400/20 flex items-center gap-1.5 hover:scale-105 active:scale-95 origin-left cursor-pointer"
                            >
                              See More <ChevronRight size={14} className="stroke-[3]" />
                            </button>
                          </div>

                          {/* Right contents: square shape company logo / photo preview with subtle shadow and NO border */}
                          <div className="md:col-span-5 lg:col-span-4 flex justify-center md:justify-end relative py-4">
                            <div className="relative w-44 h-44 md:w-52 md:h-52 aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 select-none p-3 bg-white flex items-center justify-center">
                              <img 
                                src={project.logo || activeImage} 
                                alt={`${project.title} logo`} 
                                className="max-w-full max-h-full object-contain" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resume Section */}
      <section id="resume" className="py-12 md:py-16 px-4 sm:px-6 md:px-8 lg:px-12 bg-white">
        <div className="w-full max-w-[1720px] mx-auto text-center space-y-12">
          <SectionHeading>My Resume</SectionHeading>
          <Card className="p-12 space-y-8 bg-slate-50/70 border border-slate-100">
            <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
              <Download size={40} />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-slate-900">Professional Resume</h3>
              <p className="text-slate-600 max-w-2xl mx-auto text-center font-medium">
                Access my detailed resume showcasing 7+ years of experience in Cloud Architecture, DevOps, and Enterprise IT solutions.
              </p>
            </div>
            <a 
              href={resumeLink}
              download="Abdullah_Al_Mamun_Resume.pdf"
              className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 mx-auto transition-all shadow-md shadow-sky-600/20 inline-flex"
            >
              <Download size={20} />
              Download my Resume
            </a>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-200 text-left">
              <div>
                <p className="font-bold text-slate-900 mb-2">What's Included</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Professional Summary</li>
                  <li>• Work Experience</li>
                  <li>• Technical Skills</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-2">Additional Info</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Certifications</li>
                  <li>• Education Details</li>
                  <li>• Project Portfolio</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-slate-900 mb-2">Contact Info</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Email & Phone</li>
                  <li>• LinkedIn Profile</li>
                  <li>• Location Details</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-12 md:py-16 px-4 sm:px-6 md:px-8 lg:px-12 bg-white">
        <div className="w-full max-w-[1720px] mx-auto">
          <SectionHeading>Get In Touch</SectionHeading>
          <div className="text-center -mt-8 mb-8 space-y-1">
            <p className="text-xl font-bold text-slate-900">Let's Keep In Touch</p>
            <p className="text-slate-600 font-medium">Looking forward to connecting with fellow professionals, clients, and tech enthusiasts.</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Address:</p>
                  <p className="text-slate-600">Bangladesh</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Email:</p>
                  <p className="text-slate-600 select-text font-medium cursor-text">hello@abdullahmahiofficial.com</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-sky-600 text-white rounded-full flex items-center justify-center shrink-0">
                  <User size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Social Profiles:</p>
                  <div className="flex gap-4 mt-2">
                    <a href="https://linkedin.com/in/abdullahmahiofficial/" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 transition-colors"><Linkedin size={24} /></a>
                    <a href="https://github.com/AbdullahMahiOfficial" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900 transition-colors"><Github size={24} /></a>
                    <a href="https://facebook.com/abdullahmahiofficial/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 transition-colors"><Facebook size={24} /></a>
                    <a href="https://abdullahmahiofficial.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 transition-colors"><Globe size={24} /></a>
                  </div>
                </div>
              </div>
            </div>

            <Card className="p-8 bg-slate-50/60 border border-slate-100">
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Leave me a message</h3>
                <p className="text-slate-600 text-sm font-medium -mt-2">
                  Please drop your message here. The quickest way to reach me is by filling out this form.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <input name="name" type="text" required placeholder="Your Name" className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-400" />
                  <input name="email" type="email" required placeholder="Your Email Address" className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-400" />
                </div>
                <input name="subject" type="text" required placeholder="Subject" className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all placeholder:text-slate-400" />
                <textarea name="message" required placeholder="Your Message" rows={4} className="w-full px-4 py-3 bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none placeholder:text-slate-400"></textarea>
                
                <div className="space-y-4">
                  {!isCaptchaChecked ? (
                    <div 
                      className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setShowCaptcha(true)}
                    >
                      <div className="w-6 h-6 border bg-slate-50 border-slate-300 rounded flex items-center justify-center transition-all">
                        {/* Empty box */}
                      </div>
                      <span className="text-sm font-medium text-slate-700 italic">I am a human (Security Step)</span>
                      <div className="ml-auto flex items-center gap-2 opacity-50">
                        <Lock size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Protocol</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="w-6 h-6 bg-emerald-600 border-emerald-600 rounded flex items-center justify-center">
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-bold text-emerald-700">Protocol Verified</span>
                    </div>
                  )}

                  <AnimatePresence>
                    {showCaptcha && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-white border border-slate-200 rounded-xl shadow-lg space-y-4 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <Code2 size={48} />
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Calculation</p>
                          <button onClick={generateCaptcha} className="text-[10px] font-bold text-sky-600 uppercase hover:underline">Refresh</button>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-black text-slate-900 tracking-tighter bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 italic animate-pulse">
                            {captchaChallenge.q}
                          </div>
                          <input 
                            type="number"
                            value={userCaptchaAnswer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUserCaptchaAnswer(val);
                              if (parseInt(val) === captchaChallenge.a) {
                                setIsCaptchaChecked(true);
                                setShowCaptcha(false);
                              }
                            }}
                            placeholder="?"
                            className="w-20 p-2 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 outline-none font-bold text-center text-xl placeholder:text-slate-400"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold italic">Solve the equation to verify you're human.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {formStatus === 'success' && (
                    <div className="space-y-4">
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2 bg-emerald-50 border border-emerald-200 p-4 rounded-xl"
                      >
                        <p className="text-emerald-700 font-bold text-sm flex items-center gap-2">
                          <CheckCircle2 size={16} /> Message sent successfully!
                        </p>
                        {submittedTicketRef && (
                          <p className="text-slate-700 text-xs font-semibold pl-6">
                            Operations Tracking Reference Code: <span className="text-sky-700 font-bold font-mono px-1.5 py-0.5 bg-sky-100 border border-sky-200 rounded">{submittedTicketRef}</span>
                          </p>
                        )}
                      </motion.div>

                      {smtpDiagnosticError && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3"
                        >
                          <div className="flex items-start gap-2.5 text-amber-800">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-xs uppercase tracking-wider">DevOps Auto-Responder Diagnostic</p>
                              <p className="text-slate-700 text-xs font-semibold leading-relaxed mt-1">
                                Your message was processed and saved perfectly into your database! However, the automated Microsoft 365 dispatch failed due to a tenant-level access protocol restriction:
                              </p>
                              <div className="bg-slate-900 text-amber-300 font-mono text-[10px] p-2.5 rounded-lg mt-2 overflow-x-auto whitespace-pre-wrap leading-normal shadow-inner max-h-36">
                                SYSTEM LOG: {smtpDiagnosticError}
                              </div>
                            </div>
                          </div>
                          {smtpDiagnosticError.includes('535 5.7.139') || smtpDiagnosticError.toLowerCase().includes('security defaults') ? (
                            <div className="text-slate-700 text-[11px] leading-relaxed pl-7 space-y-2">
                              <p className="font-bold text-red-600 flex items-center gap-1">🛑 Tenant Security Defaults Active Check:</p>
                              <p className="text-slate-600">
                                Your screenshots show you have already enabled <strong>Authenticated SMTP</strong> and configured an <strong>App Password</strong> perfectly! 
                                However, Microsoft 365 blocks legacy authentication protocols (including SMTP app passwords) if <strong>Security Defaults</strong> is turned on for your entire tenant.
                              </p>
                              <p className="font-bold text-slate-800">🛠️ Steps to disable "Security Defaults" in Microsoft Entra Admin Center:</p>
                              <ol className="list-decimal pl-4 space-y-1.5">
                                <li>Log in directly to the <strong>Microsoft Entra admin center</strong> (<a href="https://entra.microsoft.com" target="_blank" rel="noopener noreferrer" className="underline text-sky-600 font-bold font-mono">entra.microsoft.com</a>).</li>
                                <li>In the left sidebar menu, expand <strong>Identity</strong> and select <strong>Overview</strong>.</li>
                                <li>Under the central overview page, click the <strong>Properties</strong> tab.</li>
                                <li>Scroll to the bottom of the Properties tab and click the <strong>Manage security defaults</strong> link.</li>
                                <li>Toggle the <strong>Security defaults</strong> dropdown or checkbox value to <strong>Disabled</strong>.</li>
                                <li>Select a diagnostic reason (e.g., "My organization uses SMTP AUTH") and click <strong>Save</strong>.</li>
                              </ol>
                              <p className="text-[10px] text-amber-800 font-semibold bg-amber-100 p-2.5 rounded-lg border border-amber-200 mt-2">
                                💡 <strong>Tip for Production:</strong> After turning off basic Security Defaults, IT Admins usually create custom <strong>Conditional Access</strong> policies to mandate MFA for human sign-ins while specifically maintaining exception paths for legacy automation accounts utilizing App Passwords.
                              </p>
                            </div>
                          ) : (
                            <div className="text-slate-700 text-[11px] leading-relaxed pl-7 space-y-1">
                              <p className="font-bold text-slate-800">🛠️ Action Items to unlock your O365 SMTP Mailbox:</p>
                              <ol className="list-decimal pl-4 space-y-1">
                                <li>Log in to your <strong>Microsoft 365 Admin Center</strong> (<a href="https://admin.microsoft.com" target="_blank" rel="noopener noreferrer" className="underline text-sky-600 font-bold">admin.microsoft.com</a>).</li>
                                <li>Navigate to <strong>Users</strong> &gt; <strong>Active users</strong> and select <code>no-reply@abdullahmahiofficial.com</code> (or your sending user).</li>
                                <li>In the user flyer pane, click on the <strong>Mail</strong> tab.</li>
                                <li>Under the <strong>Email apps</strong> section, click <strong>Manage email apps</strong>.</li>
                                <li>Locate <strong>Authenticated SMTP</strong>, check the box to **explicitly enable** it, and click <strong>Save Changes</strong>.</li>
                              </ol>
                              <p className="text-[10px] text-slate-500 italic mt-2">
                                Note: SmtpClientAuthentication is disabled by default for cloud tenants under Microsoft Security Defaults. Once Enabled, modern App Passwords will successfully bypass basic auth policies.
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}
                  {formStatus === 'error' && (
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-500 font-bold text-sm"
                    >
                      Something went wrong. Please try again.
                    </motion.p>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  disabled={formStatus === 'submitting' || !isCaptchaChecked}
                  className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-xl font-bold transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {formStatus === 'submitting' ? 'Sending...' : <><Send size={18} /> Submit</>}
                </button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* Bottom Bar / Footer with Deep Navy Background (#02152b) Matching Top Navigation Bar */}
      <footer className="w-full bg-[#02152b] text-white py-6 px-4 sm:px-6 md:px-8 lg:px-12 border-t border-slate-800/80">
        <div className="w-full max-w-[1720px] mx-auto flex items-center justify-center text-center">
          <p className="text-xs sm:text-sm font-medium tracking-wide text-slate-300">
            Copyright &copy; Abdullah Mahi Official. All rights reserved
          </p>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {selectedCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md"
            onClick={() => setSelectedCert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center"
              style={{ width: '800px', height: '600px', maxWidth: '95vw', maxHeight: '85vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedCert(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm shadow-lg rounded-full hover:bg-white transition-colors z-10 text-slate-900"
              >
                <X size={24} />
              </button>
              <div className="w-full h-full p-4 flex items-center justify-center bg-gray-50">
                <img 
                  src={selectedCert.photo} 
                  alt={selectedCert.name} 
                  className={cn(
                    "max-w-full max-h-full shadow-2xl rounded-sm object-contain",
                    selectedCert.landscape ? "w-full" : "h-full"
                  )}
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white rounded-2xl overflow-hidden shadow-2xl relative flex flex-col"
              style={{ width: '600px', height: '300px', maxWidth: '95vw', maxHeight: '95vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-transparent p-2 flex items-center justify-center">
                    <img src={selectedProject.logo} alt={selectedProject.title} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <span className="text-sky-600 font-bold text-xs uppercase tracking-widest">{selectedProject.category}</span>
                    <h3 className="text-xl font-bold text-slate-900">{selectedProject.title}</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {selectedProject.description}
                  </p>
                  <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-2">Project Overview</h4>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      Comprehensive digital transformation strategy aimed at optimizing infrastructure performance and enhancing security protocols.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setSelectedProject(null)}
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Floating Button */}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-4">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsDonationModalOpen(true)}
          className="bg-amber-400 text-slate-900 p-4 rounded-full shadow-2xl hover:bg-amber-500 transition-all flex items-center justify-center group relative cursor-pointer"
        >
          <Award size={32} />
          <span className="absolute right-full mr-4 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Buy Me a Coffee to Support My Next Project
          </span>
          <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-bounce">
            COFFEE
          </div>
        </motion.div>

        <motion.a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-all flex items-center justify-center group relative"
        >
          <MessageCircle size={32} />
          <span className="absolute right-full mr-4 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat with me on WhatsApp
          </span>
        </motion.a>
      </div>

      {/* Donation / Support Innovation Modal with Custom Payment QR and WhatsApp Scan */}
      <AnimatePresence>
        {isDonationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-end p-4 sm:p-6 pointer-events-none"
          >
            {/* Transparent backdrop that handles modal close */}
            <div className="absolute inset-0 pointer-events-auto" onClick={() => setIsDonationModalOpen(false)} />
            
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden relative pointer-events-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsDonationModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors z-10 shadow-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
              
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-amber-400 text-slate-900 rounded-xl flex items-center justify-center shadow-md shrink-0">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight italic leading-tight">Support Innovation</h3>
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">
                      {modalTab === 'payment' ? 'Custom Payment QR & Coffee' : 'Connect with me on WhatsApp'}
                    </p>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => { setModalTab('payment'); setIsEditingQr(false); }}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      modalTab === 'payment' 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <QrCode size={14} />
                    Payment QR
                  </button>
                  <button
                    onClick={() => { setModalTab('whatsapp'); setIsEditingQr(false); }}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      modalTab === 'whatsapp' 
                        ? "bg-white text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>
                </div>

                {/* Payment QR Tab Content */}
                {modalTab === 'payment' && (
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col items-center gap-3 shadow-xs">
                      <div className="w-44 h-44 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center p-2 relative overflow-hidden">
                        {customPaymentQr ? (
                          <img 
                            src={customPaymentQr} 
                            alt="Custom Payment QR Code" 
                            className="w-full h-full object-contain" 
                          />
                        ) : (
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('https://wa.me/AbdullahMahiOfficial?text=Hello%20Abdullah,%20I%20want%20to%20send%20payment%20support%20for%20your%20coffee!')}&color=02152b`} 
                            alt="Payment QR Code" 
                            className="w-full h-full object-contain" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                      <div className="text-center w-full px-2">
                        <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          {customPaymentQr ? 'Custom Payment QR' : 'Payment QR Code'}
                        </p>
                        <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mt-1 truncate">
                          {paymentNote}
                        </p>
                      </div>
                    </div>

                    {/* Custom QR Code Controls */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                          Personalized QR Code
                        </span>
                        <button
                          onClick={() => setIsEditingQr(!isEditingQr)}
                          className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 size={11} />
                          {isEditingQr ? 'Close' : 'Change QR / Info'}
                        </button>
                      </div>

                      {isEditingQr && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2 space-y-3 border-t border-slate-200"
                        >
                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-1">
                              Upload QR Image:
                            </label>
                            <label className="flex items-center justify-center gap-2 w-full py-2 px-3 border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-lg text-xs font-bold text-sky-700 bg-sky-50/50 cursor-pointer transition-colors">
                              <Upload size={14} />
                              <span>Select QR image file</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleQrUpload} 
                                className="hidden" 
                              />
                            </label>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-700 block mb-1">
                              Payment Note or Methods:
                            </label>
                            <input 
                              type="text" 
                              value={tempNote}
                              onChange={(e) => setTempNote(e.target.value)}
                              placeholder="e.g. bKash / Nagad / Bank / Card"
                              className="w-full text-xs font-semibold p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-sky-500"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={handleSaveNote}
                              className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Save Note
                            </button>
                            {customPaymentQr && (
                              <button
                                onClick={handleResetCustomQr}
                                className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                Reset
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <a 
                      href={`https://wa.me/AbdullahMahiOfficial?text=${encodeURIComponent('Hello Abdullah, I am sending payment support for your innovation/coffee!')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center w-full py-3 bg-[#02152b] hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Fuel My Coffee
                    </a>
                  </div>
                )}

                {/* WhatsApp Scan Tab Content (Photo 3 reference) */}
                {modalTab === 'whatsapp' && (
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col items-center gap-3 shadow-xs">
                      <div className="w-44 h-44 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center p-2 relative overflow-hidden">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappLink)}&color=0f172a`} 
                          alt="WhatsApp Contact QR" 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">WhatsApp Scan</p>
                        <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mt-1">Scan to Support or message me</p>
                      </div>
                    </div>

                    <a 
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center w-full py-3 bg-[#02152b] hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Fuel My Coffee
                    </a>
                  </div>
                )}

                <p className="text-[10px] text-slate-400 text-center font-bold italic pt-1">
                  "Small support, big impact. Thank you."
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
