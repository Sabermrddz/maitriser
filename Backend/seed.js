import mongoose from 'mongoose';
import Module from './models/moduleModel.js';
import Quiz from './models/quizModel.js';
import VoiceExam from './models/voiceExamModel.js';
import Counter from './models/counterModel.js';

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

const modules = [...medicineModules, ...pharmacyModules];

const medicineQuizzes = [
  // Year 1 — Anatomie
  { quizId: 'Q001', year: 1, moduleName: 'Anatomie', course: 'Anatomie générale',
    questionText: 'Quel est le nombre total d\'os dans le corps humain adulte ?',
    options: ['106', '206', '306', '406'], correctAnswers: ['206'], explanation: 'Le squelette adulte comprend 206 os.' },
  { quizId: 'Q002', year: 1, moduleName: 'Anatomie', course: 'Anatomie des membres',
    questionText: 'Quel est l\'os le plus long du corps humain ?',
    options: ['Fémur', 'Humérus', 'Tibia', 'Radius'], correctAnswers: ['Fémur'], explanation: 'Le fémur est l\'os le plus long, mesurant environ 50 cm.' },
  { quizId: 'Q003', year: 1, moduleName: 'Anatomie', course: 'Anatomie du thorax',
    questionText: 'Combien de côtes le thorax humain comporte-t-il normalement ?',
    options: ['10 paires', '11 paires', '12 paires', '13 paires'], correctAnswers: ['12 paires'], explanation: 'Il y a 12 paires de côtes.' },
  // Year 1 — Biochimie
  { quizId: 'Q004', year: 1, moduleName: 'Biochimie', course: 'Biochimie structurale',
    questionText: 'Quel est le glucide le plus abondant dans le sang ?',
    options: ['Fructose', 'Galactose', 'Glucose', 'Saccharose'], correctAnswers: ['Glucose'], explanation: 'La glycémie normale est maintenue par le glucose.' },
  { quizId: 'Q005', year: 1, moduleName: 'Biochimie', course: 'Enzymologie',
    questionText: 'Quel organe produit principalement les enzymes digestives ?',
    options: ['Foie', 'Pancréas', 'Estomac', 'Intestin grêle'], correctAnswers: ['Pancréas'], explanation: 'Le pancréas exocrine sécrète les enzymes digestives.' },
  // Year 2 — Physiologie
  { quizId: 'Q006', year: 2, moduleName: 'Physiologie', course: 'Physiologie cardiovasculaire',
    questionText: 'Quel est le volume d\'éjection systolique normal du cœur gauche ?',
    options: ['50 mL', '70 mL', '90 mL', '110 mL'], correctAnswers: ['70 mL'], explanation: 'Le VES est d\'environ 70 mL au repos.' },
  { quizId: 'Q007', year: 2, moduleName: 'Physiologie', course: 'Physiologie respiratoire',
    questionText: 'Quel est le principal muscle inspiratoire ?',
    options: ['Diaphragme', 'Intercostaux externes', 'Scalènes', 'Grand pectoral'], correctAnswers: ['Diaphragme'], explanation: 'Le diaphragme assure 70 % de l\'inspiration.' },
  // Year 2 — Microbiologie
  { quizId: 'Q008', year: 2, moduleName: 'Microbiologie', course: 'Bactériologie',
    questionText: 'Quel antibiotique cible la paroi bactérienne ?',
    options: ['Tétracycline', 'Pénicilline', 'Érythromycine', 'Ciprofloxacine'], correctAnswers: ['Pénicilline'], explanation: 'Les β-lactamines inhibent la synthèse du peptidoglycane.' },
  // Year 3 — Pharmacologie
  { quizId: 'Q009', year: 3, moduleName: 'Pharmacologie', course: 'Pharmacocinétique',
    questionText: 'Quel est le principal organe du métabolisme des médicaments ?',
    options: ['Rein', 'Foie', 'Poumon', 'Cœur'], correctAnswers: ['Foie'], explanation: 'Le foie assure le métabolisme de phase I et II.' },
  { quizId: 'Q010', year: 3, moduleName: 'Pharmacologie', course: 'Pharmacodynamie',
    questionText: 'Que signifie la CI50 d\'un médicament ?',
    options: ['Concentration inhibitrice 50%', 'Coefficient d\'innocuité 50%', 'Capacité d\'intégration 50%', 'Concentration idéale 50%'],
    correctAnswers: ['Concentration inhibitrice 50%'], explanation: 'La CI50 est la concentration qui inhibe 50 % de l\'activité cible.' },
  // Year 3 — Anatomopathologie
  { quizId: 'Q011', year: 3, moduleName: 'Anatomopathologie', course: 'Pathologie tumorale',
    questionText: 'Quel est le critère microscopique essentiel de la malignité ?',
    options: ['Anisocaryose', 'Nécrose', 'Fibrose', 'Œdème'], correctAnswers: ['Anisocaryose'], explanation: 'L\'anisocaryose (noyaux de taille variable) est un signe de malignité.' },
  // Year 4 — Médecine Interne
  { quizId: 'Q012', year: 4, moduleName: 'Médecine Interne', course: 'Hépato-gastro-entérologie',
    questionText: 'Quel est le principal facteur de risque du carcinome hépatocellulaire ?',
    options: ['Hépatite B', 'Stéatose hépatique', 'Cirrhose', 'Hémochromatose'],
    correctAnswers: ['Cirrhose'], explanation: 'La cirrhose, quelle qu\'en soit la cause, est le principal facteur de risque.' },
  { quizId: 'Q013', year: 4, moduleName: 'Médecine Interne', course: 'Néphrologie',
    questionText: 'Quel est le seuil de définition de l\'insuffisance rénale chronique (DFG) ?',
    options: ['< 90 mL/min', '< 60 mL/min', '< 30 mL/min', '< 15 mL/min'],
    correctAnswers: ['< 60 mL/min'], explanation: 'Un DFG < 60 mL/min/1.73m² pendant > 3 mois définit l\'IRC.' },
  // Year 4 — Pédiatrie
  { quizId: 'Q014', year: 4, moduleName: 'Pédiatrie', course: 'Néonatologie',
    questionText: 'Quel est le score d\'Apgar normal à 1 minute ?',
    options: ['5-6', '7-8', '7-10', '10-12'], correctAnswers: ['7-10'], explanation: 'Un score ≥ 7 est considéré comme normal.' },
  // Year 5 — Cardiologie
  { quizId: 'Q015', year: 5, moduleName: 'Cardiologie', course: 'Cardiopathies ischémiques',
    questionText: 'Quel est le traitement de première intention de l\'infarctus du myocarde ST+ ?',
    options: ['Angioplastie primaire', 'Thrombolyse', 'Pontage aorto-coronarien', 'Traitement médical seul'],
    correctAnswers: ['Angioplastie primaire'], explanation: 'L\'angioplastie primaire dans les 90 min est le gold standard.' },
  { quizId: 'Q016', year: 5, moduleName: 'Cardiologie', course: 'Troubles du rythme',
    questionText: 'Quel antiarythmique est utilisé en première intention dans la fibrillation atriale ?',
    options: ['Amiodarone', 'Flécaïnide', 'Bêta-bloquant', 'Digoxine'],
    correctAnswers: ['Bêta-bloquant'], explanation: 'Les bêta-bloquants sont la 1ère ligne pour le contrôle de la fréquence.' },
  // Year 5 — Neurologie
  { quizId: 'Q017', year: 5, moduleName: 'Neurologie', course: 'Pathologies vasculaires cérébrales',
    questionText: 'Quelle est la fenêtre thérapeutique de la thrombolyse dans l\'AVC ischémique ?',
    options: ['1h30', '3h', '4h30', '6h'], correctAnswers: ['4h30'], explanation: 'La thrombolyse peut être administrée jusqu\'à 4h30 après le début des symptômes.' },
  // Year 6 — Réanimation
  { quizId: 'Q018', year: 6, moduleName: 'Réanimation', course: 'Réanimation cardiovasculaire',
    questionText: 'Quel est le rapport compression/ventilation en RCP adulte ?',
    options: ['15:2', '30:2', '15:1', '30:1'], correctAnswers: ['30:2'], explanation: 'Le rapport est de 30 compressions pour 2 insufflations.' },
  { quizId: 'Q019', year: 6, moduleName: 'Réanimation', course: 'Réanimation respiratoire',
    questionText: 'Quel mode ventilatoire est recommandé en première intention en SDRA ?',
    options: ['Ventilation contrôlée en volume', 'Ventilation protectrice (6 mL/kg)', 'Ventilation en pression', 'Ventilation spontanée'],
    correctAnswers: ['Ventilation protectrice (6 mL/kg)'], explanation: 'La ventilation protectrice réduit la mortalité dans le SDRA.' },
  // Year 6 — Urgences
  { quizId: 'Q020', year: 6, moduleName: 'Urgences', course: 'Urgences médicales',
    questionText: 'Quel est le premier geste devant un malaise hypoglycémique chez un patient conscient ?',
    options: ['Injection d\'insuline', 'Resucrage oral', 'Glucagon IM', 'Hospitalisation'],
    correctAnswers: ['Resucrage oral'], explanation: 'L\'administration de sucre par voie orale est le premier geste.' },
  // Year 7 — Préparation Internat
  { quizId: 'Q021', year: 7, moduleName: 'Préparation Internat', course: 'Synthèse cardiovasculaire',
    questionText: 'Dans l\'insuffisance cardiaque à fraction d\'éjection réduite, quel traitement a prouvé une réduction de la mortalité ?',
    options: ['IEC + Bêta-bloquant + ARM', 'Diurétiques seuls', 'Digitale seule', 'Antagonistes calciques'],
    correctAnswers: ['IEC + Bêta-bloquant + ARM'], explanation: 'La trithérapie IEC/BB/ARM est le standard thérapeutique.' },
  { quizId: 'Q022', year: 7, moduleName: 'Préparation Internat', course: 'Synthèse infectieuse',
    questionText: 'Quel est le traitement probabiliste de la pneumonie aiguë communautaire ?',
    options: ['Amoxicilline 1g x3/j', 'Amoxicilline-acide clavulanique', 'Ceftriaxone + spiramycine', 'Lévofloxacine'],
    correctAnswers: ['Amoxicilline 1g x3/j'], explanation: 'L\'amoxicilline est le traitement de 1ère intention de la PAC.' },
];

const pharmacyQuizzes = [
  { quizId: 'Q023', year: 1, moduleName: 'Chimie Générale', course: 'Atomistique',
    questionText: 'Quel est le nombre maximum d\'électrons dans la couche L (n=2) ?',
    options: ['2', '8', '18', '32'], correctAnswers: ['8'], explanation: 'La couche L (n=2) peut contenir au maximum 8 électrons.' },
  { quizId: 'Q024', year: 1, moduleName: 'Chimie Générale', course: 'Liaisons chimiques',
    questionText: 'Quel type de liaison implique un partage d\'électrons ?',
    options: ['Liaison ionique', 'Liaison covalente', 'Liaison hydrogène', 'Liaison métallique'],
    correctAnswers: ['Liaison covalente'], explanation: 'La liaison covalente est le partage d\'une paire d\'électrons.' },
  { quizId: 'Q025', year: 1, moduleName: 'Botanique Pharmaceutique', course: 'Plantes médicinales',
    questionText: 'Quelle plante est utilisée pour ses propriétés antispasmodiques ?',
    options: ['Menthe poivrée', 'Digitale', 'Belladone', 'Morphine'],
    correctAnswers: ['Menthe poivrée'], explanation: 'La menthe poivrée a des propriétés antispasmodiques digestives.' },
  { quizId: 'Q026', year: 2, moduleName: 'Pharmacie Galénique', course: 'Formes pharmaceutiques',
    questionText: 'Quel est le principal avantage d\'une forme LP (libération prolongée) ?',
    options: ['Action plus rapide', 'Prise unique par jour', 'Moins d\'effets secondaires', 'Meilleur goût'],
    correctAnswers: ['Prise unique par jour'], explanation: 'Les formes LP permettent de réduire la fréquence d\'administration.' },
  { quizId: 'Q027', year: 2, moduleName: 'Chimie Thérapeutique', course: 'Relations structure-activité',
    questionText: 'Quel groupement chimique est essentiel pour l\'activité des β-lactamines ?',
    options: ['Noyau β-lactame', 'Noyau stéroïde', 'Benzénique', 'Amine primaire'],
    correctAnswers: ['Noyau β-lactame'], explanation: 'Le noyau β-lactame est essentiel à l\'activité antibiotique.' },
  { quizId: 'Q028', year: 3, moduleName: 'Pharmacodynamie', course: 'Récepteurs',
    questionText: 'Qu\'est-ce qu\'un antagoniste compétitif ?',
    options: ['Se lie au site actif de façon irréversible', 'Se lie au site actif et bloque l\'agoniste', 'Active le récepteur', 'Ne se lie pas au récepteur'],
    correctAnswers: ['Se lie au site actif et bloque l\'agoniste'], explanation: 'Un antagoniste compétitif bloque le site actif de manière réversible.' },
  { quizId: 'Q029', year: 3, moduleName: 'Législation Pharmaceutique', course: 'Code de la santé',
    questionText: 'Quelle est la durée de validité d\'une ordonnance de médicaments stupéfiants ?',
    options: ['24h', '3 jours', '7 jours', '30 jours'], correctAnswers: ['7 jours'], explanation: 'La prescription de stupéfiants est valable 7 jours.' },
  { quizId: 'Q030', year: 4, moduleName: 'Pharmacie Clinique', course: 'Bilans de médication',
    questionText: 'Quel médicament nécessite une surveillance de la kaliémie en association avec un IEC ?',
    options: ['Paracétamol', 'Spironolactone', 'Amoxicilline', 'Oméprazole'],
    correctAnswers: ['Spironolactone'], explanation: 'L\'association IEC + spironolactone augmente le risque d\'hyperkaliémie.' },
  { quizId: 'Q031', year: 4, moduleName: 'Toxicologie', course: 'Antidotes',
    questionText: 'Quel est l\'antidote du paracétamol en cas de surdosage ?',
    options: ['Naloxone', 'N-acétylcystéine', 'Vitamine K', 'Flumazénil'],
    correctAnswers: ['N-acétylcystéine'], explanation: 'La N-acétylcystéine est l\'antidote du paracétamol.' },
  { quizId: 'Q032', year: 5, moduleName: 'Officine', course: 'Conseil pharmaceutique',
    questionText: 'Quel conseil donner à un patient prenant des IPP au long cours ?',
    options: ['Prendre avec du calcium', 'Surveillance de la vitamine B12', 'Éviter l\'alcool', 'Prendre à jeun'],
    correctAnswers: ['Surveillance de la vitamine B12'], explanation: 'Les IPP au long cours peuvent entraîner une carence en vitamine B12.' },
  { quizId: 'Q033', year: 5, moduleName: 'Pharmacie Hospitalière', course: 'Préparations',
    questionText: 'Quelle est la classe de danger des cytotoxiques manipulés en PUI ?',
    options: ['Danger 1', 'Danger 2', 'Danger 3', 'Danger 4'],
    correctAnswers: ['Danger 3'], explanation: 'Les cytotoxiques sont classés danger 3 (mutagène/cancérogène).' },
  { quizId: 'Q034', year: 6, moduleName: 'Santé Publique', course: 'Vaccination',
    questionText: 'Quel est le schéma vaccinal du ROR chez l\'enfant ?',
    options: ['1 dose à 12 mois', '1 dose à 12 mois + rappel à 6 ans', '2 doses à 1 mois d\'intervalle', '3 doses à 2 mois d\'intervalle'],
    correctAnswers: ['1 dose à 12 mois + rappel à 6 ans'], explanation: 'Le ROR est administré à 12 mois avec un rappel à 6 ans.' },
];

const medicineVoiceExams = [
  // Year 4: Internal medicine
  { title: 'Cas clinique : Syndrome occlusif', year: 4, moduleName: 'Médecine Interne',
    clinicalCasePrompt: 'Patient de 68 ans, sans antécédent chirurgical, se présente pour des douleurs abdominales diffuses, arrêt des matières et des gaz depuis 48h, nausées. À l\'examen : abdomen distendu, tympanique, douloureux diffusément. T° 38.2°C, FC 100/min.\n\nQuel est votre diagnostic et votre prise en charge ?',
    questions: [
      { questionText: 'Quels examens d\'imagerie demandez-vous en première intention ?',
        idealAnswer: 'ASP (abdomen sans préparation) debout et couché, et/ou TDM abdominal avec injection. L\'ASP recherche des niveaux hydro-aériques. Le TDM est plus sensible pour identifier la cause et rechercher des signes de gravité.',
        criteria: [
          { label: 'ASP demandé', keywords: ['ASP', 'abdomen sans préparation'] },
          { label: 'TDM abdominal demandé', keywords: ['TDM', 'scanner', 'tomodensitométrie'] },
          { label: 'Recherche de signes de gravité', keywords: ['gravité', 'complication', 'perforation'] },
        ]},
      { questionText: 'Quels critères cliniques indiquent une urgence chirurgicale ?',
        idealAnswer: 'Signes de choc (hypotension, tachycardie), fièvre élevée, défense ou contracture abdominale, douleur violente d\'installation brutale, suspicion de péritonite ou d\'ischémie intestinale.',
        criteria: [
          { label: 'Signes de choc mentionnés', keywords: ['choc', 'hypotension', 'tachycardie'] },
          { label: 'Contracture/défense citée', keywords: ['contracture', 'défense', 'péritonite'] },
        ]},
    ]},
  // Year 5: Cardiology
  { title: 'Cas clinique : Insuffisance cardiaque décompensée', year: 5, moduleName: 'Cardiologie',
    clinicalCasePrompt: 'Patient de 78 ans, connu pour insuffisance cardiaque à fraction d\'éjection réduite (FEVG 35%), se présente pour dyspnée d\'aggravation progressive depuis 5 jours, orthopnée, œdèmes des membres inférieurs. TA 150/90, FC 95/min, SpO2 88% en air ambiant.\n\nDécrivez votre prise en charge diagnostique et thérapeutique.',
    questions: [
      { questionText: 'Quels examens complémentaires réalisez-vous en urgence ?',
        idealAnswer: 'BNP ou NT-proBNP, NFS, CRP, ionogramme sanguin, créatininémie, troponine, ECG, radiographie thoracique, échocardiographie transthoracique.',
        criteria: [
          { label: 'BNP/NT-proBNP demandé', keywords: ['BNP', 'NT-proBNP', 'peptide'] },
          { label: 'Échocardiographie demandée', keywords: ['échocardiographie', 'échographie', 'ETT'] },
          { label: 'Bilan biologique standard', keywords: ['ionogramme', 'créatinine', 'NFS'] },
        ]},
      { questionText: 'Quel traitement instaurez-vous ?',
        idealAnswer: 'Oxygénothérapie pour SpO2 > 90%, diurétiques de l\'anse (furosémide IV), vasodilatateurs si hypertensive, voire inotropes si bas débit. Relais par IEC, bêta-bloquants et ARM après stabilisation.',
        criteria: [
          { label: 'Oxygénothérapie', keywords: ['oxygène', 'O2', 'oxygénothérapie'] },
          { label: 'Diurétique IV prescrit', keywords: ['furosémide', 'diurétique', 'lasilix'] },
          { label: 'Traitement de fond après stabilisation', keywords: ['IEC', 'bêta-bloquant', 'ARM'] },
        ]},
    ]},
  // Year 6: Emergency
  { title: 'Cas clinique : Polytraumatisé', year: 6, moduleName: 'Urgences',
    clinicalCasePrompt: 'Patient de 30 ans, victime d\'un accident de la voie publique (véhicule léger, choc frontal à 80 km/h). À l\'arrivée : GCS 13, TA 80/50, FC 130/min, FR 30/min, saturation 91%. Lésions apparentes : déformation du fémur gauche, plaie du cuir chevelu.\n\nQuelle est votre prise en charge immédiate ?',
    questions: [
      { questionText: 'Quelle est la priorité de prise en charge selon le damage control ?',
        idealAnswer: 'L\'hémodynamique est la priorité (choc hémorragique). Appliquer le protocole du damage control : contrôle de l\'hémorragie externe, remplissage vasculaire restrictif, activation du protocole de transfusion massive, puis bilan lésionnel rapide (Fast-echo, TDM corps entier).',
        criteria: [
          { label: 'Reconnaissance du choc hémorragique', keywords: ['choc', 'hémorragique', 'hypotension', 'tachycardie'] },
          { label: 'Damage control cité', keywords: ['damage control', 'contrôle'] },
          { label: 'Transfusion massive évoquée', keywords: ['transfusion', 'massive'] },
        ]},
    ]},
];

const quizzes = [...medicineQuizzes, ...pharmacyQuizzes];
const voiceExams = [...medicineVoiceExams];

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
      Counter.deleteMany({}),
    ]);
    console.log('Existing data cleared.');
  }

  // Insert modules
  await Module.insertMany(modules);
  console.log(`Inserted ${modules.length} modules.`);

  // Get inserted modules by name for referencing
  const moduleDocs = await Module.find({});
  const moduleMap = {};
  moduleDocs.forEach((m) => { moduleMap[m.name] = m; });

  // Insert quizzes
  const quizDocs = [];
  for (const q of quizzes) {
    const mod = moduleMap[q.moduleName];
    if (!mod) { console.warn(`Module not found: ${q.moduleName}`); continue; }
    quizDocs.push({
      quizId: q.quizId,
      year: q.year,
      moduleId: mod._id,
      discipline: mod.discipline,
      course: q.course,
      published: true,
      explanation: q.explanation,
      question: {
        questionText: q.questionText,
        options: q.options,
        correctAnswers: q.correctAnswers,
      },
    });
  }
  await Quiz.insertMany(quizDocs);
  console.log(`Inserted ${quizDocs.length} quizzes.`);

  // Insert voice exams
  const voiceExamDocs = [];
  for (const [idx, v] of voiceExams.entries()) {
    const mod = moduleMap[v.moduleName];
    if (!mod) { console.warn(`Module not found: ${v.moduleName}`); continue; }
    voiceExamDocs.push({
      examId: `VE${String(idx + 1).padStart(3, '0')}`,
      title: v.title,
      year: v.year,
      moduleId: mod._id,
      discipline: 'medicine',
      clinicalCasePrompt: v.clinicalCasePrompt,
      questions: v.questions,
    });
  }
  await VoiceExam.insertMany(voiceExamDocs);
  console.log(`Inserted ${voiceExamDocs.length} voice exams.`);

  console.log('\n--- Seed complete ---');
  console.log(`  Modules:  ${modules.length}`);
  console.log(`  Quizzes:  ${quizDocs.length}`);
  console.log(`  VoiceExams: ${voiceExamDocs.length}`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
