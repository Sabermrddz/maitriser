import {
  FaBone, FaFlask, FaChartBar, FaMicroscope, FaHeartbeat, FaAtom, FaDna,
  FaShieldAlt, FaPills, FaGlobeAmericas, FaHeart, FaBrain, FaUserFriends,
  FaLungs, FaBaby, FaHandPaper, FaHardHat, FaEye, FaVenusMars,
} from 'react-icons/fa';
import {
  LuTestTubes, LuEgg, LuLayers, LuBookOpen, LuFileSearch, LuShieldCheck,
  LuBug, LuWorm, LuBiohazard, LuUtensils, LuDroplets, LuScanEye, LuWind,
  LuAccessibility, LuFilter, LuApple, LuSandwich, LuChartPie, LuDumbbell,
  LuSyringe, LuHeartHandshake, LuFlaskRound, LuSmile, LuClock, LuShieldAlert,
  LuSiren, LuScale, LuEar, LuHeartPulse, LuFileText,
} from 'react-icons/lu';

const exactNameMap = {
  anatomie: <FaBone />,
  biochimie: <FaFlask />,
  biostatistiques: <FaChartBar />,
  chimie: <LuTestTubes />,
  cytologie: <FaMicroscope />,
  embryologie: <LuEgg />,
  histologie: <LuLayers />,
  physiologie: <FaHeartbeat />,
  physique: <FaAtom />,
  ssh: <LuBookOpen />,
  'génétique 2ème': <FaDna />,
  'immunologie 2ème': <FaShieldAlt />,
  'anatomie pathologique': <LuFileSearch />,
  'immunologie 3ème': <LuShieldCheck />,
  microbiologie: <LuBug />,
  parasitologie: <LuWorm />,
  pharmacologie: <FaPills />,
  psychologie: <FaUserFriends />,
  épidémiologie: <FaGlobeAmericas />,
  'u1: appareil cardio-respiratoire': <LuHeartPulse />,
  'u2: appareil digestif': <LuUtensils />,
  'u3: appareil urinaire': <LuDroplets />,
  'u4: système endocrinien et appareil reproducteur': <FaVenusMars />,
  'u5: système nerveux et organes des sens': <LuScanEye />,
  'u1: cardio-respiratoire': <LuWind />,
  'u2: neurologique, locomoteur et cutané': <LuAccessibility />,
  'u3: endocrinien, reproduction et urinaire': <LuFilter />,
  'u4: digestif et hématopoïétique': <LuApple />,
  cardiologie: <FaHeart />,
  'gastro-entérologie': <LuSandwich />,
  infectiologie: <LuBiohazard />,
  neurologie: <FaBrain />,
  'onco-hématologie': <LuChartPie />,
  pneumologie: <FaLungs />,
  'appareil locomoteur': <LuDumbbell />,
  endocrinologie: <LuSyringe />,
  gynécologie: <LuHeartHandshake />,
  'néphrologie-urologie': <LuFlaskRound />,
  psychiatrie: <LuSmile />,
  pédiatrie: <FaBaby />,
  dermatologie: <FaHandPaper />,
  gériatrie: <LuClock />,
  'maladies systémiques': <LuShieldAlert />,
  "médecine d'urgence": <LuSiren />,
  'médecine du travail': <FaHardHat />,
  'médecine légale et droits': <LuScale />,
  orl: <LuEar />,
  ophtalmologie: <FaEye />,
};

const keyMap = {
  'anatomie pathologique': <LuFileSearch />,
  anatomopathologie: <LuFileSearch />,
  anatomie: <FaBone />,
  biochimie: <FaFlask />,
  biostatistiques: <FaChartBar />,
  chimie: <LuTestTubes />,
  cytologie: <FaMicroscope />,
  histologie: <LuLayers />,
  embryologie: <LuEgg />,
  physiologie: <FaHeartbeat />,
  physique: <FaAtom />,
  ssh: <LuBookOpen />,
  'génétique': <FaDna />,
  'immunologie 3ème': <LuShieldCheck />,
  immunologie: <FaShieldAlt />,
  microbiologie: <LuBug />,
  parasitologie: <LuWorm />,
  pharmacologie: <FaPills />,
  psychologie: <FaUserFriends />,
  épidémiologie: <FaGlobeAmericas />,
  'appareil cardio-respiratoire': <LuHeartPulse />,
  'cardio-respiratoire': <LuWind />,
  cardiologie: <FaHeart />,
  cardio: <FaHeart />,
  'appareil digestif': <LuUtensils />,
  'digestif et hématopoïétique': <LuApple />,
  digestif: <LuUtensils />,
  'gastro-entérologie': <LuSandwich />,
  gastroentérologie: <LuSandwich />,
  gastro: <LuSandwich />,
  infectiologie: <LuBiohazard />,
  'neurologique, locomoteur': <LuAccessibility />,
  neurologie: <FaBrain />,
  neuro: <FaBrain />,
  locomoteur: <LuDumbbell />,
  'onco-hématologie': <LuChartPie />,
  pneumologie: <FaLungs />,
  pneumo: <FaLungs />,
  'endocrinien et appareil reproducteur': <FaVenusMars />,
  'endocrinien, reproduction': <LuFilter />,
  endocrinien: <FaVenusMars />,
  reproducteur: <FaVenusMars />,
  endocrinologie: <LuSyringe />,
  gynécologie: <LuHeartHandshake />,
  néphrologie: <LuFlaskRound />,
  urinaire: <LuDroplets />,
  psychiatrie: <LuSmile />,
  pédiatrie: <FaBaby />,
  dermatologie: <FaHandPaper />,
  gériatrie: <LuClock />,
  'maladies systémiques': <LuShieldAlert />,
  urgence: <LuSiren />,
  'médecine du travail': <FaHardHat />,
  légale: <LuScale />,
  droits: <LuScale />,
  orl: <LuEar />,
  ophtalmologie: <FaEye />,
  'système nerveux et organes des sens': <LuScanEye />,
  'système nerveux': <FaBrain />,
};

const fallbackIcon = <LuFileText />;

const normalize = (name) => (name || '').toLowerCase().replace(/\s+/g, ' ').trim();

export const getModuleIcon = (moduleName) => {
  const name = normalize(moduleName);
  if (!name) return fallbackIcon;
  const exact = exactNameMap[name];
  if (exact) return exact;
  let bestKey = '';
  let best = null;
  for (const [key, icon] of Object.entries(keyMap)) {
    if (name.includes(key) && key.length > bestKey.length) {
      bestKey = key;
      best = icon;
    }
  }
  return best || fallbackIcon;
};
