import React, { useState, useEffect, useRef, Component } from 'react';
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
  ChevronUp,
  Layers,
  Send,
  Languages,
  Lock,
  AlertCircle,
  QrCode,
  Upload,
  Check,
  Coffee,
  Edit3,
  Trash2,
  Clock
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

// --- Data & Global Size Configurations ---

// ============================================================================
// 📸 GLOBAL PHOTOS & LOGOS SIZE CONTROLS (EDIT PIXEL SIZES HERE)
// File to edit for size changes: /src/App.tsx
// ============================================================================

// 1. Hero Profile Photo (Change width, height, or image in px)
export const HERO_PROFILE_PHOTO = {
  src: "https://picsum.photos/seed/abdullah-profile/800/1000",
  width: "380px",       // Width in px (e.g. '380px', '400px', '320px')
  height: "475px",      // Height in px (e.g. '475px', '500px', '400px')
  maxWidth: "100%",
  objectFit: "cover" as const, // 'cover' | 'contain' | 'fill'
  borderRadius: "24px", // Border radius in px
};

// 2. Navigation Brand Logo (AM initials badge or custom image logo in px)
export const NAV_BRAND_LOGO = {
  useImageLogo: false,  // Set to true if you want to use an image logo file
  src: "/logo.png",      // Logo image file URL or relative path
  width: "36px",        // Width in px
  height: "36px",       // Height in px
  objectFit: "contain" as const, // 'contain' | 'cover' | 'fill'
  initialsWidth: "32px", // Initials box width in px
  initialsHeight: "32px",// Initials box height in px
};

// 3. Certificate Popup Modal Image (Full-view certificate photo in px)
export const CERTIFICATE_MODAL_PHOTO = {
  width: "800px",       // Popup modal width in px
  height: "600px",      // Popup modal height in px
  maxWidth: "95vw",
  maxHeight: "85vh",
  objectFit: "contain" as const,
};

// Helper for badge and certificate image paths:
export const assetPath = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  return path.startsWith('/') ? path : `/${path}`;
};

export interface CertificationItem {
  name: string;
  issuer?: string;
  badge?: React.ReactNode | string;
  certificateImage?: string;
  isPotrait?: boolean;
  isPortrait?: boolean;
  photo?: string;
  logo?: string;
  landscape?: boolean;
  modalWidth?: string;
  modalHeight?: string;
}

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
  { name: 'BENGALI', level: 100, color: '#046A38' },
  { name: 'ENGLISH', level: 85, color: '#00A859' },
  { name: 'HINDI', level: 50, color: '#FF671F' },
  { name: 'GERMANY', level: 30, color: '#FFC700' },
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
    // 🔧 LOGO SIZE CONTROLS (Edit width & height in px for this specific logo):
    logoWidth: '85px',
    logoHeight: '85px',
    imgWidth: '100%',
    imgHeight: '100%',
    logoFit: 'contain', // 'contain' | 'cover' | 'fill'
    photo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&h=500&q=80',
    // 🔧 PHOTO SIZE CONTROLS (Edit width & height in px for this photo):
    photoWidth: '100%',
    photoHeight: '260px',
    photoFit: 'cover'
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
    // 🔧 LOGO SIZE CONTROLS (Edit width & height in px for this specific logo):
    logoWidth: '85px',
    logoHeight: '85px',
    imgWidth: '100%',
    imgHeight: '100%',
    logoFit: 'contain', // 'contain' | 'cover' | 'fill'
    photo: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&h=500&q=80',
    // 🔧 PHOTO SIZE CONTROLS (Edit width & height in px for this photo):
    photoWidth: '100%',
    photoHeight: '260px',
    photoFit: 'cover'
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
    // 🔧 LOGO SIZE CONTROLS (Edit width & height in px for this specific logo):
    logoWidth: '85px',
    logoHeight: '85px',
    imgWidth: '100%',
    imgHeight: '100%',
    logoFit: 'contain', // 'contain' | 'cover' | 'fill'
    photo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&h=500&q=80',
    // 🔧 PHOTO SIZE CONTROLS (Edit width & height in px for this photo):
    photoWidth: '100%',
    photoHeight: '260px',
    photoFit: 'cover'
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
    // 🔧 LOGO SIZE CONTROLS (Edit width & height in px for this specific logo):
    logoWidth: '85px',
    logoHeight: '85px',
    imgWidth: '100%',
    imgHeight: '100%',
    logoFit: 'contain', // 'contain' | 'cover' | 'fill'
    photo: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=800&h=500&q=80',
    // 🔧 PHOTO SIZE CONTROLS (Edit width & height in px for this photo):
    photoWidth: '100%',
    photoHeight: '260px',
    photoFit: 'cover'
  }
];

const EDUCATION = [
  {
    institution: 'Jahangirnagar University',
    degree: 'Master of Science in Information Technology',
    department: 'Institute of Information Technology',
    period: '2021 - 2023',
    logo: 'https://picsum.photos/seed/ju/150/150',
    // 🔧 LOGO SIZE CONTROLS (Edit width & height in px for this specific logo):
    logoWidth: '85px',
    logoHeight: '85px',
    imgWidth: '100%',
    imgHeight: '100%',
    logoFit: 'contain', // 'contain' | 'cover' | 'fill'
    photo: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&h=500&q=80',
    // 🔧 PHOTO SIZE CONTROLS (Edit width & height in px for this photo):
    photoWidth: '100%',
    photoHeight: '260px',
    photoFit: 'cover',
    description: [
      'The Master of Science in Information Technology (MSc in IT) is an advanced graduate program designed to build strong theoretical foundations and practical expertise in modern information technology. Offered by the Institute of Information Technology at Jahangirnagar University, the program emphasizes internationally aligned disciplines including software engineering and application development, data science, cloud computing, cybersecurity, and artificial intelligence.',
      'Structured to meet the evolving needs of the global ICT industry, the program equips graduates with the capability to design, implement, and manage complex, scalable, and secure information systems, preparing them for senior technical and leadership roles in technology‑driven organizations.'
    ]
  }
];

// Dedicated Vector & Logo Component supporting 3 responsive sizes (1st: sm, 2nd: md, 3rd: lg)
const ProjectLogo = ({ 
  iconType, 
  title, 
  size = 'sm', 
  customLogo,
  customWidth,
  customHeight,
  customFit = 'contain',
}: { 
  iconType?: string; 
  title: string; 
  size?: 'sm' | 'md' | 'lg'; 
  customLogo?: string;
  customWidth?: string;
  customHeight?: string;
  customFit?: string;
}) => {
  const containerClasses = {
    sm: "rounded-2xl p-2.5 shadow-xs border border-slate-100",
    md: "rounded-2xl p-4 shadow-md border border-slate-200/80",
    lg: "rounded-3xl p-6 shadow-xl border border-slate-200"
  }[size];

  const defaultDimensions = {
    sm: { width: '80px', height: '80px' },
    md: { width: '130px', height: '130px' },
    lg: { width: '200px', height: '200px' },
  }[size];

  const appliedWidth = customWidth || defaultDimensions.width;
  const appliedHeight = customHeight || defaultDimensions.height;

  // If custom logo image provided and not a generic placeholder
  if (customLogo && !customLogo.includes('unsplash.com') && !customLogo.includes('picsum.photos')) {
    return (
      <div 
        style={{ width: appliedWidth, height: appliedHeight }}
        className={cn("bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300", containerClasses)}
      >
        <img 
          src={customLogo} 
          alt={title} 
          style={{ objectFit: (customFit as any) || 'contain' }}
          className="w-full h-full" 
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div 
      style={{ width: appliedWidth, height: appliedHeight }}
      className={cn("bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300 select-none", containerClasses)}
    >
      {iconType === 'm365' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <rect x="6" y="8" width="16" height="14" rx="2" fill="#E83B26" />
          <rect x="26" y="8" width="16" height="14" rx="2" fill="#00A4EF" />
          <rect x="6" y="26" width="16" height="14" rx="2" fill="#7FBA00" />
          <rect x="26" y="26" width="16" height="14" rx="2" fill="#FFB900" />
        </svg>
      )}
      {iconType === 'kubernetes' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#326CE5" />
          <circle cx="24" cy="24" r="7" fill="white" />
          <path d="M24 6V15M24 33V42M6 24H15M33 24H42M11 11L18 18M30 30L37 37M37 11L30 18M18 30L11 37" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {iconType === 'github' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#181717" />
          <path fillRule="evenodd" clipRule="evenodd" d="M24 10C16.27 10 10 16.36 10 24.2C10 30.48 14.01 35.8 19.58 37.67C20.28 37.8 20.54 37.36 20.54 36.98C20.54 36.64 20.52 35.53 20.52 34.33C17 34.98 16.14 33.39 15.86 32.61C15.7 32.22 15.02 30.98 14.43 30.64C13.94 30.38 13.25 29.73 14.41 29.71C15.5 29.69 16.27 30.71 16.53 31.13C17.78 33.27 19.8 32.68 20.59 32.32C20.72 31.41 21.08 30.79 21.48 30.43C18.36 30.08 15.09 28.86 15.09 23.41C15.09 21.86 15.64 20.58 16.55 19.58C16.4 19.22 15.91 17.74 16.69 15.79C16.69 15.79 17.87 15.41 20.55 17.25C21.68 16.93 22.88 16.77 24.08 16.77C25.28 16.77 26.48 16.93 27.61 17.25C30.29 15.39 31.47 15.79 31.47 15.79C32.25 17.74 31.76 19.22 31.61 19.58C32.52 20.58 33.06 21.84 33.06 23.41C33.06 28.88 29.78 30.08 26.65 30.43C27.16 30.87 27.61 31.73 27.61 33.07C27.61 35 27.59 36.56 27.59 36.98C27.59 37.36 27.85 37.81 28.56 37.67C34.12 35.8 38.14 30.46 38.14 24.2C38.14 16.36 31.87 10 24 10Z" fill="white" />
        </svg>
      )}
      {iconType === 'azure' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#0078D4" />
          <path d="M12 35L22.5 13H28L18 35H12Z" fill="white" fillOpacity="0.85" />
          <path d="M22.5 13L29 27.5L36 35H25L20 25L22.5 13Z" fill="white" />
        </svg>
      )}
      {iconType === 'intune' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#0284C7" />
          <path d="M24 11L35 15.5V23C35 30 29.8 36.2 24 38C18.2 36.2 13 30 13 23V15.5L24 11Z" fill="#0369A1" stroke="white" strokeWidth="2" />
          <path d="M20 23.5L23 26.5L28.5 20.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {iconType === 'purview' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#4F46E5" />
          <rect x="14" y="16" width="20" height="18" rx="3" stroke="white" strokeWidth="2.5" />
          <path d="M18 16V13C18 9.68 20.68 7 24 7C27.32 7 30 9.68 30 13V16" stroke="white" strokeWidth="2.5" />
          <circle cx="24" cy="25" r="2.5" fill="white" />
        </svg>
      )}
      {iconType === 'gitlab' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#E24329" />
          <path d="M24 37L35 24L31 12L24 23L17 12L13 24L24 37Z" fill="#FCA326" />
          <path d="M24 37L35 24H13L24 37Z" fill="#E24329" />
          <path d="M13 24L17 12L24 23H13Z" fill="#FC6D26" />
          <path d="M35 24L31 12L24 23H35Z" fill="#FC6D26" />
        </svg>
      )}
      {iconType === 'iot' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#0EA5E9" />
          <circle cx="24" cy="24" r="4" fill="white" />
          <circle cx="24" cy="24" r="9" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="24" cy="24" r="14" stroke="white" strokeWidth="2" />
          <path d="M24 6V10M24 38V42M6 24H10M38 24H42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {iconType === 'techshop' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#F59E0B" />
          <path d="M14 15H17L20 29H31L34 18H18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="21" cy="33" r="2" fill="white" />
          <circle cx="30" cy="33" r="2" fill="white" />
          <path d="M26 13L23 18H28L25 24" stroke="#78350F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {iconType === 'rokomari' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#2563EB" />
          <path d="M14 16C14 16 18 14 24 17C30 14 34 16 34 16V33C34 33 30 31 24 34C18 31 14 33 14 33V16Z" fill="#1D4ED8" stroke="white" strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 17V34" stroke="white" strokeWidth="2" />
        </svg>
      )}
      {iconType === 'vnet' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#0284C7" />
          <circle cx="24" cy="16" r="4" fill="white" />
          <circle cx="15" cy="31" r="4" fill="white" />
          <circle cx="33" cy="31" r="4" fill="white" />
          <path d="M24 20L17 28M24 20L31 28M19 31H29" stroke="white" strokeWidth="2" strokeDasharray="2 2" />
        </svg>
      )}
      {iconType === 'paas' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#059669" />
          <path d="M16 28C14 28 12 26 12 24C12 22 13.5 20.3 15.5 20.1C16.2 16.6 19.3 14 23 14C27.4 14 31 17.6 31 22C33.2 22.2 35 24 35 26.2C35 28.5 33.2 30.3 31 30.3H16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 33L24 29L28 33" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {iconType === 'multicloud' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#D97706" />
          <path d="M24 10L35 15V23C35 30 29.8 35.8 24 38C18.2 35.8 13 30 13 23V15L24 10Z" fill="#B45309" stroke="white" strokeWidth="2" />
          <path d="M19 22C19 20.3 20.3 19 22 19C23.7 19 25 20.3 25 22M23 26C24.7 26 26 27.3 26 29C26 30.7 24.7 32 23 32" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 19L27 22L24 25M24 26L21 29L24 32" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {iconType === 'zerotrust' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#4338CA" />
          <circle cx="24" cy="21" r="6" stroke="white" strokeWidth="2.5" />
          <path d="M24 27V36M20 32H28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {iconType === 'gitops' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#7C3AED" />
          <rect x="13" y="13" width="9" height="9" rx="1.5" fill="white" />
          <rect x="26" y="13" width="9" height="9" rx="1.5" fill="white" fillOpacity="0.75" />
          <rect x="13" y="26" width="9" height="9" rx="1.5" fill="white" fillOpacity="0.75" />
          <rect x="26" y="26" width="9" height="9" rx="1.5" fill="white" />
        </svg>
      )}
      {iconType === 'observability' && (
        <svg viewBox="0 0 48 48" className="w-full h-full" fill="none">
          <circle cx="24" cy="24" r="22" fill="#EA580C" />
          <path d="M14 34L20 26L26 30L34 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="34" cy="16" r="3" fill="white" />
        </svg>
      )}
      {!iconType && (
        <div className="w-full h-full bg-sky-600 rounded-lg flex items-center justify-center text-white font-black text-xs sm:text-sm">
          {title.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};

const PORTFOLIO = [
  {
    id: 'proj-1',
    title: 'Email Infrastructure Modernization: Zimbra to Microsoft 365 Migration',
    category: 'Email Migration',
    period: 'Oct 2024 – Present',
    iconType: 'm365',
    shortDescription: 'Led end-to-end email modernization, migrating 5,000+ enterprise mailboxes from Zimbra to Microsoft 365 Exchange Online.\nConfigured hybrid directory synchronization via Entra ID Connect and enforced strict anti-phishing protection with zero downtime.',
    description: 'Lead architect for full-scale email infrastructure modernization, successfully migrating 5,000+ enterprise mailboxes from Zimbra to Microsoft 365 Exchange Online. Configured hybrid directory identity sync via Azure Entra ID Connect with Pass-Through Authentication (PTA), engineered strict spam and phishing security policies using Exchange Online Protection (EOP), and preserved legacy archives with zero data loss.',
    keyServices: [
      'Hybrid Identity Directory Synchronization: Configured Microsoft Entra ID Connect with Pass-Through Authentication (PTA) for unified SSO.',
      'Exchange Online Protection (EOP): Engineered anti-spam, spoof intelligence, and anti-phishing policies to secure communication.',
      'Domain Authentication Protocols: Configured DKIM, DMARC, and SPF records ensuring maximum delivery trust and compliance.',
      'Mailbox & Archive Migration: Transitioned multi-terabyte legacy archives and distribution lists with zero communication downtime.'
    ],
    technologies: ['Microsoft 365', 'Exchange Online', 'Entra ID Connect', 'PowerShell', 'Zimbra']
  },
  {
    id: 'proj-2',
    title: 'Implementation and Optimization of Kubernetes Autoscaling for Microservices Architecture',
    category: 'Platform & DevOps',
    period: 'Apr 2024 – Present',
    iconType: 'kubernetes',
    shortDescription: 'Successfully designed and implemented a scalable Kubernetes-based microservices architecture.\nThe system utilizes Horizontal Pod Autoscaler (HPA) and Prometheus telemetry, cutting compute costs by 40% while ensuring 99.99% reliability.',
    description: 'Designed and deployed an automated Kubernetes cluster architecture utilizing Horizontal Pod Autoscaler (HPA) and Cluster Autoscaler on Azure AKS. Integrated Prometheus and Grafana telemetry dashboards to dynamically monitor CPU and memory thresholds, resulting in a 40% reduction in cloud compute costs while guaranteeing high availability for core transactional microservices.',
    keyServices: [
      'Kubernetes Cluster Setup: Deployed using multi-zone node pools on Azure AKS and kubectl for production-grade resilience.',
      'Horizontal Pod Autoscaler (HPA): Configured to scale microservices dynamically based on live CPU and memory saturation.',
      'Custom Metrics Integration: Enabled Prometheus Metrics Server for advanced autoscaling triggers and queue depth monitoring.',
      'Load Testing & Optimization: Conducted high-throughput load tests to fine-tune scaling thresholds and resource reservations.',
      'CI/CD Pipeline: Integrated GitHub Actions for automated container builds, vulnerability scans, and rolling updates.',
      'Monitoring & Logging: Implemented Grafana and Prometheus for real-time cluster observability and alert dispatch.',
      'Documentation & Runbooks: Delivered comprehensive technical architecture documentation and disaster recovery runbooks.'
    ],
    technologies: ['Kubernetes (CKA)', 'Azure AKS', 'Docker', 'Helm', 'Prometheus', 'Grafana']
  },
  {
    id: 'proj-3',
    title: 'GitHub Enterprise Server Deployment & Automation',
    category: 'DevOps & SCM',
    period: 'Jan 2024 – Sep 2024',
    iconType: 'github',
    shortDescription: 'Orchestrated the secure hybrid deployment of GitHub Enterprise Server across enterprise topologies.\nIntegrated SAML Single Sign-On with Entra ID, enforced custom pre-receive hooks, and established automated CI/CD runners.',
    description: 'Orchestrated the secure on-premises and cloud hybrid deployment of GitHub Enterprise Server. Formulated unified authorization schemes via SAML Single Sign-On and Microsoft Entra ID, set up highly restricted Role-Based Access Control (RBAC), and designed custom pre-receive hooks to strictly prevent sensitive API credential leaks across organizational repositories.',
    keyServices: [
      'Centralized Identity Federation: Configured SAML Single Sign-On integration with Microsoft Entra ID for corporate user lifecycle management.',
      'Secret Leakage Prevention: Engineered custom pre-receive hooks and secret scanning preventing accidental token and key commits.',
      'Self-Hosted Runner Cluster: Built auto-scaling Docker-based GitHub Actions runner fleet for internal build pipelines.',
      'High-Availability Replication: Configured automated geo-replicated active-passive backups and disaster recovery runbooks.'
    ],
    technologies: ['GitHub Enterprise', 'GitHub Actions', 'SAML SSO', 'Entra ID', 'Bash', 'Docker']
  },
  {
    id: 'proj-4',
    title: 'Microsoft Cloud Infrastructure & IaC Automation',
    category: 'Cloud Infrastructure',
    period: 'Jan 2023 – Dec 2023',
    iconType: 'azure',
    shortDescription: 'Architected and automated end-to-end enterprise cloud infrastructure on Microsoft Azure using Terraform.\nProvisioned hub-and-spoke virtual networks, firewalls, and Virtual Machine Scale Sets with automated governance and cost controls.',
    description: 'Managed end-to-end cloud infrastructure configuration and automated deployment of Microsoft Azure resources. Provisioned virtual networks, firewalls, resource groups, storage accounts, and Virtual Machine Scale Sets (VMSS) utilizing declarative Terraform (IaC) templates for automated environment bootstrapping and standardized security policies.',
    keyServices: [
      'Declarative IaC Modules: Designed modular, reusable Terraform templates for rapid staging and production bootstrapping.',
      'Hub-and-Spoke VNet Peering: Configured secure network segmentation with centralized Azure Firewall and Bastion access.',
      'Virtual Machine Scale Sets: Deployed multi-region auto-scaling compute pools ensuring high availability during workload surges.',
      'Automated Governance & Cost Controls: Enforced Azure Policy guardrails, mandatory tagging, and predictive budget alerts.'
    ],
    technologies: ['Microsoft Azure', 'Terraform', 'Azure Resource Manager', 'PowerShell', 'Linux']
  },
  {
    id: 'proj-5',
    title: 'Enterprise Endpoint Management & Zero Trust Defender',
    category: 'Security & Endpoint',
    period: 'Mar 2023 – Nov 2023',
    iconType: 'intune',
    shortDescription: 'Deployed Enterprise Microsoft Intune and Microsoft Defender for Endpoint across 2,000+ corporate endpoints.\nEnforced strict Conditional Access compliance policies, automated patching, and established real-time threat containment.',
    description: 'Formulated robust security strategies and deployed Enterprise Microsoft Intune and Microsoft Defender for Endpoint across 2,000+ corporate endpoints. Enforced strict Conditional Access policies, automated patch management lifecycles, and established real-time automated threat detection workflows mitigating endpoint vulnerabilities.',
    keyServices: [
      'Unified Device Enrollment: Enrolled and managed 2,000+ Windows and macOS corporate endpoints via Microsoft Intune.',
      'Conditional Access Baselines: Enforced device health compliance gates, BitLocker encryption, and risk-based access policies.',
      'Automated Threat Containment: Configured Microsoft Defender for Endpoint for automated investigation and real-time device isolation.',
      'Patch Lifecycle Automation: Automated zero-day OS quality updates and third-party application patch distribution.'
    ],
    technologies: ['Microsoft Intune', 'Defender for Endpoint', 'Conditional Access', 'Entra ID', 'PowerShell']
  },
  {
    id: 'proj-6',
    title: 'Microsoft 365 Security & Information Governance',
    category: 'Security & Compliance',
    period: 'Jun 2023 – Feb 2024',
    iconType: 'purview',
    shortDescription: 'Designed secure configurations for Microsoft 365 enterprise apps, implementing Purview DLP and sensitivity labels.\nSafeguarded intellectual property and prevented sensitive customer financial data leaks across corporate communications.',
    description: 'Designed secure configurations for Microsoft 365 enterprise applications, implementing cloud App Protection Policies (MAM), Microsoft Information Protection (MIP) sensitivity labels, and unified messaging governance to safeguard critical intellectual property within regulated banking environments.',
    keyServices: [
      'Data Loss Prevention (DLP): Implemented strict DLP policies preventing confidential banking and PII data exfiltration.',
      'Information Protection Labels: Rolled out automated document classification and cryptographic encryption via Microsoft Purview.',
      'Mobile Application Management: Containerized enterprise Outlook, Teams, and OneDrive data on personal BYOD devices.',
      'Unified Audit Logging: Configured comprehensive audit retention, eDiscovery cases, and insider risk anomaly alerts.'
    ],
    technologies: ['Microsoft 365', 'Purview DLP', 'Information Protection', 'Exchange Online', 'Teams']
  },
  {
    id: 'proj-7',
    title: 'Utkorsho Digital Platform DevOps & Microservices',
    category: 'Platform & DevOps',
    period: 'Sep 2022 – May 2023',
    iconType: 'gitlab',
    shortDescription: 'Configured automated multi-stage delivery pipelines on GitLab CI, containerized microservices, and database tuning.\nOptimized SQL connection pooling and reverse proxies to withstand high concurrent traffic spikes during live educational events.',
    description: 'Successfully deployed and launched the Utkorsho digital platform. Configured automated delivery pipelines (CI/CD) on GitLab CI, set up Docker-based microservice clustering, and optimized SQL database indexes and connection pooling to withstand high concurrent traffic spikes during live promotional events.',
    keyServices: [
      'Multi-Stage CI/CD Automation: Built automated GitLab CI pipelines for automated linting, container builds, and deployment.',
      'Microservice Containerization: Packaged backend API services using Docker Compose with optimized Nginx reverse proxies.',
      'Database Performance Optimization: Tuned PostgreSQL connection pools and query indexing for heavy concurrent read traffic.',
      'SSL & Security Hardening: Configured automated Let\'s Encrypt certificate renewal and OWASP security response headers.'
    ],
    technologies: ['GitLab CI/CD', 'Docker', 'Nginx', 'PostgreSQL', 'Linux', 'Redis']
  },
  {
    id: 'proj-8',
    title: 'Prohori IoT GPS Telemetry Cloud Migration',
    category: 'Cloud Migration',
    period: 'Feb 2022 – Aug 2022',
    iconType: 'iot',
    shortDescription: 'Migrated vehicle IoT GPS platform from legacy on-premises servers to high-throughput cloud infrastructure.\nImplemented RabbitMQ messaging queues and MongoDB distributed clusters to process tens of thousands of telemetry streams.',
    description: 'Led the digital migration of the Prohori GPS Tracking Platform. Re-architected on-premises MongoDB clusters to scalable cloud-managed databases and introduced clustered RabbitMQ messaging layers to process thousands of simultaneous telemetry data packets coming from vehicle GPS devices in real-time.',
    keyServices: [
      'Clustered Message Broker: Deployed RabbitMQ message queues to ingest thousands of vehicle GPS data streams concurrently.',
      'Distributed Database Migration: Re-architected on-premises MongoDB into scalable, high-throughput cloud replica sets.',
      'Zero Data Loss Streaming: Engineered robust retry logic and memory buffer limits preventing telemetry packet drops.',
      'Infrastructure Observability: Built automated monitoring for broker queue depths, consumer lag, and database replica health.'
    ],
    technologies: ['AWS Cloud', 'RabbitMQ', 'MongoDB', 'Docker', 'Linux Administration']
  },
  {
    id: 'proj-9',
    title: 'TechShopBD eCommerce High-Availability Migration',
    category: 'Cloud Migration',
    period: 'Jul 2021 – Jan 2022',
    iconType: 'techshop',
    shortDescription: 'Migrated TechShopBD eCommerce architecture from legacy physical servers to high-performance Cloud VMs.\nSlashed page load times below 1 second with Redis caching and Cloudflare CDN while sustaining 5x holiday sales volume.',
    description: 'Migrated TechShopBD eCommerce architecture from legacy local servers to highly responsive Cloud VMs. Set up global Cloudflare CDN caching rules, integrated automated SSL certifications, and established Redis-based caching layers to accelerate page response times under 1 second during major retail sales campaigns.',
    keyServices: [
      'Sub-Second Page Acceleration: Deployed Redis in-memory caching and query optimization cutting page load times under 1 second.',
      'Edge CDN & DDoS Defense: Configured Cloudflare CDN caching rules and Web Application Firewall (WAF) mitigations.',
      'Seamless Production Cutover: Transferred production databases and assets with zero customer transaction interruptions.',
      'Auto-Healing VM Pools: Provisioned resilient virtual machine scale sets handling 5x holiday sales volume surges.'
    ],
    technologies: ['Cloud Infrastructure', 'Cloudflare CDN', 'Redis', 'Nginx', 'MySQL', 'Linux']
  },
  {
    id: 'proj-10',
    title: 'Rokomari Cloud Migration & Auto-Scaling Architecture',
    category: 'Cloud Migration',
    period: 'Jan 2021 – Jun 2021',
    iconType: 'rokomari',
    shortDescription: 'Spearheaded cloud migration and architectural optimization for Rokomari.com to handle 10x traffic surges.\nEliminated API gateway bottlenecks, offloaded static media to cloud storage, and configured auto-scaling node pools.',
    description: 'Facilitated structural cloud migration and system optimization for Rokomari.com. Resolved severe bottleneck failures in API gateways, modernized static asset distribution using Cloud object storage, and configured auto-scaling node pools to effortlessly handle massive annual book fair traffic bursts.',
    keyServices: [
      'Elastic Auto-Scaling: Configured dynamic compute pools effortlessly absorbing 10x promotional traffic surges during book fairs.',
      'Static Asset Offloading: Transitioned static image and PDF media distribution to cloud object storage and edge CDN caching.',
      'API Gateway Bottleneck Resolution: Engineered connection pooling, reverse proxy caching, and rate limiting for core APIs.',
      'High-Availability Database Cluster: Deployed primary-replica database architecture with automated failover and backup.'
    ],
    technologies: ['Cloud Infrastructure', 'Auto Scaling', 'Nginx', 'Object Storage', 'Linux']
  },
  {
    id: 'proj-11',
    title: 'Azure Enterprise IaaS & Hub-Spoke VNet Deployment',
    category: 'Cloud Infrastructure',
    period: 'Aug 2020 – Dec 2020',
    iconType: 'vnet',
    shortDescription: 'Designed and deployed enterprise-grade Azure IaaS networks featuring hub-and-spoke VNet peering and Azure Firewall.\nStandardized automated Azure Backup policies, geo-redundant storage, and custom metrics verifying 99.99% system uptime.',
    description: 'Designed and implemented high-security virtual networks, peerings, and network security groups (NSGs) in Azure. Standardized hub-and-spoke VNet topologies, automated Azure Backup policies, cloud storage accounts, and custom monitoring metrics to assure 99.99% system uptime.',
    keyServices: [
      'Hub-and-Spoke Topology: Architected secure virtual network peering with centralized Azure Firewall and Bastion access.',
      'Automated Disaster Recovery: Configured Azure Backup schedules and Site Recovery replication ensuring rapid RTO.',
      'Granular Security Controls: Enforced least-privilege Network Security Groups (NSGs) and routing tables across private subnets.',
      'SLA Uptime Assurance: Implemented Azure Monitor metrics and log analytics verifying continuous 99.99% platform availability.'
    ],
    technologies: ['Microsoft Azure', 'Azure Virtual Network', 'VPN Gateway', 'Azure Backup', 'PowerShell']
  },
  {
    id: 'proj-12',
    title: 'Azure PaaS Web App & Azure SQL Database Modernization',
    category: 'DevOps & PaaS',
    period: 'Mar 2020 – Jul 2020',
    iconType: 'paas',
    shortDescription: 'Modernized multi-tier business web solutions transitioning from legacy VMs to Azure App Service and Azure SQL PaaS.\nIntegrated automated CI/CD deployment slots for risk-free blue/green staging swaps and Key Vault secret management.',
    description: 'Deployed and maintained multi-tier business web solutions using Azure App Service and Azure SQL PaaS databases. Integrated automatic CI/CD deployment slots to secure risk-free blue/green staging deployments, live production hot-fixes, and Key Vault secret segregation.',
    keyServices: [
      'Blue/Green Deployment Slots: Configured Azure App Service staging slots for instantaneous zero-downtime release swaps.',
      'Elastic Azure SQL PaaS: Migrated legacy databases to managed Azure SQL with automated indexing and automated scaling.',
      'Centralized Secret Governance: Integrated Azure Key Vault for hardware-backed secret storage and certificate rotation.',
      'Application Insights APM: Established end-to-end distributed tracing, dependency tracking, and proactive performance alerts.'
    ],
    technologies: ['Azure App Service', 'Azure SQL', 'Azure Key Vault', 'Application Insights', 'CI/CD']
  },
  {
    id: 'proj-13',
    title: 'Multi-Cloud Disaster Recovery & Business Continuity (Azure & AWS)',
    category: 'Disaster Recovery',
    period: 'Oct 2023 – Mar 2024',
    iconType: 'multicloud',
    shortDescription: 'Engineered an active-passive disaster recovery framework spanning Microsoft Azure and Amazon Web Services.\nAchieved automated database replication with RPO < 15m and RTO < 1h failover validated through live drill tests.',
    description: 'Engineered a resilient multi-cloud business continuity and disaster recovery framework spanning Microsoft Azure and Amazon Web Services (AWS). Configured automated asynchronous database replication, cross-cloud DNS failover using Route 53 and Azure Traffic Manager, and orchestrated recovery drills achieving an RPO under 15 minutes and RTO under 1 hour for financial-tier operations.',
    keyServices: [
      'Automated Cross-Cloud Failover: Configured dynamic DNS failover using AWS Route 53 and Azure Traffic Manager routing policies.',
      'Continuous Block Replication: Built asynchronous data replication pipelines verifying RPO < 15 minutes and RTO < 1 hour.',
      'Active-Passive Cloud Synchronization: Automated state sync and health probe checks between Azure and AWS environments.',
      'ITIL & ISO Runbook Standards: Authored comprehensive technical recovery procedures and conducted periodic failover drills.'
    ],
    technologies: ['Microsoft Azure', 'AWS', 'Azure Site Recovery', 'Route 53', 'Traffic Manager', 'Terraform']
  },
  {
    id: 'proj-14',
    title: 'Zero Trust Identity & Conditional Access Governance',
    category: 'Identity & Access',
    period: 'Nov 2023 – Apr 2024',
    iconType: 'zerotrust',
    shortDescription: 'Implemented corporate Zero Trust identity transformation utilizing Microsoft Entra ID P2 and Privileged Identity Management.\nConfigured risk-based Conditional Access, passwordless FIDO2 security keys, and automated access governance cycles.',
    description: 'Spearheaded corporate Zero Trust identity transformation utilizing Microsoft Entra ID P2. Configured risk-based Conditional Access policies, Privileged Identity Management (PIM) for just-in-time administrative role activation, phishing-resistant FIDO2 authentication, and automated user access review cycles to fulfill regulatory audit standards.',
    keyServices: [
      'Just-in-Time Role Elevation: Deployed Entra PIM for time-bound administrative access requiring approvals and ticket justifications.',
      'Risk-Based Conditional Access: Enforced real-time sign-in risk gates and compliant device verification for corporate access.',
      'Phishing-Resistant MFA: Rolled out passwordless FIDO2 security keys and Microsoft Authenticator number matching.',
      'Access Governance Automation: Scheduled automated quarterly access reviews for privileged groups and enterprise applications.'
    ],
    technologies: ['Microsoft Entra ID', 'PIM', 'Zero Trust', 'Conditional Access', 'PowerShell', 'Audit Logs']
  },
  {
    id: 'proj-15',
    title: 'GitOps Infrastructure as Code Pipeline with Terraform',
    category: 'IaC & Automation',
    period: 'Jan 2024 – Jun 2024',
    iconType: 'gitops',
    shortDescription: 'Built GitOps-driven cloud delivery lifecycle pairing Terraform Infrastructure as Code with GitHub Actions automation.\nEnforced static code security scanning with Checkov, cost impact forecasting, and automated approval promotion gates.',
    description: 'Architected a GitOps-driven cloud delivery lifecycle pairing Terraform Infrastructure as Code with GitHub Actions automation. Implemented automated linting, security policy validation with Checkov, cost projection analysis via Infracost on pull requests, and multi-environment approval gates ensuring immutable, reproducible infrastructure deployment across staging and production.',
    keyServices: [
      'Pull-Request GitOps Workflow: Automated Terraform speculative plans and cost forecasting via Infracost on pull requests.',
      'Automated Compliance & Security: Integrated Checkov and tfsec static code analysis to prevent cloud misconfigurations before merge.',
      'Multi-Stage Approval Gates: Configured automated staging tests and required human approval promotion for production applies.',
      'Cloud Drift Detection: Scheduled daily cloud state drift detection jobs with automated notification alerts to engineering channels.'
    ],
    technologies: ['Terraform', 'GitHub Actions', 'Checkov', 'Infracost', 'Azure', 'AWS']
  },
  {
    id: 'proj-16',
    title: 'Enterprise Centralized Observability & SIEM Logging',
    category: 'Monitoring & Security',
    period: 'May 2024 – Present',
    iconType: 'observability',
    shortDescription: 'Deployed full-stack observability with Prometheus, Grafana, and Elastic (ELK) Stack across cluster workloads.\nUnified server performance metrics, container logs, and firewall audit trails, reducing incident MTTD by 60%.',
    description: 'Architected and deployed an enterprise-wide centralized logging and observability platform incorporating Prometheus, Grafana, and the Elastic (ELK) Stack. Unified server performance metrics, container logs, and firewall audit trails into real-time operational dashboards with intelligent alerting via email and chat, reducing incident Mean Time to Detection (MTTD) by 60%.',
    keyServices: [
      'Single-Pane Operational Dashboards: Constructed unified Grafana dashboards monitoring node compute, memory, and ingress traffic.',
      '60% Faster Incident Detection: Cut Mean Time to Detection (MTTD) by 60% through dynamic threshold alert rules and webhooks.',
      'Centralized Log Parsing & Indexing: Ingested and structured multi-source server, application, and firewall logs using Logstash.',
      'Intelligent Alert Routing: Configured Prometheus Alertmanager for deduplicated notification dispatch to administrative channels.'
    ],
    technologies: ['Prometheus', 'Grafana', 'Elasticsearch', 'Logstash', 'Kibana', 'Alertmanager']
  }
];

const CERTIFICATIONS: CertificationItem[] = [
  { 
    name: 'Certified Kubernetes Administrator', 
    issuer: 'CNCF', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/1-CKA.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/cka/150/150'; }} alt="CKA badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/CKA.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/cka-full/800/600',
    logo: 'https://picsum.photos/seed/cka/150/150'
  },
  { 
    name: 'Red Hat Certified Engineer', 
    issuer: 'Red Hat', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/2-RHCE.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/rhce/150/150'; }} alt="RHCE badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/RHCE.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/rhce-full/800/600',
    logo: 'https://picsum.photos/seed/rhce/150/150'
  },
  { 
    name: 'Azure Solutions Architect Expert', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/3-AZ305.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/az305/150/150'; }} alt="AZ-305 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/AZ305.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/az305-full/800/600',
    logo: 'https://picsum.photos/seed/az305/150/150'
  },
  { 
    name: 'DevOps Engineer Expert', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/4-AZ400.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/az400/150/150'; }} alt="AZ-400 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/AZ400.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/az400-full/800/600',
    logo: 'https://picsum.photos/seed/az400/150/150'
  },
  { 
    name: 'Cybersecurity Architect Expert', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/5-SC100.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/sc100/150/150'; }} alt="SC-100 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/SC100.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/sc100-full/800/600',
    logo: 'https://picsum.photos/seed/sc100/150/150'
  },
  { 
    name: 'Power Platform Solutions Architect Expert', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/6-PL600.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/pl600/150/150'; }} alt="PL-600 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/PL600.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/pl600-full/800/600',
    logo: 'https://picsum.photos/seed/pl600/150/150'
  },
  { 
    name: 'Red Hat Certified System Administrator', 
    issuer: 'Red Hat', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/7-RHCSA.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/rhcsa/150/150'; }} alt="RHCSA badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/RHCSA.webp'),
    isPotrait: true,
    photo: 'https://picsum.photos/seed/rhcsa-full/600/800',
    logo: 'https://picsum.photos/seed/rhcsa/150/150'
  },
  { 
    name: 'Windows Server Hybrid Administrator Associate', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/8-AZ800.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/az800/150/150'; }} alt="AZ-800 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/AZ800.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/az800-full/800/600',
    logo: 'https://picsum.photos/seed/az800/150/150'
  },
  { 
    name: 'Azure Administrator Associate', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/9-AZ104.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/az104/150/150'; }} alt="AZ-104 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/AZ104.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/az104-full/800/600',
    logo: 'https://picsum.photos/seed/az104/150/150'
  },
  { 
    name: 'Security Operations Analyst Associate', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/10-SC200.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/sc200/150/150'; }} alt="SC-200 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/SC200.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/sc200-full/800/600',
    logo: 'https://picsum.photos/seed/sc200/150/150'
  },
  { 
    name: 'Teams Administrator Associate', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/11-MS700.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/ms700/150/150'; }} alt="MS-700 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/MS700.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/ms700-full/800/600',
    logo: 'https://picsum.photos/seed/ms700/150/150'
  },
  { 
    name: 'Power Platform Developer Associate', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/12-PL400.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/pl400/150/150'; }} alt="PL-400 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/PL400.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/pl400-full/800/600',
    logo: 'https://picsum.photos/seed/pl400/150/150'
  },
  { 
    name: 'MTCNA', 
    issuer: 'MikroTik', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/13-MTCNA.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/mtcna/150/150'; }} alt="MTCNA badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/MTCNA.webp'),
    isPotrait: true,
    photo: 'https://picsum.photos/seed/mtcna-full/600/800',
    logo: 'https://picsum.photos/seed/mtcna/150/150'
  },
  { 
    name: 'Azure Fundamentals', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/14-AZ900.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/az900/150/150'; }} alt="AZ-900 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/AZ900.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/az900-full/800/600',
    logo: 'https://picsum.photos/seed/az900/150/150'
  },
  { 
    name: 'Azure AI Fundamentals', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/15-AI900.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/ai900/150/150'; }} alt="AI-900 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/AI900.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/ai900-full/800/600',
    logo: 'https://picsum.photos/seed/ai900/150/150'
  },
  { 
    name: 'Security, Compliance, and Identity Fundamentals', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/16-SC900.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/sc900/150/150'; }} alt="SC-900 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/SC900.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/sc900-full/800/600',
    logo: 'https://picsum.photos/seed/sc900/150/150'
  },
  { 
    name: 'Azure Data Fundamentals', 
    issuer: 'Microsoft', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/17-DP900.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/dp900/150/150'; }} alt="DP-900 badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/DP900.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/dp900-full/800/600',
    logo: 'https://picsum.photos/seed/dp900/150/150'
  },
  { 
    name: 'Google IT Support Certificate', 
    issuer: 'Google', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/18-GIT.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/git/150/150'; }} alt="Google IT badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/GIT.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/git-full/800/600',
    logo: 'https://picsum.photos/seed/git/150/150'
  },
  { 
    name: 'Google Cybersecurity Certificate', 
    issuer: 'Google', 
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={assetPath('badges/19-GCS.webp')} onError={(e: any) => { e.currentTarget.src = 'https://picsum.photos/seed/gcs/150/150'; }} alt="Google Cyber badge" className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: assetPath('badges/GCS.webp'),
    isPotrait: false,
    photo: 'https://picsum.photos/seed/gcs-full/800/600',
    logo: 'https://picsum.photos/seed/gcs/150/150'
  },
  ...Array.from({ length: 23 }).map((_, i) => ({
    name: `Professional Certification ${i + 20}`,
    issuer: i % 2 === 0 ? 'Microsoft' : 'Red Hat',
    badge: (
      <div className="w-[200px] h-[200px] rounded-lg flex items-center justify-center">
        <img src={`https://picsum.photos/seed/cert-${i + 20}/150/150`} alt={`Cert ${i + 20} badge`} className="w-full h-full object-cover" />
      </div>
    ),
    certificateImage: `https://picsum.photos/seed/cert-photo-${i + 20}/800/600`,
    isPotrait: false,
    photo: `https://picsum.photos/seed/cert-photo-${i + 20}/800/600`,
    logo: `https://picsum.photos/seed/cert-${i + 20}/150/150`
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
    <h2 className={cn("text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 relative pb-6 inline-block transition-colors", className)}>
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

const CircularProgress = ({ 
  level, 
  name, 
  color 
}: { 
  level: number; 
  name: string; 
  color?: string; 
}) => {
  const { ref, inView } = useInView({ triggerOnce: false, threshold: 0.1 });
  const radius = 50;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (level / 100) * circumference;

  // Exact color matching reference photo
  const ringColor = color || (
    level >= 95 ? '#046A38' : // Deep forest green (100% Bengali)
    level >= 80 ? '#00A859' : // Vivid emerald green (85% English)
    level >= 45 ? '#FF671F' : // Saffron orange (50% Hindi)
    '#FFC700'                 // Warm gold/yellow (30% Germany)
  );

  return (
    <div ref={ref} className="flex flex-col items-center group transition-transform duration-300 hover:scale-105 select-none">
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          {/* Background circle track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated colored progress ring with rounded caps */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        {/* Percentage in center with scale entrance animation */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.6 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span 
            className="font-black text-xl sm:text-2xl tracking-tight"
            style={{ color: ringColor }}
          >
            {level}%
          </span>
        </motion.div>
      </div>
      {/* Language label below */}
      <span className="font-extrabold text-slate-800 uppercase tracking-widest text-xs md:text-sm mt-3">
        {name}
      </span>
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
                <div 
                  className="bg-transparent p-1 flex items-center justify-center shrink-0 transition-all"
                  style={{
                    width: item.logoWidth || '85px',
                    height: item.logoHeight || '85px',
                    maxWidth: '150px'
                  }}
                >
                  <img 
                    src={item.logo} 
                    alt={item.company} 
                    style={{
                      width: item.imgWidth || '100%',
                      height: item.imgHeight || '100%',
                      objectFit: (item.logoFit as any) || 'contain'
                    }}
                    className="max-w-full max-h-full transition-transform duration-300 group-hover:scale-105"
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
            <div 
              className="bg-transparent p-1 flex items-center justify-center shrink-0 transition-all"
              style={{
                width: item.logoWidth || '85px',
                height: item.logoHeight || '85px',
                maxWidth: '180px'
              }}
            >
              <img 
                src={item.logo} 
                alt={item.institution} 
                style={{
                  width: item.imgWidth || '100%',
                  height: item.imgHeight || '100%',
                  objectFit: (item.logoFit as any) || 'contain'
                }}
                className="max-w-full max-h-full transition-transform duration-300 group-hover:scale-105"
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

interface CertificateModalProps {
  cert: CertificationItem;
  onClose: () => void;
}

const CertificateModal: React.FC<CertificateModalProps> = ({ cert, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(7);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // 7 seconds countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const autoCloseTimeout = setTimeout(() => {
      onClose();
    }, 7000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      clearTimeout(autoCloseTimeout);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cert, onClose]);

  // Mobile mode: ALL certificate photos show in portrait orientation per user request
  // Desktop/tablet: respects isPotrait / isPortrait / landscape flag
  const isPortrait = isMobile ? true : Boolean(cert.isPotrait ?? cert.isPortrait ?? !cert.landscape);

  // Sizing:
  // PC / Tablet:
  // If portrait: w: 600px, h: 800px (or cert.modalWidth / cert.modalHeight)
  // If landscape / not portrait: w: 800px, h: 600px
  // Mobile mode: responsive full portrait frame without extra free space
  const modalWidth = isMobile
    ? '92vw'
    : (cert.modalWidth || (isPortrait ? '600px' : '800px'));

  const modalHeight = isMobile
    ? '82vh'
    : (cert.modalHeight || (isPortrait ? '800px' : '600px'));

  const imageSrc = cert.certificateImage
    ? assetPath(cert.certificateImage)
    : (cert.photo || '');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border-2 sm:border-4 border-slate-200/90 flex flex-col items-center justify-center"
        style={{
          width: modalWidth,
          height: modalHeight,
          maxWidth: '94vw',
          maxHeight: '88vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek 7-Second Animated Progress Bar at top edge */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 z-40 overflow-hidden">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 7, ease: "linear" }}
            className="h-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600"
          />
        </div>

        {/* Smart Top-Left Auto-close Pill */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 px-3 py-1 rounded-full bg-[#02152b]/90 backdrop-blur-md text-white text-[11px] sm:text-xs font-bold tracking-wider border border-white/20 shadow-lg flex items-center gap-1.5 select-none pointer-events-none">
          <Clock size={13} className="text-sky-400 animate-pulse" />
          <span>Auto close: {timeLeft}s</span>
        </div>

        {/* Top-Right Corner Exit Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-2 sm:p-2.5 rounded-full bg-[#02152b] hover:bg-slate-900 text-white shadow-xl border border-white/20 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center group"
          aria-label="Exit certificate preview"
          title="Exit (or auto-closes in 7s)"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-200" />
        </button>

        {/* Certificate Photo without extra free space - smart fit */}
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white p-1 sm:p-2">
          <img
            src={imageSrc}
            alt={cert.name}
            onError={(e: any) => {
              if (cert.photo && e.currentTarget.src !== cert.photo) {
                e.currentTarget.src = cert.photo;
              }
            }}
            className="w-full h-full rounded-xl transition-all duration-300 shadow-sm object-contain"
            style={{
              maxHeight: '100%',
              maxWidth: '100%',
            }}
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  useEffect(() => {
    // Pure Light Mode only: remove any leftover dark class and theme storage
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('theme');
    }
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [selectedCert, setSelectedCert] = useState<typeof CERTIFICATIONS[0] | null>(null);
  const [activeProjIdx, setActiveProjIdx] = useState<number | null>(null);
  const [expandedProjIdx, setExpandedProjIdx] = useState<number | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const hoveredProjIdxRef = useRef<number | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cancelAutoClose = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  };

  const startAutoClose = (idx: number, seconds: number) => {
    cancelAutoClose();
    autoCloseTimerRef.current = setTimeout(() => {
      // If cursor is still inside this project's card/title, do not minimize
      if (hoveredProjIdxRef.current === idx) {
        return;
      }
      setActiveProjIdx((curr) => (curr === idx ? null : curr));
      setExpandedProjIdx((curr) => (curr === idx ? null : curr));
    }, seconds * 1000);
  };

  useEffect(() => {
    return () => {
      cancelAutoClose();
    };
  }, []);
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const profSnap = await getDocs(collection(db, 'profile'));
        if (isMounted && !profSnap.empty) setProfileData(profSnap.docs[0].data());

        const [certSnap, skillSnap, langSnap, expSnap, projSnap] = await Promise.all([
          getDocs(collection(db, 'certifications')),
          getDocs(collection(db, 'skills')),
          getDocs(collection(db, 'languages')),
          getDocs(collection(db, 'experience')),
          getDocs(collection(db, 'projects'))
        ]);

        if (isMounted) {
          if (!certSnap.empty) {
            setDbCertifications(certSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).sort((a, b) => (a.order || 0) - (b.order || 0)));
          }
          if (!skillSnap.empty) setDbSkills(skillSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          if (!langSnap.empty) setDbLanguages(langSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          if (!expSnap.empty) setDbExperience(expSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          if (!projSnap.empty && projSnap.docs.length >= 16) {
            setDbProjects(projSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
          }
        }
      } catch (error) {
        console.error("Background sync check:", error);
      }
    };
    fetchData();
    return () => { isMounted = false; };
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
    
    // Calculate sequential ticket number starting at 260001
    let calculatedTicketRef = '260001';
    if (auth.currentUser) {
      try {
        const snapshot = await getDocs(collection(db, path));
        calculatedTicketRef = (260001 + snapshot.size).toString();
      } catch {
        const baseSeq = 260001 + (Math.floor(Date.now() / 1000) % 700000);
        calculatedTicketRef = baseSeq.toString();
      }
    } else {
      // Monotonic sequence in 260001+ range without querying private collections
      const baseSeq = 260001 + (Math.floor(Date.now() / 1000) % 700000);
      calculatedTicketRef = baseSeq.toString();
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
      <div className="min-h-screen font-sans selection:bg-sky-500/20 selection:text-sky-900 flex flex-col bg-white text-slate-900">
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
              {NAV_BRAND_LOGO.useImageLogo ? (
                <img 
                  src={NAV_BRAND_LOGO.src} 
                  alt="Logo" 
                  style={{
                    width: NAV_BRAND_LOGO.width,
                    height: NAV_BRAND_LOGO.height,
                    objectFit: NAV_BRAND_LOGO.objectFit
                  }}
                  className="shrink-0"
                />
              ) : (
                <span 
                  style={{ width: NAV_BRAND_LOGO.initialsWidth, height: NAV_BRAND_LOGO.initialsHeight }}
                  className="rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0"
                >
                  AM
                </span>
              )}
              <span className="tracking-wide uppercase font-bold text-sm md:text-base">
                Abdullah Mahi
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-7 h-full">
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

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-2 lg:hidden">
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
              <div 
                className="overflow-hidden shadow-2xl relative transition-all"
                style={{
                  width: HERO_PROFILE_PHOTO.width,
                  height: HERO_PROFILE_PHOTO.height,
                  maxWidth: HERO_PROFILE_PHOTO.maxWidth,
                  borderRadius: HERO_PROFILE_PHOTO.borderRadius
                }}
              >
                <img 
                  src={HERO_PROFILE_PHOTO.src} 
                  alt="Abdullah Al Mamun" 
                  loading="eager"
                  decoding="async"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: HERO_PROFILE_PHOTO.objectFit
                  }}
                  className="transition-transform duration-700 group-hover:scale-105"
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
              className="flex flex-wrap items-center gap-4 pt-4"
            >
              <Link 
                to="contact" 
                smooth={true} 
                className="bg-sky-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-sky-700 transition-all shadow-md shadow-sky-600/20 cursor-pointer"
              >
                Hire Me Now
              </Link>
              <Link 
                to="resume" 
                smooth={true} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-4 rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-200 cursor-pointer"
              >
                <Download size={18} className="text-sky-600" /> View CV / Resume
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-50/70 pt-10 pb-12 md:pb-16 px-4 sm:px-6 md:px-8 lg:px-12 border-y border-slate-100">
        <div className="w-full max-w-[1720px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {STATS.map((stat, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="text-center space-y-2"
            >
              <p className="text-5xl font-black text-sky-600">
                <Counter value={stat.value} />
              </p>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
            </motion.div>
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
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false }}
                transition={{ duration: 0.4, delay: (idx % 6) * 0.05 }}
                whileHover={{ scale: 1.08, y: -4 }}
                onClick={() => setSelectedCert(cert)}
                className="bg-transparent p-2 flex flex-col items-center justify-center cursor-pointer group transition-all"
                title={cert.name}
              >
                {React.isValidElement(cert.badge) ? (
                  <div className="relative flex items-center justify-center w-full max-w-full [&>div]:max-w-full [&>div]:h-auto [&>div]:aspect-square">
                    {cert.badge}
                    <div className="absolute inset-0 bg-sky-600/0 group-hover:bg-sky-500/10 transition-all flex items-center justify-center rounded-2xl pointer-events-none">
                      <Award className="text-sky-600 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" size={32} />
                    </div>
                  </div>
                ) : (
                  <div 
                    className="relative overflow-hidden rounded-2xl w-full aspect-square flex items-center justify-center p-3 transition-all"
                  >
                    <img 
                      src={cert.badge ? assetPath(cert.badge as string) : (cert.logo || '')} 
                      alt={cert.name} 
                      onError={(e: any) => {
                        if (cert.logo && e.currentTarget.src !== cert.logo) {
                          e.currentTarget.src = cert.logo;
                        }
                      }}
                      className="w-full h-full object-contain transition-all duration-500 group-hover:scale-110 bg-transparent"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-sky-600/0 group-hover:bg-sky-500/10 transition-all flex items-center justify-center rounded-2xl pointer-events-none">
                      <Award className="text-sky-600 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" size={32} />
                    </div>
                  </div>
                )}
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
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-14 text-center uppercase tracking-widest">Language Skills</h3>
              <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 lg:gap-24">
                {displayLanguages.map((lang, idx) => (
                  <CircularProgress 
                    key={idx} 
                    name={lang.name} 
                    level={lang.level} 
                    color={(lang as any).color} 
                  />
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
              const isExpanded = expandedProjIdx === idx;
              const isPreview = !isExpanded && activeProjIdx === idx;
              const isDefault = !isExpanded && !isPreview;

              return (
                <motion.div
                  key={project.id || idx}
                  layout
                  transition={{ layout: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
                  onMouseEnter={() => {
                    hoveredProjIdxRef.current = idx;
                    // If this card is open (Mode 2 summary or Mode 3 full details), keep showing (cancel close timer)
                    if (activeProjIdx === idx || expandedProjIdx === idx) {
                      cancelAutoClose();
                    } else {
                      // Cursor moved to another project title!
                      // Start closing the other open card: 3s if it's in summary, 5s if in full details
                      if (activeProjIdx !== null && activeProjIdx !== idx) {
                        startAutoClose(activeProjIdx, 3);
                      } else if (expandedProjIdx !== null && expandedProjIdx !== idx) {
                        startAutoClose(expandedProjIdx, 5);
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (hoveredProjIdxRef.current === idx) {
                      hoveredProjIdxRef.current = null;
                    }
                    // Cursor exit without cursor:
                    // 1st click summary mode: wait 3 seconds and then close
                    if (activeProjIdx === idx) {
                      startAutoClose(idx, 3);
                    }
                    // 'See more' full details mode: wait 5 seconds and then close
                    else if (expandedProjIdx === idx) {
                      startAutoClose(idx, 5);
                    }
                  }}
                  onClick={() => {
                    cancelAutoClose();
                    if (!isExpanded) {
                      if (activeProjIdx === idx) {
                        // Clicking open summary toggles it closed
                        setActiveProjIdx(null);
                        setExpandedProjIdx(null);
                      } else {
                        // 1st click: show the summary
                        setExpandedProjIdx(null);
                        setActiveProjIdx(idx);
                        // If cursor is not over this card, wait 3s without cursor and close
                        if (hoveredProjIdxRef.current !== idx) {
                          startAutoClose(idx, 3);
                        }
                      }
                    }
                  }}
                  className={cn(
                    "group transition-all duration-300 overflow-hidden",
                    isExpanded 
                      ? "bg-white p-6 md:p-10 rounded-2xl md:rounded-[2rem] shadow-[0_12px_40px_rgba(0,0,0,0.07)] border border-slate-200" 
                      : isPreview 
                      ? "bg-white p-6 md:p-8 rounded-2xl md:rounded-[2rem] shadow-md border border-slate-200/80 cursor-pointer" 
                      : "bg-white py-5 px-6 md:px-8 rounded-2xl border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all duration-300 cursor-pointer"
                  )}
                >
                  {/* Header Row: Title & Right-Aligned Controls / Logos */}
                  <div className="flex justify-between items-center gap-4">
                    {/* Project Title (No serial numbers - starts directly with title) */}
                    <div className="flex-1 text-left">
                      <h3 className={cn(
                        "tracking-tight transition-colors text-left",
                        isExpanded 
                          ? "text-slate-950 font-black text-lg md:text-xl lg:text-2xl" 
                          : isPreview 
                          ? "text-slate-900 font-bold text-base md:text-lg lg:text-xl" 
                          : "text-slate-800 font-bold text-base md:text-lg lg:text-xl group-hover:text-sky-600"
                      )}>
                        {project.title}
                      </h3>
                    </div>

                    {/* Right side: Category tag & Logos in 1st (80px) or 2nd (130px) size */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <span className={cn(
                        "text-[9px] md:text-[10px] uppercase font-black px-2.5 sm:px-3 py-1 rounded-full tracking-wider transition-colors font-mono hidden xs:inline-block",
                        isExpanded 
                          ? "bg-sky-600 text-white" 
                          : isPreview 
                          ? "bg-sky-100 text-sky-700" 
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/70"
                      )}>
                        {project.category}
                      </span>

                      {/* 1st Logo Size (80px): Normal collapsed state */}
                      {isDefault && (
                        <ProjectLogo 
                          iconType={project.iconType} 
                          title={project.title} 
                          size="sm" 
                          customLogo={project.logo} 
                        />
                      )}

                      {/* 2nd Logo Size (130px): Short details preview state */}
                      {isPreview && (
                        <ProjectLogo 
                          iconType={project.iconType} 
                          title={project.title} 
                          size="md" 
                          customLogo={project.logo} 
                        />
                      )}
                    </div>
                  </div>

                  {/* Mode 2: Short Details Preview with 2-line summary & Yellow "See More" Button on LEFT SIDE */}
                  <AnimatePresence initial={false}>
                    {isPreview && (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, height: 0, y: 6 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -4 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="overflow-hidden pt-4 mt-3 border-t border-slate-200/60"
                      >
                        <div className="space-y-4 text-left">
                          <p className="text-slate-600 text-sm md:text-base leading-relaxed text-left font-medium whitespace-pre-line">
                            {project.shortDescription || (project.description && project.description.slice(0, 160) + '...')}
                          </p>

                          {/* Yellow "See More" button on the LEFT side */}
                          <div className="flex items-center justify-start pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelAutoClose();
                                setActiveProjIdx(null);
                                setExpandedProjIdx(idx);
                                // If cursor is not inside this card, wait 5 seconds without cursor and minimize
                                if (hoveredProjIdxRef.current !== idx) {
                                  startAutoClose(idx, 5);
                                }
                              }}
                              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-full text-xs transition-all duration-200 shadow-md shadow-amber-400/25 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer select-none"
                            >
                              See More <ChevronRight size={14} className="stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Mode 3: Full Expanded Details Inline (2nd photo style with 200px Right-Side Logo) */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0, y: 10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden pt-6 mt-6 border-t border-slate-200/80"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                          {/* Left contents: Timeline, Full Description, Key Services Deployed, Technologies, and Minimize Button */}
                          <div className="lg:col-span-8 space-y-5 text-left">
                            {/* Project Timeline & Category */}
                            <div className="flex flex-wrap items-center gap-2">
                              {project.period && (
                                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200/60 font-mono">
                                  {project.period}
                                </span>
                              )}
                              <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full tracking-wider bg-slate-100 text-slate-700 font-mono">
                                {project.category}
                              </span>
                            </div>

                            {/* Full Description */}
                            <p className="text-slate-700 text-sm md:text-base leading-relaxed text-justify font-medium">
                              {project.description}
                            </p>

                            {/* Key Services Deployed (Photo 2 format) */}
                            {((project.keyServices && project.keyServices.length > 0) || (project.deliverables && project.deliverables.length > 0)) && (
                              <div className="space-y-3 pt-2">
                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
                                  <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                                  Key Services Deployed:
                                </h4>
                                <div className="space-y-2.5 pl-1">
                                  {(project.keyServices || project.deliverables).map((item: string, sIdx: number) => {
                                    const colonIdx = item.indexOf(':');
                                    const hasTitle = colonIdx !== -1;
                                    const itemTitle = hasTitle ? item.slice(0, colonIdx) : '';
                                    const itemDesc = hasTitle ? item.slice(colonIdx + 1) : item;
                                    return (
                                      <div key={sIdx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
                                        <span className="text-sky-600 font-black shrink-0 mt-0.5">•</span>
                                        <div>
                                          {hasTitle && <strong className="text-slate-900 font-bold">{itemTitle}: </strong>}
                                          <span>{itemDesc}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Tech Stack Chips */}
                            {project.technologies && project.technologies.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                <span className="text-[11px] font-black uppercase text-slate-500 mr-1 flex items-center gap-1">
                                  <Layers size={13} className="text-slate-500" /> Technologies:
                                </span>
                                {project.technologies.map((tech: string, tIdx: number) => (
                                  <span key={tIdx} className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Minimize Control */}
                            <div className="pt-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelAutoClose();
                                  setExpandedProjIdx(null);
                                  setActiveProjIdx(null);
                                }}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-black px-5 py-2.5 rounded-full text-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 select-none border border-slate-300/40"
                              >
                                <ChevronUp size={14} className="stroke-[2.5]" /> Minimize
                              </button>
                            </div>
                          </div>

                          {/* Right contents: 3rd Logo Size (200px) */}
                          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/60 self-center">
                            <ProjectLogo 
                              iconType={project.iconType} 
                              title={project.title} 
                              size="lg" 
                              customLogo={project.logo} 
                            />
                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest mt-3 text-center">
                              {project.category}
                            </p>
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
                          <Code2 size={48} className="text-slate-900" />
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
          <CertificateModal
            cert={selectedCert}
            onClose={() => setSelectedCert(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Chat Button */}
      <div className="fixed bottom-8 right-8 z-[9999]">
        <motion.a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl transition-all flex items-center justify-center group relative cursor-pointer"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle size={32} />
          <span className="absolute right-full mr-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat on WhatsApp
          </span>
        </motion.a>
      </div>
    </div>
    </ErrorBoundary>
  );
}
