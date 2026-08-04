import '../styles/Landing.css';
import { useEffect, useMemo, useState, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import logo from '../assets/icons/logo.png'

const STORAGE_KEY = 'gov-subsidy-language'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
]

const COPY = {
  en: {
    nav: ['Home', 'Schemes', 'Tracking', 'Support'],
    eyebrow: 'Unified subsidy access for farmers, families, and local enterprises',
    title: 'Government Subsidy Scheme Portal',
    titleAccent: 'Subsidy',
    subtitle:
      'Apply for schemes, become a verified beneficiary, and track every fund movement through a transparent, professional public-service workflow.',
    primary: 'Proceed to Login',
    secondary: 'Send a Query',
    servicesTitle: 'What This Portal Offers',
    servicesIntro:
      'A clean civic-tech experience that helps citizens apply, verify, and monitor their subsidy journey without confusion.',
    services: [
      {
        icon: 'apply',
        title: 'Apply for a Scheme',
        text: 'Browse eligible subsidy schemes and submit your application in minutes.',
      },
      {
        icon: 'track',
        title: 'Become a Verified Beneficiary',
        text: 'Our system verifies your eligibility and confirms your status.',
      },
      {
        icon: 'beneficiary',
        title: 'Track Every Fund Transfer',
        text: 'Follow your disbursement in real time, from approval to your account.',
      },
    ],
    featureTitle: 'Built for transparency',
    featureText:
      'The portal organizes eligibility, application progress, approval status, and fund movement into a calm, reliable experience for every user.',
    queryTitle: 'Send Us Your Query',
    queryText:
      'Need help with an application, status update, or scheme details? Send us a message and our support desk will guide you.',
    emailLabel: 'Support Email',
    email: 'support@govsubsidyportal.in',
    footer: '© Developed by Infosys interns',
    languagePrompt: 'Choose your language',
    languageHint: 'You can switch anytime - choosing now just opens the portal in your preferred language.',
  },
  hi: {
    nav: ['होम', 'योजनाएँ', 'ट्रैकिंग', 'सहायता'],
    eyebrow: 'किसानों, परिवारों और स्थानीय उद्यमों के लिए एकीकृत सब्सिडी पहुँच',
    title: 'Government Subsidy Scheme Portal',
    titleAccent: 'Subsidy',
    subtitle:
      'योजनाओं के लिए आवेदन करें, सत्यापित लाभार्थी बनें, और हर धन प्रवाह को पारदर्शी, पेशेवर सार्वजनिक सेवा प्रक्रिया में ट्रैक करें।',
    primary: 'Login',
    secondary: 'प्रश्न भेजें',
    servicesTitle: 'यह पोर्टल क्या प्रदान करता है',
    servicesIntro:
      'एक स्वच्छ सार्वजनिक-सेवा अनुभव जो नागरिकों को बिना उलझन के आवेदन, सत्यापन और ट्रैकिंग में मदद करता है।',
    services: [
      {
        icon: 'apply',
        title: 'योजना के लिए आवेदन',
        text: 'पात्र सब्सिडी योजनाएँ देखें और मिनटों में आवेदन करें।',
      },
      {
        icon: 'track',
        title: 'सत्यापित लाभार्थी बनें',
        text: 'हमारी प्रणाली आपकी पात्रता जाँचकर आपकी स्थिति की पुष्टि करती है।',
      },
      {
        icon: 'beneficiary',
        title: 'हर निधि हस्तांतरण ट्रैक करें',
        text: 'स्वीकृति से लेकर खाते तक वितरण को रीयल-टाइम में देखें।',
      },
    ],
    featureTitle: 'पारदर्शिता के लिए बनाया गया',
    featureText:
      'यह पोर्टल पात्रता, आवेदन प्रगति, स्वीकृति स्थिति और निधि प्रवाह को हर उपयोगकर्ता के लिए शांत और भरोसेमंद तरीके से व्यवस्थित करता है।',
    queryTitle: 'अपना प्रश्न भेजें',
    queryText:
      'आवेदन, स्थिति अपडेट या योजना विवरण में मदद चाहिए? संदेश भेजें, हमारी सहायता टीम मार्गदर्शन करेगी।',
    emailLabel: 'सपोर्ट ईमेल',
    email: 'support@govsubsidyportal.in',
    footer: '© इंफोसिस इंटर्न्स द्वारा विकसित',
    languagePrompt: 'अपनी भाषा चुनें',
    languageHint: 'आप कभी भी बदल सकते हैं - अभी चुनने से पोर्टल आपकी पसंदीदा भाषा में खुलता है।',
  },
  mr: {
    nav: ['मुख्यपृष्ठ', 'योजना', 'ट्रॅकिंग', 'सहायता'],
    eyebrow: 'शेतकरी, कुटुंबे आणि स्थानिक उद्योगांसाठी एकत्रित अनुदान प्रवेश',
    title: 'Government Subsidy Scheme Portal',
    titleAccent: 'Subsidy',
    subtitle:
      'योजनांसाठी अर्ज करा, पात्र लाभार्थी बना, आणि प्रत्येक निधी प्रवाह पारदर्शक, व्यावसायिक सार्वजनिक सेवेच्या प्रक्रियेत ट्रॅक करा.',
    primary: 'Login',
    secondary: 'प्रश्न पाठवा',
    servicesTitle: 'हे पोर्टल काय देते',
    servicesIntro:
      'नागरिकांना अर्ज, पडताळणी आणि ट्रॅकिंगमध्ये मदत करणारा स्वच्छ सार्वजनिक-सेवा अनुभव.',
    services: [
      {
        icon: 'apply',
        title: 'योजनेसाठी अर्ज करा',
        text: 'पात्र अनुदान योजना पहा आणि काही मिनिटांत अर्ज करा.',
      },
      {
        icon: 'track',
        title: 'पडताळलेले लाभार्थी बना',
        text: 'आमची प्रणाली पात्रता तपासून तुमची स्थिती निश्चित करते.',
      },
      {
        icon: 'beneficiary',
        title: 'प्रत्येक निधी हस्तांतरण ट्रॅक करा',
        text: 'मंजुरीपासून खात्यापर्यंत वितरण रिअल टाइममध्ये पहा.',
      },
    ],
    featureTitle: 'पारदर्शकतेसाठी तयार',
    featureText:
      'हे पोर्टल पात्रता, अर्ज प्रगती, मंजुरी स्थिती आणि निधी प्रवाह सर्व वापरकर्त्यांसाठी शांत व विश्वासार्ह पद्धतीने मांडते.',
    queryTitle: 'तुमचा प्रश्न पाठवा',
    queryText:
      'अर्ज, स्थिती अपडेट किंवा योजना तपशीलांमध्ये मदत हवी आहे का? संदेश पाठवा आणि आमची टीम मार्गदर्शन करेल.',
    emailLabel: 'सपोर्ट ईमेल',
    email: 'support@govsubsidyportal.in',
    footer: '© इन्फोसिस इंटर्न्सने विकसित केले',
    languagePrompt: 'तुमची भाषा निवडा',
    languageHint: 'तुम्ही कधीही बदलू शकता - आताच निवडल्याने पोर्टल तुमच्या पसंतीच्या भाषेत उघडेल.',
  },
  ml: {
    nav: ['ഹോം', 'പദ്ധതികൾ', 'ട്രാക്കിംഗ്', 'സഹായം'],
    eyebrow: 'കർഷകർ, കുടുംബങ്ങൾ, പ്രാദേശിക സംരംഭങ്ങൾ എന്നിവർക്കായുള്ള ഏകീകൃത സബ്‌സിഡി പ്രവേശനം',
    title: 'Government Subsidy Scheme Portal',
    titleAccent: 'Subsidy',
    subtitle:
      'പദ്ധതികൾക്ക് അപേക്ഷിച്ച് അംഗീകൃത ഗുണഭോക്താവാകുക, ഓരോ ഫണ്ട് നീക്കവും സുതാര്യമായ ഒരു പൊതുസേവന പ്രവാഹത്തിൽ പിന്തുടരുക.',
    primary: 'Login',
    secondary: 'ചോദ്യം അയയ്ക്കുക',
    servicesTitle: 'ഈ പോർട്ടൽ നൽകുന്നത്',
    servicesIntro:
      'നാഗരികർക്കു അപേക്ഷ, സ്ഥിരീകരണം, ട്രാക്കിംഗ് എന്നിവയിൽ സഹായിക്കുന്ന ശുദ്ധമായ പൊതുസേവന അനുഭവം.',
    services: [
      {
        icon: 'apply',
        title: 'പദ്ധതിക്ക് അപേക്ഷിക്കുക',
        text: 'യോഗ്യമായ സബ്‌സിഡി പദ്ധതികൾ കണ്ടു മിനിറ്റുകൾക്കുള്ളിൽ അപേക്ഷിക്കുക.',
      },
      {
        icon: 'track',
        title: 'സ്ഥിരീകരിച്ച ഗുണഭോക്താവാകുക',
        text: 'ഞങ്ങളുടെ സംവിധാനം യോഗ്യത പരിശോധിച്ച് നിങ്ങളുടെ നില ഉറപ്പാക്കുന്നു.',
      },
      {
        icon: 'beneficiary',
        title: 'ഓരോ ഫണ്ട് മാറ്റവും ട്രാക്ക് ചെയ്യുക',
        text: 'അംഗീകാരത്തിൽ നിന്ന് അക്കൗണ്ടിലേക്കുള്ള വിതരണം റിയൽ ടൈമിൽ പിന്തുടരുക.',
      },
    ],
    featureTitle: 'വ്യക്തതയ്ക്കായി നിർമ്മിച്ചത്',
    featureText:
      'ഈ പോർട്ടൽ യോഗ്യത, അപേക്ഷ പുരോഗതി, അംഗീകാര സ്ഥിതി, ഫണ്ട് നീക്കം എന്നിവ എല്ലാ ഉപയോക്താക്കൾക്കും ശാന്തവും വിശ്വസനീയവുമായ രീതിയിൽ ക്രമീകരിക്കുന്നു.',
    queryTitle: 'നിങ്ങളുടെ ചോദ്യം അയയ്ക്കുക',
    queryText:
      'അപേക്ഷ, നില പുതുക്കൽ, അല്ലെങ്കിൽ പദ്ധതി വിവരങ്ങളിൽ സഹായം വേണോ? സന്ദേശം അയയ്ക്കുക, ഞങ്ങളുടെ പിന്തുണ ടീം വഴികാട്ടും.',
    emailLabel: 'സപ്പോർട്ട് ഇമെയിൽ',
    email: 'support@govsubsidyportal.in',
    footer: '© ഇൻഫോസിസ് ഇന്റേൺസ് വികസിപ്പിച്ചത്',
    languagePrompt: 'നിങ്ങളുടെ ഭാഷ തിരഞ്ഞെടുക്കുക',
    languageHint: 'നിങ്ങൾക്ക് എപ്പോഴും മാറ്റാം - ഇപ്പോൾ തിരഞ്ഞെടുക്കുന്നത് പോർട്ടൽ നിങ്ങളുടെ ഇഷ്ടഭാഷയിൽ തുറക്കും.',
  },
  ta: {
    nav: ['முகப்பு', 'திட்டங்கள்', 'பின்தொடர்வு', 'உதவி'],
    eyebrow: 'விவசாயிகள், குடும்பங்கள் மற்றும் உள்ளூர் நிறுவனங்களுக்கு ஒருங்கிணைந்த மானிய அணுகல்',
    title: 'Government Subsidy Scheme Portal',
    titleAccent: 'Subsidy',
    subtitle:
      'திட்டங்களுக்கு விண்ணப்பித்து, உறுதிப்படுத்தப்பட்ட பயனாளராகி, ஒவ்வொரு நிதி நகர்வையும் வெளிப்படையான, தொழில்முறை பொதுச் சேவை செயல்பாட்டில் கண்காணிக்கவும்.',
    primary: 'Login',
    secondary: 'கேள்வி அனுப்பவும்',
    servicesTitle: 'இந்த போர்டல் வழங்குவது',
    servicesIntro:
      'மக்கள் விண்ணப்பம், சரிபார்ப்பு மற்றும் கண்காணிப்பை எளிதாக செய்ய உதவும் சுத்தமான பொதுச் சேவை அனுபவம்.',
    services: [
      {
        icon: 'apply',
        title: 'திட்டத்திற்கு விண்ணப்பிக்கவும்',
        text: 'தகுதியான மானியத் திட்டங்களைப் பார்த்து சில நிமிடங்களில் விண்ணப்பிக்கவும்.',
      },
      {
        icon: 'track',
        title: 'உறுதிப்படுத்தப்பட்ட பயனாளராகுங்கள்',
        text: 'எங்கள் அமைப்பு உங்கள் தகுதியைச் சரிபார்த்து நிலையை உறுதிப்படுத்தும்.',
      },
      {
        icon: 'beneficiary',
        title: 'ஒவ்வொரு நிதி மாற்றத்தையும் கண்காணிக்கவும்',
        text: 'ஒப்புதல் முதல் கணக்குவரை வழங்கலை நேரடி நேரத்தில் பின்தொடருங்கள்.',
      },
    ],
    featureTitle: 'வெளிப்படைத்தன்மைக்காக உருவாக்கப்பட்டது',
    featureText:
      'இந்த போர்டல் தகுதி, விண்ணப்ப முன்னேற்றம், ஒப்புதல் நிலை மற்றும் நிதி நகர்வுகளை ஒவ்வொரு பயனாளருக்கும் அமைதியான, நம்பகமான முறையில் ஒழுங்குபடுத்துகிறது.',
    queryTitle: 'உங்கள் கேள்வியை அனுப்புங்கள்',
    queryText:
      'விண்ணப்பம், நிலை புதுப்பிப்பு அல்லது திட்ட விவரங்களில் உதவி வேண்டுமா? செய்தி அனுப்புங்கள், எங்கள் ஆதரவு குழு வழிகாட்டும்.',
    emailLabel: 'சப்போர்ட் மின்னஞ்சல்',
    email: 'support@govsubsidyportal.in',
    footer: '© இன்ஃபோசிஸ் இன்டர்ன்களால் உருவாக்கப்பட்டது',
    languagePrompt: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    languageHint: 'நீங்கள் எப்போது வேண்டுமானாலும் மாற்றலாம் - இப்போது தேர்வு செய்வது போர்டலை உங்கள் விருப்ப மொழியில் திறக்கும்.',
  },
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
  },
}

function useStoredLanguage() {
  const [language, setLanguage] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored && COPY[stored] ? stored : 'en'
  })

  const [showLanguageModal, setShowLanguageModal] = useState(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return !(stored && COPY[stored])
  })

  const selectLanguage = (code) => {
    setLanguage(code)
    window.localStorage.setItem(STORAGE_KEY, code)
    setShowLanguageModal(false)
  }

  return { language, showLanguageModal, setShowLanguageModal, selectLanguage }
}

function LanguageModal({ open, selected, onSelect, onClose, copy }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="language-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="language-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            className="language-modal__backdrop"
            onClick={onClose}
            aria-label="Close language chooser"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="language-modal__panel"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <p className="eyebrow">{copy.languagePrompt}</p>
            <h2 id="language-title">Choose your language</h2>
            <p className="modal-copy">{copy.languageHint}</p>

            <div className="language-grid">
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  className={`language-chip ${selected === language.code ? 'active' : ''}`}
                  onClick={() => onSelect(language.code)}
                >
                  <span>{language.native}</span>
                  <small>{language.label}</small>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function AnimatedWords({ text, accentWord, className = '' }) {
  const words = text.split(' ')

  return (
    <motion.span className={`animated-words ${className}`.trim()} variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.7 }}>
      {words.map((word, index) => {
        const isAccent = word.replace(/[^\p{L}\p{N}]/gu, '') === accentWord

        return (
          <motion.span key={`${word}-${index}`} className={`animated-word ${isAccent ? 'accent' : ''}`} variants={itemVariants}>
            {word.split('').map((character, charIndex) => (
              <span key={`${character}-${charIndex}`} className="animated-letter">
                {character}
              </span>
            ))}
            {index < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        )
      })}
    </motion.span>
  )
}

function Icon({ name, className = '' }) {
  const common = {
    className: className || 'service-icon__svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (name === 'user') {
    return (
      <svg {...common}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }

  if (name === 'phone') {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    )
  }

  if (name === 'mail') {
    return (
      <svg {...common}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    )
  }

  if (name === 'info') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    )
  }

  if (name === 'pen') {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    )
  }

  if (name === 'track') {
    return (
      <svg {...common}>
        <path d="M4 18h16" />
        <path d="M6 14l4-4 3 3 5-6" />
        <circle cx="6" cy="14" r="1" />
        <circle cx="10" cy="10" r="1" />
        <circle cx="13" cy="13" r="1" />
        <circle cx="18" cy="7" r="1" />
      </svg>
    )
  }

  if (name === 'beneficiary') {
    return (
      <svg {...common}>
        <path d="M12 13c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5Z" />
        <path d="M4 21c1.6-3.5 4.5-5.5 8-5.5s6.4 2 8 5.5" />
        <path d="m10.2 10 1.2 1.2 2.6-2.8" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <path d="M4 20h16" />
      <path d="M7 20v-7" />
      <path d="M12 20V8" />
      <path d="M17 20v-4" />
      <path d="M5 12 12 5l4 4 3-3" />
    </svg>
  )
}

function LanguageDropdown({ selectedLanguage, selectLanguage }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="language-dropdown" ref={ref}>
      <button 
        type="button" 
        className="language-dropdown__btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedLanguage.native}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${isOpen ? 'open' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            className="language-dropdown__menu"
            role="listbox"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {LANGUAGES.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  className={item.code === selectedLanguage.code ? 'active' : ''}
                  onClick={() => {
                    selectLanguage(item.code)
                    setIsOpen(false)
                  }}
                  role="option"
                  aria-selected={item.code === selectedLanguage.code}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function Landing() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const backdropOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1])
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -18])
  const { language, showLanguageModal, setShowLanguageModal, selectLanguage } = useStoredLanguage()
  const copy = useMemo(() => COPY[language] ?? COPY.en, [language])
  const selectedLanguage = LANGUAGES.find((item) => item.code === language) ?? LANGUAGES[0]

  // Query Form State
  const [queryForm, setQueryForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' })
  const [queryToast, setQueryToast] = useState(null)
  const [submittedTicket, setSubmittedTicket] = useState(null)

  function handleQueryChange(e) {
    setQueryForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleQuerySubmit(e) {
    e.preventDefault()
    if (!queryForm.name.trim() || !queryForm.email.trim() || !queryForm.message.trim()) {
      setQueryToast({ message: 'Please provide your name, email, and query message.', type: 'error' })
      setTimeout(() => setQueryToast(null), 3000)
      return
    }

    const ticketId = 'QRY-' + Math.floor(100000 + Math.random() * 900000)
    const newQuery = {
      id: ticketId,
      name: queryForm.name.trim(),
      phone: queryForm.phone.trim(),
      email: queryForm.email.trim(),
      subject: queryForm.subject.trim() || 'General Subsidy Inquiry',
      message: queryForm.message.trim(),
      status: 'Open',
      submittedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const existingQueries = JSON.parse(localStorage.getItem('gov-subsidy-queries') || '[]')
    existingQueries.unshift(newQuery)
    localStorage.setItem('gov-subsidy-queries', JSON.stringify(existingQueries))

    setSubmittedTicket(newQuery)
    setQueryForm({ name: '', phone: '', email: '', subject: '', message: '' })
  }

  useEffect(() => {
    document.body.classList.add('landing-active')
    return () => document.body.classList.remove('landing-active')
  }, [])

  useEffect(() => {
    document.body.style.overflow = showLanguageModal ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [showLanguageModal])

  const motionViewport = reduceMotion ? { once: true, amount: 0.01 } : { once: false, amount: 0.24 }

  return (
    <main className="landing-shell">
      <LanguageModal
        open={showLanguageModal}
        selected={language}
        onSelect={selectLanguage}
        onClose={() => setShowLanguageModal(false)}
        copy={copy}
      />

      <div className="landing-backdrop" aria-hidden="true" />
      <motion.div className="landing-backdrop--blurred" aria-hidden="true" style={{ opacity: backdropOpacity }} />

      <header className="topbar">
        <div className="topbar__brand">
          <img src={logo} alt="GS Gov Subsidy Logo" className="brand-logo" />
          <div>
            <strong>GS Gov Subsidy</strong>
            <span>Scheme Portal</span>
          </div>
        </div>

        <nav className="topbar__nav" aria-label="Primary">
          {copy.nav.map((item, index) => (
            <a key={item} href={`#${['home', 'schemes', 'tracking', 'queries'][index]}`}>
              {item}
            </a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LanguageDropdown selectedLanguage={selectedLanguage} selectLanguage={selectLanguage} />
          <Link to="/officer/register" className="button button--ghost" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', borderColor: 'rgba(217, 130, 43, 0.4)', color: '#ffc76a' }}>
            Officer Register
          </Link>
          <Link to="/admin/dashboard" className="button button--ghost" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', borderColor: 'rgba(130, 174, 202, 0.4)', color: '#82aeca' }}>
            Admin Center
          </Link>
        </div>
      </header>

      <motion.section
        className="hero"
        id="home"
        style={{ y: heroY }}
        initial={reduceMotion ? false : 'hidden'}
        whileInView={reduceMotion ? undefined : 'show'}
        viewport={motionViewport}
        variants={containerVariants}
      >
        <div className="hero__panel">
          <motion.div className="hero__copy" variants={itemVariants}>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="hero__title">
              <AnimatedWords text={copy.title} accentWord={copy.titleAccent} />
            </h1>
            <p className="hero__subtitle">{copy.subtitle}</p>

            <div className="hero__actions" style={{ flexWrap: 'wrap' }}>
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Link className="button button--primary" to="/login">
                  {copy.primary}
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Link className="button button--ghost" to="/register" style={{ borderColor: 'rgba(142, 214, 106, 0.4)', color: '#8ed66a' }}>
                  Register Beneficiary
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Link className="button button--ghost" to="/officer/register" style={{ borderColor: 'rgba(217, 130, 43, 0.5)', color: '#ffc76a' }}>
                  Officer Registration
                </Link>
              </motion.div>
              <motion.a className="button button--ghost" href="#queries" whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
                {copy.secondary}
              </motion.a>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="section"
        id="login"
        initial={reduceMotion ? false : 'hidden'}
        whileInView={reduceMotion ? undefined : 'show'}
        viewport={motionViewport}
        variants={containerVariants}
      >
        <motion.div className="login-panel" variants={itemVariants}>
          <div className="section__heading section__heading--compact">
            <p className="eyebrow">Secure access</p>
            <h2>
              <AnimatedWords text="Continue to your portal account" />
            </h2>
            <p>Sign in to apply for schemes, review beneficiary status, and monitor subsidy disbursement updates.</p>
          </div>
          <motion.a className="button button--primary" href="#schemes" whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
            Continue
          </motion.a>
        </motion.div>
      </motion.section>

      <motion.section
        className="section"
        id="schemes"
        initial={reduceMotion ? false : 'hidden'}
        whileInView={reduceMotion ? undefined : 'show'}
        viewport={motionViewport}
        variants={containerVariants}
      >
        <motion.div className="section__heading" variants={itemVariants}>
          <p className="eyebrow">{copy.servicesTitle}</p>
          <h2>
            <AnimatedWords text={copy.servicesTitle} />
          </h2>
          <p>{copy.servicesIntro}</p>
        </motion.div>

        <div className="feature-grid">
          {copy.services.map((service) => (
            <motion.article className="feature-card" key={service.title} variants={itemVariants} whileHover={{ y: -6 }}>
              <div className="feature-card__icon">
                <Icon name={service.icon} />
              </div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="section"
        id="tracking"
        initial={reduceMotion ? false : 'hidden'}
        whileInView={reduceMotion ? undefined : 'show'}
        viewport={motionViewport}
        variants={containerVariants}
      >
        <motion.div className="process-panel" variants={itemVariants}>
          <div className="section__heading section__heading--compact">
            <p className="eyebrow">Why it matters</p>
            <h2>
              <AnimatedWords text={copy.featureTitle} />
            </h2>
            <p>{copy.featureText}</p>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        className="section section--contact"
        id="queries"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.2 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="query-card">
          <div className="section__heading section__heading--compact section__heading--center">
            <p className="eyebrow">{copy.queryTitle}</p>
            <h2>
              <AnimatedWords text={copy.queryTitle} />
            </h2>
            <p>{copy.queryText}</p>
          </div>

          <div className="query-form-wrap">
            <form className="query-form" onSubmit={handleQuerySubmit}>
              <label>
                <Icon name="user" className="query-form__icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name *"
                  autoComplete="name"
                  value={queryForm.name}
                  onChange={handleQueryChange}
                  required
                />
              </label>
              <label>
                <Icon name="phone" className="query-form__icon" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  autoComplete="tel"
                  value={queryForm.phone}
                  onChange={handleQueryChange}
                />
              </label>
              <label>
                <Icon name="mail" className="query-form__icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address *"
                  autoComplete="email"
                  value={queryForm.email}
                  onChange={handleQueryChange}
                  required
                />
              </label>
              <label>
                <Icon name="info" className="query-form__icon" />
                <input
                  type="text"
                  name="subject"
                  placeholder="Subject / Scheme Name"
                  value={queryForm.subject}
                  onChange={handleQueryChange}
                />
              </label>
              <label className="query-form__message">
                <Icon name="pen" className="query-form__icon" />
                <textarea
                  name="message"
                  rows="3"
                  placeholder="How can we help you? Describe your query in detail..."
                  value={queryForm.message}
                  onChange={handleQueryChange}
                  required
                />
              </label>
              <motion.button type="submit" className="button button--secondary query-form__submit" whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
                Submit Official Query
              </motion.button>
            </form>
          </div>
        </div>
      </motion.section>

      {/* Query Ticket Confirmation Modal */}
      <AnimatePresence>
        {submittedTicket && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              className="modal-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ background: 'var(--panel-strong)', borderRadius: '16px', border: '1px solid var(--border)', maxWidth: '480px', width: '100%', padding: '2rem', textAlign: 'center' }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                ✓
              </div>
              <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem', color: 'var(--text)' }}>Query Submitted Successfully!</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
                Your ticket has been assigned to our support desk for officer review.
              </p>

              <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '10px', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--muted)' }}>Reference Ticket ID:</span>
                  <strong style={{ fontFamily: 'monospace', color: '#ffc76a' }}>{submittedTicket.id}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--muted)' }}>Submitter:</span>
                  <strong>{submittedTicket.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--muted)' }}>Contact Email:</span>
                  <strong>{submittedTicket.email}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Expected SLA:</span>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>Within 24 Hours</span>
                </div>
              </div>

              <button className="button button--primary" style={{ width: '100%' }} onClick={() => setSubmittedTicket(null)}>
                Done & Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="footer">
        <p>{copy.footer}</p>
      </footer>
    </main>
  )
}

export default Landing
