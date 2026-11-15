/* Module membres : calculs et actions */
UE.mods.push({
  get membresList() { return [...this.d.membres].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')); },
  get membresFiltres() { const q = this.q.toLowerCase(); return this.membresList.filter(m => [m.nom, m.matricule, m.ville].join(' ').toLowerCase().includes(q)); },
});
