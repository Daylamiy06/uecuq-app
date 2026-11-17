/* Module prêts : montant prêté, remboursements et reste dû */

UE.mods.push({
  /* Chaque prêt avec ses remboursements (`repayments`), le total remboursé (`paid`) et le reste dû */
  get loans() {
    return cache('loans', [this.data.prets, this.data.remboursements], () => this.byDate(this.data.prets).map(loan => {
      const repayments = this.byDate(this.data.remboursements.filter(r => r.pretId == loan.id));
      const paid = sum(repayments);
      return {...loan, repayments, paid, reste: round2(loan.montant - paid)};
    }));
  },

  loanStatus(loan) {
    if (loan.reste <= 0) return 'Remboursé';
    return loan.paid > 0 ? 'Partiel' : 'En cours';
  },

  get totalPrets() { return sum(this.data.prets); },
  get totalRemboursements() { return sum(this.data.remboursements); },
  get pretsRestant() { return this.totalPrets - this.totalRemboursements; },

  /* Phrase d'aide affichée dans la fenêtre de remboursement */
  loanInfo() {
    const loan = this.loans.find(l => l.id == this.form.pretId);
    return loan ? `Prêt de ${this.memberName(loan.membreId)}. Reste à rembourser : ${this.fmtMoney(loan.reste)}` : '';
  },
});
