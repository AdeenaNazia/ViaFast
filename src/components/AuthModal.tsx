import React, { useState } from 'react';
import { Role, Student, Driver } from '../types';
import {
  User,
  GraduationCap,
  Shield,
  Radio,
  Activity,
  Lock,
  Mail,
  KeyRound,
  CheckCircle2,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AuthUser {
  id: string;
  name: string;
  role: Role;
  email: string;
  badge: string;
  avatar: string;
  description: string;
  studentId?: string;
  driverId?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: Role;
  onSelectUser: (user: AuthUser) => void;
  students: Student[];
  drivers: Driver[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectUser,
  students,
  drivers,
}) => {
  const [activeTab, setActiveTab] = useState<Role>(currentRole === 'landing' ? 'student' : currentRole);
  const [emailInput, setEmailInput] = useState('sarah.ahmed@nu.edu.pk');
  const [passwordInput, setPasswordInput] = useState('••••••••••');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const demoAccounts: Record<Role, AuthUser[]> = {
    student: [
      {
        id: 'usr-student-1',
        name: students[0]?.name || 'Sarah Ahmed',
        role: 'student',
        email: 'sarah.ahmed@nu.edu.pk',
        badge: students[0]?.rollNumber || 'CS-2023-104',
        avatar: students[0]?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        description: 'BSc Computer Science • Route 2 (Chungi No. 9)',
        studentId: students[0]?.id || 'stu-1',
      },
      {
        id: 'usr-student-2',
        name: students[1]?.name || 'Hamza Malik',
        role: 'student',
        email: 'hamza.malik@nu.edu.pk',
        badge: students[1]?.rollNumber || 'EE-2022-089',
        avatar: students[1]?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        description: 'BSc Electrical Eng • Route 1 (BCG Chowk)',
        studentId: students[1]?.id || 'stu-2',
      },
      {
        id: 'usr-student-3',
        name: students[2]?.name || 'Ayesha Khan',
        role: 'student',
        email: 'ayesha.k@nu.edu.pk',
        badge: students[2]?.rollNumber || 'BBA-2024-012',
        avatar: students[2]?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        description: 'BBA Marketing • Route 3 (Bosan Road)',
        studentId: students[2]?.id || 'stu-3',
      },
    ],
    parent: [
      {
        id: 'usr-parent-1',
        name: 'Mr. Tariq Ahmed',
        role: 'parent',
        email: 'tariq.ahmed@gmail.com',
        badge: 'Guardian of Sarah (CS-2023-104)',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        description: 'Linked Child: Sarah Ahmed • Priority Safety SMS Active',
        studentId: students[0]?.id || 'stu-1',
      },
      {
        id: 'usr-parent-2',
        name: 'Mrs. Rashida Malik',
        role: 'parent',
        email: 'rashida.malik@yahoo.com',
        badge: 'Guardian of Hamza (EE-2022-089)',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        description: 'Linked Child: Hamza Malik • Route 1 Alerts Active',
        studentId: students[1]?.id || 'stu-2',
      },
    ],
    driver: [
      {
        id: 'usr-driver-1',
        name: drivers[1]?.name || 'Ustad Mohammad Rafiq',
        role: 'driver',
        email: 'm.rafiq.transport@nu.edu.pk',
        badge: 'Coaster #02 • Cell: 0300-7389211',
        avatar: drivers[1]?.avatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        description: 'Route 2 Captain • 12 Years Service • Verified',
        driverId: drivers[1]?.id || 'drv-2',
      },
      {
        id: 'usr-driver-2',
        name: drivers[0]?.name || 'Ustad Ghulam Rasool',
        role: 'driver',
        email: 'g.rasool.transport@nu.edu.pk',
        badge: 'Bus #04 • Cell: 0301-8492019',
        avatar: drivers[0]?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        description: 'Route 1 Captain • 14 Years Service • Verified',
        driverId: drivers[0]?.id || 'drv-1',
      },
    ],
    admin: [
      {
        id: 'usr-admin-1',
        name: 'Engr. Bilal Aslam',
        role: 'admin',
        email: 'bilal.aslam@nu.edu.pk',
        badge: 'Director Fleet Operations',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        description: 'Campus Mobility Administrator • Full System Authorization',
      },
      {
        id: 'usr-admin-2',
        name: 'Ms. Hina Qureshi',
        role: 'admin',
        email: 'hina.qureshi@nu.edu.pk',
        badge: 'Transport Coordinator',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
        description: 'Student Registrations & Fee Reconciliation Officer',
      },
    ],
    landing: [],
  };

  const handleSelectAccount = (user: AuthUser) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onSelectUser(user);
      onClose();
      confetti({ particleCount: 35, spread: 60 });
    }, 400);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const available = demoAccounts[activeTab] || demoAccounts.student;
    const user = available[0];
    handleSelectAccount(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#020617]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] text-white">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                ViaFast Identity & Access Management
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Select a verified university persona to sign in
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="px-6 pt-4 border-b border-slate-800 bg-[#020617]/30 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('student')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'student'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Portals</span>
          </button>

          <button
            onClick={() => setActiveTab('parent')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'parent'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Parent & Guardian</span>
          </button>

          <button
            onClick={() => setActiveTab('driver')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'driver'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Driver / Captain</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-b-2 ${
              activeTab === 'admin'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Admin Center</span>
          </button>
        </div>

        {/* Account Cards for Selected Role */}
        <div className="p-6 space-y-3 max-h-[380px] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Instant 1-Click Role Switcher
            </span>
            <span className="text-[10px] text-blue-400 font-mono">
              Ready for evaluation
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {demoAccounts[activeTab]?.map((user) => (
              <div
                key={user.id}
                onClick={() => handleSelectAccount(user)}
                className="flex items-center justify-between p-4 rounded-2xl bg-[#020617]/70 border border-slate-800 hover:border-blue-500/60 hover:bg-[#1e293b]/50 cursor-pointer transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-700 group-hover:border-blue-500 transition-colors"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-[#020617]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        {user.name}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40">
                        {user.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{user.description}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 group-hover:bg-blue-600 text-blue-400 group-hover:text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                  >
                    Switch →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Simulated Login Form for Custom Testing */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <details className="text-xs group">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-semibold flex items-center justify-between">
                <span>Or simulate manual credentials sign-in</span>
                <span className="text-[10px] font-mono text-blue-400">Expand Form ↓</span>
              </summary>
              <form onSubmit={handleManualLogin} className="space-y-3 mt-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    University Email or Roll Number
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-[0_0_12px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In with FAST Credentials'}</span>
                </button>
              </form>
            </details>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#020617]/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>FAST-NUCES Multan • Transport Portal Auth</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            256-bit Encrypted Session
          </span>
        </div>
      </div>
    </div>
  );
};
