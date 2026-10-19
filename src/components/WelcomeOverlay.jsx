import { useEffect, useRef, useState } from 'react';
import './WelcomeOverlay.css';

const STORAGE_KEY = 'civicfix_welcomed';

const speak = (text, lang = 'en-IN') => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  
  const msg = new SpeechSynthesisUtterance(text);
  
  // Find a voice that matches the language code
  const voices = window.speechSynthesis.getVoices();
  const langLower = lang.toLowerCase();
  
  // 1st choice: Perfect match (e.g., 'ta-IN')
  // 2nd choice: Language match (e.g., 'ta')
  let voice = voices.find(v => v.lang.toLowerCase() === langLower) || 
              voices.find(v => v.lang.toLowerCase().startsWith(langLower.split('-')[0]));
  
  if (voice) {
    msg.voice = voice;
  }
  
  msg.lang = lang;
  msg.rate = 0.95;
  msg.pitch = 1;
  msg.volume = 1;
  window.speechSynthesis.speak(msg);
};

const PROMPTS = {
  'en-IN': {
    welcome: 'Welcome to CivicFix! Please select your preferred language to continue. Choose English, Tamil, Hindi, Telugu, or Malayalam.',
    confirmation: (lang) => `You selected ${lang}. Now, please choose how you would like to get started.`,
    options: 'Welcome to CivicFix! Please select one of the options. Click Start Guide to hear step-by-step voice instructions. Click Chat Bot to speak with our AI assistant. Or click Just Browse to explore on your own.'
  },
  'ta-IN': {
    welcome: 'சிவிக்ஃபிக்ஸிற்கு வரவேற்கிறோம்! தொடర உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும். ஆங்கிலం, தமிழ், ఈంది, தெலுங்கு அல்லது மலையாளத்தைத் தேர்ந்தெடுக்கவும்.',
    confirmation: (lang) => `நீங்கள் தமிழைத் தேர்ந்தெடுத்துள்ளீர்கள். இப்போது, நீங்கள் எவ்வாறு தொடங்க விரும்புகிறீர்கள் என்பதைத் தேர்வுசெய்யவும்.`,
    options: 'சிவிக்ஃபிக்ஸிற்கு வரவேற்கிறோம்! விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும். படிப்படியான குரல் வழிமுறைகளைக் கேட்க தொடக்க வழிகாட்டியை கிளிக் செய்யவும். எங்கள் AI உதவியாளருடன் பேச சாட் பாட்டை கிளிக் செய்யவும். அல்லது நீங்களாகவே உலாவ ஜஸ்ட் பிரவுஸை கிளிக் செய்யவும்.'
  },
  'hi-IN': {
    welcome: 'CivicFix में आपका स्वागत है! जारी रखने के लिए कृपया अपनी पसंदीदा भाषा चुनें। अंग्रेजी, तमिल, हिंदी, तेलुगु या मलयालम चुनें।',
    confirmation: (lang) => `आपने हिंदी चुनी है। अब, कृपया चुनें कि आप कैसे शुरू करना चाहेंगे।`,
    options: 'CivicFix में आपका स्वागत है! कृपया विकल्पों में से एक चुनें। चरण-दर-चरण वॉयस निर्देश सुनने के लिए स्टार्ट गाइड पर क्लिक करें। हमारे एआई सहायक से बात करने के लिए चैट बॉट पर क्लिक करें। या अपने आप घूमने के लिए जस्ट ब्राउज़ पर क्लिक करें।'
  },
  'te-IN': {
    welcome: 'సివిక్ ఫిక్స్ కు స్వాగతం! కొనసాగించడానికి దయచేసి మీకు ఇష్టమైన భాషను ఎంచుకోండి. ఇంగ్లీష్, తమిళం, హిందీ, తెలుగు లేదా మలయాళం ఎంచుకోండి.',
    confirmation: (lang) => `మీరు తెలుగును ఎంచుకున్నారు. ఇప్పుడు, మీరు ఎలా ప్రారంభించాలనుకుంటున్నారో ఎంచుకోండి.`,
    options: 'సివిక్ ఫిక్స్‌కు స్వాగతం! ఎంపికలలో ఒకదాన్ని ఎంచుకోండి. వాయిస్ సూచనల కోసం స్టార్ట్ గైడ్‌ని క్లిక్ చేయండి. మా AI అసిస్టెంట్‌తో మాట్లాడటానికి చాట్ బాట్‌ని క్లిక్ చేయండి. లేదా మీ స్వంతంగా అన్వేషించడానికి జస్ట్ బ్రౌజ్ క్లిక్ చేయండి.'
  },
  'ml-IN': {
    welcome: 'സിവിക് ഫിക്സിലേക്ക് സ്വാഗതം! തുടരുന്നതിന് നിങ്ങളുടെ ഇഷ്ടപ്പെട്ട ഭാഷ തിരഞ്ഞെടുക്കുക. ഇംഗ്ലീഷ്, തമിഴ്, ഹിന്ദി, തെലുങ്ക് അല്ലെങ്കിൽ മലയാളം തിരഞ്ഞെടുക്കുക.',
    confirmation: (lang) => `നിങ്ങൾ മലയാളം തിരഞ്ഞെടുത്തു. ഇനി, എങ്ങനെ തുടങ്ങണമെന്ന് ദയവായി തിരഞ്ഞെടുക്കുക.`,
    options: 'സിവിക് ഫിക്സിലേക്ക് സ്വാഗതം! ഓപ്ഷനുകളിൽ ഒന്ന് തിരഞ്ഞെടുക്കുക. ശബ്ദ നിർദ്ദേശങ്ങൾക്കായി സ്റ്റാർട്ട് ഗైഡ് ക്ലിക്ക് ചെയ്യുക. AI అసిస్టന്റിനായി చాറ്റ് బాട്ട് ക്ലിക്ക് ചെയ്യുക. അല്ലെങ്കിൽ സ്വന്തമായി ബ്രൗസ് ചെയ്യാൻ ജസ്റ്റ് బ్రౌజ్ ക്ലിക്ക് ചെയ്യുക.'
  }
};

const WelcomeOverlay = ({ onStartGuide, onOpenChatbot, onLanguageSelect }) => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState('language'); // 'language' or 'options'
  const [langCode, setLangCode] = useState('en-IN');
  const [pointer, setPointer] = useState(0); 
  const [voicePlayed, setVoicePlayed] = useState(false);
  const pointerTimer = useRef(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // sessionStorage blocked (private browsing, storage quota) — show overlay
    }
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Trigger voice when user clicks the 🔊 button
  const handleHearInstructions = () => {
    setVoicePlayed(true);
    const p = PROMPTS[langCode];
    speak(step === 'language' ? p.welcome : p.options, langCode);
  };

  // Animated pointer cycles between the language cards
  useEffect(() => {
    if (!visible) return;
    const maxSteps = step === 'language' ? 5 : 3;
    pointerTimer.current = setInterval(() => {
      setPointer(p => (p + 1) % maxSteps);
    }, 1400);
    return () => clearInterval(pointerTimer.current);
  }, [visible, step]);

  const dismiss = (action) => {
    window.speechSynthesis.cancel();
    clearInterval(pointerTimer.current);
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    if (action === 'guide') onStartGuide();
    if (action === 'chatbot') onOpenChatbot();
  };

  const handleLanguageSelect = (label, code) => {
    setLangCode(code);
    if (onLanguageSelect) onLanguageSelect(code);
    
    speak(PROMPTS[code].confirmation(label), code);
    setStep('options');
    setPointer(0);
    setVoicePlayed(false);
  };

  const handleCardClick = (action, cardText) => {
    const confirmText = langCode === 'ta-IN' ? `நீங்கள் ${cardText}-ஐத் தேர்ந்தெடுத்துள்ளீர்கள். இப்போது திறக்கிறது.` : 
                       langCode === 'hi-IN' ? `आपने ${cardText} चुना है। अब खुल रहा है।` :
                       langCode === 'te-IN' ? `మీరు ${cardText} ఎంచుకున్నారు. ఇప్పుడు తెరుచుకుంటుంది.` :
                       langCode === 'ml-IN' ? `നിങ്ങൾ ${cardText} തിരഞ്ഞെടുത്തു. ഇപ്പോൾ തുറക്കുന്നു.` :
                       `You selected ${cardText}. Opening now.`;
    speak(confirmText, langCode);
    setTimeout(() => dismiss(action), 600);
  };

  if (!visible) return null;

  return (
    <div className="wo-backdrop">
      <div className="wo-panel" onClick={e => e.stopPropagation()}>

        {/* Heading */}
        <div className="wo-heading">
          <span className="wo-logo">🏛️</span>
          <h2>Welcome to CivicFix</h2>
          <p>
            {step === 'language' 
              ? (langCode === 'ta-IN' ? 'உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்' : 
                 langCode === 'hi-IN' ? 'अपनी पसंदीदा भाषा चुनें' : 
                 langCode === 'te-IN' ? 'మీకు ఇష్టమైన భాషను ఎంచుకోండి' :
                 langCode === 'ml-IN' ? 'നിങ്ങളുടെ ഇഷ്ടപ്പെട്ട ഭാഷ തിരഞ്ഞെടുക്കുക' :
                 'Select your preferred language')
              : (langCode === 'ta-IN' ? 'நீங்கள் எவ்வாறு தொடங்க விரும்புகிறீர்கள்?' : 
                 langCode === 'hi-IN' ? 'आप कैसे शुरुआत करना चाहेंगे?' : 
                 langCode === 'te-IN' ? 'మీరు ఎలా ప్రారంభించాలనుకుంటున్నారు?' :
                 langCode === 'ml-IN' ? 'നിങ്ങൾക്ക് എങ്ങനെ തുടങ്ങണം?' :
                 'How would you like to get started?')
            }
          </p>
          <button className="wo-hear-btn" onClick={handleHearInstructions}>
            🔊 {voicePlayed 
                ? (langCode === 'ta-IN' ? 'வழிமுறைகளை மீண்டும் இயக்கவும்' : 
                   langCode === 'hi-IN' ? 'निर्देश दोबारा सुनें' : 
                   langCode === 'te-IN' ? 'సూచనలను మళ్లీ ప్లే చేయండి' :
                   langCode === 'ml-IN' ? 'നിർദ്ദേശങ്ങൾ വീണ്ടും കേൾക്കുക' :
                   'Replay Instructions') 
                : (langCode === 'ta-IN' ? 'வழிமுறைகளைக் கேட்க தட்டவும்' : 
                   langCode === 'hi-IN' ? 'निर्देश सुनने के लिए टैप करें' : 
                   langCode === 'te-IN' ? 'సూచనల కోసం ఇక్కడ నొక్కండి' :
                   langCode === 'ml-IN' ? 'നിർദ്ദേശങ്ങൾ കേൾക്കാൻ ടാപ്പ് ചെയ്യുക' :
                   'Tap to Hear Instructions')}
          </button>
        </div>

        {step === 'language' ? (
          /* Step 1: Language selection */
          <div className="wo-cards">
            <div
              className={`wo-card wo-card--lang${pointer === 0 ? ' wo-card--active' : ''}`}
              onClick={() => handleLanguageSelect('English', 'en-IN')}
            >
              {pointer === 0 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">🇬🇧</span>
              <h3>English</h3>
              <p>Continue in English</p>
            </div>

            <div
              className={`wo-card wo-card--lang${pointer === 1 ? ' wo-card--active' : ''}`}
              onClick={() => handleLanguageSelect('Tamil', 'ta-IN')}
            >
              {pointer === 1 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">🇮🇳</span>
              <h3>Tamil (தமிழ்)</h3>
              <p>தமிழில் தொடరவும்</p>
            </div>

            <div
              className={`wo-card wo-card--lang${pointer === 2 ? ' wo-card--active' : ''}`}
              onClick={() => handleLanguageSelect('Hindi', 'hi-IN')}
            >
              {pointer === 2 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">🇮🇳</span>
              <h3>Hindi (हिन्दी)</h3>
              <p>हिंदी में जारी रखें</p>
            </div>

            <div
              className={`wo-card wo-card--lang${pointer === 3 ? ' wo-card--active' : ''}`}
              onClick={() => handleLanguageSelect('Telugu', 'te-IN')}
            >
              {pointer === 3 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">🇮🇳</span>
              <h3>Telugu (తెలుగు)</h3>
              <p>తెలుగులో కొనసాగించండి</p>
            </div>

            <div
              className={`wo-card wo-card--lang${pointer === 4 ? ' wo-card--active' : ''}`}
              onClick={() => handleLanguageSelect('Malayalam', 'ml-IN')}
            >
              {pointer === 4 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">🇮🇳</span>
              <h3>Malayalam (മലയാളം)</h3>
              <p>മലയാളത്തിൽ തുടരുക</p>
            </div>
          </div>
        ) : (
          /* Step 2: Options */
          <div className="wo-cards">
            {/* Start Guide */}
            <div
              className={`wo-card wo-card--guide${pointer === 0 ? ' wo-card--active' : ''}`}
              onClick={() => handleCardClick('guide', 'Start Guide')}
            >
              {pointer === 0 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">🎙️</span>
              <h3>{langCode === 'ta-IN' ? 'தொடக்க வழிகாட்டி' : langCode === 'hi-IN' ? 'गाイド शुरू करें' : langCode === 'te-IN' ? 'గైడ్‌ని ప్రారంభించండి' : langCode === 'ml-IN' ? 'ഗൈഡ് ആരംഭിക്കുക' : 'Start Guide'}</h3>
              <p>Step-by-step voice instructions to report an issue</p>
            </div>

            {/* Chat Bot */}
            <div
              className={`wo-card wo-card--chat${pointer === 1 ? ' wo-card--active' : ''}`}
              onClick={() => handleCardClick('chatbot', 'Chat Bot')}
            >
              {pointer === 1 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">🤖</span>
              <h3>Chat Bot</h3>
              <p>Describe your issue to our AI assistant and auto-fill the form</p>
            </div>

            {/* Just Browse */}
            <div
              className={`wo-card wo-card--stop${pointer === 2 ? ' wo-card--active' : ''}`}
              onClick={() => handleCardClick('close', 'Just Browse')}
            >
              {pointer === 2 && <span className="wo-pointer">👆 Click here</span>}
              <span className="wo-card-icon">✋</span>
              <h3>Just Browse</h3>
              <p>Explore the site on your own — you can start the guide anytime</p>
            </div>
          </div>
        )}

        <p className="wo-hint">🔊 {langCode === 'ta-IN' ? 'மேலே உள்ள குரల్ வழிகாட்டியைப் பின்பற்றவும், அல்லது ஏதேனும் கார்டினை கிளிக் செய்து தொடங்கவும்' : 
                                langCode === 'hi-IN' ? 'ऊपर दी गई वॉयस गाइड सुनें, या शुरू करने के लिए किसी भी कार्ड पर क्लिक करें' : 
                                langCode === 'te-IN' ? 'పైన ఉన్న వాయిస్ గైడ్ వినండి లేదా ప్రారంభించడానికి ఏదైనా కార్డ్‌ని క్లిక్ చేయండి' :
                                langCode === 'ml-IN' ? 'മുകളിലുള്ള വോയ്‌സ് ഗൈഡ് കേൾക്കുക, അല്ലെങ്കിൽ ആരംഭിക്കാൻ ഏതെങ്കിലും കാർഡിൽ ക്ലിക്ക് ചെയ്യുക' :
                                'Listen to the voice guide above, or click any card to begin'}</p>
      </div>
    </div>
  );
};

export default WelcomeOverlay;
