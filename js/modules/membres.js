/* Module membres : liste, recherche et noms */

UE.mods.push({
  /* Membres triés par nom */
  get membresList() {
    return [...this.data.membres].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  },

  /* Membres dont le nom, le matricule ou la ville contient la recherche */
  get membresFiltres() {
    const query = this.search.toLowerCase();
    return this.membresList.filter(m => [m.nom, m.matricule, m.ville].join(' ').toLowerCase().includes(query));
  },

  memberName(id) {
    return this.data.membres.find(m => m.id == id)?.nom || 'Membre supprimé';
  },

  /* « Matricule — Nom », pour afficher un membre dans un formulaire */
  memberLabel(id) {
    const member = this.data.membres.find(m => m.id == id);
    return member ? `${member.matricule} — ${member.nom}` : '';
  },
});
