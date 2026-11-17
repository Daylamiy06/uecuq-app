const REQUIRED_FIELDS = {
  membres: ['matricule', 'nom'],
  cotisations: ['membreId', 'montant', 'date'],
  activites: ['titre', 'montant', 'date'],
  prets: ['membreId', 'motif', 'montant', 'date'],
  remboursements: ['pretId', 'montant', 'date'],
  depenses: ['motif', 'montant', 'date'],
};
const COLLECTIONS = Object.keys(REQUIRED_FIELDS);
const SINGLE_NODES = ['exercices', 'soldeInitial'];

/* Tous les nœuds écoutés en temps réel */
const WATCHED_NODES = [...COLLECTIONS, ...SINGLE_NODES];
const CURRENCY = 'SAR';
const FORM_TITLES = {
  membres: 'Membre',
  cotisations: 'Nouveau versement',
  activites: 'Activité',
  prets: 'Nouveau prêt',
  remboursements: 'Remboursement',
  depenses: 'Dépense',
  soldeInitial: 'Solde initial',
};

const DELETE_LABELS = {
  membres: 'ce membre',
  cotisations: 'ce versement',
  activites: 'cette activité',
  prets: 'ce prêt',
  remboursements: 'ce remboursement',
  depenses: 'cette dépense',
};

/* Couleur des pastilles de statut */
const BADGE_CLASSES = {
  'Soldé':     'bg-emerald-100 text-emerald-700',
  'Remboursé': 'bg-emerald-100 text-emerald-700',
  'Partiel':   'bg-amber-100 text-amber-700',
  'En cours':  'bg-amber-100 text-amber-700',
  'Non payé':  'bg-rose-100 text-rose-700',
};

const round2 = n => Math.round(n * 100) / 100;
const sum = (rows, key = 'montant') => round2(rows.reduce((total, row) => total + (+row[key] || 0), 0));
const today = () => new Date().toISOString().slice(0, 10);
const memo = new Map();
function cache(key, deps, compute) {
  const hit = memo.get(key);
  if (hit && hit.deps.every((dep, i) => dep === deps[i])) return hit.value;
  const value = compute();
  memo.set(key, {deps, value});
  return value;
}

const emptyData = () => Object.fromEntries([
  ...COLLECTIONS.map(name => [name, []]),
  ...SINGLE_NODES.map(name => [name, {}]),
]);

const sessionDefaults = () => ({
  email: '',
  password: '',
  busy: false,
  error: '',
  loading: true,
  denied: false,
  online: true,
  data: emptyData(),
  tab: 'dash',
  search: '',
  openLoan: null,
  modal: null,
  form: {},
  dialog: null,
});

const CORE_STATE = {
  user: null,
  ready: false,
  toast: '',
  year: new Date().getFullYear(),
  titles: FORM_TITLES,
  sum,

  /* Onglets de navigation */
  tabs: [
    {id: 'dash',        icon: 'fa-gauge-high',     title: 'Tableau de bord', short: 'Accueil'},
    {id: 'membres',     icon: 'fa-users',          title: 'Membres',         short: 'Membres'},
    {id: 'cotisations', icon: 'fa-coins',          title: 'Cotisations',     short: 'Cotisations'},
    {id: 'activites',   icon: 'fa-calendar-check', title: 'Activités',       short: 'Activités'},
    {id: 'prets',       icon: 'fa-handshake',      title: 'Prêts',           short: 'Prêts'},
    {id: 'depenses',    icon: 'fa-receipt',        title: 'Dépenses',        short: 'Dépenses'},
  ],

  get tabTitle() { return this.tabs.find(t => t.id == this.tab).title; },
  ...sessionDefaults(),
};

const AUTH_ERRORS = {
  'auth/network-request-failed': 'Connexion impossible. Vérifiez votre connexion internet.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
};
const AUTH_DEFAULT_ERROR = 'Adresse e-mail ou mot de passe incorrect.';

const CORE_AUTH = {
  init() {
    if (!firebaseReady) {
      this.ready = true;
      this.error = 'Impossible de charger Firebase. Vérifiez la connexion internet.';
      return;
    }
    auth.onAuthStateChanged(user => {
      this.user = user;
      this.ready = true;
      if (user) this.listen();
      else this.reset();
    });
  },

  async login() {
    if (this.busy) return;
    this.error = '';
    if (!this.email.trim() || !this.password) {
      this.error = 'Veuillez saisir votre adresse e-mail et votre mot de passe.';
      return;
    }
    this.busy = true;
    try {
      await auth.signInWithEmailAndPassword(this.email.trim(), this.password);
      this.password = '';
    } catch (e) {
      this.error = AUTH_ERRORS[e.code] || AUTH_DEFAULT_ERROR;
    }
    this.busy = false;
  },

  logout() { auth.signOut(); },
};

function parseSnapshot(node, snapshot) {
  const value = snapshot.val() || {};
  if (SINGLE_NODES.includes(node)) return value;
  return Object.entries(value).map(([id, record]) => ({id, ...record}));
}

const CORE_DATA = {
  listen() {
    this.unlisten();
    this.denied = false;
    this.loading = true;

    const loaded = new Set();
    const onLoaded = node => {
      loaded.add(node);
      if (loaded.size == WATCHED_NODES.length) this.loading = false;
    };
    const onDenied = () => {
      this.denied = true;
      this.loading = false;
    };

    WATCHED_NODES.forEach(node => {
      db.ref(node).on('value', snapshot => {
        this.data[node] = parseSnapshot(node, snapshot);
        onLoaded(node);
      }, onDenied);
    });

    db.ref('.info/connected').on('value', snapshot => { this.online = snapshot.val() === true; });
  },

  unlisten() {
    [...WATCHED_NODES, '.info/connected'].forEach(node => db.ref(node).off());
  },

  reset() {
    this.closeDialog(false);
    this.unlisten();
    Object.assign(this, sessionDefaults());
  },
};

let toastTimer;
const CORE_FORMAT = {
  fmtMoney(n) {
    return new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 2}).format(n || 0) + ' ' + CURRENCY;
  },

  fmtDate(iso) { return iso ? iso.split('-').reverse().join('/') : ''; },

  /* Copie de la liste triée du plus récent au plus ancien */
  byDate(rows) { return [...rows].sort((a, b) => (b.date || '').localeCompare(a.date || '')); },

  badgeClass(status) { return BADGE_CLASSES[status]; },

  /* Affiche un message en bas de l'écran pendant 4 secondes */
  notify(message) {
    this.toast = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { this.toast = ''; }, 4000);
  },
};

let dialogAnswer = null;
const CORE_DIALOGS = {
  askConfirm(options) {
    return this.openDialog({icon: 'fa-circle-question', danger: false, ok: 'Confirmer', cancel: 'Annuler', ...options, kind: 'confirm'});
  },

  showInfo(options) {
    return this.openDialog({icon: 'fa-triangle-exclamation', danger: false, ok: 'Compris', ...options, kind: 'info'});
  },

  openDialog(config) {
    this.closeDialog(false);
    return new Promise(resolve => {
      dialogAnswer = resolve;
      this.dialog = config;
    });
  },

  closeDialog(response) {
    if (!this.dialog) return;
    this.dialog = null;
    dialogAnswer(response);
    dialogAnswer = null;
  },
};

const CORE_RECORDS = {
  openForm(type, preset = {}) {
    const defaults = type == 'membres' ? {} : {date: today()};
    this.error = '';
    this.form = {...defaults, ...preset};
    this.modal = type;
  },

  /* Valide le formulaire puis l'enregistre dans Firebase */
  save() {
    const type = this.modal;
    const {id, ...data} = this.form;

    const error = type == 'soldeInitial' ? this.checkSoldeInitial(data) : this.checkRecord(type, data, id);
    if (error) {
      this.error = error;
      return;
    }

    this.writeRecord(type, id, data);
    this.modal = null;
  },

  checkSoldeInitial(data) {
    data.montant = round2(+data.montant);
    if (!(data.montant >= 0) || !data.date) return 'Veuillez renseigner un montant et une date.';
    return '';
  },

  checkRecord(type, data, id) {
    if (type == 'membres') data.matricule = String(data.matricule ?? '').trim();

    const missingField = REQUIRED_FIELDS[type].some(field => !String(data[field] ?? '').trim());
    if (missingField) return 'Veuillez renseigner les champs obligatoires.';

    if (data.montant != null) {
      data.montant = round2(+data.montant);
      if (!(data.montant > 0)) return 'Le montant doit être supérieur à 0.';
    }

    if (type == 'membres') {
      const sameMatricule = m => m.id != id && String(m.matricule).toLowerCase() == data.matricule.toLowerCase();
      if (this.data.membres.some(sameMatricule)) return 'Ce matricule existe déjà.';
    }

    if (type == 'cotisations') data.annee = +(data.annee || this.year);
    if (type == 'remboursements') {
      const loan = this.loans.find(l => l.id == data.pretId);
      if (data.montant > loan.reste) return `Le remboursement dépasse le reste dû (${this.fmtMoney(loan.reste)}).`;
    }
    return '';
  },

  writeRecord(type, id, data) {
    let request;
    if (type == 'soldeInitial') {
      request = data.montant
        ? db.ref('soldeInitial').set({montant: data.montant, date: data.date, note: data.note || ''})
        : db.ref('soldeInitial').remove();
    } else {
      request = id ? db.ref(`${type}/${id}`).update(data) : db.ref(type).push(data);
    }

    request
      .then(() => this.notify('Enregistrement effectué.'))
      .catch(() => this.notify("L'enregistrement a échoué. Vérifiez vos droits d'accès."));
  },

  deleteBlocker(type, id) {
    const memberHasOperations = ['cotisations', 'prets'].some(name => this.data[name].some(x => x.membreId == id));
    if (type == 'membres' && memberHasOperations) {
      return 'Ce membre a des opérations enregistrées (cotisations ou prêts). Il ne peut pas être supprimé.';
    }
    if (type == 'prets' && this.data.remboursements.some(r => r.pretId == id)) {
      return "Supprimez d'abord les remboursements de ce prêt.";
    }
    return '';
  },

  async deleteRecord(type, id) {
    const blocker = this.deleteBlocker(type, id);
    if (blocker) return this.showInfo({title: 'Suppression impossible', message: blocker});

    const confirmed = await this.askConfirm({
      title: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer ${DELETE_LABELS[type]} ? Cette action est définitive.`,
      icon: 'fa-trash-can',
      danger: true,
      ok: 'Supprimer',
    });
    if (!confirmed) return;
    db.ref(`${type}/${id}`).remove().catch(() => this.notify('La suppression a échoué.'));
  },
};

const CORE_PARTS = [CORE_STATE, CORE_AUTH, CORE_DATA, CORE_FORMAT, CORE_DIALOGS, CORE_RECORDS];
function app() {
  const component = {};
  [...CORE_PARTS, ...UE.mods].forEach(part => Object.defineProperties(component, Object.getOwnPropertyDescriptors(part)));
  return component;
}
