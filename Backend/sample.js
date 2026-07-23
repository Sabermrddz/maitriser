import mongoose from 'mongoose';
import Module from './models/moduleModel.js';
import Quiz from './models/quizModel.js';
import VoiceExam from './models/voiceExamModel.js';
import Counter from './models/counterModel.js';
import User from './models/userModel.js';
import QuizResult from './models/quizResultModel.js';
import VoiceExamResult from './models/voiceExamResultModel.js';
import OralMockExam from './models/oralMockExamModel.js';
import OralMockSession from './models/oralMockSessionModel.js';
import Plan from './models/planModel.js';
import SubscriptionCode from './models/subscriptionCodeModel.js';
import Case from './models/caseModel.js';
import Bookmark from './models/bookmarkModel.js';
import DailyActivity from './models/dailyActivityModel.js';
import Feedback from './models/feedbackModel.js';
import ContactMessage from './models/contactModel.js';
import AppConfig from './models/appConfigModel.js';
import TokenBlacklist from './models/tokenBlacklistModel.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/QuizApp';

const medicineModules = [
  { name: 'Anatomie', year: 1, courses: [{ name: 'Anatomie générale', pdfId: '' }, { name: 'Anatomie des membres', pdfId: '' }, { name: 'Anatomie du thorax', pdfId: '' }], discipline: 'medicine' },
  { name: 'Biochimie', year: 1, courses: [{ name: 'Biochimie structurale', pdfId: '' }, { name: 'Enzymologie', pdfId: '' }, { name: 'Métabolismes', pdfId: '' }], discipline: 'medicine' },
  { name: 'Biophysique', year: 1, courses: [{ name: 'Biophysique des membranes', pdfId: '' }, { name: 'Radiations', pdfId: '' }, { name: 'Biomécanique', pdfId: '' }], discipline: 'medicine' },
  { name: 'Histologie', year: 1, courses: [{ name: 'Histologie générale', pdfId: '' }, { name: 'Histologie spéciale', pdfId: '' }, { name: 'Embryologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Physiologie', year: 2, courses: [{ name: 'Physiologie cardiovasculaire', pdfId: '' }, { name: 'Physiologie respiratoire', pdfId: '' }, { name: 'Physiologie rénale', pdfId: '' }], discipline: 'medicine' },
  { name: 'Microbiologie', year: 2, courses: [{ name: 'Bactériologie', pdfId: '' }, { name: 'Virologie', pdfId: '' }, { name: 'Parasitologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Immunologie', year: 2, courses: [{ name: 'Immunité innée', pdfId: '' }, { name: 'Immunité adaptative', pdfId: '' }, { name: 'Immunopathologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Sémiologie', year: 2, courses: [{ name: 'Sémiologie cardiovasculaire', pdfId: '' }, { name: 'Sémiologie digestive', pdfId: '' }, { name: 'Sémiologie neurologique', pdfId: '' }], discipline: 'medicine' },
  { name: 'Pharmacologie', year: 3, courses: [{ name: 'Pharmacocinétique', pdfId: '' }, { name: 'Pharmacodynamie', pdfId: '' }, { name: 'Pharmacovigilance', pdfId: '' }], discipline: 'medicine' },
  { name: 'Anatomopathologie', year: 3, courses: [{ name: 'Pathologie générale', pdfId: '' }, { name: 'Pathologie tumorale', pdfId: '' }, { name: 'Pathologie inflammatoire', pdfId: '' }], discipline: 'medicine' },
  { name: 'Radiologie', year: 3, courses: [{ name: 'Radioanatomie', pdfId: '' }, { name: 'Imagerie thoracique', pdfId: '' }, { name: 'Imagerie ostéoarticulaire', pdfId: '' }], discipline: 'medicine' },
  { name: 'Médecine Interne', year: 4, courses: [{ name: 'Hépato-gastro-entérologie', pdfId: '' }, { name: 'Néphrologie', pdfId: '' }, { name: 'Rhumatologie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Pédiatrie', year: 4, courses: [{ name: 'Pédiatrie générale', pdfId: '' }, { name: 'Néonatologie', pdfId: '' }, { name: 'Urgences pédiatriques', pdfId: '' }], discipline: 'medicine' },
  { name: 'Chirurgie Générale', year: 4, courses: [{ name: 'Chirurgie digestive', pdfId: '' }, { name: 'Chirurgie orthopédique', pdfId: '' }, { name: 'Chirurgie vasculaire', pdfId: '' }], discipline: 'medicine' },
  { name: 'Cardiologie', year: 5, courses: [{ name: 'Cardiopathies ischémiques', pdfId: '' }, { name: 'Insuffisance cardiaque', pdfId: '' }, { name: 'Troubles du rythme', pdfId: '' }], discipline: 'medicine' },
  { name: 'Neurologie', year: 5, courses: [{ name: 'Pathologies vasculaires cérébrales', pdfId: '' }, { name: 'Épilepsie', pdfId: '' }, { name: 'Maladies neurodégénératives', pdfId: '' }], discipline: 'medicine' },
  { name: 'Oncologie', year: 5, courses: [{ name: 'Cancérogenèse', pdfId: '' }, { name: 'Chimiothérapie', pdfId: '' }, { name: 'Radiothérapie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Réanimation', year: 6, courses: [{ name: 'Réanimation cardiovasculaire', pdfId: '' }, { name: 'Réanimation respiratoire', pdfId: '' }, { name: 'Sédation', pdfId: '' }], discipline: 'medicine' },
  { name: 'Urgences', year: 6, courses: [{ name: 'Urgences médicales', pdfId: '' }, { name: 'Urgences chirurgicales', pdfId: '' }, { name: 'Urgences traumatologiques', pdfId: '' }], discipline: 'medicine' },
  { name: 'Éthique Médicale', year: 6, courses: [{ name: 'Droits des patients', pdfId: '' }, { name: 'Consentement éclairé', pdfId: '' }, { name: 'Fin de vie', pdfId: '' }], discipline: 'medicine' },
  { name: 'Préparation Internat', year: 7, courses: [{ name: 'Synthèse cardiovasculaire', pdfId: '' }, { name: 'Synthèse neurologique', pdfId: '' }, { name: 'Synthèse infectieuse', pdfId: '' }], discipline: 'medicine' },
];

const pharmacyModules = [
  { name: 'Chimie Générale', year: 1, courses: [{ name: 'Atomistique', pdfId: '' }, { name: 'Liaisons chimiques', pdfId: '' }, { name: 'Thermodynamique', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Botanique Pharmaceutique', year: 1, courses: [{ name: 'Botanique générale', pdfId: '' }, { name: 'Plantes médicinales', pdfId: '' }, { name: 'Pharmacognosie', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Pharmacie Galénique', year: 2, courses: ['Formes pharmaceutiques', 'Voies d\'administration', 'Excipients'], discipline: 'pharmacy' },
  { name: 'Chimie Thérapeutique', year: 2, courses: [{ name: 'Relations structure-activité', pdfId: '' }, { name: 'Médicaments du SNC', pdfId: '' }, { name: 'Antibiotiques', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Pharmacodynamie', year: 3, courses: ['Récepteurs', 'Mécanismes d\'action', 'Interactions'], discipline: 'pharmacy' },
  { name: 'Législation Pharmaceutique', year: 3, courses: ['Code de la santé', 'Pharmacie d\'officine', 'Médicaments'], discipline: 'pharmacy' },
  { name: 'Pharmacie Clinique', year: 4, courses: [{ name: 'Bilans de médication', pdfId: '' }, { name: 'Pharmacovigilance', pdfId: '' }, { name: 'Suivi thérapeutique', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Toxicologie', year: 4, courses: [{ name: 'Toxicologie générale', pdfId: '' }, { name: 'Médicaments toxiques', pdfId: '' }, { name: 'Antidotes', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Officine', year: 5, courses: ['Gestion d\'officine', 'Conseil pharmaceutique', 'Ordonnances'], discipline: 'pharmacy' },
  { name: 'Pharmacie Hospitalière', year: 5, courses: [{ name: 'PUI', pdfId: '' }, { name: 'Stérilisation', pdfId: '' }, { name: 'Préparations', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Santé Publique', year: 6, courses: [{ name: 'Épidémiologie', pdfId: '' }, { name: 'Prévention', pdfId: '' }, { name: 'Vaccination', pdfId: '' }], discipline: 'pharmacy' },
  { name: 'Synthèse Pharmaceutique', year: 6, courses: ['Synthèse et dispensation', 'Cas cliniques complexes', 'Préparation à l\'internat'], discipline: 'pharmacy' },
];

const moduleDefs = [...medicineModules, ...pharmacyModules];

const quizDefs = [
  { quizId: 'Q001', year: 1, moduleName: 'Anatomie', course: 'Anatomie générale',
    discipline: 'medicine',
    questionText: 'Quel est le nombre total d\'os dans le corps humain adulte ?',
    options: ['106', '206', '306', '406'], correctAnswers: ['206'], explanation: 'Le squelette adulte comprend 206 os.' },
  { quizId: 'Q002', year: 1, moduleName: 'Anatomie', course: 'Anatomie des membres',
    discipline: 'medicine',
    questionText: 'Quel est l\'os le plus long du corps humain ?',
    options: ['Fémur', 'Humérus', 'Tibia', 'Radius'], correctAnswers: ['Fémur'], explanation: 'Le fémur est l\'os le plus long, mesurant environ 50 cm.' },
  { quizId: 'Q003', year: 1, moduleName: 'Biochimie', course: 'Biochimie structurale',
    discipline: 'medicine',
    questionText: 'Quel est le glucide le plus abondant dans le sang ?',
    options: ['Fructose', 'Galactose', 'Glucose', 'Saccharose'], correctAnswers: ['Glucose'], explanation: 'La glycémie normale est maintenue par le glucose.' },
  { quizId: 'Q004', year: 2, moduleName: 'Physiologie', course: 'Physiologie cardiovasculaire',
    discipline: 'medicine',
    questionText: 'Quel est le volume d\'éjection systolique normal du cœur gauche ?',
    options: ['50 mL', '70 mL', '90 mL', '110 mL'], correctAnswers: ['70 mL'], explanation: 'Le VES est d\'environ 70 mL au repos.' },
  { quizId: 'Q005', year: 2, moduleName: 'Microbiologie', course: 'Bactériologie',
    discipline: 'medicine',
    questionText: 'Quel antibiotique cible la paroi bactérienne ?',
    options: ['Tétracycline', 'Pénicilline', 'Érythromycine', 'Ciprofloxacine'], correctAnswers: ['Pénicilline'], explanation: 'Les β-lactamines inhibent la synthèse du peptidoglycane.' },
  { quizId: 'Q006', year: 3, moduleName: 'Pharmacologie', course: 'Pharmacocinétique',
    discipline: 'medicine',
    questionText: 'Quel est le principal organe du métabolisme des médicaments ?',
    options: ['Rein', 'Foie', 'Poumon', 'Cœur'], correctAnswers: ['Foie'], explanation: 'Le foie assure le métabolisme de phase I et II.' },
  { quizId: 'Q007', year: 4, moduleName: 'Médecine Interne', course: 'Hépato-gastro-entérologie',
    discipline: 'medicine',
    questionText: 'Quel est le principal facteur de risque du carcinome hépatocellulaire ?',
    options: ['Hépatite B', 'Stéatose hépatique', 'Cirrhose', 'Hémochromatose'],
    correctAnswers: ['Cirrhose'], explanation: 'La cirrhose, quelle qu\'en soit la cause, est le principal facteur de risque.' },
  { quizId: 'Q008', year: 5, moduleName: 'Cardiologie', course: 'Cardiopathies ischémiques',
    discipline: 'medicine',
    questionText: 'Quel est le traitement de première intention de l\'infarctus du myocarde ST+ ?',
    options: ['Angioplastie primaire', 'Thrombolyse', 'Pontage aorto-coronarien', 'Traitement médical seul'],
    correctAnswers: ['Angioplastie primaire'], explanation: 'L\'angioplastie primaire dans les 90 min est le gold standard.' },
  { quizId: 'Q009', year: 6, moduleName: 'Réanimation', course: 'Réanimation cardiovasculaire',
    discipline: 'medicine',
    questionText: 'Quel est le rapport compression/ventilation en RCP adulte ?',
    options: ['15:2', '30:2', '15:1', '30:1'], correctAnswers: ['30:2'], explanation: 'Le rapport est de 30 compressions pour 2 insufflations.' },
  { quizId: 'Q010', year: 7, moduleName: 'Préparation Internat', course: 'Synthèse cardiovasculaire',
    discipline: 'medicine',
    questionText: 'Dans l\'insuffisance cardiaque à fraction d\'éjection réduite, quel traitement a prouvé une réduction de la mortalité ?',
    options: ['IEC + Bêta-bloquant + ARM', 'Diurétiques seuls', 'Digitale seule', 'Antagonistes calciques'],
    correctAnswers: ['IEC + Bêta-bloquant + ARM'], explanation: 'La trithérapie IEC/BB/ARM est le standard thérapeutique.' },
  // Pharmacy quizzes
  { quizId: 'Q011', year: 1, moduleName: 'Chimie Générale', course: 'Atomistique',
    discipline: 'pharmacy',
    questionText: 'Quel est le nombre maximum d\'électrons dans la couche L (n=2) ?',
    options: ['2', '8', '18', '32'], correctAnswers: ['8'], explanation: 'La couche L (n=2) peut contenir au maximum 8 électrons.' },
  { quizId: 'Q012', year: 2, moduleName: 'Pharmacie Galénique', course: 'Formes pharmaceutiques',
    discipline: 'pharmacy',
    questionText: 'Quel est le principal avantage d\'une forme LP (libération prolongée) ?',
    options: ['Action plus rapide', 'Prise unique par jour', 'Moins d\'effets secondaires', 'Meilleur goût'],
    correctAnswers: ['Prise unique par jour'], explanation: 'Les formes LP permettent de réduire la fréquence d\'administration.' },
  { quizId: 'Q013', year: 3, moduleName: 'Pharmacodynamie', course: 'Récepteurs',
    discipline: 'pharmacy',
    questionText: 'Qu\'est-ce qu\'un antagoniste compétitif ?',
    options: ['Se lie au site actif de façon irréversible', 'Se lie au site actif et bloque l\'agoniste', 'Active le récepteur', 'Ne se lie pas au récepteur'],
    correctAnswers: ['Se lie au site actif et bloque l\'agoniste'], explanation: 'Un antagoniste compétitif bloque le site actif de manière réversible.' },
  { quizId: 'Q014', year: 4, moduleName: 'Pharmacie Clinique', course: 'Bilans de médication',
    discipline: 'pharmacy',
    questionText: 'Quel médicament nécessite une surveillance de la kaliémie en association avec un IEC ?',
    options: ['Paracétamol', 'Spironolactone', 'Amoxicilline', 'Oméprazole'],
    correctAnswers: ['Spironolactone'], explanation: 'L\'association IEC + spironolactone augmente le risque d\'hyperkaliémie.' },
  { quizId: 'Q015', year: 5, moduleName: 'Officine', course: 'Conseil pharmaceutique',
    discipline: 'pharmacy',
    questionText: 'Quel conseil donner à un patient prenant des IPP au long cours ?',
    options: ['Prendre avec du calcium', 'Surveillance de la vitamine B12', 'Éviter l\'alcool', 'Prendre à jeun'],
    correctAnswers: ['Surveillance de la vitamine B12'], explanation: 'Les IPP au long cours peuvent entraîner une carence en vitamine B12.' },
  { quizId: 'Q016', year: 6, moduleName: 'Santé Publique', course: 'Vaccination',
    discipline: 'pharmacy',
    questionText: 'Quel est le schéma vaccinal du ROR chez l\'enfant ?',
    options: ['1 dose à 12 mois', '1 dose à 12 mois + rappel à 6 ans', '2 doses à 1 mois d\'intervalle', '3 doses à 2 mois d\'intervalle'],
    correctAnswers: ['1 dose à 12 mois + rappel à 6 ans'], explanation: 'Le ROR est administré à 12 mois avec un rappel à 6 ans.' },
];

const voiceExamDefs = [
  { title: 'Cas clinique : Syndrome occlusif', year: 5, moduleName: 'Médecine Interne', discipline: 'medicine',
    clinicalCasePrompt: 'Patient de 68 ans, sans antécédent chirurgical, se présente pour des douleurs abdominales diffuses, arrêt des matières et des gaz depuis 48h, nausées. À l\'examen : abdomen distendu, tympanique, douloureux diffusément. T° 38.2°C, FC 100/min.',
    questions: [
      { questionText: 'Quels examens d\'imagerie demandez-vous en première intention ?',
        idealAnswer: 'ASP debout et couché, et/ou TDM abdominal avec injection.',
        criteria: [{ label: 'ASP demandé', keywords: ['ASP', 'abdomen sans préparation'] }, { label: 'TDM demandé', keywords: ['TDM', 'scanner'] }] },
      { questionText: 'Quels critères cliniques indiquent une urgence chirurgicale ?',
        idealAnswer: 'Signes de choc, fièvre élevée, défense ou contracture abdominale.',
        criteria: [{ label: 'Signes de choc', keywords: ['choc', 'hypotension', 'tachycardie'] }, { label: 'Contracture/défense', keywords: ['contracture', 'défense'] }] },
    ]},
  { title: 'Cas clinique : Insuffisance cardiaque', year: 5, moduleName: 'Cardiologie', discipline: 'medicine',
    clinicalCasePrompt: 'Patient de 78 ans, FEVG 35%, dyspnée d\'aggravation progressive, orthopnée, œdèmes des membres inférieurs. TA 150/90, FC 95, SpO2 88%.',
    questions: [
      { questionText: 'Quels examens complémentaires réalisez-vous en urgence ?',
        idealAnswer: 'BNP, NFS, CRP, ionogramme, créatinine, troponine, ECG, radio thoracique, échocardiographie.',
        criteria: [{ label: 'BNP demandé', keywords: ['BNP', 'NT-proBNP'] }, { label: 'Échocardiographie', keywords: ['échocardiographie', 'ETT'] }] },
      { questionText: 'Quel traitement instaurez-vous ?',
        idealAnswer: 'Oxygénothérapie, diurétiques de l\'anse IV, puis IEC, bêta-bloquants et ARM après stabilisation.',
        criteria: [{ label: 'Oxygénothérapie', keywords: ['oxygène', 'O2'] }, { label: 'Diurétique IV', keywords: ['furosémide', 'diurétique'] }] },
    ]},
  { title: 'Cas clinique : Polytraumatisé (urgences)', year: 6, moduleName: 'Urgences', discipline: 'medicine',
    clinicalCasePrompt: 'Patient de 30 ans, AVP, GCS 13, TA 80/50, FC 130, FR 30. Déformation fémur gauche, plaie cuir chevelu.',
    questions: [
      { questionText: 'Quelle est la priorité selon le damage control ?',
        idealAnswer: 'Contrôle hémorragique, remplissage restrictif, transfusion massive si besoin, bilan lésionnel (Fast-echo, TDM).',
        criteria: [{ label: 'Choc hémorragique', keywords: ['choc', 'hémorragique'] }, { label: 'Damage control', keywords: ['damage control'] }] },
    ]},
];

async function clearAll() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})));
  console.log('All collections cleared.');
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const force = process.argv.includes('--force');
  if (force) await clearAll();

  // -----------------------------------------------------------------------
  // 1. COUNTERS
  // -----------------------------------------------------------------------
  await Counter.findByIdAndUpdate('U', { $setOnInsert: { seq: 0 } }, { upsert: true });
  await Counter.findByIdAndUpdate('Q', { $setOnInsert: { seq: 16 } }, { upsert: true });
  await Counter.findByIdAndUpdate('VE', { $setOnInsert: { seq: 2 } }, { upsert: true });
  console.log('Counters initialized.');

  // -----------------------------------------------------------------------
  // 2. APP CONFIG
  // -----------------------------------------------------------------------
  await AppConfig.insertMany([
    { key: 'maintenance_mode', value: false },
    { key: 'site_name', value: 'QuizApp v7' },
    { key: 'max_upload_size_mb', value: 10 },
    { key: 'allowed_quiz_attempts', value: 3 },
  ]);
  const [configDoc] = await AppConfig.find({});
  console.log(`AppConfig: ${await AppConfig.countDocuments()} configs`);

  // -----------------------------------------------------------------------
  // 3. MODULES
  // -----------------------------------------------------------------------
  const existingModules = await Module.countDocuments();
  if (existingModules === 0) {
    await Module.insertMany(moduleDefs);
  }
  const moduleDocs = await Module.find({});
  const moduleMap = {};
  moduleDocs.forEach(m => { moduleMap[m.name] = m; });
  console.log(`Modules: ${moduleDocs.length}`);

  // -----------------------------------------------------------------------
  // 4. USERS (admin + 2 regular)
  // -----------------------------------------------------------------------
  let existingUsers = await User.countDocuments();
  let admin, user1, user2;
  if (existingUsers === 0) {
    admin = await User.create({
      userId: 'U001', name: 'Admin Docteur', email: 'admin@quizapp.com',
      password: 'admin123', role: 'admin', discipline: 'medicine', year: 5,
    });
    user1 = await User.create({
      userId: 'U002', name: 'Étudiant Médecine', email: 'etudiant.med@example.com',
      password: 'test1234', role: 'user', discipline: 'medicine', year: 4,
    });
    user2 = await User.create({
      userId: 'U003', name: 'Étudiant Pharmacie', email: 'etudiant.pharma@example.com',
      password: 'test1234', role: 'user', discipline: 'pharmacy', year: 3,
    });
  } else {
    [admin, user1, user2] = await User.find({}).sort({ createdAt: 1 }).limit(3);
    if (!admin) admin = user1;
  }

  console.log(`Users: ${await User.countDocuments()}  (admin=${admin.name}, user1=${user1?.name}, user2=${user2?.name})`);

  // -----------------------------------------------------------------------
  // 5. QUIZZES
  // -----------------------------------------------------------------------
  const existingQuizzes = await Quiz.countDocuments();
  let quizDocs = [];
  if (existingQuizzes === 0) {
    const toInsert = [];
    for (const q of quizDefs) {
      const mod = moduleMap[q.moduleName];
      if (!mod) { console.warn(`Module not found: ${q.moduleName}`); continue; }
      toInsert.push({
        quizId: q.quizId, year: q.year, moduleId: mod._id,
        discipline: q.discipline, course: q.course, published: true,
        explanation: q.explanation,
        question: { questionText: q.questionText, options: q.options, correctAnswers: q.correctAnswers },
      });
    }
    quizDocs = await Quiz.insertMany(toInsert);
  } else {
    quizDocs = await Quiz.find({});
  }
  console.log(`Quizzes: ${quizDocs.length}`);

  const quizById = {};
  quizDocs.forEach(q => { quizById[q.quizId] = q; });

  // -----------------------------------------------------------------------
  // 6. CASES (with case quizzes)
  // -----------------------------------------------------------------------
  const existingCases = await Case.countDocuments();
  let caseDoc;
  let caseQuizDocs = [];
  if (existingCases === 0) {
    const medIntMod = moduleMap['Médecine Interne'];
    caseDoc = await Case.create({
      title: 'Cas clinique : Hémorragie digestive haute',
      description: 'Patient de 55 ans se présente pour mélœna et hématémèse. Antécédents d\'ulcère gastrique.',
      moduleId: medIntMod._id, year: 4, discipline: 'medicine', course: 'Hépato-gastro-entérologie',
    });

    const caseQuizData = [
      { quizId: 'Q017', year: 4, course: 'Hépato-gastro-entérologie',
        questionText: 'Quel est le premier geste d\'urgence devant une hémorragie digestive haute active ?',
        options: ['Fibroscopie œso-gastro-duodénale', 'Lavage gastrique', 'Bande gastrique', 'Transfusion systématique'],
        correctAnswers: ['Fibroscopie œso-gastro-duodénale'], explanation: 'La FOGD diagnostique et permet le traitement hémostatique.' },
      { quizId: 'Q018', year: 4, course: 'Hépato-gastro-entérologie',
        questionText: 'Quel score évalue la gravité d\'une hémorragie digestive haute ?',
        options: ['Score de Glasgow-Blatchford', 'Score APACHE II', 'Score SOFA', 'Score MELD'],
        correctAnswers: ['Score de Glasgow-Blatchford'], explanation: 'Le score de Glasgow-Blatchford évalue le risque de récidive et la mortalité.' },
    ];

    caseQuizDocs = [];
    for (const cq of caseQuizData) {
      const q = await Quiz.create({
        quizId: cq.quizId, year: cq.year, moduleId: medIntMod._id,
        discipline: 'medicine', course: cq.course, published: true, caseId: caseDoc._id,
        explanation: cq.explanation,
        question: { questionText: cq.questionText, options: cq.options, correctAnswers: cq.correctAnswers },
      });
      caseQuizDocs.push(q);
    }
  } else {
    caseDoc = await Case.findOne({});
    caseQuizDocs = await Quiz.find({ caseId: { $ne: null } });
  }
  console.log(`Cases: ${await Case.countDocuments()}  (case quizzes: ${caseQuizDocs.length})`);

  // -----------------------------------------------------------------------
  // 7. QUIZ MOCK EXAMS
  // -----------------------------------------------------------------------
  const existingMockExams = await QuizMockExam.countDocuments();
  let mockExam;
  if (existingMockExams === 0) {
    const med4Modules = moduleDocs.filter(m => m.year === 4 && m.discipline === 'medicine');
    const med4QuizIds = quizDocs.filter(q => q.year === 4 && q.discipline === 'medicine').concat(caseQuizDocs).map(q => q._id);
    const pharm3Modules = moduleDocs.filter(m => m.year === 3 && m.discipline === 'pharmacy');
    const pharm3QuizIds = quizDocs.filter(q => q.year === 3 && q.discipline === 'pharmacy').map(q => q._id);

    mockExam = await QuizMockExam.create({
      title: 'Examen Blanc : Médecine Interne 4e Année',
      moduleId: med4Modules[0]?._id || moduleMap['Médecine Interne']._id,
      year: 4, discipline: 'medicine',
      quizIds: med4QuizIds.slice(0, 5),
      duration: 45, published: true,
    });
    await QuizMockExam.create({
      title: 'Examen Blanc : Pharmacodynamie 3e Année',
      moduleId: pharm3Modules[0]?._id || moduleMap['Pharmacodynamie']._id,
      year: 3, discipline: 'pharmacy',
      quizIds: pharm3QuizIds.slice(0, 3),
      duration: 30, published: true,
    });
  } else {
    mockExam = await QuizMockExam.findOne({});
  }
  console.log(`QuizMockExams: ${await QuizMockExam.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 8. QUIZ MOCK ATTEMPTS
  // -----------------------------------------------------------------------
  const existingAttempts = await QuizMockAttempt.countDocuments();
  if (existingAttempts === 0 && mockExam && user1) {
    await QuizMockAttempt.create({
      userId: user1.userId,
      mockExamId: mockExam._id,
      quizIds: mockExam.quizIds,
      answers: mockExam.quizIds.map(qId => ({
        quizId: qId,
        selectedAnswers: ['Fémur'],
        correct: true,
        correctAnswers: ['Fémur'],
        explanation: '',
      })),
      totalScore: mockExam.quizIds.length,
      totalPossible: mockExam.quizIds.length,
      percentage: 100,
      status: 'completed',
      completedAt: new Date(),
    });
  }
  console.log(`QuizMockAttempts: ${await QuizMockAttempt.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 9. ORAL MOCK EXAMS
  // -----------------------------------------------------------------------
  const existingOralExams = await OralMockExam.countDocuments();
  let oralExam;
  if (existingOralExams === 0) {
    const allVoiceExams = await VoiceExam.find({});

    oralExam = await OralMockExam.create({
      title: 'Oral Blanc : Urgences & Réanimation',
      moduleId: moduleMap['Urgences']._id,
      year: 6, discipline: 'medicine',
      voiceExamIds: allVoiceExams.map(v => v._id),
      published: true,
      createdBy: admin._id,
    });
  } else {
    oralExam = await OralMockExam.findOne({});
  }
  console.log(`OralMockExams: ${await OralMockExam.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 10. VOICE EXAMS
  // -----------------------------------------------------------------------
  const existingVoiceExams = await VoiceExam.countDocuments();
  let voiceExamDocs = [];
  if (existingVoiceExams === 0) {
    const toInsert = [];
    for (const [idx, v] of voiceExamDefs.entries()) {
      const mod = moduleMap[v.moduleName];
      if (!mod) continue;
      toInsert.push({
        examId: `VE${String(idx + 1).padStart(3, '0')}`,
        title: v.title, year: v.year, moduleId: mod._id,
        discipline: v.discipline, clinicalCasePrompt: v.clinicalCasePrompt,
        questions: v.questions,
      });
    }
    voiceExamDocs = await VoiceExam.insertMany(toInsert);

    // Update oral mock exam with voice exam refs
    if (oralExam) {
      oralExam.voiceExamIds = voiceExamDocs.map(v => v._id);
      await oralExam.save();
    }
  } else {
    voiceExamDocs = await VoiceExam.find({});
  }
  console.log(`VoiceExams: ${voiceExamDocs.length}`);

  // -----------------------------------------------------------------------
  // 11. VOICE EXAM RESULTS
  // -----------------------------------------------------------------------
  const existingVoiceResults = await VoiceExamResult.countDocuments();
  if (existingVoiceResults === 0 && voiceExamDocs.length > 0 && user1) {
    const ve = voiceExamDocs[0];
    await VoiceExamResult.create({
      userId: user1.userId,
      examId: ve._id,
      answers: (ve.questions || []).map((q, qi) => {
        const criteriaResults = (q.criteria || []).map(c => ({ label: c.label, passed: true }));
        return {
          questionIndex: qi,
          text: `Réponse à la question ${qi + 1}`,
          criteriaResults,
          allPassed: criteriaResults.every(cr => cr.passed),
        };
      }),
      overallPassed: 3,
      overallTotal: 3,
      overallMax: 4,
    });
  }
  console.log(`VoiceExamResults: ${await VoiceExamResult.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 12. ORAL MOCK SESSIONS
  // -----------------------------------------------------------------------
  const existingSessions = await OralMockSession.countDocuments();
  if (existingSessions === 0 && oralExam && user1) {
    await OralMockSession.create({
      blueprintId: oralExam._id,
      userId: user1.userId,
      voiceExamIds: oralExam.voiceExamIds,
      status: 'completed',
      currentStation: oralExam.voiceExamIds.length,
      stationResults: (oralExam.voiceExamIds || []).map((vid, i) => ({
        voiceExamId: vid,
        resultId: null,
        title: voiceExamDocs[i]?.title || `Station ${i + 1}`,
        overallPassed: 2,
        overallTotal: 2,
        overallMax: 3,
      })),
      completedAt: new Date(),
    });
  }
  console.log(`OralMockSessions: ${await OralMockSession.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 13. QUIZ RESULTS
  // -----------------------------------------------------------------------
  const existingResults = await QuizResult.countDocuments();
  if (existingResults === 0 && user1 && quizDocs.length > 0) {
    await QuizResult.create({
      userId: user1.userId,
      quizId: quizDocs[0]._id,
      score: 1,
      answers: {
        selected: ['Fémur'],
        correct: ['Fémur'],
        isCorrect: true,
      },
    });
    if (quizDocs.length > 1) {
      await QuizResult.create({
        userId: user1.userId,
        quizId: quizDocs[1]._id,
        score: 0,
        answers: { selected: ['106'], correct: ['206'], isCorrect: false },
      });
    }
    // Results for user2
    if (user2) {
      await QuizResult.create({
        userId: user2.userId,
        quizId: quizDocs[0]._id,
        score: 1,
        answers: { selected: ['206'], correct: ['206'], isCorrect: true },
      });
    }
  }
  console.log(`QuizResults: ${await QuizResult.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 14. BOOKMARKS
  // -----------------------------------------------------------------------
  const existingBookmarks = await Bookmark.countDocuments();
  if (existingBookmarks === 0 && user1 && quizDocs.length > 1) {
    await Bookmark.insertMany([
      { userId: user1.userId, quizId: quizDocs[0]._id },
      { userId: user1.userId, quizId: quizDocs[1]._id },
      { userId: user2?.userId || user1.userId, quizId: quizDocs[0]._id },
    ]);
  }
  console.log(`Bookmarks: ${await Bookmark.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 15. DAILY ACTIVITIES
  // -----------------------------------------------------------------------
  const existingActivities = await DailyActivity.countDocuments();
  if (existingActivities === 0 && user1 && quizDocs.length > 1) {
    const today = new Date().toISOString().slice(0, 10);
    await DailyActivity.create({
      userId: admin._id,
      date: today,
      quizIds: quizDocs.slice(0, 3).map(q => q._id),
      answers: quizDocs.slice(0, 3).map(q => ({
        quizId: q._id,
        questionText: q.question?.questionText || '',
        selectedAnswers: q.question?.correctAnswers || [],
        correctAnswers: q.question?.correctAnswers || [],
        correct: true,
      })),
      score: 3,
      total: 3,
    });
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await DailyActivity.create({
      userId: user1._id,
      date: yesterday,
      quizIds: quizDocs.slice(1, 3).map(q => q._id),
      answers: quizDocs.slice(1, 3).map(q => ({
        quizId: q._id,
        questionText: q.question?.questionText || '',
        selectedAnswers: q.question?.correctAnswers || [],
        correctAnswers: q.question?.correctAnswers || [],
        correct: true,
      })),
      score: 2,
      total: 2,
    });
  }
  console.log(`DailyActivities: ${await DailyActivity.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 16. PLANS
  // -----------------------------------------------------------------------
  const existingPlans = await Plan.countDocuments();
  let plan1, plan2;
  if (existingPlans === 0) {
    plan1 = await Plan.create({
      name: 'Médecine Annuelle', discipline: 'medicine', year: 1,
      price: 99.99, interval: 'year', isActive: true, sortOrder: 1,
      included: { quizzes: true, voiceExams: false },
    });
    plan2 = await Plan.create({
      name: 'Pharmacie Mensuelle', discipline: 'pharmacy', year: 1,
      price: 12.99, interval: 'month', isActive: true, sortOrder: 2,
      included: { quizzes: true, voiceExams: true },
    });
  } else {
    [plan1, plan2] = await Plan.find({}).limit(2);
  }
  console.log(`Plans: ${await Plan.countDocuments()}`);

  // Give users active subscriptions so gated content (voice exams, etc.) is accessible
  const subEnd = new Date(Date.now() + 365 * 86400000);
  for (const u of [admin, user1, user2]) {
    if (u && (!u.subscription || u.subscription.status !== 'active')) {
      await User.findByIdAndUpdate(u._id, {
        subscription: {
          planId: plan1?._id || undefined,
          planName: plan1?.name || 'Sample Plan',
          status: 'active',
          startDate: new Date(),
          endDate: subEnd,
        },
      });
    }
  }
  const activeUsers = await User.countDocuments({ 'subscription.status': 'active' });
  console.log(`Users with active subscription: ${activeUsers}`);

  // -----------------------------------------------------------------------
  // 17. SUBSCRIPTION CODES
  // -----------------------------------------------------------------------
  const existingCodes = await SubscriptionCode.countDocuments();
  if (existingCodes === 0 && plan1) {
    await SubscriptionCode.insertMany([
      { code: 'MEDFREE2026', planId: plan1._id, status: 'active',
        expiresAt: new Date('2027-12-31'), createdBy: admin._id,
        notes: 'Code promo gratuit médecine' },
      { code: 'PHARMA50', planId: plan2?._id || plan1._id, status: 'active',
        expiresAt: new Date('2026-12-31'), createdBy: admin._id,
        notes: 'Code promo pharmacie' },
      { code: 'USEDCODE01', planId: plan1._id, status: 'used',
        usedBy: user1?._id, usedAt: new Date(),
        expiresAt: new Date('2025-06-30'), createdBy: admin._id,
        notes: 'Déjà utilisé' },
    ]);
  }
  console.log(`SubscriptionCodes: ${await SubscriptionCode.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 18. FEEDBACK
  // -----------------------------------------------------------------------
  const existingFeedback = await Feedback.countDocuments();
  if (existingFeedback === 0 && user1) {
    await Feedback.insertMany([
      { userId: user1._id, message: 'Très bonne plateforme pour réviser les QCM. J\'aimerais plus de quiz en neurologie.',
        pageUrl: '/dashboard', status: 'unread' },
      { userId: user2?._id || user1._id, message: 'Fonctionnalité vocale très utile pour préparer l\'oral.',
        pageUrl: '/oral-mock-exam', status: 'read' },
    ]);
  }
  console.log(`Feedback: ${await Feedback.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 19. CONTACT MESSAGES
  // -----------------------------------------------------------------------
  const existingContacts = await ContactMessage.countDocuments();
  if (existingContacts === 0) {
    await ContactMessage.insertMany([
      { name: 'Jean Dupont', email: 'jean.dupont@example.com',
        message: 'Bonjour, je suis intéressé par un abonnement pour la pharmacie. Pouvez-vous me contacter ?',
        status: 'unread' },
      { name: 'Marie Curie', email: 'marie.curie@example.com',
        message: 'Problème de connexion à la plateforme depuis hier soir.',
        status: 'read' },
      { name: 'Paul Martin', email: 'paul.martin@example.com',
        message: 'Suggestion : ajouter des quiz en ophtalmologie.',
        status: 'replied' },
    ]);
  }
  console.log(`ContactMessages: ${await ContactMessage.countDocuments()}`);

  // -----------------------------------------------------------------------
  // 20. TOKEN BLACKLIST (optional — add a "logged out" token for demo)
  // -----------------------------------------------------------------------
  const existingTokens = await TokenBlacklist.countDocuments();
  if (existingTokens === 0) {
    await TokenBlacklist.create({
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_expired_token_for_testing',
      expiresAt: new Date(Date.now() + 86400000),
    });
  }
  console.log(`TokenBlacklist: ${await TokenBlacklist.countDocuments()}`);

  // -----------------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------------
  console.log('\n========================================');
  console.log('  SAMPLE DATABASE SEED COMPLETE');
  console.log('========================================');
  const counts = {
    AppConfig: await AppConfig.countDocuments(),
    Modules: await Module.countDocuments(),
    Users: await User.countDocuments(),
    Quizzes: await Quiz.countDocuments(),
    Cases: await Case.countDocuments(),
    QuizMockExams: await QuizMockExam.countDocuments(),
    QuizMockAttempts: await QuizMockAttempt.countDocuments(),
    OralMockExams: await OralMockExam.countDocuments(),
    OralMockSessions: await OralMockSession.countDocuments(),
    VoiceExams: await VoiceExam.countDocuments(),
    VoiceExamResults: await VoiceExamResult.countDocuments(),
    QuizResults: await QuizResult.countDocuments(),
    Bookmarks: await Bookmark.countDocuments(),
    DailyActivities: await DailyActivity.countDocuments(),
    Plans: await Plan.countDocuments(),
    SubscriptionCodes: await SubscriptionCode.countDocuments(),
    Feedback: await Feedback.countDocuments(),
    ContactMessages: await ContactMessage.countDocuments(),
    TokenBlacklist: await TokenBlacklist.countDocuments(),
    Counters: await Counter.countDocuments(),
  };
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name.padEnd(20)} ${count}`);
  }
  console.log('========================================\n');

  console.log('Test accounts:');
  console.log('  Admin: admin@quizapp.com / admin123');
  console.log('  User:  etudiant.med@example.com / test1234');
  console.log('  User:  etudiant.pharma@example.com / test1234');
  console.log('\nSubscription codes:');
  console.log('  MEDFREE2026 — free medicine plan');
  console.log('  PHARMA50 — pharmacy discount');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
