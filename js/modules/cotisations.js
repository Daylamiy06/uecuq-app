/* Module cotisations : montant annuel, versements et reste à payer par membre */

UE.mods.push({
  /* Cotisation annuelle fixée pour l'exercice affiché */
  get due() { return +this.data.exercices[this.year]?.montantCotisation || 0; },

  /* Versements de l'exercice affiché, du plus récent au plus ancien */
  get cotisationsOfYear() {
    return this.byDate(this.data.cotisations.filter(c => c.annee == this.year));
  },

  /* Une ligne par membre : montant payé et reste à payer pour l'exercice */
  get cotisationRows() {
    const deps = [this.data.membres, this.data.cotisations, this.year, this.due];
    return cache('cotisationRows', deps, () => this.membresList.map(member => {
      const paye = sum(this.data.cotisations.filter(c => c.membreId == member.id && c.annee == this.year));
      return {...member, paye, reste: Math.max(0, round2(this.due - paye))};
    }));
  },

  get totalCotisations() { return sum(this.data.cotisations); },

  cotStatus(row) {
    if (this.due > 0 && row.reste == 0) return 'Soldé';
    return row.paye > 0 ? 'Partiel' : 'Non payé';
  },

  /* Enregistre la cotisation annuelle de l'exercice affiché */
  setDue(value) {
    db.ref('exercices/' + this.year).set({montantCotisation: +value || 0})
      .catch(() => this.notify('La modification a échoué.'));
  },
});
