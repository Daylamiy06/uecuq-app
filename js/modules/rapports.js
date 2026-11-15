/* Module rapports : calculs et actions */
UE.mods.push({
  get report() { return +this.d.soldeInitial?.montant || 0; },
  get solde() { return this.report + this.totCot + this.totAct + this.totRemb - this.totPrets - this.totDep; },
  get mv() { return cache('mv', [this.d.cotisations, this.d.activites, this.d.remboursements, this.d.prets, this.d.depenses, this.d.membres, this.d.soldeInitial], () => this._mv()); },
  _mv() {
    const m = this.d, pn = id => this.nom(m.prets.find(p => p.id == id)?.membreId);
    return [
      ...m.cotisations.map(x => ({k:'c'+x.id, date:x.date, t:'Cotisation', l:this.nom(x.membreId), ent:x.montant})),
      ...m.activites.map(x => ({k:'a'+x.id, date:x.date, t:x.type == 'aide' ? 'Aide' : 'Activité', l:x.titre, ent:x.montant})),
      ...m.remboursements.map(x => ({k:'r'+x.id, date:x.date, t:'Remboursement', l:pn(x.pretId), ent:x.montant})),
      ...m.prets.map(x => ({k:'p'+x.id, date:x.date, t:'Prêt', l:this.nom(x.membreId), sor:x.montant})),
      ...m.depenses.map(x => ({k:'d'+x.id, date:x.date, t:'Dépense', l:x.motif, sor:x.montant})),
      ...(this.report ? [{k:'init', date:m.soldeInitial.date || '', t:'Solde initial', l:m.soldeInitial.note || 'Report du mandat précédent', ent:this.report}] : [])
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },
  exportCsv() {
    const q = c => '"' + String(c ?? '').replace(/"/g, '""') + '"';
    const rows = [['Date', 'Type', 'Libellé', 'Entrée (SAR)', 'Sortie (SAR)']].concat(this.mv.map(x => [x.date, x.t, x.l, x.ent || 0, x.sor || 0]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(q).join(';')).join('\n')], {type:'text/csv'}));
    a.download = 'journal-tresorerie-' + today() + '.csv'; a.click();
  },
});
