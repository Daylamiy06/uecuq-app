/* Magasin central : état, écoute Firebase, saisie, suppression */
const REQ = {membres:['matricule','nom'], cotisations:['membreId','montant','date'], activites:['titre','montant','date'],
  prets:['membreId','motif','montant','date'], remboursements:['pretId','montant','date'], depenses:['motif','montant','date']};
const TITLES = {membres:'Membre', cotisations:'Nouveau versement', activites:'Activité', prets:'Nouveau prêt', remboursements:'Remboursement', depenses:'Dépense'};
const sum = (a, k='montant') => Math.round(a.reduce((s, x) => s + (+x[k] || 0), 0) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const memo = new Map();
const cache = (k, deps, fn) => { const m = memo.get(k); if (m && m.deps.every((x, i) => x === deps[i])) return m.v; const v = fn(); memo.set(k, {deps, v}); return v; };

const CORE = {
  user:null, ready:false, email:'', pass:'', err:'', denied:false, loading:true, busy:false, msg:'', online:true, tab:'dash', modal:null, f:{}, q:'',
  year:new Date().getFullYear(), openLoan:null, titles:TITLES, sum,
  tabs:[['dash','fa-gauge-high','Tableau de bord','Accueil'],['membres','fa-users','Membres','Membres'],['cotisations','fa-coins','Cotisations','Cotisations'],['activites','fa-calendar-check','Activités','Activités'],['prets','fa-handshake','Prêts','Prêts'],['depenses','fa-receipt','Dépenses','Dépenses']],
  d:{membres:[], cotisations:[], activites:[], prets:[], remboursements:[], depenses:[], exercices:{}},
  init() {
    if (!window.fbOk) { this.ready = true; this.err = 'Impossible de charger Firebase. Vérifiez la connexion internet.'; return; }
    auth.onAuthStateChanged(u => { this.user = u; this.ready = true; if (u) this.listen(); else this.reset(); });
  },
  listen() {
    this.unlisten(); this.denied = false; this.loading = true;
    const keys = Object.keys(REQ).concat('exercices'), got = new Set();
    const fail = () => { this.denied = true; this.loading = false; };
    const mark = k => { got.add(k); if (got.size == keys.length) this.loading = false; };
    keys.forEach(k => db.ref(k).on('value', s => {
      this.d[k] = k == 'exercices' ? (s.val() || {}) : Object.entries(s.val() || {}).map(([id, o]) => ({id, ...o}));
      mark(k);
    }, fail));
    db.ref('.info/connected').on('value', s => { this.online = s.val() === true; });
  },
  unlisten() { Object.keys(REQ).concat('exercices', '.info/connected').forEach(k => db.ref(k).off()); },
  reset() {
    this.unlisten(); this.email = ''; this.pass = ''; this.err = ''; this.busy = false; this.modal = null; this.f = {}; this.q = '';
    this.tab = 'dash'; this.openLoan = null; this.denied = false; this.loading = true; this.online = true;
    this.d = {membres:[], cotisations:[], activites:[], prets:[], remboursements:[], depenses:[], exercices:{}};
  },
  notify(m) { this.msg = m; clearTimeout(this._t); this._t = setTimeout(() => { this.msg = ''; }, 4000); },
  async login() {
    if (this.busy) return; this.err = ''; this.busy = true;
    try { await auth.signInWithEmailAndPassword(this.email.trim(), this.pass); this.pass = ''; }
    catch (e) { this.err = e.code == 'auth/network-request-failed' ? 'Connexion impossible. Vérifiez votre connexion internet.' : e.code == 'auth/too-many-requests' ? 'Trop de tentatives. Réessayez dans quelques minutes.' : 'Adresse e-mail ou mot de passe incorrect.'; }
    this.busy = false;
  },
  logout() { auth.signOut(); },
  fmt(n) { return new Intl.NumberFormat('fr-FR', {maximumFractionDigits:2}).format(n || 0) + ' SAR'; },
  dt(s) { return s ? s.split('-').reverse().join('/') : ''; },
  nom(id) { return this.d.membres.find(m => m.id == id)?.nom || 'Membre supprimé'; },
  byDate(a) { return [...a].sort((x, y) => (y.date || '').localeCompare(x.date || '')); },
  bc(l) { return {'Soldé':'bg-emerald-100 text-emerald-700','Remboursé':'bg-emerald-100 text-emerald-700','Partiel':'bg-amber-100 text-amber-700','En cours':'bg-amber-100 text-amber-700','Non payé':'bg-rose-100 text-rose-700'}[l]; },
  open(t, pre = {}) { this.err = ''; this.f = {...(t != 'membres' && {date:today()}), ...pre}; this.modal = t; },
  async save() {
    const t = this.modal, f = {...this.f}, id = f.id; delete f.id;
    if (t == 'membres') f.matricule = String(f.matricule ?? '').trim();
    for (const k of REQ[t]) if (!String(f[k] ?? '').trim()) return this.err = 'Veuillez renseigner les champs obligatoires.';
    if (f.montant != null) { f.montant = +f.montant; if (!(f.montant > 0)) return this.err = 'Le montant doit être supérieur à 0.'; }
    if (t == 'membres' && this.d.membres.some(m => m.id != id && String(m.matricule).toLowerCase() == f.matricule.toLowerCase())) return this.err = 'Ce matricule existe déjà.';
    if (t == 'cotisations') f.annee = +(f.annee || this.year);
    if (t == 'remboursements') { const p = this.loanRows.find(x => x.id == f.pretId); if (f.montant > p.reste) return this.err = 'Le remboursement dépasse le reste dû (' + this.fmt(p.reste) + ').'; }
    (id ? db.ref(t + '/' + id).update(f) : db.ref(t).push(f))
      .then(() => this.notify('Enregistrement effectué.'))
      .catch(() => this.notify("L'enregistrement a échoué. Vérifiez vos droits d'accès."));
    this.modal = null;
  },
  del(t, id) {
    if (t == 'membres' && ['cotisations', 'prets'].some(k => this.d[k].some(x => x.membreId == id))) return alert('Ce membre a des opérations enregistrées : suppression impossible.');
    if (t == 'prets' && this.d.remboursements.some(r => r.pretId == id)) return alert("Supprimez d'abord les remboursements de ce prêt.");
    if (confirm('Supprimer cet enregistrement ?')) db.ref(t + '/' + id).remove().catch(() => this.notify('La suppression a échoué.'));
  },
};

/* Assemble le noyau et les modules (les getters sont conservés) */
function app() {
  const o = {};
  [CORE, ...UE.mods].forEach(m => Object.defineProperties(o, Object.getOwnPropertyDescriptors(m)));
  return o;
}
