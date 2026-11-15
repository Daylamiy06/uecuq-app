/* Module cotisations : calculs et actions */
UE.mods.push({
  cotSt(r) { return this.due > 0 && r.reste == 0 ? 'Soldé' : r.paye > 0 ? 'Partiel' : 'Non payé'; },
  get due() { return +this.d.exercices[this.year]?.montantCotisation || 0; },
  get cotYear() { return this.byDate(this.d.cotisations.filter(c => c.annee == this.year)); },
  get cotRows() { return cache('cr', [this.d.membres, this.d.cotisations, this.year, this.due], () => this._cotRows()); },
  _cotRows() { return this.membresList.map(m => { const paye = sum(this.d.cotisations.filter(c => c.membreId == m.id && c.annee == this.year)); return {...m, paye, reste:Math.max(0, Math.round((this.due - paye) * 100) / 100)}; }); },
  get totCot() { return sum(this.d.cotisations); },
  setDue(v) { db.ref('exercices/' + this.year).set({montantCotisation: +v || 0}).catch(() => this.notify('La modification a échoué.')); },
});
