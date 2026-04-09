import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';

// =============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (FIREBASE GOOGLE)
// =============================================================
const firebaseConfig = {
    apiKey: "AIzaSyBSXiZWea-cXvztxKv28YggNOJioqsBobU",
    authDomain: "pf-verbas.firebaseapp.com",
    projectId: "pf-verbas",
    storageBucket: "pf-verbas.firebasestorage.app",
    messagingSenderId: "1048653186555",
    appId: "1:1048653186555:web:2b7945d5e1cf3998b5f75e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION_NAME = 'pf_budget_oficial_2026';

const TEAMS = [
    "DISTRITAL RIO TOTAL", "DISTRITAL MG/ES", "DISTRITAL NNE", "DISTRITAL SPC1", "DISTRITAL SPC2",
    "DISTRITAL SPI/BSB", "DISTRITAL SPI/GNY",
    "GERENTE NACIONAL DE VISITAÇÃO MÉDICA", "GERENTE NACIONAL DE EXECUÇÃO", "DIRETORIA (MATRIZ)"
];

const REPRESENTATIVES = {
    "DISTRITAL RIO TOTAL": ["CARLOS OTAVIO", "LIVIA NUNES DO AMARAL", "VALERIA DIAS DA COSTA", "THAIS SANTANNA RIBEIRO", "CARLOS EDUARDO DO NASCIMENTO SOARES", "FERNANDA DE JESUS NASCIMENTO", "ARTHUR MARILAC FERREIRA", "ELIZABETH LIMA DA SILVA", "CARINA CARVALHO DIAS DE AMORIM", "ROSIMERE MARIA DA SILVA FALCAO", "DEBORAH DE ALMEIDA LEITE PINTO DE LACERDA", "ISIS DE OLIVEIRA ALVES", "PATRICIA MEIRE DE SOUZA IAMIM SILVA"],
    "DISTRITAL MG/ES": ["CALEBE MIRANDA WANDERLEY", "HELOISA DE BARROS", "MARSEILLE COSTA DE CARVALHO", "AMANDA DE OLIVEIRA MOURA", "IZABELA SALES ROCHA DELUCCA", "PAULO MARCIO TOFANI DE MELLO JUNIOR", "KENIA OLIVEIRA CANHESTRO", "KELLY CRISTINA PEREIRA DE ARAUJO","JANAINA BEMMUYAL PARENTE SANTOS", "SANDRINE AGNES LUCIE YOUST"],
    "DISTRITAL NNE": ["SUELLEN VASCONCELOS", "JOSE BERNARDO SOUZA SILVA OLIVEIRA", "ANA ROSA FERREIRA DE MELO VENTURA", "RICARDO JOSE COELHO DE ALBUQUERQUE", "MARCIA CATERINE MELO LIMA DA ROCHA", "FABIANA CRISTINA PINTO TETI MAGALHAES DE MORAES", "FLAVIA MARIA CAVALCANTI MADUREIRA", "KALIANNE FELIX", "LUIS PINHEIRO"],
    "DISTRITAL SPC1": ["SIDNEI DE SANTIS", "GABRIELA ARAUJO DE PIERI ZAMPIERI", "PAULA NERY ARAGAO", "VALDIRENE COSME DA CONCEICAO DE FLOR", "KARINA PEREIRA SILVA ACTIS", "RAFAEL MENDES PEREIRA", "ROBERTA SALES GADELHA", "SHEILA SANTANA FULNAZARI", "GRAZIELA VICENTE TORRECILLAS", "PAMELA ARAUJO DA COSTA" "LAURO FERREIRA JÚNIOR" "JULIANA STEFANIE OLIVEIRA"],
    "DISTRITAL SPC2": ["VAGO", "DANNY MELO PEREIRA", "SILVIA REGINA LAZINHO", "GISELE MAKUL BIANCO", "MARCEL OLMO FERNANDES BRANCO", "LUCIENE DE SOUZA", "GISLAINE MONTINI BIZINOTTI", "KARINA CAVALCANTI", "VAGO VM", "FLAVIA LUIZA CARDOSO LIUTTI", "VANESSA GARCIA DE OLIVEIRA", "SEBASTIAO ARAUJO ALMEIDA", "TATIANA RODRIGUES DA FONSECA"],
    "DISTRITAL SPI/BSB": ["CARLOS DIAS", "LUCIANA ARAUJO DE OLIVEIRA CAMPOS", "LUCILIA CIBELE DE OLIVEIRA", "GELIANE DE LIMA", "KARINA APARECIDA PADILHA MOTA", "CRISTIANO CARVALHO DO NASCIMENTO", "DOUGLAS RODRIGO MUNHOZ DOMINGOS FIOCHI", "BRUNO CAETANO FELIX", "KELLY FABIANE DA SILVA"],
    "DISTRITAL SPI/GNY": ["JACQUELINE MENEZES", "TATIANE FERRARI", "AMANDA THAIS PICKEL VALERIO", "LINDA LUCIA DE SOUSA ALVES OLIVEIRA", "LADY MARY DE SOUZA ALMEIDA LINHARES", "PAOLA FERNANDA DA SILVA MOSCOSO DE BARROS", "VERA ALICE BEVEVINO DIAS DE MORAES RIGHETI", "GIOVANA SALAB DEPOLLI", "ARYADINE CARDOSO DE SOUZA", "ANTONIO MARCOS SHIMAZAKI DA SILVA"], 
    "GERENTE NACIONAL DE VISITAÇÃO MÉDICA": ["BRUNO JORGE"],
    "GERENTE NACIONAL DE EXECUÇÃO": ["GUSTAVO LIMA"],
    "DIRETORIA (MATRIZ)": ["CARLOS OTAVIO"]
};

const ACTION_TYPES = ['DIAS DE PRODUTO', 'PRESENTE', 'REFEIÇÃO', 'CONGRESSOS', 'ORGANIZAÇÃO DE AMOSTRAS', 'MINI MEETING', 'EVENTOS', 'COMPRA DE ORIGINAIS', 'MATERIAL GRÁFICO'];
const CATEGORIES = ['CAT 1', 'CAT 2', 'CAT 3', 'CAT 4', 'CAT5', 'OUTROS'];

const ADMIN_USERS = {
    "8888": { name: "CARLOS OTÁVIO", isGeneral: true, team: "DIRETORIA (MATRIZ)" },
    "1001": { name: "GESTOR RIO", isGeneral: false, team: "DISTRITAL RIO TOTAL" },
    "1002": { name: "GESTOR MG/ES", isGeneral: false, team: "DISTRITAL MG/ES" },
    "1003": { name: "GESTOR NNE", isGeneral: false, team: "DISTRITAL NNE" },
    "1004": { name: "GESTOR SPC1", isGeneral: false, team: "DISTRITAL SPC1" },
    "1005": { name: "GESTOR SPC2", isGeneral: false, team: "DISTRITAL SPC2" },
    "1006": { name: "GESTOR SPI/BSB", isGeneral: false, team: "DISTRITAL SPI/BSB" },
    "1007": { name: "GESTOR SPI/GNY", isGeneral: false, team: "DISTRITAL SPI/GNY" },
};

// MÁSCARA AUTOMÁTICA DE CRM (Sem hífen, Limite de 9 dígitos)
const formatCRM = (val) => {
    let v = String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return v.substring(0, 9);
};

// COMPONENTE: TOUCH SELECT
const TouchSelect = ({ name, value, onChange, options, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlight, setHighlight] = useState(-1);
    const highlightRef = useRef(-1);
    const containerRef = useRef(null);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el || !isOpen) return;

        const handleTouchMove = (e) => {
            e.preventDefault(); 
            if (e.touches.length !== 1) return;
            
            const touch = e.touches[0];
            const elem = document.elementFromPoint(touch.clientX, touch.clientY);
            const optionElem = elem?.closest('[data-index]');
            
            if (optionElem && optionElem.dataset && optionElem.dataset.index !== undefined) {
                const idx = Number(optionElem.dataset.index);
                if (idx !== highlightRef.current) {
                    setHighlight(idx);
                    highlightRef.current = idx;
                    try { if (navigator.vibrate) navigator.vibrate(15); } catch(err){}
                }
            } else {
                setHighlight(-1);
                highlightRef.current = -1;
            }
        };

        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        return () => el.removeEventListener('touchmove', handleTouchMove);
    }, [isOpen]);

    const handleEnd = () => {
        if (highlightRef.current >= 0 && options[highlightRef.current]) {
            onChange({ target: { name, value: options[highlightRef.current] } });
            try { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); } catch(err){}
        }
        setIsOpen(false);
        setHighlight(-1);
        highlightRef.current = -1;
    };

    return (
        <>
            <div onClick={() => setIsOpen(true)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none transition-all active:scale-[0.98] active:shadow-inner flex justify-between items-center cursor-pointer">
                <span className={value ? "text-slate-800 uppercase" : "text-[10px] text-slate-400 uppercase"}>{value || placeholder}</span>
                <span className="text-slate-400 text-[10px]">▼</span>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div 
                        className="w-full max-w-md bg-white rounded-t-[2.5rem] p-5 pb-8 shadow-2xl flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 shrink-0"></div>
                        <p className="text-[10px] font-black text-slate-400 mb-3 uppercase text-center tracking-widest shrink-0">Deslize o dedo sem soltar</p>
                        
                        <div ref={containerRef} className="space-y-1 relative" onTouchEnd={handleEnd} onTouchCancel={handleEnd}>
                            {options.map((opt, i) => (
                                <div 
                                    key={opt} 
                                    data-index={i}
                                    onTouchStart={() => { 
                                        setHighlight(i); 
                                        highlightRef.current = i;
                                        try{ if (navigator.vibrate) navigator.vibrate(15); }catch(err){} 
                                    }}
                                    onClick={() => { onChange({ target: { name, value: opt }}); setIsOpen(false); }}
                                    className={`p-3 rounded-xl transition-all duration-75 cursor-pointer border flex items-center ${value === opt || highlight === i ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 scale-[1.02] border-emerald-400 z-10 relative' : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'}`}
                                >
                                    <span className="text-xs font-bold uppercase pointer-events-none">{opt}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// COMPONENTE: SWIPEABLE ENTRY
const SwipeableEntry = ({ entry, onEdit, onDelete, formatDate }) => {
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [offsetX, setOffsetX] = useState(0);
    
    const handleStart = (e) => {
        setStartX(e.touches[0].clientX);
        setStartY(e.touches[0].clientY);
    };
    
    const handleMove = (e) => {
        const diffX = e.touches[0].clientX - startX;
        const diffY = e.touches[0].clientY - startY;
        
        if (Math.abs(diffY) > Math.abs(diffX)) return;
        
        if (diffX > 120) setOffsetX(120);
        else if (diffX < -120) setOffsetX(-120);
        else setOffsetX(diffX);
    };
    
    const handleEnd = () => {
        if (offsetX > 70) {
            onEdit(entry); 
            try { if (navigator.vibrate) navigator.vibrate(20); } catch(e){}
        }
        else if (offsetX < -70) {
            onDelete(entry); 
            try { if (navigator.vibrate) navigator.vibrate(20); } catch(e){}
        }
        setOffsetX(0); 
    };

    const formattedActionDate = entry.actionDate ? new Date(entry.actionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '';

    return (
        <div className="relative rounded-2xl overflow-hidden mb-3 bg-slate-200 border border-slate-200">
            <div className="absolute inset-0 flex justify-between items-center px-5">
                <div className={`font-black flex items-center gap-2 transition-opacity duration-200 ${offsetX > 0 ? 'opacity-100 text-emerald-600' : 'opacity-0'}`}>
                    <span className="text-2xl">✏️</span> EDITAR
                </div>
                <div className={`font-black flex items-center gap-2 transition-opacity duration-200 ${offsetX < 0 ? 'opacity-100 text-rose-600' : 'opacity-0'}`}>
                    EXCLUIR <span className="text-2xl">🗑️</span>
                </div>
            </div>

            <div 
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                style={{ transform: `translateX(${offsetX}px)`, transition: offsetX === 0 ? 'transform 0.3s ease' : 'none', touchAction: 'pan-y' }}
                className="relative bg-white p-5 rounded-2xl shadow-sm flex justify-between items-start z-10"
            >
                <div className="min-w-0 pr-4 text-left">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">{String(entry.team || 'S/ Equipe')}</span>
                        {formattedActionDate && (
                            <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">📅 {formattedActionDate}</span>
                        )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm truncate uppercase leading-tight">{String(entry.doctorName || '')} <span className="text-slate-400 font-normal ml-1">({String(entry.category || '')})</span></h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase truncate opacity-70 mt-0.5">{String(entry.requesterName || '')} • {String(entry.actionType || '')}</p>
                    {entry.observations && <p className="text-[9px] text-slate-400 italic mt-1.5 truncate">Det: {entry.observations}</p>}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end">
                    <p className="font-black text-slate-900 text-sm uppercase tracking-tighter">R$ {String(entry.value || '0,00')}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{formatDate(entry.createdAt)}</p>
                    <span className="text-[8px] font-black uppercase text-slate-400 mt-3 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">⇦ DESLIZE</span>
                </div>
            </div>
        </div>
    );
};

// =========================================================================
// APLICATIVO PRINCIPAL
// =========================================================================
export default function App() {
    const [user, setUser] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('form'); 
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    
    // GESTOR STATES
    const [currentAdmin, setCurrentAdmin] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [adminTab, setAdminTab] = useState('reports'); 
    const [adminGeneralFilter, setAdminGeneralFilter] = useState('TODAS AS DISTRITAIS');
    const [adminRepFilter, setAdminRepFilter] = useState('TODOS');
    
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editingEntry, setEditingEntry] = useState(null); 

    // STATE PARA O BANCO DE MÉDICOS
    const [doctorsDatabase, setDoctorsDatabase] = useState({});

    // EFEITO PARA CARREGAR OS MÉDICOS (Com blindagem de erros)
    useEffect(() => {
        fetch('/medicos.json?v=' + new Date().getTime(), { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error("Ficheiro não encontrado");
                return res.json();
            })
            .then(data => {
                const dbDict = {};
                data.forEach(m => {
                    if (m.crm) {
                        const cleanCRM = formatCRM(m.crm);
                        let catFormatada = String(m.categoria || '').trim();
                        // Transforma "1" em "CAT 1"
                        if (/^\d+$/.test(catFormatada)) catFormatada = `CAT ${catFormatada}`;
                        
                        const nomeMedico = m.medico || m.nome || '';
                        dbDict[cleanCRM] = { name: nomeMedico, category: catFormatada };
                    }
                });
                setDoctorsDatabase(dbDict);
                console.log(`Sucesso: ${Object.keys(dbDict).length} médicos carregados!`);
            })
            .catch(err => {
                console.log("INFO: Modo Manual Ativado. Ficheiro de médicos offline.", err);
            });
    }, []);

    useEffect(() => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1024; canvas.height = 1024;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
                grad.addColorStop(0, '#059669'); 
                grad.addColorStop(1, '#10b981'); 
                ctx.fillStyle = grad;
                ctx.beginPath(); 
                ctx.roundRect(0, 0, 1024, 1024, 200); 
                ctx.fill();
                ctx.fillStyle = 'white'; 
                ctx.font = 'italic bold 550px serif';
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle';
                ctx.fillText('PF', 512, 512 + 40);
                const iconUrl = canvas.toDataURL('image/png');
                
                let link = document.querySelector('link[rel="apple-touch-icon"]');
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'apple-touch-icon';
                    document.head.appendChild(link);
                }
                link.href = iconUrl;
            }
        } catch(e) {}
    }, []);

    const [teamBudgets, setTeamBudgets] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pf_team_budgets')) || {}; } 
        catch (e) { return {}; }
    });

    const handleBudgetChange = (val) => {
        if (!currentFeedTeam || currentFeedTeam === 'ALL') return;
        const newBudgets = { ...teamBudgets, [currentFeedTeam]: val };
        setTeamBudgets(newBudgets);
        try { localStorage.setItem('pf_team_budgets', JSON.stringify(newBudgets)); } catch(e) {}
    };

    const [formData, setFormData] = useState(() => {
        let t = '', r = '';
        try {
            t = localStorage.getItem('pf_user_team') || '';
            r = localStorage.getItem('pf_user_name') || '';
        } catch(e) {}
        return { team: t, requesterName: r, actionDate: '', doctorName: '', crm: '', category: '', actionType: '', value: '', observations: '' };
    });

    useEffect(() => {
        try {
            localStorage.setItem('pf_user_team', formData.team);
            localStorage.setItem('pf_user_name', formData.requesterName);
        } catch (e) {}
    }, [formData.team, formData.requesterName]);

    const notify = useCallback((msg, type = 'success') => {
        setStatus({ type, msg });
        setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
    }, []);

    useEffect(() => {
        signInAnonymously(auth).catch(() => notify("Erro de ligação", "error"));
        return onAuthStateChanged(auth, setUser);
    }, [notify]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const colRef = collection(db, COLLECTION_NAME);
        const unsubscribe = onSnapshot(colRef, (snapshot) => {
            try {
                const data = snapshot.docs.map(doc => {
                    const d = doc.data();
                    let date = new Date();
                    if (d.createdAt) {
                        if (typeof d.createdAt.toDate === 'function') date = d.createdAt.toDate();
                        else date = new Date(d.createdAt);
                    }
                    return { id: doc.id, ...d, createdAt: date };
                });
                setEntries([...data].sort((a, b) => b.createdAt - a.createdAt));
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [user]);

    const parseCurrency = useCallback((valStr) => {
        if (!valStr) return 0;
        return parseFloat(String(valStr).replace(/\./g, '').replace(',', '.')) || 0;
    }, []);

    const formatValueInput = (val) => {
        let v = String(val || "").replace(/\D/g, "");
        return (Number(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (dateObj) => {
        try {
            if (dateObj && typeof dateObj.toLocaleDateString === 'function') return dateObj.toLocaleDateString('pt-BR');
            return '';
        } catch (e) { return ''; }
    };

    const effectiveAdminTeam = useMemo(() => {
        if (!currentAdmin) return null;
        if (currentAdmin.isGeneral) {
            if (adminGeneralFilter === 'TODAS AS DISTRITAIS') return null; 
            if (adminGeneralFilter === 'MINHA EQUIPE') return currentAdmin.team;
            return adminGeneralFilter;
        }
        return currentAdmin.team;
    }, [currentAdmin, adminGeneralFilter]);

    const adminAvailableReps = useMemo(() => {
        if (!effectiveAdminTeam) return [];
        return REPRESENTATIVES[effectiveAdminTeam] || [];
    }, [effectiveAdminTeam]);

    const filteredEntriesAdmin = useMemo(() => {
        try {
            if (!currentAdmin) return [];
            let base = entries;

            if (currentAdmin.isGeneral) {
                if (adminGeneralFilter === 'MINHA EQUIPE') {
                    base = base.filter(e => e.team === currentAdmin.team);
                } else if (adminGeneralFilter !== 'TODAS AS DISTRITAIS') {
                    base = base.filter(e => e.team === adminGeneralFilter);
                }
            } else {
                base = base.filter(e => e.team === currentAdmin.team);
            }

            if (adminRepFilter && adminRepFilter !== 'TODOS') {
                base = base.filter(e => e.requesterName === adminRepFilter);
            }

            return base;
        } catch(e) { return []; }
    }, [entries, currentAdmin, adminGeneralFilter, adminRepFilter]);

    const currentFeedTeam = useMemo(() => {
        if (currentAdmin) {
            if (currentAdmin.isGeneral) {
                if (adminGeneralFilter === 'TODAS AS DISTRITAIS') return 'ALL';
                if (adminGeneralFilter === 'MINHA EQUIPE') return currentAdmin.team;
                return adminGeneralFilter;
            }
            return currentAdmin.team;
        }
        return formData.team; 
    }, [currentAdmin, adminGeneralFilter, formData.team]);

    const displayBudgetCeiling = useMemo(() => {
        try {
            if (currentFeedTeam === 'ALL') {
                const total = TEAMS.reduce((acc, team) => acc + parseCurrency(teamBudgets[team] || "0"), 0);
                return total > 0 ? total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
            }
            return teamBudgets[currentFeedTeam] || '';
        } catch(e) { return ''; }
    }, [currentFeedTeam, teamBudgets, parseCurrency]);

    const feedEntries = useMemo(() => {
        try {
            if (currentAdmin) return filteredEntriesAdmin; 
            if (formData.requesterName) return entries.filter(e => e.requesterName === formData.requesterName);
            return []; 
        } catch(e) { return []; }
    }, [entries, currentAdmin, filteredEntriesAdmin, formData.requesterName]);

    const totalUsedFeed = useMemo(() => {
        try { return feedEntries.reduce((acc, curr) => acc + parseCurrency(curr.value), 0); } 
        catch(e) { return 0; }
    }, [feedEntries, parseCurrency]);
    
    const budgetBalance = useMemo(() => {
        try { return parseCurrency(displayBudgetCeiling) - totalUsedFeed; } 
        catch(e) { return 0; }
    }, [displayBudgetCeiling, totalUsedFeed]);

    const exportToCSV = () => {
        try {
            const dataToExport = currentAdmin ? filteredEntriesAdmin : feedEntries;
            if (dataToExport.length === 0) return notify("Não existem dados para exportar.", "error");

            const headers = ["Data Insercao", "Data da Acao", "Estrutura", "Solicitante", "Medico/Destinatario", "CRM", "Categoria", "Acao", "Valor", "Observacoes"];
            const rows = dataToExport.map(e => {
                const dateIns = formatDate(e.createdAt);
                const actionDateExport = e.actionDate ? new Date(e.actionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                const obs = String(e.observations || "").replace(/"/g, '""').replace(/\n/g, ' '); 
                return [`"${dateIns}"`,`"${actionDateExport}"`,`"${e.team || ''}"`,`"${e.requesterName || ''}"`,`"${e.doctorName || ''}"`,`"${e.crm || ''}"`,`"${e.category || ''}"`,`"${e.actionType || ''}"`,`"${e.value || ''}"`,`"${obs}"`].join(";");
            });

            const csvString = [headers.join(";"), ...rows].join("\n");
            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `PF_Relatorio_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            notify("Exportação concluída!");
        } catch (err) { notify("Falha ao exportar", "error"); }
    };

    const feedStatsByRep = useMemo(() => {
        try {
            const groups = feedEntries.reduce((acc, curr) => {
                const name = String(curr.requesterName || "NÃO IDENTIFICADO");
                if (!acc[name]) acc[name] = { total: 0, count: 0 };
                acc[name].total += parseCurrency(curr.value);
                acc[name].count += 1;
                return acc;
            }, {});
            return Object.entries(groups).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
        } catch(e) { return []; }
    }, [feedEntries, parseCurrency]);

    const feedStatsByAction = useMemo(() => {
        try {
            const groups = feedEntries.reduce((acc, curr) => {
                const type = String(curr.actionType || "NÃO DEFINIDA");
                if (!acc[type]) acc[type] = { total: 0, count: 0 };
                acc[type].total += parseCurrency(curr.value);
                acc[type].count += 1;
                return acc;
            }, {});
            return Object.entries(groups).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
        } catch(e) { return []; }
    }, [feedEntries, parseCurrency]);

    const feedStatsByDoctor = useMemo(() => {
        try {
            const groups = feedEntries.reduce((acc, curr) => {
                const crmKey = String(curr.crm || "").trim().toUpperCase();
                const groupKey = crmKey || String(curr.doctorName || "DESCONHECIDO").trim().toUpperCase();
                if (!acc[groupKey]) {
                    acc[groupKey] = { 
                        total: 0, count: 0, doctorName: String(curr.doctorName || "DESCONHECIDO"), 
                        category: String(curr.category || "-"), crm: crmKey || "-", 
                        createdAt: (curr.createdAt && typeof curr.createdAt.getTime === 'function') ? curr.createdAt.getTime() : 0
                    };
                } else {
                    const currTime = (curr.createdAt && typeof curr.createdAt.getTime === 'function') ? curr.createdAt.getTime() : 0;
                    if (currTime < acc[groupKey].createdAt) {
                        acc[groupKey].doctorName = String(curr.doctorName || "DESCONHECIDO");
                        acc[groupKey].category = String(curr.category || "-");
                        acc[groupKey].createdAt = currTime;
                    }
                }
                acc[groupKey].total += parseCurrency(curr.value);
                acc[groupKey].count += 1;
                return acc;
            }, {});
            return Object.values(groups).sort((a, b) => b.total - a.total);
        } catch(e) { return []; }
    }, [feedEntries, parseCurrency]);

    const countEntriesAdmin = filteredEntriesAdmin.length;
    const totalInvestedAdmin = useMemo(() => {
        try { return filteredEntriesAdmin.reduce((acc, curr) => acc + parseCurrency(curr.value), 0); } 
        catch(e) { return 0; }
    }, [filteredEntriesAdmin, parseCurrency]);

    const statsByTeam = useMemo(() => {
        try {
            const groups = filteredEntriesAdmin.reduce((acc, curr) => {
                const team = String(curr.team || "SEM ESTRUTURA");
                if (!acc[team]) acc[team] = { total: 0, count: 0 };
                acc[team].total += parseCurrency(curr.value);
                acc[team].count += 1;
                return acc;
            }, {});
            return Object.entries(groups).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
        } catch(e) { return []; }
    }, [filteredEntriesAdmin, parseCurrency]);

    // PREENCHIMENTO AUTOMÁTICO DO MÉDICO E DA CATEGORIA
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'team') {
            setFormData(prev => ({ ...prev, team: value, requesterName: '' }));
        } else if (name === 'value') {
            setFormData(prev => ({ ...prev, [name]: formatValueInput(value) }));
        } else if (name === 'crm') {
            const formattedCrm = formatCRM(value);
            setFormData(prev => {
                const newState = { ...prev, crm: formattedCrm };
                if (doctorsDatabase[formattedCrm]) {
                    newState.doctorName = doctorsDatabase[formattedCrm].name;
                    newState.category = doctorsDatabase[formattedCrm].category;
                    try { if (navigator.vibrate) navigator.vibrate([15, 30]); } catch(err){}
                }
                return newState;
            });
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        if (name === 'team') {
            setEditingEntry(prev => ({ ...prev, team: value, requesterName: '' }));
        } else if (name === 'value') {
            setEditingEntry(prev => ({ ...prev, [name]: formatValueInput(value) }));
        } else if (name === 'crm') {
            const formattedCrm = formatCRM(value);
            setEditingEntry(prev => {
                const newState = { ...prev, crm: formattedCrm };
                if (doctorsDatabase[formattedCrm]) {
                    newState.doctorName = doctorsDatabase[formattedCrm].name;
                    newState.category = doctorsDatabase[formattedCrm].category;
                }
                return newState;
            });
        } else {
            setEditingEntry(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return alert("Aguarde a ligação ao servidor");
        
        const { team, requesterName, actionDate, doctorName, value, observations, crm, category, actionType } = formData;
        if (!team || !requesterName || !actionDate || !doctorName || !value || !crm || !category || !actionType) {
            return alert("Preencha todos os campos obrigatórios.");
        }
        try {
            await addDoc(collection(db, COLLECTION_NAME), { ...formData, userId: user.uid, createdAt: new Date() });
            setFormData({ ...formData, actionDate: '', doctorName: '', crm: '', value: '', observations: '', category: '', actionType: '' }); 
            
            if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 30]); 
            setShowSuccessPopup(true);
            setTimeout(() => { setShowSuccessPopup(false); }, 3500); 
            setView('history');
        } catch (err) { alert("Erro ao gravar: " + err.message); }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const { team, requesterName, actionDate, doctorName, value, crm, category, actionType } = editingEntry;
        if (!team || !requesterName || !actionDate || !doctorName || !value || !crm || !category || !actionType) {
            return notify("Preencha todos os campos obrigatórios.", "error");
        }
        try {
            await updateDoc(doc(db, COLLECTION_NAME, editingEntry.id), {
                team, requesterName, actionDate, doctorName, value, crm, category, actionType, observations: editingEntry.observations || ''
            });
            setEditingEntry(null);
            if (navigator.vibrate) navigator.vibrate([30, 50, 30]); 
            notify("Lançamento atualizado com sucesso!");
        } catch(err) {
            notify("Erro ao atualizar a base de dados.", "error");
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
            await deleteDoc(doc(db, COLLECTION_NAME, deleteTarget.id));
            setDeleteTarget(null);
            if (navigator.vibrate) navigator.vibrate(50);
            notify("LANÇAMENTO REMOVIDO.");
        } catch (err) { notify("Erro ao excluir.", "error"); }
    };

    const handleAdminLogin = (e) => {
        e.preventDefault();
        if (ADMIN_USERS[pinInput]) {
            setCurrentAdmin(ADMIN_USERS[pinInput]);
            setPinInput('');
        } else {
            alert("PIN INCORRETO");
        }
    };

    const logoutAdmin = () => { 
        setCurrentAdmin(null); 
        setPinInput(''); 
        setAdminGeneralFilter('TODAS AS DISTRITAIS');
        setAdminRepFilter('TODOS');
    };
    
    const currentReps = REPRESENTATIVES[formData.team] || [];
    const editingReps = editingEntry ? (REPRESENTATIVES[editingEntry.team] || []) : [];

    const isAllTeams = currentAdmin && currentAdmin.isGeneral && adminGeneralFilter === 'TODAS AS DISTRITAIS';
    const hasNoTeam = !currentAdmin && !formData.team;
    const inputDisabled = isAllTeams || hasNoTeam;

    const getFeedTitle = () => {
        if (currentAdmin) {
            if (currentAdmin.isGeneral && adminGeneralFilter === 'TODAS AS DISTRITAIS') return "Total Brasil (Geral)";
            if (currentAdmin.isGeneral && adminGeneralFilter !== 'MINHA EQUIPE') return `Total ${adminGeneralFilter}`;
            return `Total Equipe (${currentAdmin.team})`;
        }
        return formData.team ? `Seu Total (${formData.team})` : "Seu Total Utilizado";
    };

    const numMedicosCarregados = Object.keys(doctorsDatabase).length;

    return (
        <div className="min-h-screen bg-slate-100 pb-24 text-slate-900 font-sans">
            
            {showSuccessPopup && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setShowSuccessPopup(false)}></div>
                    <div className="relative bg-white w-full max-sm:rounded-3xl rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 border border-slate-100 text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-800 rounded-[2rem] flex items-center justify-center text-white font-serif text-5xl font-bold italic shadow-[0_10px_30px_rgba(16,185,129,0.4)] mb-6">
                            PF
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Sucesso!</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8 uppercase tracking-wider leading-relaxed">
                            Seu investimento foi enviado com sucesso.
                        </p>
                        <button onClick={() => setShowSuccessPopup(false)} className="w-full bg-emerald-50 text-emerald-600 font-black py-4 rounded-2xl active:scale-95 transition-all uppercase text-sm tracking-widest border border-emerald-100">
                            Continuar
                        </button>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}></div>
                    <div className="relative bg-white w-full max-sm:rounded-3xl rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 border border-slate-100 text-center">
                        <div className="text-5xl mb-4">⚠️</div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Confirmar Exclusão?</h3>
                        <p className="text-sm text-slate-500 my-4 px-2 italic">Excluir lançamento de <strong className="text-slate-800">{deleteTarget.doctorName}</strong>?</p>
                        <div className="space-y-3">
                            <button onClick={confirmDelete} className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-lg uppercase text-sm tracking-widest">Sim, Apagar</button>
                            <button onClick={() => setDeleteTarget(null)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl active:scale-95 transition-all uppercase text-sm">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {editingEntry && (
                <div className="fixed inset-0 z-[105] flex items-end justify-center bg-slate-900/80 backdrop-blur-sm" onClick={() => setEditingEntry(null)}>
                    <div 
                        className="w-full bg-white rounded-t-[2.5rem] p-6 pb-10 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-full duration-300" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                        <h2 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center justify-center gap-2">
                            <span className="text-xl">✏️</span> Alterar Lançamento
                        </h2>
                        
                        <form onSubmit={handleEditSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Estrutura</label>
                                <TouchSelect name="team" value={editingEntry.team} onChange={handleEditChange} options={TEAMS} placeholder="ESTRUTURA" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Solicitante</label>
                                {editingReps.length > 0 ? (
                                    <TouchSelect name="requesterName" value={editingEntry.requesterName} onChange={handleEditChange} options={[...editingReps, "OUTRO (MANUAL)"]} placeholder="SEU NOME" />
                                ) : (
                                    <input value={editingEntry.requesterName} onChange={handleEditChange} name="requesterName" placeholder="NOME COMPLETO" disabled={!editingEntry.team} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none uppercase focus:border-emerald-500" />
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Data da Ação</label>
                                <input 
                                    type="date" 
                                    name="actionDate" 
                                    value={editingEntry.actionDate || ''} 
                                    onChange={handleEditChange} 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all uppercase text-slate-600" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest italic">
                                        CRM
                                    </label>
                                    <input name="crm" value={editingEntry.crm} onChange={handleEditChange} placeholder="UF0000000" maxLength={9} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none uppercase focus:border-emerald-500 transition-all placeholder:text-slate-400" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Valor (R$)</label>
                                    <input name="value" value={editingEntry.value} onChange={handleEditChange} placeholder="R$ 0,00" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-800 text-sm outline-none focus:border-emerald-500 transition-all text-center placeholder:text-emerald-400" />
                                </div>
                            </div>

                            <input name="doctorName" value={editingEntry.doctorName} onChange={e => setEditingEntry({...editingEntry, doctorName: e.target.value.toUpperCase()})} placeholder="NOME DO MÉDICO / DESTINATÁRIO" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all uppercase placeholder:text-slate-400" />

                            <div className="grid grid-cols-2 gap-4">
                                <TouchSelect name="category" value={editingEntry.category} onChange={handleEditChange} options={CATEGORIES} placeholder="CATEGORIA" />
                                <TouchSelect name="actionType" value={editingEntry.actionType} onChange={handleEditChange} options={ACTION_TYPES} placeholder="AÇÃO" />
                            </div>

                            <textarea name="observations" value={editingEntry.observations} onChange={handleEditChange} placeholder="DETALHE A AÇÃO AQUI..." rows="3" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 transition-all uppercase placeholder:text-slate-400" />
                            
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button type="button" onClick={() => setEditingEntry(null)} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl active:scale-95 transition-all uppercase text-sm">Cancelar</button>
                                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase text-sm tracking-widest">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-50 bg-slate-900 p-5 border-b border-slate-800 shadow-xl text-white">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black italic shadow-lg text-white">PF</div>
                        <div>
                            <h1 className="text-base font-black tracking-tight uppercase leading-none">Pierre Fabre</h1>
                            <p className="text-[10px] text-emerald-400 font-bold tracking-[0.3em] uppercase mt-1">
                                Corporate Brasil {numMedicosCarregados > 0 ? `• 🟢 ${numMedicosCarregados} MD` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={exportToCSV} className="bg-slate-800 text-emerald-400 font-bold py-2 px-3 rounded-lg text-xs uppercase tracking-wider active:scale-90 transition-all border border-slate-700">
                        Exportar CSV
                    </button>
                </div>
            </header>

            {status.msg && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-emerald-100 px-6 py-3 rounded-full shadow-2xl border border-emerald-700 font-bold text-xs animate-bounce uppercase text-center w-3/4 max-w-xs">
                    {status.msg}
                </div>
            )}

            <main className="max-w-md mx-auto p-4">
                {view === 'form' && (
                    <div className="bg-white rounded-[2rem] p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                        <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-7 flex items-center gap-2">
                            Nova Solicitação
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            <div className="group space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Sua Estrutura</label>
                                <TouchSelect name="team" value={formData.team} onChange={handleInputChange} options={TEAMS} placeholder="SELECIONAR ESTRUTURA..." />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Seu Nome (Solicitante)</label>
                                {currentReps.length > 0 ? (
                                    <TouchSelect name="requesterName" value={formData.requesterName} onChange={handleInputChange} options={[...currentReps, "OUTRO (MANUAL)"]} placeholder="SELECIONAR SEU NOME..." />
                                ) : (
                                    <input 
                                        value={formData.requesterName} 
                                        onChange={e => setFormData({...formData, requesterName: e.target.value})} 
                                        placeholder={formData.team ? "DIGITE SEU NOME COMPLETO" : "ESCOLHA A ESTRUTURA ACIMA"} 
                                        disabled={!formData.team}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none uppercase transition-all focus:border-emerald-500" 
                                    />
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Data da Ação</label>
                                <input 
                                    type="date" 
                                    name="actionDate" 
                                    value={formData.actionDate} 
                                    onChange={handleInputChange} 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all uppercase text-slate-600" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest italic">
                                        CRM
                                    </label>
                                    <input 
                                        name="crm"
                                        value={formData.crm} 
                                        onChange={handleInputChange} 
                                        placeholder="UF0000000" 
                                        maxLength={9}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none uppercase focus:border-emerald-500 transition-all placeholder:text-slate-400" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Valor (R$)</label>
                                    <input name="value" value={formData.value} onChange={handleInputChange} placeholder="R$ 0,00" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl font-black text-emerald-800 text-sm outline-none focus:border-emerald-500 transition-all text-center placeholder:text-emerald-400" />
                                </div>
                            </div>

                            <input name="doctorName" value={formData.doctorName} onChange={e => setFormData({...formData, doctorName: e.target.value.toUpperCase()})} placeholder="NOME DO MÉDICO / DESTINATÁRIO" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-emerald-500 transition-all uppercase placeholder:text-slate-400" />

                            <div className="grid grid-cols-2 gap-4">
                                <TouchSelect name="category" value={formData.category} onChange={handleInputChange} options={CATEGORIES} placeholder="CATEGORIA..." />
                                <TouchSelect name="actionType" value={formData.actionType} onChange={handleInputChange} options={ACTION_TYPES} placeholder="AÇÃO..." />
                            </div>

                            <textarea name="observations" value={formData.observations} onChange={handleInputChange} placeholder="DETALHE A AÇÃO AQUI..." rows="3" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-emerald-500 transition-all uppercase placeholder:text-slate-400" />
                            
                            <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-2xl active:scale-[0.96] transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest mt-4">
                                Registrar solicitação
                            </button>
                        </form>
                    </div>
                )}

                {view === 'history' && (
                    <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500 pb-10">
                        
                        {currentAdmin && currentAdmin.isGeneral && (
                            <select 
                                value={adminGeneralFilter} 
                                onChange={e => {
                                    setAdminGeneralFilter(e.target.value);
                                    setAdminRepFilter('TODOS');
                                }} 
                                className="w-full p-3.5 bg-slate-900 text-white rounded-2xl font-bold text-xs outline-none shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest"
                            >
                                <option value="TODAS AS DISTRITAIS">🌎 VISÃO GERAL BRASIL (SOMA)</option>
                                <option value="MINHA EQUIPE">👤 MINHA EQUIPE ({currentAdmin.team})</option>
                                {TEAMS.map(t => <option key={t} value={t}>📍 {t}</option>)}
                            </select>
                        )}

                        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl text-white space-y-5 border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">
                                        {getFeedTitle()}
                                    </p>
                                    <h4 className="text-2xl font-black tracking-tight">R$ {Number(totalUsedFeed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Registos</p>
                                    <h4 className="text-2xl font-black text-slate-300">{feedEntries.length}</h4>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5 relative z-10">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        {isAllTeams ? "Teto do Brasil" : "Teto da Distrital"}
                                    </label>
                                    <input 
                                        value={displayBudgetCeiling} 
                                        onChange={e => handleBudgetChange(formatValueInput(e.target.value))} 
                                        placeholder={isAllTeams ? "SOMA AUTOMÁTICA" : "R$ 0,00"} 
                                        disabled={inputDisabled}
                                        className={`w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm font-black text-emerald-100 focus:ring-2 focus:ring-emerald-500 uppercase text-center transition-all ${inputDisabled ? 'opacity-60 cursor-not-allowed' : ''}`} 
                                    />
                                </div>
                                <div className="text-right flex flex-col justify-end">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Livre</p>
                                    <h4 className={`text-lg font-black ${budgetBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        R$ {Number(budgetBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </h4>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {feedStatsByRep.length > 0 && currentAdmin && (
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 border-l-2 border-emerald-500 pl-2">Top Representantes</h3>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                        {feedStatsByRep.map((s, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1.5 last:border-0">
                                                <span className="font-bold text-slate-600 truncate pr-2 uppercase">{i+1}. {s.name}</span>
                                                <span className="font-black text-emerald-600 shrink-0">R$ {Number(s.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                {feedStatsByAction.length > 0 && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 border-l-2 border-sky-500 pl-2">Top Ações</h3>
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                            {feedStatsByAction.map((s, i) => (
                                                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1.5 last:border-0">
                                                <span className="font-bold text-slate-600 truncate pr-2 uppercase">{i+1}. {s.name}</span>
                                                    <span className="font-black text-sky-600 shrink-0">R$ {Number(s.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {feedStatsByDoctor.length > 0 && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 border-l-2 border-indigo-500 pl-2">Top Médicos (Por CRM)</h3>
                                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                            {feedStatsByDoctor.map((s, i) => (
                                                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0">
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        <span className="font-bold text-slate-700 truncate uppercase">{i+1}. {s.doctorName}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{s.crm}</span>
                                                            <span className="text-[9px] font-black uppercase text-indigo-500">{s.category}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-black text-indigo-600 shrink-0 text-sm">R$ {Number(s.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between items-center px-3 mt-8">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest border-l-4 border-emerald-500 pl-2">
                                Lista de Atividades
                            </h2>
                        </div>
                        
                        {feedEntries.length === 0 ? (
                            <div className="bg-white p-10 rounded-3xl text-center border border-dashed border-slate-300">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    {!formData.requesterName && !currentAdmin
                                        ? "Selecione seu nome na aba NOVO para visualizar."
                                        : "Nenhum lançamento encontrado."}
                                </p>
                            </div>
                        ) : (
                            feedEntries.map(e => {
                                const formattedActionDate = e.actionDate ? new Date(e.actionDate + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                                return (
                                    <div key={e.id} className="bg-white p-5 rounded-2xl shadow-md border border-slate-100 flex flex-col active:scale-[0.98] transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0 pr-4 text-left">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">{String(e.team || 'S/ Equipe')}</span>
                                                    {formattedActionDate && (
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">📅 {formattedActionDate}</span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-sm truncate uppercase leading-tight">{String(e.doctorName || '')} <span className="text-slate-400 font-normal ml-1">({String(e.category || '')})</span></h3>
                                                <p className="text-[11px] text-slate-500 font-bold uppercase truncate opacity-70 mt-0.5">{String(e.requesterName || '')} • {String(e.actionType || '')}</p>
                                                {e.observations && <p className="text-[9px] text-slate-400 italic mt-1.5 truncate">Det: {e.observations}</p>}
                                            </div>
                                            <div className="text-right shrink-0 flex flex-col items-end">
                                                <p className="font-black text-slate-900 text-sm uppercase tracking-tighter">R$ {String(e.value || '0,00')}</p>
                                                {/* CORREÇÃO DO ERRO AQUI ABAIXO: 'e.createdAt' em vez de 'entry.createdAt' */}
                                                <p className="text-[10px] text-slate-400 font-bold mt-1">{formatDate(e.createdAt)}</p>
                                            </div>
                                        </div>

                                        {!currentAdmin && e.userId === user?.uid && (
                                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-50">
                                                <button onClick={() => setEditingEntry(e)} className="bg-sky-50 text-sky-600 font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase active:scale-90 transition-all border border-sky-100">
                                                    Editar
                                                </button>
                                                <button onClick={() => setDeleteTarget(e)} className="bg-rose-50 text-rose-600 font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase active:scale-90 transition-all border border-rose-100">
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {view === 'admin' && (
                    <div className="animate-in fade-in duration-500">
                        {!currentAdmin ? (
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center border border-slate-100 mt-10">
                                <div className="text-5xl mb-4">🛡️</div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight uppercase">Portal do Gestor</h2>
                                <p className="text-xs text-slate-400 font-bold mt-2 mb-8">Área restrita à liderança.</p>
                                <form onSubmit={handleAdminLogin} className="space-y-6">
                                    <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="PIN" className="w-full p-5 bg-slate-100 rounded-2xl text-center text-4xl font-black tracking-[0.5em] outline-none border-2 border-transparent focus:border-emerald-500 uppercase shadow-inner transition-all" maxLength={6} />
                                    <button type="submit" className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase text-sm tracking-widest active:scale-95 transition-all">Acessar Painel</button>
                                </form>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl flex justify-between items-center transition-all">
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1.5 italic">Gestão: {currentAdmin.isGeneral ? "Nacional" : "Regional"}</p>
                                        <h3 className="font-bold text-lg tracking-tight uppercase leading-tight">{currentAdmin.name}</h3>
                                    </div>
                                    <button onClick={logoutAdmin} className="text-xs font-black uppercase bg-rose-500/20 text-rose-400 px-4 py-2.5 rounded-xl active:scale-90 shadow-md border border-rose-500/30 transition-all">Sair</button>
                                </div>

                                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2 border-l-2 border-emerald-500 pl-2">
                                        <span className="text-lg">🔍</span> Filtros de Pesquisa
                                    </h3>
                                    
                                    <div className="space-y-5">
                                        {currentAdmin.isGeneral && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Distrital / Equipe</label>
                                                <TouchSelect 
                                                    name="adminGeneralFilter" 
                                                    value={adminGeneralFilter} 
                                                    onChange={(e) => {
                                                        setAdminGeneralFilter(e.target.value);
                                                        setAdminRepFilter('TODOS'); 
                                                    }} 
                                                    options={['TODAS AS DISTRITAIS', 'MINHA EQUIPE', ...TEAMS]} 
                                                    placeholder="SELECIONAR DISTRITAL" 
                                                />
                                            </div>
                                        )}

                                        <div className={`space-y-1.5 ${effectiveAdminTeam ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                            <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase tracking-widest italic">Representante</label>
                                            <TouchSelect 
                                                name="adminRepFilter" 
                                                value={adminRepFilter} 
                                                onChange={(e) => setAdminRepFilter(e.target.value)} 
                                                options={['TODOS', ...adminAvailableReps]} 
                                                placeholder={effectiveAdminTeam ? "TODOS OS REPRESENTANTES" : "SELECIONE UMA DISTRITAL ANTES"} 
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex bg-slate-200 p-1.5 rounded-2xl shadow-inner text-center">
                                    <button onClick={() => setAdminTab('reports')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${adminTab === 'reports' ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>Relatórios</button>
                                    <button onClick={() => setAdminTab('manage')} className={`flex-1 py-3 text-xs font-black uppercase rounded-xl transition-all ${adminTab === 'manage' ? 'bg-white text-rose-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>Feed da Equipe</button>
                                </div>

                                {adminTab === 'reports' ? (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-200 text-center uppercase"><p className="text-[10px] font-black text-slate-400 mb-2 tracking-widest leading-none">Investimento</p><h4 className="text-lg font-black text-emerald-600 leading-none">R$ {Number(totalInvestedAdmin).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4></div>
                                            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-200 text-center uppercase"><p className="text-[10px] font-black text-slate-400 mb-2 tracking-widest leading-none">Total Lançamentos</p><h4 className="text-3xl font-black text-slate-800 leading-none">{countEntriesAdmin}</h4></div>
                                        </div>

                                        {currentAdmin.isGeneral && adminGeneralFilter === 'TODAS AS DISTRITAIS' && (
                                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">Total por Distrital</h3>
                                                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                                                    {statsByTeam.map((s, i) => (
                                                        <div key={i} className="space-y-2 animate-in slide-in-from-left-2 duration-300 border-b border-slate-50 pb-2 last:border-0">
                                                            <div className="flex justify-between text-[11px] font-bold uppercase">
                                                                <span className="text-slate-600 truncate pr-4 leading-none">{i+1}. {s.name}</span>
                                                                <span className="text-emerald-700 font-black shrink-0">R$ {Number(s.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner"><div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: totalInvestedAdmin > 0 ? `${(s.total/totalInvestedAdmin)*100}%` : '0%' }}></div></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">👉</div>
                                                <p className="text-[10px] text-emerald-800 font-black uppercase tracking-wider leading-tight">Deslize para a direita<br/><span className="text-emerald-600 font-medium">para editar</span></p>
                                            </div>
                                            <div className="w-[1px] h-6 bg-emerald-200"></div>
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] text-rose-800 font-black uppercase tracking-wider leading-tight text-right">Deslize esquerda<br/><span className="text-rose-600 font-medium">para excluir</span></p>
                                                <div className="text-2xl">👈</div>
                                            </div>
                                        </div>
                                        
                                        {filteredEntriesAdmin.map(e => (
                                            <SwipeableEntry 
                                                key={e.id} 
                                                entry={e} 
                                                formatDate={formatDate}
                                                onEdit={(entry) => setEditingEntry(entry)}
                                                onDelete={(entry) => setDeleteTarget(entry)}
                                            />
                                        ))}

                                        {filteredEntriesAdmin.length === 0 && (
                                            <div className="bg-white p-10 rounded-3xl text-center border border-dashed border-slate-300">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                                    Nenhum lançamento encontrado para os filtros selecionados.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <nav className="fixed bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around p-4 z-50 shadow-[0_-15px_40px_rgba(0,0,0,0.1)]">
                <button onClick={() => setView('form')} className={`flex flex-col items-center gap-1.5 p-2 transition-all active:scale-90 ${view === 'form' ? 'text-emerald-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><span className="text-2xl mb-1">➕</span><span className="text-[11px] font-black uppercase tracking-tighter">Novo</span></button>
                <button onClick={() => setView('history')} className={`flex flex-col items-center gap-1.5 p-2 transition-all active:scale-90 ${view === 'history' ? 'text-emerald-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><span className="text-2xl mb-1">📋</span><span className="text-[11px] font-black uppercase tracking-tighter">Feed</span></button>
                <div className="w-[1.5px] h-10 bg-slate-200 self-center"></div>
                <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1.5 p-2 transition-all active:scale-90 ${view === 'admin' ? 'text-slate-900 scale-110' : 'text-slate-400 hover:text-slate-600'}`}><span className="text-2xl mb-1">🛡️</span><span className="text-[11px] font-black uppercase tracking-tighter">Gestor</span></button>
            </nav>
        </div>
    );
}

