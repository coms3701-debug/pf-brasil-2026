import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { 
  User, Stethoscope, Tag, Activity, MessageSquare, Send, Download, 
  Trash2, Plus, ListFilter, Wallet, CheckCircle2, AlertCircle, 
  Briefcase, TrendingUp, Globe, ShieldAlert, BarChart3, Lock, Users, PieChart, MapPin
} from 'lucide-react';

const COLLECTION_NAME = 'pf_global_budget'; // Coleção de produção

const TEAMS = [
  "Diretoria (Matriz)",
  "Gerente Nacional de VM",
  "Gerente Nacional de Execução",
  "Distrital Sul",
  "Distrital São Paulo 1",
  "Distrital São Paulo 2",
  "Distrital SPI GO",     
  "Distrital SPI BSB",    
  "Distrital Rio Total",
  "Distrital MG/ES",
  "Distrital NNE"
];

const ADMIN_USERS = {
  "8888": { name: "Administrador", isGeneral: true, team: "Diretoria (Matriz)" },
  "8889": { name: "Nacional de VM", isGeneral: true, team: "Gerente Nacional de VM" },
  "8890": { name: "Nacional de Execução", isGeneral: true, team: "Gerente Nacional de Execução" },
  "1001": { name: "Gestor Sul", isGeneral: false, team: "Distrital Sul" },
  "1002": { name: "Gestor SP 1", isGeneral: false, team: "Distrital São Paulo 1" },
  "1003": { name: "Gestor SP 2", isGeneral: false, team: "Distrital São Paulo 2" },
  "1004": { name: "Gestor SPI GO", isGeneral: false, team: "Distrital SPI GO" },
  "1005": { name: "Gestor SPI BSB", isGeneral: false, team: "Distrital SPI BSB" },
  "1006": { name: "Gestor Rio Total", isGeneral: false, team: "Distrital Rio Total" },
  "1007": { name: "Gestor MG/ES", isGeneral: false, team: "Distrital MG/ES" },
  "1008": { name: "Gestor NNE", isGeneral: false, team: "Distrital NNE" }
};

const categories = ['CAT 1', 'CAT 2', 'CAT 3', 'CAT 4'];
const actionTypes = ['Dias de produto', 'Presente', 'Refeição', 'Congresso'];

const App = () => {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('form'); 
  const [status, setStatus] = useState({ type: '', msg: '' });
  
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [adminTab, setAdminTab] = useState('reports'); 
  const [adminGeneralFilter, setAdminGeneralFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    team: localStorage.getItem('pf_last_team') || '',
    requesterName: localStorage.getItem('pf_last_requester') || '',
    doctorName: '',
    crm: '',
    category: '',
    actionType: '',
    value: '',
    observations: ''
  });

  const notify = useCallback((msg, type = 'success') => {
    setStatus({ type, msg });
    if (type !== 'error') setTimeout(() => setStatus({ type: '', msg: '' }), 3000);
  }, []);

  // Auth e Ícone Dinâmico
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) { 
        console.error(err);
        notify('Falha de Autenticação', 'error'); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);

    // Gerar ícone
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
        gradient.addColorStop(0, '#064e3b'); 
        gradient.addColorStop(1, '#10b981'); 
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.fillStyle = '#ffffff'; 
        ctx.font = 'italic bold 480px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PF', 512, 512 + 40);
        const iconUrl = canvas.toDataURL('image/png');
        let linkApple = document.querySelector('link[rel="apple-touch-icon"]');
        if (!linkApple) {
          linkApple = document.createElement('link'); 
          linkApple.rel = 'apple-touch-icon'; 
          document.head.appendChild(linkApple);
        }
        linkApple.href = iconUrl;
      }
    } catch(e) {}

    return () => unsubscribe();
  }, [notify]);

  // Leitura Firestore
  useEffect(() => {
    if (!user) return;
    setLoading(true); 
    const colRef = collection(db, COLLECTION_NAME);
    const unsubscribe = onSnapshot(colRef, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date() 
        }));
        setEntries([...data].sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      }, 
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Filtros Gestão
  const adminFilteredEntries = useMemo(() => {
    if (!currentAdmin) return [];
    if (currentAdmin.isGeneral) {
      if (adminGeneralFilter === 'ALL') return entries;
      if (adminGeneralFilter === 'MINE') return entries.filter(e => e.team === currentAdmin.team);
      return entries.filter(e => e.team === adminGeneralFilter);
    } 
    return entries.filter(e => e.team === currentAdmin.team);
  }, [entries, currentAdmin, adminGeneralFilter]);

  const parseCurrency = useCallback((valStr) => {
    if (!valStr) return 0;
    return parseFloat(valStr.toString().replace(/\./g, '').replace(',', '.')) || 0;
  }, []);

  const totalInvested = useMemo(() => adminFilteredEntries.reduce((acc, curr) => acc + parseCurrency(curr.value), 0), [adminFilteredEntries, parseCurrency]);

  const statsByUser = useMemo(() => {
    const groups = adminFilteredEntries.reduce((acc, curr) => {
      const name = curr.requesterName || "Não Identificado";
      if (!acc[name]) acc[name] = { total: 0, count: 0 };
      acc[name].total += parseCurrency(curr.value);
      acc[name].count += 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
  }, [adminFilteredEntries, parseCurrency]);

  const statsByType = useMemo(() => {
    const groups = adminFilteredEntries.reduce((acc, curr) => {
      const type = curr.actionType || "Outros";
      if (!acc[type]) acc[type] = { total: 0, count: 0 };
      acc[type].total += parseCurrency(curr.value);
      acc[type].count += 1;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
  }, [adminFilteredEntries, parseCurrency]);

  const maxUserTotal = statsByUser.length > 0 ? statsByUser[0].total : 1;
  const maxTypeTotal = statsByType.length > 0 ? statsByType[0].total : 1;

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'value') {
      let val = value.replace(/\D/g, "");
      val = (Number(val) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setFormData(prev => ({ ...prev, [name]: val }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return notify("Aguarde a ligação ao servidor", "error");
    
    const { team, requesterName, doctorName, crm, category, actionType, value, observations } = formData;
    if (!team || !requesterName || !doctorName || !crm || !category || !actionType || !value) {
      return notify("Preencha todos os campos obrigatórios.", "error");
    }
    
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        ...formData, 
        userId: user.uid, 
        createdAt: new Date(),
      });
      localStorage.setItem('pf_last_team', team);
      localStorage.setItem('pf_last_requester', requesterName);
      setFormData({ team, requesterName, doctorName: '', crm: '', category: '', actionType: '', value: '', observations: '' });
      notify("Lançamento efetuado!");
      setView('history');
    } catch (err) { 
      notify("Erro ao gravar.", "error"); 
    }
  };

  const deleteEntry = async (id, isForceDelete = false) => {
    if (!isForceDelete && !window.confirm("Tem a certeza que deseja cancelar?")) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      notify("Registo removido");
    } catch (err) { 
      notify("Erro ao remover", "error"); 
    }
  };

  const exportToExcel = () => {
    const dataToExport = currentAdmin ? adminFilteredEntries : entries.filter(e => e.team === formData.team);
    if (dataToExport.length === 0) return notify("Sem dados para exportar", "error");
    
    const headers = ["Data", "Equipe", "Solicitante", "Médico", "CRM", "Categoria", "Tipo", "Valor", "Observações"];
    const csvContent = [headers.join(";"), ...dataToExport.map(e => [
      e.createdAt.toLocaleDateString(), e.team || "-", e.requesterName, e.doctorName, e.crm, e.category, e.actionType, e.value, (e.observations || "").replace(/;/g, ' ')
    ].join(";"))].join("\n");
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' }));
    const fileNameScope = currentAdmin && currentAdmin.isGeneral && adminGeneralFilter === 'ALL' ? 'Geral_Brasil' : (currentAdmin ? currentAdmin.team.replace(/\s+/g, '_') : 'Geral');
    link.download = `PF_Relatorio_${fileNameScope}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const adminRole = ADMIN_USERS[pinInput];
    if (adminRole) {
      setCurrentAdmin(adminRole);
      setPinInput('');
      setAdminGeneralFilter('ALL'); 
      notify(`Bem-vindo, ${adminRole.name}`);
    } else {
      notify("PIN Incorreto", "error");
      setPinInput('');
    }
  };

  const logoutAdmin = () => {
    setCurrentAdmin(null);
    setView('form');
    notify("Sessão terminada");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-28 selection:bg-emerald-200">
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-5 py-4 shadow-xl">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-800 rounded-xl flex items-center justify-center text-white font-serif text-xl font-bold italic shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400/20">
              PF
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none tracking-tight">Pierre Fabre</h1>
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                {currentAdmin && view === 'admin' ? <ShieldAlert size={10} /> : <Globe size={10} />}
                {currentAdmin && view === 'admin' ? (currentAdmin.isGeneral ? 'Admin Brasil' : 'Gestor Regional') : 'Corporate Brasil'}
              </span>
            </div>
          </div>
          <button onClick={exportToExcel} className="p-2.5 bg-slate-800 text-emerald-400 rounded-xl hover:bg-slate-700 transition-all border border-slate-700 active:scale-95">
            <Download size={20} />
          </button>
        </div>
      </header>

      {status.msg && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm px-4 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 backdrop-blur-md border ${
          status.type === 'error' ? 'bg-rose-950/90 text-rose-100 border-rose-800' : 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
        }`}>
          {status.type === 'error' ? <AlertCircle size={20} className="text-rose-400" /> : <CheckCircle2 size={20} className="text-emerald-400" />}
          <span className="text-sm font-semibold">{status.msg}</span>
        </div>
      )}

      <main className="max-w-md mx-auto p-4 pt-6">
        {view === 'form' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Plus size={16} className="text-emerald-600" /> Nova Solicitação
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1">Equipe / Regional</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 text-emerald-600" size={18} />
                    <select name="team" value={formData.team} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:border-emerald-500 outline-none text-sm font-bold text-emerald-800 appearance-none">
                      <option value="">Selecione...</option>
                      {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Seu Nome (Solicitante)</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-3 top-3.5 text-slate-300 group-focus-within:text-emerald-600" size={18} />
                    <input name="requesterName" value={formData.requesterName} onChange={handleInputChange} placeholder="Seu Nome" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-semibold text-slate-700 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Médico / Ação</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3.5 text-slate-300 group-focus-within:text-emerald-600" size={18} />
                    <input name="doctorName" value={formData.doctorName} onChange={handleInputChange} placeholder="Nome do Médico" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-semibold text-slate-700 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">CRM/UF</label>
                    <div className="relative group">
                      <Stethoscope className="absolute left-3 top-3.5 text-slate-300 group-focus-within:text-emerald-600" size={18} />
                      <input name="crm" value={formData.crm} onChange={handleInputChange} placeholder="00000-XX" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none uppercase font-semibold text-slate-700 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-emerald-700 uppercase ml-1">Valor Total</label>
                    <div className="relative group">
                      <Wallet className="absolute left-3 top-3.5 text-emerald-600" size={18} />
                      <input name="value" value={formData.value} onChange={handleInputChange} placeholder="0,00" className="w-full pl-10 pr-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none font-bold text-emerald-800 text-sm" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Categoria</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold text-slate-600">
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Ação</label>
                    <select name="actionType" value={formData.actionType} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-sm font-semibold text-slate-600">
                      <option value="">Selecione...</option>
                      {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Observações</label>
                  <textarea name="observations" value={formData.observations} onChange={handleInputChange} rows="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 outline-none resize-none text-sm" />
                </div>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Send size={18} className="text-emerald-400" />
                  Enviar Lançamento
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
            <div className="flex justify-between items-center px-1 mb-2">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Feed de Lançamentos</h2>
              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md">{entries.filter(e => e.team === formData.team).length} ITENS</span>
            </div>
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div></div>
            ) : entries.filter(e => e.team === formData.team).length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-300"><p className="text-slate-400 text-sm">Nenhum registo da sua equipa.</p></div>
            ) : (
              <div className="space-y-3">
                {entries.filter(e => e.team === formData.team).map(e => (
                  <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start group">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-center justify-between">
                         <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{e.requesterName}</span>
                         </div>
                         <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">{e.team}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 text-sm truncate">{e.doctorName}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">{e.category}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-black text-emerald-600 text-sm shrink-0">R$ {e.value}</span>
                        <div className="h-3 w-[1px] bg-slate-300"></div>
                        <span className="text-slate-500 text-[11px] font-bold uppercase truncate">{e.actionType}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 font-medium">
                        {e.createdAt.toLocaleDateString()} • CRM {e.crm}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'admin' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!currentAdmin ? (
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 text-center mt-10">
                <ShieldAlert size={48} className="mx-auto text-emerald-600 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Portal do Gestor</h2>
                <form onSubmit={handleAdminLogin} className="space-y-4 max-w-xs mx-auto mt-6">
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="Seu PIN" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-center font-bold tracking-[0.5em] text-lg" maxLength={6} />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all">Acessar Painel</button>
                </form>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-3 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center">
                      <User size={16} className="text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase">{currentAdmin.isGeneral ? "Nível Nacional" : "Nível Regional"}</p>
                      <p className="text-sm font-bold text-slate-800">{currentAdmin.name}</p>
                    </div>
                  </div>
                  <button onClick={logoutAdmin} className="text-[10px] font-bold uppercase text-slate-500 bg-white rounded-md border border-slate-200 px-3 py-1.5">Sair</button>
                </div>

                {currentAdmin.isGeneral && (
                  <div className="bg-slate-900 p-3 rounded-xl shadow-lg border border-slate-800">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 block">Visão de Dados</label>
                    <select value={adminGeneralFilter} onChange={(e) => setAdminGeneralFilter(e.target.value)} className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg outline-none text-sm font-semibold">
                      <option value="ALL">🌎 Visão Geral Brasil</option>
                      {TEAMS.map(t => <option key={t} value={t}>📍 {t}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 rounded-2xl p-4 shadow-lg border border-slate-800 relative overflow-hidden">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Verba Utilizada</p>
                    <h3 className="text-lg font-bold text-white relative z-10"><span className="text-emerald-400 text-sm mr-1">R$</span>{totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Total Ações</p>
                    <h3 className="text-2xl font-black text-slate-800 relative z-10">{adminFilteredEntries.length}</h3>
                  </div>
                </div>

                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                  <button onClick={() => setAdminTab('reports')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'reports' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Análises</button>
                  <button onClick={() => setAdminTab('manage')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'manage' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Controle</button>
                </div>

                {adminTab === 'reports' && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16} className="text-emerald-500" /> Por Solicitante</h3>
                      <div className="space-y-4">
                        {statsByUser.map((stat, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold"><span className="text-slate-700">{stat.name}</span><span className="text-emerald-700">R$ {stat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <div className="w-full bg-slate-100 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(stat.total / maxUserTotal) * 100}%` }}></div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'manage' && (
                  <div className="space-y-3 animate-in fade-in">
                    {adminFilteredEntries.map(e => (
                      <div key={e.id} className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{e.requesterName}</p>
                          <p className="font-bold text-slate-800 text-sm truncate">{e.doctorName}</p>
                          <p className="text-xs font-semibold text-slate-600 mt-1">R$ {e.value} - <span className="font-normal text-slate-500">{e.actionType}</span></p>
                        </div>
                        <button onClick={() => deleteEntry(e.id, true)} className="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-4 py-3 flex justify-around items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] pb-safe-area">
        <button onClick={() => setView('form')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'form' ? 'text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}><Plus size={22} /><span className="text-[9px] font-bold uppercase">Novo</span></button>
        <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'history' ? 'text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}><ListFilter size={22} /><span className="text-[9px] font-bold uppercase">Feed</span></button>
        <div className="w-[1px] h-8 bg-slate-200"></div>
        <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'admin' ? 'text-slate-900' : 'text-slate-400 hover:bg-slate-50'}`}><ShieldAlert size={22} /><span className="text-[9px] font-bold uppercase">Gestor</span></button>
      </nav>
    </div>
  );
};
