/* Module prets : calculs et actions */
UE.mods.push({
  loanSt(p) { return p.reste <= 0 ? 'Remboursé' : p.paid > 0 ? 'Partiel' : 'En cours'; },
  get loanRows() { return cache('lr', [this.d.prets, this.d.remboursements], () => this._loanRows()); },
  _loanRows() { return this.byDate(this.d.prets).map(p => { const r = this.byDate(this.d.remboursements.filter(x => x.pretId == p.id)); const paid = sum(r); return {...p, r, paid, reste:Math.round((p.montant - paid) * 100) / 100}; }); },
  get totRemb() { return sum(this.d.remboursements); },
  get totPrets() { return sum(this.d.prets); },
  get pretsReste() { return this.totPrets - this.totRemb; },
  loanInfo() { const p = this.loanRows.find(x => x.id == this.f.pretId); return p ? `Prêt de ${this.nom(p.membreId)}. Reste à rembourser : ${this.fmt(p.reste)}` : ''; },
});
