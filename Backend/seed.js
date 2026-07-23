import mongoose from 'mongoose';
import Module from './models/moduleModel.js';
import Quiz from './models/quizModel.js';
import VoiceExam from './models/voiceExamModel.js';
import QuizResult from './models/quizResultModel.js';
import VoiceExamResult from './models/voiceExamResultModel.js';
import Bookmark from './models/bookmarkModel.js';
import Feedback from './models/feedbackModel.js';
import ContactMessage from './models/contactModel.js';
import Case from './models/caseModel.js';
import Plan from './models/planModel.js';
import AppConfig from './models/appConfigModel.js';
import AuditLog from './models/auditLogModel.js';
import DailyActivity from './models/dailyActivityModel.js';
import SubscriptionCode from './models/subscriptionCodeModel.js';
import Counter from './models/counterModel.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/QuizApp';

// ─── MODULES ─────────────────────────────────────────────────────────────
const medicineModules = [
  { name: 'Anatomie', year: 1, courses: [{ name: 'Anatomie générale', pdfId: '' }, { name: 'Anatomie des membres', pdfId: '' }, { name: 'Anatomie du thorax', pdfId: '' }, { name: 'Anatomie de la tête et du cou', pdfId: '' }, { name: 'Neuroanatomie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Biochimie', year: 1, courses: [{ name: 'Biochimie structurale', pdfId: '' }, { name: 'Enzymologie', pdfId: '' }, { name: 'Métabolismes', pdfId: '' }, { name: 'Biologie moléculaire', pdfId: '' }, { name: 'Signalisation cellulaire', pdfId: '' }], discipline: 'medicine' },
  { name: 'Biophysique', year: 1, courses: [{ name: 'Biophysique des membranes', pdfId: '' }, { name: 'Radiations', pdfId: '' }, { name: 'Biomécanique', pdfId: '' }, { name: 'Hémodynamique', pdfId: '' }, { name: 'Électrophysiologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Histologie', year: 1, courses: [{ name: 'Histologie générale', pdfId: '' }, { name: 'Histologie spéciale', pdfId: '' }, { name: 'Embryologie', pdfId: '' }, { name: 'Histologie du système nerveux', pdfId: '' }, { name: 'Techniques histologiques', pdfId: '' }], discipline: 'medicine' },
  { name: 'Physiologie', year: 2, courses: [{ name: 'Physiologie cardiovasculaire', pdfId: '' }, { name: 'Physiologie respiratoire', pdfId: '' }, { name: 'Physiologie rénale', pdfId: '' }, { name: 'Physiologie digestive', pdfId: '' }, { name: 'Physiologie endocrinienne', pdfId: '' }], discipline: 'medicine' },
  { name: 'Microbiologie', year: 2, courses: [{ name: 'Bactériologie', pdfId: '' }, { name: 'Virologie', pdfId: '' }, { name: 'Parasitologie', pdfId: '' }, { name: 'Mycologie', pdfId: '' }, { name: 'Sérologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Immunologie', year: 2, courses: [{ name: 'Immunité innée', pdfId: '' }, { name: 'Immunité adaptative', pdfId: '' }, { name: 'Immunopathologie', pdfId: '' }, { name: 'Immunité antitumorale', pdfId: '' }, { name: 'Vaccination', pdfId: '' }], discipline: 'medicine' },
  { name: 'Sémiologie', year: 2, courses: [{ name: 'Sémiologie cardiovasculaire', pdfId: '' }, { name: 'Sémiologie digestive', pdfId: '' }, { name: 'Sémiologie neurologique', pdfId: '' }, { name: 'Sémiologie respiratoire', pdfId: '' }, { name: 'Sémiologie rhumatologique', pdfId: '' }], discipline: 'medicine' },
  { name: 'Pharmacologie', year: 3, courses: [{ name: 'Pharmacocinétique', pdfId: '' }, { name: 'Pharmacodynamie', pdfId: '' }, { name: 'Pharmacovigilance', pdfId: '' }, { name: 'Antibiotiques', pdfId: '' }, { name: 'Médicaments du SNC', pdfId: '' }], discipline: 'medicine' },
  { name: 'Anatomopathologie', year: 3, courses: [{ name: 'Pathologie générale', pdfId: '' }, { name: 'Pathologie tumorale', pdfId: '' }, { name: 'Pathologie inflammatoire', pdfId: '' }, { name: 'Pathologie métabolique', pdfId: '' }, { name: 'Cytopathologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Radiologie', year: 3, courses: [{ name: 'Radioanatomie', pdfId: '' }, { name: 'Imagerie thoracique', pdfId: '' }, { name: 'Imagerie ostéoarticulaire', pdfId: '' }, { name: 'Imagerie abdominale', pdfId: '' }, { name: 'Imagerie neuroradiologique', pdfId: '' }], discipline: 'medicine' },
  { name: 'Médecine Interne', year: 4, courses: [{ name: 'Hépato-gastro-entérologie', pdfId: '' }, { name: 'Néphrologie', pdfId: '' }, { name: 'Rhumatologie', pdfId: '' }, { name: 'Endocrinologie', pdfId: '' }, { name: 'Hématologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Pédiatrie', year: 4, courses: [{ name: 'Pédiatrie générale', pdfId: '' }, { name: 'Néonatologie', pdfId: '' }, { name: 'Urgences pédiatriques', pdfId: '' }, { name: 'Infectiologie pédiatrique', pdfId: '' }, { name: 'Nutrition pédiatrique', pdfId: '' }], discipline: 'medicine' },
  { name: 'Chirurgie Générale', year: 4, courses: [{ name: 'Chirurgie digestive', pdfId: '' }, { name: 'Chirurgie orthopédique', pdfId: '' }, { name: 'Chirurgie vasculaire', pdfId: '' }, { name: 'Chirurgie viscérale', pdfId: '' }, { name: 'Chirurgie cancérologique', pdfId: '' }], discipline: 'medicine' },
  { name: 'Cardiologie', year: 5, courses: [{ name: 'Cardiopathies ischémiques', pdfId: '' }, { name: 'Insuffisance cardiaque', pdfId: '' }, { name: 'Troubles du rythme', pdfId: '' }, { name: 'Cardiologie interventionnelle', pdfId: '' }, { name: 'Pathologies valvulaires', pdfId: '' }], discipline: 'medicine' },
  { name: 'Neurologie', year: 5, courses: [{ name: 'Pathologies vasculaires cérébrales', pdfId: '' }, { name: 'Épilepsie', pdfId: '' }, { name: 'Maladies neurodégénératives', pdfId: '' }, { name: 'Pathologies inflammatoires du SNC', pdfId: '' }, { name: 'Neuromusculaire', pdfId: '' }], discipline: 'medicine' },
  { name: 'Oncologie', year: 5, courses: [{ name: 'Cancérogenèse', pdfId: '' }, { name: 'Chimiothérapie', pdfId: '' }, { name: 'Radiothérapie', pdfId: '' }, { name: 'Oncogénétique', pdfId: '' }, { name: 'Soins de support', pdfId: '' }], discipline: 'medicine' },
  { name: 'Réanimation', year: 6, courses: [{ name: 'Réanimation cardiovasculaire', pdfId: '' }, { name: 'Réanimation respiratoire', pdfId: '' }, { name: 'Sédation', pdfId: '' }, { name: 'Nutrition artificielle', pdfId: '' }, { name: 'Éthique en réanimation', pdfId: '' }], discipline: 'medicine' },
  { name: 'Urgences', year: 6, courses: [{ name: 'Urgences médicales', pdfId: '' }, { name: 'Urgences chirurgicales', pdfId: '' }, { name: 'Urgences traumatologiques', pdfId: '' }, { name: 'Urgences toxicologiques', pdfId: '' }, { name: 'Médecine de catastrophe', pdfId: '' }], discipline: 'medicine' },
  { name: 'Éthique Médicale', year: 6, courses: [{ name: 'Droits des patients', pdfId: '' }, { name: 'Consentement éclairé', pdfId: '' }, { name: 'Fin de vie', pdfId: '' }, { name: 'Secret médical', pdfId: '' }, { name: 'Déontologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Préparation Internat', year: 7, courses: [{ name: 'Synthèse cardiovasculaire', pdfId: '' }, { name: 'Synthèse neurologique', pdfId: '' }, { name: 'Synthèse infectieuse', pdfId: '' }, { name: 'Synthèse pédiatrique', pdfId: '' }, { name: 'Synthèse urgences', pdfId: '' }], discipline: 'medicine' },
];

const pharmacyModules = [
  { name: 'Chimie Générale', year: 1, courses: [{ name: 'Atomistique', pdfId: '' }, { name: 'Liaisons chimiques', pdfId: '' }, { name: 'Thermodynamique', pdfId: '' }, { name: 'Cinétique chimique', pdfId: '' }, { name: 'Chimie organique fondamentale', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Botanique Pharmaceutique', year: 1, courses: [{ name: 'Botanique générale', pdfId: '' }, { name: 'Plantes médicinales', pdfId: '' }, { name: 'Pharmacognosie', pdfId: '' }, { name: 'Phytochimie', pdfId: '' }, { name: 'Taxinomie végétale', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Pharmacie Galénique', year: 2, courses: [{ name: 'Formes pharmaceutiques', pdfId: '' }, { name: 'Voies d\'administration', pdfId: '' }, { name: 'Excipients', pdfId: '' }, { name: 'Biodisponibilité', pdfId: '' }, { name: 'Stabilité des médicaments', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Chimie Thérapeutique', year: 2, courses: [{ name: 'Relations structure-activité', pdfId: '' }, { name: 'Médicaments du SNC', pdfId: '' }, { name: 'Antibiotiques', pdfId: '' }, { name: 'Anticancéreux', pdfId: '' }, { name: 'Anti-inflammatoires', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Pharmacodynamie', year: 3, courses: [{ name: 'Récepteurs', pdfId: '' }, { name: 'Mécanismes d\'action', pdfId: '' }, { name: 'Interactions', pdfId: '' }, { name: 'Pharmacogénomique', pdfId: '' }, { name: 'Signalisation cellulaire', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Législation Pharmaceutique', year: 3, courses: [{ name: 'Code de la santé', pdfId: '' }, { name: 'Pharmacie d\'officine', pdfId: '' }, { name: 'Médicaments', pdfId: '' }, { name: 'Stupéfiants', pdfId: '' }, { name: 'Ordre des pharmaciens', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Pharmacie Clinique', year: 4, courses: [{ name: 'Bilans de médication', pdfId: '' }, { name: 'Pharmacovigilance', pdfId: '' }, { name: 'Suivi thérapeutique', pdfId: '' }, { name: 'Médicaments génériques', pdfId: '' }, { name: 'Pathologies chroniques', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Toxicologie', year: 4, courses: [{ name: 'Toxicologie générale', pdfId: '' }, { name: 'Médicaments toxiques', pdfId: '' }, { name: 'Antidotes', pdfId: '' }, { name: 'Toxicologie environnementale', pdfId: '' }, { name: 'Toxicomanie', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Officine', year: 5, courses: [{ name: 'Gestion d\'officine', pdfId: '' }, { name: 'Conseil pharmaceutique', pdfId: '' }, { name: 'Ordonnances', pdfId: '' }, { name: 'Dispensation', pdfId: '' }, { name: 'Relation patient', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Pharmacie Hospitalière', year: 5, courses: [{ name: 'PUI', pdfId: '' }, { name: 'Stérilisation', pdfId: '' }, { name: 'Préparations', pdfId: '' }, { name: 'Nutrition parentérale', pdfId: '' }, { name: 'Essais cliniques', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Santé Publique', year: 6, courses: [{ name: 'Épidémiologie', pdfId: '' }, { name: 'Prévention', pdfId: '' }, { name: 'Vaccination', pdfId: '' }, { name: 'Économie de la santé', pdfId: '' }, { name: 'Politiques de santé', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Synthèse Pharmaceutique', year: 6, courses: [{ name: 'Synthèse et dispensation', pdfId: '' }, { name: 'Cas cliniques complexes', pdfId: '' }, { name: 'Préparation à l\'internat', pdfId: '' }, { name: 'Thérapeutiques avancées', pdfId: '' }, { name: 'Bilans partagés', pdfId: '' }], discipline: 'pharmacy' },
];

const modules = [...medicineModules, ...pharmacyModules];

// ─── QUESTION TEMPLATES ─────────────────────────────────────────────────
const medicineCourseQuestions = {
  'Anatomie générale': [
    { q: 'Combien d\'os composent le crâne humain ?', opts: ['8', '12', '14', '22'], ans: ['22'], exp: 'Le crâne humain est composé de 22 os.' },
    { q: 'Quelle est la fonction principale du système squelettique ?', opts: ['Protection et soutien', 'Production d\'hormones', 'Régulation thermique', 'Digestion'], ans: ['Protection et soutien'], exp: 'Le squelette protège les organes vitaux et soutient le corps.' },
    { q: 'Combien de vertèbres composent la colonne vertébrale ?', opts: ['26', '33', '30', '24'], ans: ['33'], exp: 'La colonne vertébrale compte 33 vertèbres.' },
    { q: 'Quel est l\'os le plus petit du corps humain ?', opts: ['Étrier', 'Enclume', 'Marteau', 'Lunatum'], ans: ['Étrier'], exp: 'L\'étrier (stapes) mesure environ 3 mm.' },
    { q: 'Quelle articulation est la plus mobile du corps ?', opts: ['Épaule', 'Hanche', 'Genou', 'Coude'], ans: ['Épaule'], exp: 'L\'articulation gléno-humérale est la plus mobile.' },
  ],
  'Anatomie des membres': [
    { q: 'Quel muscle est le principal fléchisseur du bras ?', opts: ['Biceps brachial', 'Triceps brachial', 'Deltoïde', 'Brachial'], ans: ['Biceps brachial'], exp: 'Le biceps brachial est le fléchisseur principal du coude.' },
    { q: 'Combien d\'os compose le carpe ?', opts: ['6', '8', '10', '12'], ans: ['8'], exp: 'Le carpe est formé de 8 os.' },
    { q: 'Quel ligament stabilise principalement le genou en valgus ?', opts: ['LLI', 'LLE', 'LCA', 'LCP'], ans: ['LLI'], exp: 'Le ligament latéral interne stabilise le genou contre le valgus.' },
    { q: 'Qu\'est-ce que le canal carpien ?', opts: ['Un passage osseux du poignet', 'Un nerf', 'Une artère', 'Un tendon'], ans: ['Un passage osseux du poignet'], exp: 'Le canal carpien est un tunnel ostéofibreux du poignet.' },
    { q: 'Quel est le nerf principal du membre supérieur ?', opts: ['Nerf médian', 'Nerf radial', 'Nerf ulnaire', 'Nerf musculocutané'], ans: ['Nerf médian'], exp: 'Le nerf médian innerve les muscles de l\'avant-bras et de la main.' },
  ],
  'Anatomie du thorax': [
    { q: 'Où se situe le médiastin ?', opts: ['Entre les deux poumons', 'Dans l\'abdomen', 'Dans le cou', 'Dans le bassin'], ans: ['Entre les deux poumons'], exp: 'Le médiastin est l\'espace entre les deux poumons.' },
    { q: 'Combien de lobes comporte le poumon droit ?', opts: ['2', '3', '4', '1'], ans: ['3'], exp: 'Le poumon droit a 3 lobes.' },
  ],
  'Biochimie structurale': [
    { q: 'Quelle est la structure primaire d\'une protéine ?', opts: ['Séquence d\'acides aminés', 'Hélice alpha', 'Feuillet bêta', 'Structure quaternaire'], ans: ['Séquence d\'acides aminés'], exp: 'La structure primaire est la séquence linéaire d\'acides aminés.' },
    { q: 'Quel est le glucide le plus abondant dans le sang ?', opts: ['Fructose', 'Galactose', 'Glucose', 'Saccharose'], ans: ['Glucose'], exp: 'La glycémie normale est maintenue par le glucose.' },
  ],
};

const pharmacologyQuestions = [
  { q: 'Quelle est la demi-vie d\'élimination ?', opts: ['Temps pour éliminer 50% du médicament', 'Temps pour éliminer 100%', 'Temps d\'absorption', 'Temps de distribution'], ans: ['Temps pour éliminer 50% du médicament'], exp: 'La demi-vie est le temps nécessaire pour réduire la concentration plasmatique de moitié.' },
  { q: 'Que signifie la CI50 d\'un médicament ?', opts: ['Concentration inhibitrice 50%', 'Coefficient d\'innocuité', 'Capacité d\'intégration', 'Concentration idéale'], ans: ['Concentration inhibitrice 50%'], exp: 'CI50 est la concentration qui inhibe 50% de l\'activité cible.' },
  { q: 'Quel est le principal organe du métabolisme des médicaments ?', opts: ['Foie', 'Rein', 'Poumon', 'Cœur'], ans: ['Foie'], exp: 'Le foie assure le métabolisme de phase I et II.' },
  { q: 'Qu\'est-ce que l\'effet de premier passage hépatique ?', opts: ['Métabolisation avant circulation systémique', 'Élimination rénale', 'Distribution tissulaire', 'Absorption intestinale'], ans: ['Métabolisation avant circulation systémique'], exp: 'L\'effet de premier passage réduit la biodisponibilité des médicaments administrés par voie orale.' },
  { q: 'Quelle est la voie d\'administration la plus rapide ?', opts: ['IV', 'IM', 'SC', 'Orale'], ans: ['IV'], exp: 'La voie intraveineuse permet une action immédiate.' },
];

function pickQuestionPool(moduleName, course) {
  const key = course;
  if (medicineCourseQuestions[key]) return medicineCourseQuestions[key];
  if (moduleName === 'Pharmacologie') return pharmacologyQuestions;
  return null;
}

// ─── GENERATE QUIZZES ──────────────────────────────────────────────────
function generateQuizzesForModule(mod, startIdx) {
  const pool = pickQuestionPool(mod.name, mod.courses[0]?.name);
  const quizzes = [];
  let idx = startIdx;
  for (const course of mod.courses) {
    const cPool = pickQuestionPool(mod.name, course.name);
    const baseQuestions = cPool || (pool || []).slice(0, 3);
    const questionVariants = [
      ...baseQuestions,
      ...[
        { q: `Question supplémentaire 1 pour ${course.name}`, opts: ['Réponse A', 'Réponse B', 'Réponse C', 'Réponse D'], ans: ['Réponse A'], exp: `Explication pour ${course.name} Q1.` },
        { q: `Question supplémentaire 2 pour ${course.name}`, opts: ['Option 1', 'Option 2', 'Option 3', 'Option 4'], ans: ['Option 2'], exp: `Explication pour ${course.name} Q2.` },
        { q: `Question supplémentaire 3 pour ${course.name}`, opts: ['Choix 1', 'Choix 2', 'Choix 3', 'Choix 4'], ans: ['Choix 3'], exp: `Explication pour ${course.name} Q3.` },
        { q: `Question supplémentaire 4 pour ${course.name}`, opts: ['A. Vrai', 'B. Faux', 'C. Ni vrai ni faux', 'D. Non applicable'], ans: ['A. Vrai'], exp: `Explication pour ${course.name} Q4.` },
        { q: `Question supplémentaire 5 pour ${course.name}`, opts: ['Réponse 1', 'Réponse 2', 'Réponse 3', 'Réponse 4'], ans: ['Réponse 4'], exp: `Explication pour ${course.name} Q5.` },
      ],
    ];
    for (let i = 0; i < questionVariants.length; i++) {
      const q = questionVariants[i];
      idx++;
      quizzes.push({
        quizId: `Q${String(idx).padStart(4, '0')}`,
        moduleName: mod.name,
        year: mod.year,
        discipline: mod.discipline,
        course: course.name,
        published: true,
        explanation: q.exp,
        question: {
          questionText: q.q,
          options: q.opts,
          correctAnswers: q.ans,
        },
      });
    }
  }
  return quizzes;
}

// ─── VOICE EXAMS ────────────────────────────────────────────────────────
const voiceExamTemplates = [
  { title: 'Cas clinique : Syndrome occlusif', year: 4, moduleName: 'Médecine Interne', course: 'Hépato-gastro-entérologie',
    prompt: 'Patient de 68 ans, sans antécédent chirurgical, se présente pour des douleurs abdominales diffuses, arrêt des matières et des gaz depuis 48h, nausées. À l\'examen : abdomen distendu, tympanique, douloureux diffusément. T° 38.2°C, FC 100/min.\n\nQuel est votre diagnostic et votre prise en charge ?',
    questions: [
      { questionText: 'Quels examens d\'imagerie demandez-vous en première intention ?',
        idealAnswer: 'ASP debout et couché, et/ou TDM abdominal avec injection. L\'ASP recherche des niveaux hydro-aériques. Le TDM est plus sensible.',
        criteria: [
          { label: 'ASP demandé', keywords: ['ASP', 'abdomen sans préparation'] },
          { label: 'TDM abdominal demandé', keywords: ['TDM', 'scanner', 'tomodensitométrie'] },
          { label: 'Signes de gravité', keywords: ['gravité', 'complication', 'perforation'] },
        ] },
      { questionText: 'Quels critères cliniques indiquent une urgence chirurgicale ?',
        idealAnswer: 'Signes de choc, fièvre élevée, défense ou contracture abdominale, suspicion de péritonite ou d\'ischémie.',
        criteria: [
          { label: 'Signes de choc', keywords: ['choc', 'hypotension', 'tachycardie'] },
          { label: 'Contracture/défense', keywords: ['contracture', 'défense', 'péritonite'] },
        ] },
    ] },
  { title: 'Cas clinique : Insuffisance cardiaque décompensée', year: 5, moduleName: 'Cardiologie', course: 'Insuffisance cardiaque',
    prompt: 'Patient de 78 ans, insuffisance cardiaque à fraction d\'éjection réduite (FEVG 35%), dyspnée d\'aggravation progressive depuis 5 jours, orthopnée, œdèmes des membres inférieurs. TA 150/90, FC 95/min, SpO2 88%.\n\nDécrivez votre prise en charge.',
    questions: [
      { questionText: 'Quels examens complémentaires réalisez-vous en urgence ?',
        idealAnswer: 'BNP ou NT-proBNP, NFS, CRP, ionogramme, créatininémie, troponine, ECG, radiographie thoracique, échocardiographie.',
        criteria: [
          { label: 'BNP/NT-proBNP', keywords: ['BNP', 'NT-proBNP', 'peptide'] },
          { label: 'Échocardiographie', keywords: ['échocardiographie', 'échographie', 'ETT'] },
          { label: 'Bilan biologique', keywords: ['ionogramme', 'créatinine', 'NFS'] },
        ] },
      { questionText: 'Quel traitement instaurez-vous ?',
        idealAnswer: 'Oxygénothérapie, diurétiques de l\'anse (furosémide IV), vasodilatateurs si hypertensive, puis IEC, bêta-bloquants, ARM après stabilisation.',
        criteria: [
          { label: 'Oxygénothérapie', keywords: ['oxygène', 'O2', 'oxygénothérapie'] },
          { label: 'Diurétique IV', keywords: ['furosémide', 'diurétique', 'lasilix'] },
          { label: 'Traitement de fond', keywords: ['IEC', 'bêta-bloquant', 'ARM'] },
        ] },
    ] },
  { title: 'Cas clinique : Polytraumatisé', year: 6, moduleName: 'Urgences', course: 'Urgences traumatologiques',
    prompt: 'Patient de 30 ans, AVP (choc frontal à 80 km/h). GCS 13, TA 80/50, FC 130/min, FR 30/min, saturation 91%. Déformation du fémur gauche, plaie du cuir chevelu.\n\nQuelle est votre prise en charge immédiate ?',
    questions: [
      { questionText: 'Quelle est la priorité selon le damage control ?',
        idealAnswer: 'L\'hémodynamique est la priorité (choc hémorragique). Damage control : contrôle hémorragie externe, remplissage restrictif, protocole transfusion massive, bilan lésionnel (Fast-echo, TDM corps entier).',
        criteria: [
          { label: 'Reconnaissance choc', keywords: ['choc', 'hémorragique', 'hypotension'] },
          { label: 'Damage control', keywords: ['damage control', 'contrôle'] },
          { label: 'Transfusion massive', keywords: ['transfusion', 'massive'] },
        ] },
    ] },
  { title: 'Cas clinique : Diabète acidocétosique', year: 4, moduleName: 'Médecine Interne', course: 'Endocrinologie',
    prompt: 'Patient de 22 ans, diabétique de type 1, se présente pour altération de la conscience, polyurie, polydipsie. Haleine cétonique, T° 37°C, TA 90/60, FC 110/min, FR 32/min. Glycémie capillaire > 5.5 g/L, cétonurie +++.\n\nDécrivez votre prise en charge immédiate.',
    questions: [
      { questionText: 'Quel bilan réalisez-vous en urgence ?',
        idealAnswer: 'Glycémie veineuse, gaz du sang artériel, ionogramme, créatininémie, osmolarité, corps cétoniques, NFS, CRP, ECG.',
        criteria: [
          { label: 'GDS artériel', keywords: ['gaz du sang', 'GDS', 'pH'] },
          { label: 'Ionogramme', keywords: ['ionogramme', 'K+', 'potassium'] },
          { label: 'Corps cétoniques', keywords: ['cétoniques', 'cétonurie', 'béta-hydroxybutyrate'] },
        ] },
      { questionText: 'Quel traitement instaurez-vous ?',
        idealAnswer: 'Remplissage par sérum physiologique, insuline IV continue, correction de la kaliémie, surveillance glycémique et ionique stricte.',
        criteria: [
          { label: 'Remplissage', keywords: ['sérum physiologique', 'remplissage', 'NaCl'] },
          { label: 'Insuline IV', keywords: ['insuline', 'IV continue'] },
          { label: 'Correction kaliémie', keywords: ['kaliémie', 'potassium', 'K+'] },
        ] },
    ] },
  { title: 'Cas clinique : Pneumonie aiguë communautaire', year: 5, moduleName: 'Cardiologie', course: 'Cardiopathies ischémiques',
    prompt: 'Patient de 65 ans, tabagique 40 PA, se présente pour fièvre à 39°C, toux productive purulente, douleur thoracique droite, dyspnée. T° 39.2°C, FC 100/min, FR 25/min, SpO2 90%. Crépitants base droite.\n\nQuel diagnostic et traitement ?',
    questions: [
      { questionText: 'Quels examens complémentaires ?',
        idealAnswer: 'NFS, CRP, PCT, hémocultures, radiographie thoracique, ECBC si expectorations, recherche antigènes urinaires.',
        criteria: [
          { label: 'Radiographie thoracique', keywords: ['radiographie', 'thorax', 'RX'] },
          { label: 'Hémocultures', keywords: ['hémocultures', 'bactériémie'] },
          { label: 'CRP/PCT', keywords: ['CRP', 'PCT', 'biologie'] },
        ] },
      { questionText: 'Quelle antibiothérapie probabiliste ?',
        idealAnswer: 'Amoxicilline 1g x3/j ou amoxicilline-acide clavulanique si comorbidités. Durée 7 jours. Réévaluation à 48h.',
        criteria: [
          { label: 'Antibiothérapie adaptée', keywords: ['amoxicilline', 'amox'] },
          { label: 'Durée mentionnée', keywords: ['7 jours', 'durée'] },
          { label: 'Réévaluation', keywords: ['réévaluation', '48h'] },
        ] },
    ] },
  { title: 'Cas clinique : Hépatite aiguë', year: 4, moduleName: 'Médecine Interne', course: 'Hépato-gastro-entérologie',
    prompt: 'Patient de 35 ans, ictère cutanéomuqueux depuis 48h, urines foncées, selles décolorées, asthénie, nausées. Pas d\'antécédent, pas de traitement régulier. Voyage récent en Afrique subsaharienne.\n\nQuel diagnostic ?',
    questions: [
      { questionText: 'Quel bilan hépatique initial ?',
        idealAnswer: 'Transaminases (ASAT, ALAT), phosphatases alcalines, GGT, bilirubine totale et conjuguée, TP/INR, NFS, sérologies hépatites A, B, C, E.',
        criteria: [
          { label: 'Transaminases', keywords: ['transaminases', 'ASAT', 'ALAT'] },
          { label: 'Bilirubine', keywords: ['bilirubine', 'ictère'] },
          { label: 'Sérologies virales', keywords: ['sérologies', 'hépatite', 'HAV', 'HVB', 'HVC'] },
        ] },
      { questionText: 'Quels signes de gravité recherchez-vous ?',
        idealAnswer: 'Encéphalopathie hépatique, TP bas < 50%, ictère intense, ascite, hypoglycémie, insuffisance rénale.',
        criteria: [
          { label: 'Encéphalopathie', keywords: ['encéphalopathie', 'confusion'] },
          { label: 'TP bas', keywords: ['TP', 'INR', 'temps de prothrombine'] },
          { label: 'Hépatite fulminante', keywords: ['fulminante', 'gravité'] },
        ] },
    ] },
  { title: 'Cas clinique : Accident vasculaire cérébral', year: 5, moduleName: 'Neurologie', course: 'Pathologies vasculaires cérébrales',
    prompt: 'Patient de 72 ans, hypertendu, se présente pour hémiparésie droite d\'installation brutale il y a 2h, aphasie, déviation de la bouche. TA 180/100, FC 85/min, glycémie 1.2 g/L.\n\nQuelle prise en charge ?',
    questions: [
      { questionText: 'Quel bilan d\'urgence ?',
        idealAnswer: 'TDM cérébrale sans injection immédiate, puis angio-TDM si accessible, ECG, NFS, CRP, ionogramme, glycémie, TP/TCK.',
        criteria: [
          { label: 'TDM cérébrale', keywords: ['TDM', 'scanner', 'cérébrale'] },
          { label: 'Angio-TDM', keywords: ['angio-TDM', 'angiographie'] },
          { label: 'Bilan biologique', keywords: ['glycémie', 'ionogramme', 'NFS'] },
        ] },
      { questionText: 'Quelle prise en charge thérapeutique si AVC ischémique confirmé ?',
        idealAnswer: 'Thrombolyse si < 4h30 et pas de contre-indication, contrôle tensionnel, surveillance en UINV, ASPIRE, réévaluation neurologique.',
        criteria: [
          { label: 'Thrombolyse évoquée', keywords: ['thrombolyse', 'tPA', 'altéplase'] },
          { label: 'Fenêtre thérapeutique', keywords: ['4h30', '4h', 'fenêtre'] },
          { label: 'Surveillance', keywords: ['UINV', 'surveillance', 'neurologique'] },
        ] },
    ] },
  { title: 'Cas clinique : Douleur thoracique typique', year: 5, moduleName: 'Cardiologie', course: 'Cardiopathies ischémiques',
    prompt: 'Patient de 55 ans, facteurs de risque (tabac, HTA, diabète), douleur thoracique rétrosternale constrictive depuis 3h, irradiant dans le bras gauche, dyspnée, sueurs. TA 150/90, FC 95/min, SpO2 96%.\n\nQuel diagnostic et prise en charge ?',
    questions: [
      { questionText: 'Quels examens immédiats ?',
        idealAnswer: 'ECG 18 dérivations à réaliser dans les 10 minutes, troponine, NFS, CRP, ionogramme, créatininémie, radiographie thoracique.',
        criteria: [
          { label: 'ECG immédiat', keywords: ['ECG', 'électrocardiogramme'] },
          { label: 'Troponine', keywords: ['troponine'] },
          { label: 'Radiographie thoracique', keywords: ['radiographie', 'thorax', 'RX'] },
        ] },
      { questionText: 'Quel traitement de première intention ?',
        idealAnswer: 'MONA : Morphine, Oxygène, Nitrés (trinitrine), Aspirine. Puis double antiagrégation, héparine, angioplastie primaire si STEMI.',
        criteria: [
          { label: 'MONA', keywords: ['morphine', 'oxygène', 'nitré', 'aspirine'] },
          { label: 'Double antiagrégation', keywords: ['DAPT', 'double antiagrégation', 'aspirine'] },
          { label: 'Angioplastie', keywords: ['angioplastie', 'coronarographie', 'STEMI'] },
        ] },
    ] },
  { title: 'Cas clinique : Insuffisance rénale aiguë', year: 4, moduleName: 'Médecine Interne', course: 'Néphrologie',
    prompt: 'Patient de 70 ans, sous IEC et AINS pour arthrose, se présente pour oligurie depuis 48h, nausées, œdèmes des membres inférieurs. Créatininémie à 350 µmol/L (basale 100). TA 160/95, FC 80/min.\n\nQuel diagnostic et prise en charge ?',
    questions: [
      { questionText: 'Quels examens pour étayer le diagnostic ?',
        idealAnswer: 'Ionogramme sanguin, urée, créatininémie, GDS, ECBU, protéinurie, hématurie, échographie rénale, avis néphrologique.',
        criteria: [
          { label: 'Ionogramme', keywords: ['ionogramme', 'K+', 'potassium'] },
          { label: 'ECBU', keywords: ['ECBU', 'bandelette', 'urines'] },
          { label: 'Échographie rénale', keywords: ['échographie', 'rénale'] },
        ] },
      { questionText: 'Quel traitement ?',
        idealAnswer: 'Arrêt des néphrotoxiques (IEC, AINS), remplissage prudent si fonctionnel, surveillance diurèse, correction ionique, discuter épuration extrarénale.',
        criteria: [
          { label: 'Arrêt néphrotoxiques', keywords: ['IEC', 'AINS', 'arrêt', 'néphrotoxiques'] },
          { label: 'Correction ionique', keywords: ['kaliémie', 'correction', 'potassium'] },
          { label: 'Épuration extrarénale', keywords: ['épuration', 'dialyse', 'hémodialyse'] },
        ] },
    ] },
  { title: 'Cas clinique : Choc septique', year: 6, moduleName: 'Réanimation', course: 'Réanimation cardiovasculaire',
    prompt: 'Patient de 75 ans, septicémie à point de départ urinaire, TA 70/40, FC 130/min, FR 35/min, T° 39.5°C, lactates 6 mmol/L, GCS 12. Antécédent de diabète et BPCO.\n\nDécrivez votre prise en charge.',
    questions: [
      { questionText: 'Quelle prise en charge immédiate ?',
        idealAnswer: 'Remplissage par cristalloïdes (30 mL/kg), prélèvements bactériologiques (hémocultures, ECBU), antibiothérapie probabiliste à large spectre dans l\'heure, vasopresseurs si remplissage insuffisant (noradrénaline), monitorage continu.',
        criteria: [
          { label: 'Remplissage', keywords: ['remplissage', 'cristalloïdes', '30 mL/kg'] },
          { label: 'Antibiothérapie précoce', keywords: ['antibiothérapie', 'large spectre', '1h'] },
          { label: 'Vasopresseurs', keywords: ['noradrénaline', 'vasopresseur'] },
        ] },
      { questionText: 'Quels critères définissent le sepsis ?',
        idealAnswer: 'Sepsis = infection + SOFA ≥ 2. Choc septique = sepsis + vasopresseurs nécessaires pour maintenir PAM ≥ 65 mmHg + lactates > 2 mmol/L.',
        criteria: [
          { label: 'Critères SOFA', keywords: ['SOFA', 'qSOFA'] },
          { label: 'Lactates', keywords: ['lactates', 'hyperlactatémie'] },
          { label: 'Hypotension', keywords: ['PAM', 'hypotension', 'vasopresseurs'] },
        ] },
    ] },
  { title: 'Cas clinique : Crise d\'asthme aiguë grave', year: 5, moduleName: 'Cardiologie', course: 'Insuffisance cardiaque',
    prompt: 'Patient de 25 ans, asthmatique connu, crise depuis 6h ne cédant pas aux bronchodilatateurs. FR 35/min, SpO2 85%, impossibilité de parler, silence auscultatoire, cyanose, saturation à 85%, pic débit < 30%.\n\nQuelle prise en charge ?',
    questions: [
      { questionText: 'Quelle prise en charge immédiate ?',
        idealAnswer: 'Oxygénothérapie haut débit, nébulisations de bêta-2-mimétiques (salbutamol) + anticholinergiques (ipratropium), corticothérapie IV (méthylprednisolone), surveillance clinique et gazométrique.',
        criteria: [
          { label: 'Oxygénothérapie', keywords: ['oxygène', 'O2', 'haut débit'] },
          { label: 'Nébulisations', keywords: ['salbutamol', 'bêta-2', 'nébulisation'] },
          { label: 'Corticothérapie', keywords: ['corticoïde', 'méthylprednisolone'] },
        ] },
      { questionText: 'Quels signes de gravité ?',
        idealAnswer: 'Impossibilité de parler, cyanose, silence auscultatoire, SpO2 < 90%, pic débit < 30%, épuisement respiratoire, hypercapnie, acidose respiratoire.',
        criteria: [
          { label: 'Silence auscultatoire', keywords: ['silence auscultatoire'] },
          { label: 'Parole impossible', keywords: ['parole', 'parler impossible'] },
          { label: 'Épuisement', keywords: ['épuisement', 'hypercapnie', 'acidose'] },
        ] },
    ] },
  { title: 'Cas clinique : Pancréatite aiguë', year: 4, moduleName: 'Chirurgie Générale', course: 'Chirurgie digestive',
    prompt: 'Patient de 50 ans, éthylique chronique, douleur épigastrique transfixiante depuis 12h, nausées, vomissements. T° 38.5°C, TA 110/70, FC 110/min, abdomen sensible épigastrique. Lipasémie à 800 UI/L.\n\nQuel diagnostic et prise en charge ?',
    questions: [
      { questionText: 'Quels examens pour évaluer la gravité ?',
        idealAnswer: 'NFS, CRP, ionogramme, créatininémie, glycémie, lactates, GDS, fonction hépatique. Score Ranson ou BISAP. TDM abdominal avec injection à 48-72h.',
        criteria: [
          { label: 'Bilan biologique', keywords: ['NFS', 'CRP', 'ionogramme', 'créatinine'] },
          { label: 'Score de gravité', keywords: ['Ranson', 'BISAP'] },
          { label: 'TDM abdominal', keywords: ['TDM', 'scanner', 'injection'] },
        ] },
      { questionText: 'Quel traitement ?',
        idealAnswer: 'Jeûne, réhydratation IV intensive (Ringer Lactate), antalgiques (paracétamol, morphine si nécessaire), surveillance clinique et biologique stricte.',
        criteria: [
          { label: 'Réhydratation IV', keywords: ['réhydratation', 'Ringer', 'lactate'] },
          { label: 'Jeûne', keywords: ['jeûne', 'à jeun'] },
          { label: 'Antalgiques', keywords: ['antalgiques', 'morphine', 'paracétamol'] },
        ] },
    ] },
  { title: 'Cas clinique : Fracture ouverte de jambe', year: 6, moduleName: 'Urgences',
    prompt: 'Patient de 35 ans, accident de moto, fracture ouverte de jambe droite stade II de Cauchoix, déformation du tibia, plaie punctiforme. Pouls tibial perçu. TA 120/80, FC 90/min.\n\nQuelle prise en charge ?',
    questions: [
      { questionText: 'Quelle prise en charge aux urgences ?',
        idealAnswer: 'Évaluation lésions vitales (ATLS), bilan radiologique (face/profil), parage chirurgical en urgence, antibioprophylaxie, lotion antiseptique, attelle, couverture antibiotique + SAT-VAT, avis orthopédique.',
        criteria: [
          { label: 'Bilan radiologique', keywords: ['radiographie', 'RX', 'bilan'] },
          { label: 'Parage chirurgical', keywords: ['parage', 'chirurgical'] },
          { label: 'Antibioprophylaxie', keywords: ['antibiotique', 'prophylaxie'] },
        ] },
      { questionText: 'Quels risques spécifiques ?',
        idealAnswer: 'Infection ostéoarticulaire, syndrome de loges, retard de consolidation, pseudarthrose, embolie graisseuse, phlébite.',
        criteria: [
          { label: 'Infection', keywords: ['infection', 'ostéoarticulaire'] },
          { label: 'Syndrome de loges', keywords: ['loges', 'compartiment'] },
          { label: 'Embolie graisseuse', keywords: ['embolie', 'graisseuse'] },
        ] },
    ] },
  { title: 'Cas clinique : Intoxication médicamenteuse', year: 6, moduleName: 'Urgences',
    prompt: 'Adolescente de 16 ans, intoxication volontaire par paracétamol (quantité inconnue), prise il y a environ 6h. Nausées, douleur épigastrique. GCS 15, TA 110/70, FC 85/min.\n\nQuelle prise en charge ?',
    questions: [
      { questionText: 'Quel bilan et traitement ?',
        idealAnswer: 'Dosage de la paracétamolémie, NFS, CRP, TP/INR, transaminases, créatininémie. N-acétylcystéine IV si taux toxique, selon le nomogramme de Rumack-Matthew.',
        criteria: [
          { label: 'Paracétamolémie', keywords: ['paracétamolémie', 'dosage'] },
          { label: 'Bilan hépatique', keywords: ['TP', 'transaminases', 'hépatique'] },
          { label: 'N-acétylcystéine', keywords: ['NAC', 'N-acétylcystéine', 'antidote'] },
        ] },
    ] },
  { title: 'Cas clinique : Méningite bactérienne', year: 4, moduleName: 'Pédiatrie',
    prompt: 'Enfant de 3 ans, fièvre à 39.5°C depuis 24h, vomissements, céphalées, raideur de nuque, purpura aux membres inférieurs. GCS 13. Parents inquiets.\n\nQuel diagnostic et prise en charge ?',
    questions: [
      { questionText: 'Quels examens en urgence ?',
        idealAnswer: 'PL après fond d\'œil si pas de signe d\'HTIC, NFS, CRP, PCT, hémocultures, glycémie, GDS. PL : examen direct (Gram), culture, biochimie (protéines, glucose), PCR méningocoque.',
        criteria: [
          { label: 'PL réalisée', keywords: ['PL', 'ponction lombaire'] },
          { label: 'Bilan infectieux', keywords: ['CRP', 'PCT', 'hémocultures'] },
          { label: 'Purpura', keywords: ['purpura', 'méningocoque'] },
        ] },
      { questionText: 'Quelle antibiothérapie ?',
        idealAnswer: 'Ceftriaxone 100 mg/kg/j IV ou méropénème, associé à la vancomycine si suspicion résistance. Corticothérapie (dexaméthasone) avant ou avec la 1ère dose.',
        criteria: [
          { label: 'Antibiothérapie', keywords: ['ceftriaxone', 'méropénème'] },
          { label: 'Corticothérapie', keywords: ['dexaméthasone', 'corticothérapie'] },
          { label: 'Isolément', keywords: ['isolement', 'gouttelettes'] },
        ] },
    ] },
  { title: 'Cas clinique : Détresse respiratoire aiguë', year: 5, moduleName: 'Cardiologie',
    prompt: 'Patient de 60 ans, BPCO stade III, infection respiratoire basse, dyspnée majeure, FR 40/min, SpO2 75% sous 2L/min, cyanose, tirage, utilisation muscles accessoires. GDS : pH 7.25, PaCO2 65, PaO2 50.\n\nQuelle prise en charge ?',
    questions: [
      { questionText: 'Quelle stratégie d\'oxygénation ?',
        idealAnswer: 'Oxygénothérapie à objectif de SpO2 88-92%, VNI (ventilation non-invasive) en première intention si le patient est coopérant et conscient, avec surveillance clinique et gazométrique stricte.',
        criteria: [
          { label: 'Objectif SpO2', keywords: ['88-92%', 'SpO2'] },
          { label: 'VNI', keywords: ['VNI', 'ventilation non-invasive'] },
          { label: 'Monitorage', keywords: ['gazométrique', 'GDS', 'surveillance'] },
        ] },
      { questionText: 'Quels examens étiologiques ?',
        idealAnswer: 'NFS, CRP, PCT, hémocultures, ECBC, radiographie thoracique, antigènes urinaires (pneumocoque, légionelle).',
        criteria: [
          { label: 'Radiographie', keywords: ['radiographie', 'thorax'] },
          { label: 'ECBC', keywords: ['ECBC', 'crachats'] },
          { label: 'Antigènes urinaires', keywords: ['antigènes', 'pneumocoque', 'légionelle'] },
        ] },
    ] },
  { title: 'Cas clinique : Thyrotoxicose', year: 4, moduleName: 'Médecine Interne',
    prompt: 'Femme de 32 ans, palpitations, insomnie, amaigrissement (8 kg en 2 mois), thermophobie, tremblements des extrémités, exophtalmie bilatérale. TA 150/80, FC 110/min, goitre diffus.\n\nQuel diagnostic et traitement ?',
    questions: [
      { questionText: 'Quel bilan hormonal ?',
        idealAnswer: 'TSH ultrasensible, T3L, T4L, anticorps anti-récepteur TSH (TRAK), anticorps anti-thyropéroxydase, échographie thyroïdienne.',
        criteria: [
          { label: 'TSH/T3/T4', keywords: ['TSH', 'T3', 'T4', 'thyroïde'] },
          { label: 'TRAK', keywords: ['TRAK', 'anticorps', 'Basedow'] },
          { label: 'Échographie', keywords: ['échographie', 'thyroïde'] },
        ] },
      { questionText: 'Quel traitement symptomatique et spécifique ?',
        idealAnswer: 'Bêta-bloquants (propranolol) pour les signes adrénergiques, antithyroïdiens de synthèse (carbimazole ou propylthiouracile), avis endocrinologique.',
        criteria: [
          { label: 'Bêta-bloquants', keywords: ['propranolol', 'bêta-bloquant'] },
          { label: 'Antithyroïdiens', keywords: ['carbimazole', 'thyréostatiques'] },
          { label: 'Surveillance', keywords: ['NFS', 'agranulocytose'] },
        ] },
    ] },
  { title: 'Cas clinique : Anaphylaxie', year: 6, moduleName: 'Urgences',
    prompt: 'Patient de 40 ans, allergique aux arachides, ingestion accidentelle. Urticaire généralisée, œdème de Quincke, dyspnée, sifflements, TA 70/40, FC 120/min, SpO2 85%. Délai : 10 min.\n\nQuelle prise en charge ?',
    questions: [
      { questionText: 'Quel traitement immédiat ?',
        idealAnswer: 'Adrénaline IM dans la cuisse (0.5 mg), oxygénothérapie haut débit, antihistaminiques IV, corticoïdes IV, remplissage, surveillance prolongée (risque biphasique).',
        criteria: [
          { label: 'Adrénaline IM', keywords: ['adrénaline', 'épinéphrine'] },
          { label: 'Oxygène', keywords: ['oxygène', 'O2'] },
          { label: 'Antihistaminiques', keywords: ['antihistaminiques', 'corticoïdes'] },
        ] },
    ] },
];

// ─── GENERATE QUIZ RESULTS ──────────────────────────────────────────────
const dummyUserIds = [
  'U001', 'U002', 'U003', 'U004', 'U005', 'U006', 'U007', 'U008', 'U009', 'U010',
  'U011', 'U012', 'U013', 'U014', 'U015', 'U016', 'U017', 'U018', 'U019', 'U020',
];

function generateQuizResults(quizDocs) {
  const results = [];
  for (let i = 0; i < 200; i++) {
    const quiz = quizDocs[Math.floor(Math.random() * quizDocs.length)];
    const userId = dummyUserIds[Math.floor(Math.random() * dummyUserIds.length)];
    const total = quiz.question.options.length;
    const userAnswerIdx = Math.floor(Math.random() * total);
    const isCorrect = quiz.question.correctAnswers.includes(quiz.question.options[userAnswerIdx]);
    const score = isCorrect ? 1 : 0;
    results.push({
      userId,
      quizId: quiz._id,
      score,
      answers: { [quiz.question.questionText]: quiz.question.options[userAnswerIdx] },
      timestamp: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
    });
  }
  return results;
}

// ─── GENERATE VOICE EXAM RESULTS ────────────────────────────────────────
function generateVoiceExamResults(voiceExamDocs) {
  const results = [];
  for (let i = 0; i < 50; i++) {
    const exam = voiceExamDocs[Math.floor(Math.random() * voiceExamDocs.length)];
    const userId = dummyUserIds[Math.floor(Math.random() * dummyUserIds.length)];
    const answers = exam.questions.map((q, qi) => {
      const criteriaResults = q.criteria.map(c => ({
        label: c.label,
        passed: Math.random() > 0.3,
      }));
      const allPassed = criteriaResults.every(cr => cr.passed);
      return { questionIndex: qi, text: `Réponse simulée pour : ${q.questionText}`, criteriaResults, allPassed };
    });
    const passed = answers.filter(a => a.allPassed).length;
    results.push({
      userId,
      examId: exam._id,
      answers,
      overallPassed: passed,
      overallTotal: exam.questions.length,
      overallMax: exam.questions.length,
    });
  }
  return results;
}

// ─── GENERATE BOOKMARKS ────────────────────────────────────────────────
function generateBookmarks(quizDocs) {
  const seen = new Set();
  const bookmarks = [];
  for (let i = 0; i < 60; i++) {
    const userId = dummyUserIds[Math.floor(Math.random() * dummyUserIds.length)];
    const quiz = quizDocs[Math.floor(Math.random() * quizDocs.length)];
    const key = `${userId}|${quiz._id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bookmarks.push({ userId, quizId: quiz._id });
  }
  return bookmarks;
}

const dummyUserId = new mongoose.Types.ObjectId('000000000000000000000001');

// ─── FEEDBACK ───────────────────────────────────────────────────────────
const feedbackMessages = [
  { userId: dummyUserId, message: 'L\'interface est très intuitive. Bravo pour le travail !', pageUrl: '/dashboard', status: 'read' },
  { userId: dummyUserId, message: 'J\'aimerais pouvoir filtrer les quiz par difficulté.', pageUrl: '/quizzes', status: 'unread' },
  { userId: dummyUserId, message: 'Les explications des réponses sont très claires et utiles pour apprendre.', pageUrl: '/quiz/Q001', status: 'read' },
  { userId: dummyUserId, message: 'Il y a un problème d\'affichage sur mobile, la navigation disparaît.', pageUrl: '/', status: 'unread' },
  { userId: dummyUserId, message: 'Le module de voice exam est excellent, mais pourrait gérer des réponses plus longues.', pageUrl: '/voice-exam', status: 'resolved' },
  { userId: dummyUserId, message: 'Pouvez-vous ajouter plus de quiz en pharmacologie SVP ?', pageUrl: '/modules', status: 'unread' },
  { userId: dummyUserId, message: 'Les notifications push seraient un plus pour les révisions quotidiennes.', pageUrl: '/settings', status: 'read' },
  { userId: dummyUserId, message: 'Merci pour cette plateforme, elle m\'aide beaucoup dans mes révisions.', pageUrl: '/dashboard', status: 'read' },
  { userId: dummyUserId, message: 'Bug : le timer du quiz se réinitialise quand je change d\'onglet.', pageUrl: '/quiz/Q015', status: 'unread' },
  { userId: dummyUserId, message: 'Ajoutez un mode sombre (déjà fait ? super !)', pageUrl: '/settings', status: 'resolved' },
  { userId: dummyUserId, message: 'Le suivi de progression par module est très motivant.', pageUrl: '/dashboard', status: 'read' },
  { userId: dummyUserId, message: 'Impossible de soumettre le quiz après expiration du temps.', pageUrl: '/quiz/Q008', status: 'unread' },
];

// ─── CONTACT MESSAGES ──────────────────────────────────────────────────
const contactMessages = [
  { name: 'Dr. Martin', email: 'martin@medecine.fr', message: 'Je souhaiterais proposer des quiz pour le module de cardiologie interventionnelle.', status: 'unread' },
  { name: 'Sophie Lambert', email: 'sophie.lambert@pharma.fr', message: 'Les cours de pharmacie galénique sont très complets. Bravo !', status: 'read' },
  { name: 'Pierre Durand', email: 'pierre.durand@gmail.com', message: 'J\'ai trouvé une erreur dans le quiz Q012, la réponse attendue n\'est pas correcte.', status: 'unread' },
  { name: 'Marie Dubois', email: 'marie.dubois@chu-lyon.fr', message: 'Serait-il possible d\'avoir une version PDF téléchargeable des cours ?', status: 'resolved' },
  { name: 'Lucas Petit', email: 'lucas.petit@etu.univ.fr', message: 'Les voice exams sont une excellente idée pour préparer l\'internat.', status: 'read' },
  { name: 'Dr. Moreau', email: 'moreau@clinique.fr', message: 'Je suis intéressé par un abonnement groupe pour mon service hospitalier.', status: 'unread' },
];

// ─── CLINICAL CASES (Case model) ────────────────────────────────────────
const clinicalCaseData = [
  { title: 'Syndrome coronarien aigu', description: 'Patient de 60 ans avec douleur thoracique typique, sus-décalage ST, nécessitant une prise en charge en urgence.', moduleName: 'Cardiologie', year: 5, discipline: 'medicine', course: 'Cardiopathies ischémiques' },
  { title: 'Insuffisance cardiaque terminale', description: 'Patient avec FEVG < 20% dyspnétique au moindre effort, discutant transplantation cardiaque.', moduleName: 'Cardiologie', year: 5, discipline: 'medicine', course: 'Insuffisance cardiaque' },
  { title: 'Fibrillation atriale compliquée', description: 'Patient de 75 ans en FA avec réponse ventriculaire rapide, instable hémodynamiquement.', moduleName: 'Cardiologie', year: 5, discipline: 'medicine', course: 'Troubles du rythme' },
  { title: 'Hépatite fulminante', description: 'Patient de 40 ans avec hépatite médicamenteuse, encéphalopathie, TP < 30%, discutant transplantation.', moduleName: 'Médecine Interne', year: 4, discipline: 'medicine', course: 'Hépato-gastro-entérologie' },
  { title: 'Pancréatite aiguë grave', description: 'Patient de 55 ans, éthylique, nécrose pancréatique, défaillance multiviscérale.', moduleName: 'Chirurgie Générale', year: 4, discipline: 'medicine', course: 'Chirurgie digestive' },
  { title: 'Péritonite aiguë généralisée', description: 'Patient avec péritonite sur perforation d\'ulcère duodénal, sepsis sévère.', moduleName: 'Chirurgie Générale', year: 4, discipline: 'medicine', course: 'Chirurgie viscérale' },
  { title: 'Embolie pulmonaire massive', description: 'Patient de 70 ans, dyspnée brutale, TA 80/40, signes de cœur pulmonaire aigu.', moduleName: 'Cardiologie', year: 5, discipline: 'medicine', course: 'Pathologies valvulaires' },
  { title: 'AVC hémorragique', description: 'Patient hypertendu avec AVC hémorragique profond, Glasgow bas, discutant drainage.', moduleName: 'Neurologie', year: 5, discipline: 'medicine', course: 'Pathologies vasculaires cérébrales' },
  { title: 'Coma diabétique hyperosmolaire', description: 'Patient de 75 ans diabétique type 2, déshydraté, glycémie > 8 g/L, osmolarité > 350.', moduleName: 'Médecine Interne', year: 4, discipline: 'medicine', course: 'Endocrinologie' },
  { title: 'Asthme aigu grave intubé', description: 'Patient de 35 ans intubé pour asthme aigu grave, difficultés de ventilation.', moduleName: 'Réanimation', year: 6, discipline: 'medicine', course: 'Réanimation respiratoire' },
  { title: 'Monitoring choc septique', description: 'Patient avec SDRA sur choc septique, ventilation protectrice, optimisation hémodynamique.', moduleName: 'Réanimation', year: 6, discipline: 'medicine', course: 'Réanimation cardiovasculaire' },
  { title: 'Cancer du poumon métastatique', description: 'Patient de 65 ans, tabagique, cancer bronchique avec métastases cérébrales, discutant thérapeutique.', moduleName: 'Oncologie', year: 5, discipline: 'medicine', course: 'Cancérogenèse' },
  { title: 'Polytraumatisé grave', description: 'Patient de 25 ans, défenestration, TDM corps entier, hémopéritoine, fracture bassin.', moduleName: 'Urgences', year: 6, discipline: 'medicine', course: 'Urgences traumatologiques' },
  { title: 'Intoxication au CO', description: 'Famille retrouvée inanimée au domicile, suspicion intoxication monoxyde de carbone.', moduleName: 'Urgences', year: 6, discipline: 'medicine', course: 'Urgences toxicologiques' },
  { title: 'Urgence hypertensive', description: 'Patient avec HTA maligne, PA 240/130, œdème papillaire, IR aiguë.', moduleName: 'Médecine Interne', year: 4, discipline: 'medicine', course: 'Néphrologie' },
];

// ─── PLANS ──────────────────────────────────────────────────────────────
const planData = [
  { name: 'Première Année Médecine', slug: 'medecine-annee1-med-y1', discipline: 'medicine', year: 1, price: 29.99, included: { quizzes: true, voiceExams: false }, interval: 'year', sortOrder: 1 },
  { name: 'Deuxième Année Médecine', slug: 'medecine-annee2-med-y2', discipline: 'medicine', year: 2, price: 29.99, included: { quizzes: true, voiceExams: false }, interval: 'year', sortOrder: 2 },
  { name: 'Troisième Année Médecine', slug: 'medecine-annee3-med-y3', discipline: 'medicine', year: 3, price: 34.99, included: { quizzes: true, voiceExams: false }, interval: 'year', sortOrder: 3 },
  { name: 'Quatrième Année Médecine', slug: 'medecine-annee4-med-y4', discipline: 'medicine', year: 4, price: 39.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 4 },
  { name: 'Cinquième Année Médecine', slug: 'medecine-annee5-med-y5', discipline: 'medicine', year: 5, price: 44.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 5 },
  { name: 'Sixième Année Médecine', slug: 'medecine-annee6-med-y6', discipline: 'medicine', year: 6, price: 49.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 6 },
  { name: 'Préparation Internat Médecine', slug: 'prepa-internat-med-y7', discipline: 'medicine', year: 7, price: 59.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 7 },
  { name: 'Pack Complet Médecine (1-7)', slug: 'pack-complet-med-all', discipline: 'medicine', year: 1, price: 149.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 0 },
  { name: 'Première Année Pharmacie', slug: 'pharmacie-annee1-pharm-y1', discipline: 'pharmacy', year: 1, price: 24.99, included: { quizzes: true, voiceExams: false }, interval: 'year', sortOrder: 1 },
  { name: 'Deuxième Année Pharmacie', slug: 'pharmacie-annee2-pharm-y2', discipline: 'pharmacy', year: 2, price: 24.99, included: { quizzes: true, voiceExams: false }, interval: 'year', sortOrder: 2 },
  { name: 'Troisième Année Pharmacie', slug: 'pharmacie-annee3-pharm-y3', discipline: 'pharmacy', year: 3, price: 29.99, included: { quizzes: true, voiceExams: false }, interval: 'year', sortOrder: 3 },
  { name: 'Quatrième Année Pharmacie', slug: 'pharmacie-annee4-pharm-y4', discipline: 'pharmacy', year: 4, price: 34.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 4 },
  { name: 'Cinquième Année Pharmacie', slug: 'pharmacie-annee5-pharm-y5', discipline: 'pharmacy', year: 5, price: 39.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 5 },
  { name: 'Sixième Année Pharmacie', slug: 'pharmacie-annee6-pharm-y6', discipline: 'pharmacy', year: 6, price: 44.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 6 },
  { name: 'Pack Complet Pharmacie (1-6)', slug: 'pack-complet-pharm-all', discipline: 'pharmacy', year: 1, price: 129.99, included: { quizzes: true, voiceExams: true }, interval: 'year', sortOrder: 0 },
];

// ─── APP CONFIG ─────────────────────────────────────────────────────────
const appConfigData = [
  { key: 'site_name', value: 'QuizApp Médecine & Pharmacie' },
  { key: 'site_description', value: 'Plateforme de préparation aux examens de médecine et pharmacie' },
  { key: 'contact_email', value: 'contact@quizapp.com' },
  { key: 'support_email', value: 'support@quizapp.com' },
  { key: 'maintenance_mode', value: false },
  { key: 'max_quiz_attempts', value: 3 },
  { key: 'quiz_default_timer', value: 60 },
  { key: 'voice_exam_recording_limit_seconds', value: 300 },
  { key: 'enable_voice_exams', value: true },
  { key: 'enable_quiz_bookmarks', value: true },
  { key: 'free_trial_days', value: 7 },
  { key: 'default_locale', value: 'fr' },
  { key: 'available_locales', value: ['fr', 'en', 'ar'] },
  { key: 'registration_open', value: true },
  { key: 'app_version', value: '2.0.0' },
  { key: 'passing_score_percentage', value: 60 },
];

// ─── AUDIT LOGS ─────────────────────────────────────────────────────────
const auditActions = [
  { userId: 'U001', email: 'admin@quizapp.com', action: 'LOGIN', target: 'authentification', details: { method: 'email' }, method: 'POST', path: '/api/auth/login' },
  { userId: 'U002', email: 'etudiant@medecine.fr', action: 'REGISTER', target: 'user', details: { role: 'student' }, method: 'POST', path: '/api/auth/register' },
  { userId: 'U003', email: 'etudiant2@medecine.fr', action: 'REGISTER', target: 'user', details: { role: 'student' }, method: 'POST', path: '/api/auth/register' },
  { userId: 'U001', action: 'QUIZ_START', target: 'quiz', details: { quizId: 'Q001' }, method: 'GET', path: '/api/quizzes/Q001' },
  { userId: 'U001', action: 'QUIZ_SUBMIT', target: 'quiz', details: { quizId: 'Q001', score: 8 }, method: 'POST', path: '/api/quizzes/Q001/submit' },
  { userId: 'U002', action: 'QUIZ_START', target: 'quiz', details: { quizId: 'Q005' }, method: 'GET', path: '/api/quizzes/Q005' },
  { userId: 'U002', action: 'VOICE_EXAM_START', target: 'voiceExam', details: { examId: 'VE001' }, method: 'GET', path: '/api/voice-exams/VE001' },
  { userId: 'U001', action: 'ADMIN_MODULE_CREATE', target: 'module', details: { module: 'Nouveau module test' }, method: 'POST', path: '/admin/modules' },
  { userId: 'U001', action: 'ADMIN_QUIZ_CREATE', target: 'quiz', details: { quizId: 'Q100' }, method: 'POST', path: '/admin/quizzes' },
  { userId: 'U003', action: 'BOOKMARK_ADD', target: 'quiz', details: { quizId: 'Q010' }, method: 'POST', path: '/api/bookmarks' },
  { userId: 'U003', action: 'BOOKMARK_REMOVE', target: 'quiz', details: { quizId: 'Q005' }, method: 'DELETE', path: '/api/bookmarks/Q005' },
  { userId: 'U002', action: 'QUIZ_SUBMIT', target: 'quiz', details: { quizId: 'Q010', score: 10 }, method: 'POST', path: '/api/quizzes/Q010/submit' },
  { userId: 'U001', action: 'FEEDBACK_SEND', target: 'feedback', details: { id: 'feedback-1' }, method: 'POST', path: '/api/feedback' },
  { userId: 'U001', action: 'LOGOUT', target: 'authentification', details: {}, method: 'POST', path: '/api/auth/logout' },
];

// ─── DAILY ACTIVITY ─────────────────────────────────────────────────────
const dailyActivities = [
  { userId: dummyUserId, date: '2026-01-10', quizIds: [], answers: [{ quizId: null, questionText: 'Quel est le volume d\'éjection systolique ?', selectedAnswers: ['70 mL'], correctAnswers: ['70 mL'], correct: true }], score: 1, total: 1 },
  { userId: dummyUserId, date: '2026-01-11', quizIds: [], answers: [{ quizId: null, questionText: 'Quel est le principal muscle inspiratoire ?', selectedAnswers: ['Diaphragme'], correctAnswers: ['Diaphragme'], correct: true }], score: 1, total: 1 },
  { userId: dummyUserId, date: '2026-01-12', quizIds: [], answers: [{ quizId: null, questionText: 'Qu\'est-ce que la CI50 ?', selectedAnswers: ['Concentration inhibitrice 50%'], correctAnswers: ['Concentration inhibitrice 50%'], correct: true }], score: 1, total: 1 },
  { userId: dummyUserId, date: '2026-01-13', quizIds: [], answers: [], score: 0, total: 0 },
  { userId: dummyUserId, date: '2026-01-14', quizIds: [], answers: [], score: 0, total: 0 },
  { userId: dummyUserId, date: '2026-01-15', quizIds: [], answers: [{ quizId: null, questionText: 'Quel est l\'os le plus long ?', selectedAnswers: ['Fémur'], correctAnswers: ['Fémur'], correct: true }], score: 1, total: 1 },
];

// ─── SUBSCRIPTION CODES ─────────────────────────────────────────────────
const subscriptionCodesData = [
  { code: 'MED2026', planId: null, status: 'active', expiresAt: new Date('2027-12-31'), notes: 'Code promo médecine 2026' },
  { code: 'PHARM2026', planId: null, status: 'active', expiresAt: new Date('2027-12-31'), notes: 'Code promo pharmacie 2026' },
  { code: 'PREPA20', planId: null, status: 'active', expiresAt: new Date('2027-06-30'), notes: 'Réduction 20% préparation internat' },
  { code: 'ESSAI7J', planId: null, status: 'used', expiresAt: new Date('2026-06-30'), usedBy: null, usedAt: new Date('2026-01-10'), notes: '7 jours d\'essai gratuit' },
  { code: 'PACKMED', planId: null, status: 'active', expiresAt: new Date('2027-12-31'), notes: 'Pack complet médecine' },
  { code: 'STUDENT50', planId: null, status: 'active', expiresAt: new Date('2027-09-30'), notes: '50% étudiant boursier' },
];

// ─── MAIN SEED ──────────────────────────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const force = process.argv.includes('--force');
  const existingModules = await Module.countDocuments();
  if (existingModules > 0 && !force) {
    console.log(`Database already has ${existingModules} modules. Use --force to re-seed. Aborting.`);
    process.exit(0);
  }
  if (existingModules > 0) {
    await Promise.all([
      Module.deleteMany({}),
      Quiz.deleteMany({}),
      VoiceExam.deleteMany({}),
      QuizResult.deleteMany({}),
      VoiceExamResult.deleteMany({}),
      Bookmark.deleteMany({}),
      Feedback.deleteMany({}),
      ContactMessage.deleteMany({}),
      Case.deleteMany({}),
      Plan.deleteMany({}),
      AppConfig.deleteMany({}),
      AuditLog.deleteMany({}),
      DailyActivity.deleteMany({}),
      SubscriptionCode.deleteMany({}),
      Counter.deleteMany({}),
    ]);
    console.log('Existing data cleared.');
  }

  // 1. Modules
  const insertedModules = await Module.insertMany(modules);
  console.log(`Inserted ${insertedModules.length} modules.`);

  const moduleMap = {};
  insertedModules.forEach((m) => { moduleMap[m.name] = m; });

  // 2. Quizzes
  let quizIdCounter = 0;
  const allQuizDocs = [];
  for (const mod of insertedModules) {
    const qs = generateQuizzesForModule(mod, quizIdCounter);
    quizIdCounter += qs.length;
    const quizRecords = qs.map(q => ({
      quizId: q.quizId,
      moduleName: q.moduleName,
      moduleId: mod._id,
      year: mod.year,
      discipline: mod.discipline,
      course: q.course,
      published: q.published,
      explanation: q.explanation,
      question: q.question,
    }));
    allQuizDocs.push(...quizRecords);
  }
  const quizDocs = await Quiz.insertMany(allQuizDocs);
  console.log(`Inserted ${quizDocs.length} quizzes.`);

  // 3. Voice Exams
  const voiceExamRecords = [];
  for (const [idx, v] of voiceExamTemplates.entries()) {
    const mod = moduleMap[v.moduleName];
    if (!mod) { console.warn(`  VoiceExam module not found: ${v.moduleName}`); continue; }
    voiceExamRecords.push({
      examId: `VE${String(idx + 1).padStart(3, '0')}`,
      title: v.title,
      moduleId: mod._id,
      course: v.course || '',
      year: v.year,
      discipline: 'medicine',
      clinicalCasePrompt: v.prompt,
      questions: v.questions,
    });
  }
  const voiceExamDocs = await VoiceExam.insertMany(voiceExamRecords);
  console.log(`Inserted ${voiceExamDocs.length} voice exams.`);

  // 4. Quiz Results
  const quizResults = generateQuizResults(quizDocs);
  if (quizResults.length > 0) {
    await QuizResult.insertMany(quizResults);
  }
  console.log(`Inserted ${quizResults.length} quiz results.`);

  // 5. Voice Exam Results
  const voiceExamResults = generateVoiceExamResults(voiceExamDocs);
  if (voiceExamResults.length > 0) {
    await VoiceExamResult.insertMany(voiceExamResults);
  }
  console.log(`Inserted ${voiceExamResults.length} voice exam results.`);

  // 6. Bookmarks
  const bookmarks = generateBookmarks(quizDocs);
  if (bookmarks.length > 0) {
    await Bookmark.insertMany(bookmarks);
  }
  console.log(`Inserted ${bookmarks.length} bookmarks.`);

  // 7. Feedback
  await Feedback.insertMany(feedbackMessages);
  console.log(`Inserted ${feedbackMessages.length} feedback messages.`);

  // 8. Contact Messages
  await ContactMessage.insertMany(contactMessages);
  console.log(`Inserted ${contactMessages.length} contact messages.`);

  // 9. Cases
  const caseRecords = [];
  for (const c of clinicalCaseData) {
    const mod = moduleMap[c.moduleName];
    if (!mod) { console.warn(`  Case module not found: ${c.moduleName}`); continue; }
    caseRecords.push({
      title: c.title,
      description: c.description,
      moduleId: mod._id,
      year: c.year,
      discipline: c.discipline,
      course: c.course,
    });
  }
  const insertedCases = await Case.insertMany(caseRecords);
  console.log(`Inserted ${insertedCases.length} clinical cases.`);

  // 10. Plans
  const insertedPlans = await Plan.insertMany(planData);
  console.log(`Inserted ${insertedPlans.length} plans.`);

  // 11. App Config
  await AppConfig.insertMany(appConfigData);
  console.log(`Inserted ${appConfigData.length} app config entries.`);

  // 12. Audit Logs
  await AuditLog.insertMany(auditActions);
  console.log(`Inserted ${auditActions.length} audit logs.`);

  // 13. Daily Activity
  await DailyActivity.insertMany(dailyActivities);
  console.log(`Inserted ${dailyActivities.length} daily activity records.`);

  // 14. Subscription Codes (need plan refs)
  const planMap = {};
  insertedPlans.forEach(p => {
    if (p.year === 7 && p.discipline === 'medicine') planMap['PREPA20'] = p._id;
    if (p.slug === 'pack-complet-med-all') planMap['PACKMED'] = p._id;
    if (p.slug === 'pack-complet-pharm-all') planMap['PHARM2026'] = p._id;
    if (p.year === 1 && p.discipline === 'medicine') { planMap['ESSAI7J'] = p._id; planMap['STUDENT50'] = p._id; planMap['MED2026'] = p._id; }
  });
  const subCodeRecords = subscriptionCodesData.map(sc => ({
    ...sc,
    planId: planMap[sc.code] || insertedPlans[0]?._id || null,
    createdBy: dummyUserId,
  }));
  await SubscriptionCode.insertMany(subCodeRecords);
  console.log(`Inserted ${subCodeRecords.length} subscription codes.`);

  // ─── SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('         SEED COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`  Modules:              ${insertedModules.length}`);
  console.log(`  Quizzes:              ${quizDocs.length}`);
  console.log(`  Voice Exams:          ${voiceExamDocs.length}`);
  console.log(`  Quiz Results:         ${quizResults.length}`);
  console.log(`  Voice Exam Results:   ${voiceExamResults.length}`);
  console.log(`  Bookmarks:            ${bookmarks.length}`);
  console.log(`  Feedbacks:            ${feedbackMessages.length}`);
  console.log(`  Contacts:             ${contactMessages.length}`);
  console.log(`  Clinical Cases:       ${insertedCases.length}`);
  console.log(`  Plans:                ${insertedPlans.length}`);
  console.log(`  App Configs:          ${appConfigData.length}`);
  console.log(`  Audit Logs:           ${auditActions.length}`);
  console.log(`  Daily Activities:     ${dailyActivities.length}`);
  console.log(`  Subscription Codes:   ${subCodeRecords.length}`);
  console.log('───────────────────────────────────────');
  console.log(`  TOTAL collections:    14`);
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
