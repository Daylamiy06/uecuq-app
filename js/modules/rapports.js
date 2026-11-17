/* Module rapports : solde de la caisse, journal des opérations et export CSV */

UE.mods.push({
  /* Solde laissé par le trésorier précédent */
  get initialBalance() { return +this.data.soldeInitial?.montant || 0; },

  /* Solde de la caisse = solde initial + entrées − sorties */
  get solde() {
    const entrees = this.initialBalance + this.totalCotisations + this.totalActivites + this.totalRemboursements;
    const sorties = this.totalPrets + this.totalDepenses;
    return entrees - sorties;
  },

  /* Journal : toutes les opérations, de la plus récente à la plus ancienne.
     Chaque ligne a soit `entree` (argent reçu), soit `sortie` (argent sorti). */
  get movements() {
    const data = this.data;
    const deps = [data.cotisations, data.activites, data.remboursements, data.prets, data.depenses, data.membres, data.soldeInitial];

    return cache('movements', deps, () => {
      const loanMember = loanId => this.memberName(data.prets.find(p => p.id == loanId)?.membreId);

      const rows = [
        ...data.cotisations.map(c => ({key: 'c' + c.id, date: c.date, type: 'Cotisation', label: this.memberName(c.membreId), entree: c.montant})),
        ...data.activites.map(a => ({key: 'a' + a.id, date: a.date, type: a.type == 'aide' ? 'Aide' : 'Activité', label: a.titre, entree: a.montant})),
        ...data.remboursements.map(r => ({key: 'r' + r.id, date: r.date, type: 'Remboursement', label: loanMember(r.pretId), entree: r.montant})),
        ...data.prets.map(p => ({key: 'p' + p.id, date: p.date, type: 'Prêt', label: this.memberName(p.membreId), sortie: p.montant})),
        ...data.depenses.map(x => ({key: 'd' + x.id, date: x.date, type: 'Dépense', label: x.motif, sortie: x.montant})),
      ];

      if (this.initialBalance) {
        rows.push({key: 'init', date: data.soldeInitial.date || '', type: 'Solde initial', label: data.soldeInitial.note || 'Report du mandat précédent', entree: this.initialBalance});
      }
      return this.byDate(rows);
    });
  },

  /* Télécharge le journal au format CSV (séparateur « ; », lisible par Excel) */
  exportCsv() {
    const quote = cell => '"' + String(cell ?? '').replace(/"/g, '""') + '"';
    const header = ['Date', 'Type', 'Libellé', 'Entrée (' + CURRENCY + ')', 'Sortie (' + CURRENCY + ')'];
    const lines = this.movements.map(m => [m.date, m.type, m.label, m.entree || 0, m.sortie || 0]);
    const csv = [header, ...lines].map(row => row.map(quote).join(';')).join('\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], {type: 'text/csv'}));
    link.download = 'journal-tresorerie-' + today() + '.csv';
    link.click();
  },
});
