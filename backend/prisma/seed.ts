import { PrismaClient } from "@prisma/client";
import { computeLoanSummary } from "../src/services/loanEngine.js";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

const USERS = [
  { email: "johann@vision.local", name: "Johann Faraut", firstName: "Johann", initials: "JF", role: "GERANT" as const, password: "vision" },
  { email: "alexandre@vision.local", name: "Alexandre Niel", firstName: "Alexandre", initials: "AN", role: "ASSOCIE" as const, shareholderName: "Alexandre Niel", password: "vision" },
  { email: "ca@bank.local", name: "Crédit Agricole", firstName: "CA", initials: "CA", role: "BANQUE" as const, bankName: "Crédit Agricole", password: "vision" },
  { email: "lcl@bank.local", name: "LCL", firstName: "LCL", initials: "LC", role: "BANQUE" as const, bankName: "LCL", password: "vision" },
  { email: "bnp@bank.local", name: "BNP Paribas", firstName: "BNP", initials: "BN", role: "BANQUE" as const, bankName: "BNP Paribas", password: "vision" },
  { email: "sg@bank.local", name: "Société Générale", firstName: "SG", initials: "SG", role: "BANQUE" as const, bankName: "Société Générale", password: "vision" },
];

const ENTITIES = [
  { slug: "beneduc", name: "SCI IR BENEDUC", shortName: "BENEDUC", type: "IR", creation: "Janv. 2017", valeurEstimee: 380000, color: "#60a5fa", gradient: "from-blue-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 50 }, { name: "Alexandre Niel", parts: 50 }] },
  { slug: "troika", name: "SCI IR TROIKA", shortName: "TROIKA", type: "IR", creation: "Juin 2017", valeurEstimee: 1265000, color: "#a78bfa", gradient: "from-violet-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 50 }, { name: "Alexandre Niel", parts: 50 }] },
  { slug: "lavista", name: "SCI IS LA VISTA", shortName: "LA VISTA", type: "IS", creation: "Mars 2020", valeurEstimee: 390000, color: "#22d3ee", gradient: "from-cyan-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 60 }, { name: "Alexandre Niel", parts: 40 }] },
  { slug: "rp", name: "Résidence Principale", shortName: "RP", type: "RP", creation: "Mai 2019", valeurEstimee: 630000, color: "#34d399", gradient: "from-emerald-500/20 to-transparent", associes: [{ name: "Johann Faraut", parts: 50 }, { name: "Alexandre Niel", parts: 50 }] },
];

const PROPERTIES = [
  { slug: "beneduc", address: "14 Rue Séry", ville: "Lille", cp: "59000", type: "T2", surface: 45, lots: 1, prixAchat: 80000, travaux: 12000, fraisNotaire: 6500, valeurActuelle: 130000, loyer: 620, taxeFonciere: 850, assurance: 540, credit: { banque: "Crédit Agricole", montantInitial: 70000, taux: 1.80, duree: 180, debut: "2018-03-01", assuranceMensuelle: 45 } },
  { slug: "beneduc", address: "8 Rue Danton", ville: "Roubaix", cp: "59100", type: "T1", surface: 32, lots: 1, prixAchat: 65000, travaux: 8000, fraisNotaire: 5200, valeurActuelle: 110000, loyer: 490, taxeFonciere: 620, assurance: 456, credit: { banque: "BNP Paribas", montantInitial: 58000, taux: 2.10, duree: 180, debut: "2019-06-01", assuranceMensuelle: 38 } },
  { slug: "beneduc", address: "22 Rue Victor Hugo", ville: "Tourcoing", cp: "59200", type: "Immeuble", surface: 180, lots: 4, prixAchat: 180000, travaux: 45000, fraisNotaire: 14000, valeurActuelle: 140000, loyer: 2200, taxeFonciere: 2100, assurance: 1200, credit: { banque: "Société Générale", montantInitial: 160000, taux: 2.40, duree: 240, debut: "2020-01-01", assuranceMensuelle: 100 } },
  { slug: "troika", address: "45 Av. de la République", ville: "Lyon", cp: "69003", type: "T3", surface: 72, lots: 1, prixAchat: 195000, travaux: 18000, fraisNotaire: 15000, valeurActuelle: 280000, loyer: 1100, taxeFonciere: 1400, assurance: 1020, credit: { banque: "LCL", montantInitial: 175000, taux: 1.60, duree: 300, debut: "2017-09-01", assuranceMensuelle: 85 } },
  { slug: "troika", address: "12 Rue du Commerce", ville: "Lyon", cp: "69002", type: "Local commercial", surface: 95, lots: 1, prixAchat: 320000, travaux: 35000, fraisNotaire: 25000, valeurActuelle: 420000, loyer: 2800, taxeFonciere: 3200, assurance: 2280, credit: { banque: "CIC", montantInitial: 290000, taux: 2.00, duree: 240, debut: "2018-11-01", assuranceMensuelle: 190 } },
  { slug: "troika", address: "7 Imp. des Tilleuls", ville: "Villeurbanne", cp: "69100", type: "T2", surface: 48, lots: 1, prixAchat: 142000, travaux: 9000, fraisNotaire: 11000, valeurActuelle: 195000, loyer: 780, taxeFonciere: 980, assurance: 720, credit: { banque: "Crédit Mutuel", montantInitial: 128000, taux: 1.90, duree: 240, debut: "2019-04-01", assuranceMensuelle: 60 } },
  { slug: "troika", address: "33 Bd Gambetta", ville: "Caluire-et-Cuire", cp: "69300", type: "Immeuble", surface: 320, lots: 6, prixAchat: 420000, travaux: 80000, fraisNotaire: 33000, valeurActuelle: 370000, loyer: 4200, taxeFonciere: 4800, assurance: 3840, credit: { banque: "Banque Populaire", montantInitial: 380000, taux: 2.20, duree: 300, debut: "2021-02-01", assuranceMensuelle: 320 } },
  { slug: "lavista", address: "18 Rue de la Paix", ville: "Marseille", cp: "13001", type: "T4", surface: 98, lots: 1, prixAchat: 220000, travaux: 25000, fraisNotaire: 17000, valeurActuelle: 265000, loyer: 1250, taxeFonciere: 1650, assurance: 1500, credit: { banque: "BRED", montantInitial: 198000, taux: 2.30, duree: 240, debut: "2020-07-01", assuranceMensuelle: 125 } },
  { slug: "lavista", address: "5 Rue Paradis", ville: "Marseille", cp: "13006", type: "T2", surface: 55, lots: 1, prixAchat: 145000, travaux: 12000, fraisNotaire: 11000, valeurActuelle: 125000, loyer: 820, taxeFonciere: 890, assurance: 984, credit: { banque: "Caisse d'Épargne", montantInitial: 130000, taux: 2.60, duree: 240, debut: "2021-10-01", assuranceMensuelle: 82 } },
  { slug: "rp", address: "24 Allée des Roses", ville: "Lyon", cp: "69006", type: "Maison", surface: 165, lots: 1, prixAchat: 480000, travaux: 0, fraisNotaire: 34000, valeurActuelle: 630000, loyer: 0, taxeFonciere: 2800, assurance: 2160, credit: { banque: "LCL", montantInitial: 430000, taux: 1.35, duree: 360, debut: "2019-05-01", assuranceMensuelle: 180 } },
];

async function main() {
  await prisma.session.deleteMany();
  await prisma.bankDossier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.amortizationEntry.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.property.deleteMany();
  await prisma.shareholder.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.legalEntity.deleteMany();

  const entityMap = new Map<string, string>();

  for (const e of ENTITIES) {
    const entity = await prisma.legalEntity.create({
      data: {
        slug: e.slug,
        name: e.name,
        shortName: e.shortName,
        type: e.type,
        creation: e.creation,
        valeurEstimee: e.valeurEstimee,
        color: e.color,
        gradient: e.gradient,
        shareholders: { create: e.associes },
      },
    });
    entityMap.set(e.slug, entity.id);
  }

  for (const p of PROPERTIES) {
    const entityId = entityMap.get(p.slug)!;
    const property = await prisma.property.create({
      data: {
        entityId,
        address: p.address,
        ville: p.ville,
        cp: p.cp,
        type: p.type,
        surface: p.surface,
        lots: p.lots,
        prixAchat: p.prixAchat,
        travaux: p.travaux,
        fraisNotaire: p.fraisNotaire,
        valeurActuelle: p.valeurActuelle,
        loyer: p.loyer,
        taxeFonciere: p.taxeFonciere,
        assurance: p.assurance,
      },
    });

    const summary = computeLoanSummary({
      montantInitial: p.credit.montantInitial,
      tauxAnnuel: p.credit.taux,
      dureeMois: p.credit.duree,
      dateDebut: new Date(p.credit.debut),
      assuranceMensuelle: p.credit.assuranceMensuelle,
    });

    await prisma.loan.create({
      data: {
        propertyId: property.id,
        banque: p.credit.banque,
        montantInitial: p.credit.montantInitial,
        tauxAnnuel: p.credit.taux,
        dureeMois: p.credit.duree,
        dateDebut: new Date(p.credit.debut),
        assuranceMensuelle: p.credit.assuranceMensuelle,
        mensualite: summary.mensualite,
        capitalRestant: summary.capitalRestant,
        schedule: {
          create: summary.schedule.map((r) => ({
            moisIndex: r.moisIndex,
            periode: r.periode,
            crd: r.crd,
            capitalAmorti: r.capitalAmorti,
            interets: r.interets,
            assurance: r.assurance,
            mensualite: r.mensualite,
          })),
        },
      },
    });
  }

  await prisma.alert.createMany({
    data: [
      { type: "info", title: "Loyer impayé", detail: "Karim Benzali · 8 Rue Danton, Roubaix", severity: "high" },
      { type: "credit", title: "Fin de prêt proche", detail: "Crédit Agricole · 14 Rue Séry, Lille", severity: "high" },
      { type: "taxe", title: "Taxe foncière à régler", detail: "SCI TROIKA · Octobre 2026", severity: "medium" },
    ],
  });

  for (const u of USERS) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        firstName: u.firstName,
        initials: u.initials,
        role: u.role,
        passwordHash: hashPassword(u.password),
        bankName: "bankName" in u ? u.bankName : null,
        shareholderName: "shareholderName" in u ? u.shareholderName : null,
      },
    });
  }

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
