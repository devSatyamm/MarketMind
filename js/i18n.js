/**
 * MarketMind — i18n (Internationalization) Engine
 * js/i18n.js
 *
 * Usage:
 *   - Add  data-i18n="key"  to any element to auto-translate its textContent
 *   - Add  data-i18n-ph="key"  for input placeholders
 *   - Add  data-i18n-title="key"  for title attributes
 *   - Call  I18n.setLang('hi')  to switch language (persists via localStorage)
 *   - I18n.t('key')  returns translated string for manual use
 *
 * Default: 'en' (English)
 */

const I18n = (() => {

    const LS_KEY   = 'mm_lang';
    const DEFAULT  = 'en';

    // ── Language Metadata ─────────────────────────────────────────────────────
    const LANGUAGES = [
        { code: 'en', label: 'English',    native: 'English',    flag: '🇬🇧' },
        { code: 'hi', label: 'Hindi',      native: 'हिंदी',       flag: '🇮🇳' },
        { code: 'bn', label: 'Bengali',    native: 'বাংলা',       flag: '🇧🇩' },
        { code: 'ta', label: 'Tamil',      native: 'தமிழ்',       flag: '🇮🇳' },
        { code: 'te', label: 'Telugu',     native: 'తెలుగు',      flag: '🇮🇳' },
        { code: 'mr', label: 'Marathi',    native: 'मराठी',       flag: '🇮🇳' },
        { code: 'gu', label: 'Gujarati',   native: 'ગુજરાતી',     flag: '🇮🇳' },
        { code: 'kn', label: 'Kannada',    native: 'ಕನ್ನಡ',       flag: '🇮🇳' },
    ];

    // ── Translation Dictionary ────────────────────────────────────────────────
    const DICT = {

        // ── Navigation ──
        'nav.features':       { en:'Features',    hi:'विशेषताएं',  bn:'বৈশিষ্ট্য',   ta:'அம்சங்கள்',   te:'లక్షణాలు',   mr:'वैशिष्ट्ये',  gu:'વૈશિષ્ટ્ય',  kn:'ವೈಶಿಷ್ಟ್ಯಗಳು' },
        'nav.impact':         { en:'Impact',      hi:'प्रभाव',     bn:'প্রভাব',      ta:'தாக்கம்',     te:'ప్రభావం',    mr:'प्रभाव',      gu:'અસર',        kn:'ಪ್ರಭಾವ' },
        'nav.launch':         { en:'Launch App',  hi:'ऐप खोलें',  bn:'অ্যাপ চালু',  ta:'ஆப் திற',     te:'యాప్ తెరవు', mr:'ॲप उघडा',    gu:'એપ ખોલો',    kn:'ಆ್ಯಪ್ ತೆರೆಯಿರಿ' },
        'nav.dashboard':      { en:'Dashboard',   hi:'डैशबोर्ड',   bn:'ড্যাশবোর্ড',  ta:'டாஷ்போர்ட்',  te:'డాష్బోర్డ్', mr:'डॅशबोर्ड',   gu:'ડૅશબોર્ડ',   kn:'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' },
        'nav.simulations':    { en:'Simulations', hi:'सिमुलेशन',   bn:'সিমুলেশন',    ta:'உருவகப்படுத்து',te:'అనుకరణలు',  mr:'सिम्युलेशन',  gu:'સિમ્યુલેશન', kn:'ಸಿಮ್ಯುಲೇಶನ್' },
        'nav.funding':        { en:'Funding',     hi:'फंडिंग',     bn:'ফান্ডিং',     ta:'நிதியுதவி',   te:'నిధులు',     mr:'फंडिंग',      gu:'ભંડોળ',      kn:'ನಿಧಿ' },
        'nav.vcforge':        { en:'VC Forge',    hi:'VC फोर्ज',   bn:'VC ফোর্জ',    ta:'VC ஃபோர்ஜ்', te:'VC ఫోర్జ్',  mr:'VC फोर्ज',   gu:'VC ફોર્જ',   kn:'VC ಫೋರ್ಜ್' },
        'nav.policies':       { en:'Policies',    hi:'नीतियां',    bn:'নীতি',        ta:'கொள்கைகள்',  te:'విధానాలు',   mr:'धोरणे',       gu:'નીતિ',       kn:'ನೀತಿಗಳು' },

        // ── Landing page ──
        'land.beta':          { en:'Now in Beta — Limited Access', hi:'बीटा में — सीमित एक्सेस', bn:'বেটায় — সীমিত অ্যাক্সেস', ta:'பீட்டாவில் — வரையறுக்கப்பட்ட அணுகல்', te:'బీటాలో — పరిమిత యాక్సెస్', mr:'बीटामध्ये — मर्यादित प्रवेश', gu:'બૅટામાં — મર્યાદિત ઍક્સેસ', kn:'ಬೀಟಾದಲ್ಲಿ — ಸೀಮಿತ ಪ್ರವೇಶ' },
        'land.hero.title':    { en:'AI That Thinks Ahead',     hi:'AI जो आगे सोचता है',    bn:'AI যা এগিয়ে ভাবে',   ta:'முன்னோக்கி சிந்திக்கும் AI', te:'ముందు ఆలోచించే AI', mr:'पुढे विचार करणारी AI', gu:'આગળ વિચારતી AI', kn:'ಮುಂದೆ ಯೋಚಿಸುವ AI' },
        'land.hero.gradient': { en:'Thinks Ahead', hi:'आगे सोचता है', bn:'এগিয়ে ভাবে', ta:'முன்னோக்கி', te:'ముందు', mr:'पुढे विचार', gu:'આગળ', kn:'ಮುಂದೆ' },
        'land.hero.sub':      { en:'Predict market shifts before they happen. The world\'s first agentic economic foresight engine, powered by causal intelligence.', hi:'बाजार बदलाव पहले ही भांप लें। दुनिया का पहला एजेंटिक आर्थिक दूरदर्शिता इंजन।', bn:'বাজারের পরিবর্তন আগেই অনুমান করুন।', ta:'சந்தை மாற்றங்களை முன்கூட்டியே கணியுங்கள்.', te:'మార్కెట్ మార్పులను ముందే అంచనా వేయండి.', mr:'बाजारातील बदल आधीच ओळखा.', gu:'બજારના ફેરફારો પહેલેથી જ અનુમાનો.', kn:'ಮಾರ್ಕೆಟ್ ಬದಲಾವಣೆಗಳನ್ನು ಮೊದಲೇ ಊಹಿಸಿ.' },
        'land.cta.access':    { en:'Get Early Access', hi:'अर्ली एक्सेस पाएं', bn:'আর্লি অ্যাক্সেস পান', ta:'முன்கூட்டி அணுகல் பெறுங்கள்', te:'ముందు యాక్సెస్ పొందండి', mr:'लवकर प्रवेश मिळवा', gu:'વહેલો ઍક્સેસ મેળવો', kn:'ಮೊದಲ ಪ್ರವೇಶ ಪಡೆಯಿರಿ' },
        'land.cta.explore':   { en:'Explore Features', hi:'विशेषताएं देखें', bn:'বৈশিষ্ট্য দেখুন', ta:'அம்சங்களை ஆராயுங்கள்', te:'లక్షణాలు అన్వేషించండి', mr:'वैशिष्ट्ये पहा', gu:'સুવિધાઓ જુઓ', kn:'ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಅನ್ವೇಷಿಸಿ' },
        'land.accuracy':      { en:'94% Accuracy', hi:'94% सटीकता', bn:'৯৪% নির্ভুলতা', ta:'94% துல்லியம்', te:'94% ఖచ్చితత్వం', mr:'94% अचूकता', gu:'94% ચોકસાઈ', kn:'94% ನಿಖರತೆ' },
        'land.realtime':      { en:'Real-time Processing', hi:'रियल-टाइम प्रोसेसिंग', bn:'রিয়েল-টাইম প্রসেসিং', ta:'நிகழ்நேர செயலாக்கம்', te:'నిజ సమయ ప్రాసెసింగ్', mr:'रिअल-टाइम प्रोसेसिंग', gu:'રીઅલ-ટાઇમ પ્રોસેસિંગ', kn:'ರಿಯಲ್-ಟೈಮ್ ಪ್ರಕ್ರಿಯೆ' },

        // ── Features section ──
        'feat.title':         { en:'Architected for Speed', hi:'Speed के लिए बनाया', bn:'গতির জন্য তৈরি', ta:'வேகத்திற்காக வடிவமைக்கப்பட்டது', te:'వేగం కోసం నిర్మించబడింది', mr:'वेगासाठी तयार', gu:'ઝડપ માટે ઘડ્યું', kn:'ವೇಗಕ್ಕಾಗಿ ರಚಿಸಲಾಗಿದೆ' },
        'feat.sub':           { en:'Processing global economic data at the edge of possibility.', hi:'वैश्विक आर्थिक डेटा को संभावना की सीमा पर प्रोसेस करना।', bn:'সম্ভাবনার প্রান্তে বৈশ্বিক অর্থনৈতিক তথ্য প্রক্রিয়াকরণ।', ta:'உலகளாவிய பொருளாதார தரவை வேகமாக செயலாக்கும்.', te:'ప్రపంచ ఆర్థిక డేటాను అత్యంత వేగంగా ప్రాసెస్ చేస్తోంది.', mr:'जागतिक आर्थिक डेटा प्रक्रिया करणे.', gu:'વૈશ્વિક આર્થિક ડેટાની ઝડપી પ્રક્રિયા.', kn:'ಜಾಗತಿಕ ಆರ್ಥಿಕ ಡೇಟಾವನ್ನು ಅತ್ಯಂತ ವೇಗವಾಗಿ ಪ್ರಕ್ರಿಯೆ.' },
        'feat.latency.h':     { en:'Latency Zero', hi:'शून्य विलंब', bn:'শূন্য বিলম্ব', ta:'பூஜ்ய தாமதம்', te:'జీరో లేటెన్సీ', mr:'शून्य विलंब', gu:'શૂન્ય વિલંબ', kn:'ಶೂನ್ಯ ವಿಳಂಬ' },
        'feat.latency.p':     { en:'Real-time execution with sub-millisecond response times across global markets.', hi:'वैश्विक बाजारों में मिलीसेकंड से कम रिस्पॉन्स समय।', bn:'বৈশ্বিক বাজারে মিলিসেকেন্ডের নিচে প্রতিক্রিয়া।', ta:'உலகளாவிய சந்தைகளில் மில்லி-விநாடிக்கும் குறைவான பதில்.', te:'గ్లోబల్ మార్కెట్లలో మిల్లీసెకన్డ్ కంటే తక్కువ రెస్పాన్స్.', mr:'जागतिक बाजारात मिलिसेकंदपेक्षा कमी प्रतिसाद.', gu:'ગ્લોબલ માર્કેટ્સમાં મિલીસેકન્ડ કરતા ઓછો રિસ્પોન્સ.', kn:'ಜಾಗತಿಕ ಮಾರ್ಕೆಟ್‌ಗಳಲ್ಲಿ ಮಿಲ್ಲಿಸೆಕೆಂಡ್‌ಗಿಂತ ಕಡಿಮೆ ಪ್ರತಿಕ್ರಿಯೆ.' },
        'feat.risk.h':        { en:'Risk Simulation', hi:'रिस्क सिमुलेशन', bn:'ঝুঁকি সিমুলেশন', ta:'அபாய உருவகப்படுத்துதல்', te:'రిస్క్ సిమ్యులేషన్', mr:'जोखीम सिम्युलेशन', gu:'જોખમ સિમ્યુલેશન', kn:'ಅಪಾಯ ಸಿಮ್ಯುಲೇಶನ್' },
        'feat.causal.h':      { en:'Causal Graphs', hi:'कारण ग्राफ', bn:'কার্যকারণ গ্রাফ', ta:'காரண வரைபடங்கள்', te:'కారణ గ్రాఫ్‌లు', mr:'कारण ग्राफ', gu:'કારण ગ્રાફ', kn:'ಕಾರಣ ಗ್ರಾಫ್‌ಗಳು' },

        // ── Stats section ──
        'stat.sources':       { en:'Data Sources', hi:'डेटा स्रोत', bn:'ডেটা উৎস', ta:'தரவு மூலங்கள்', te:'డేటా మూలాలు', mr:'डेटा स्रोत', gu:'ડેટા સ્ત્રોત', kn:'ಡೇಟಾ ಮೂಲಗಳು' },
        'stat.markets':       { en:'Markets Tracked', hi:'बाजार ट्रैक', bn:'ট্র্যাক করা বাজার', ta:'கண்காணிக்கப்படும் சந்தைகள்', te:'ట్రాక్ అయిన మార్కెట్లు', mr:'ट्रॅक केलेले बाजार', gu:'ટ્રૅક કરેલ બજારો', kn:'ಟ್ರ್ಯಾಕ್ ಮಾರ್ಕೆಟ್‌ಗಳು' },
        'stat.prediction':    { en:'% Prediction Rate', hi:'% भविष्यवाणी दर', bn:'% পূর্বাভাস হার', ta:'% கணிப்பு விகிதம்', te:'% అంచనా రేటు', mr:'% अंदाज दर', gu:'% પ્રિડિક્શન રેટ', kn:'% ಊಹೆ ದರ' },

        // ── CTA Section ──
        'cta.title':          { en:'Ready to see the future?', hi:'भविष्य देखने के लिए तैयार हैं?', bn:'ভবিষ্যৎ দেখতে প্রস্তুত?', ta:'எதிர்காலத்தை காண தயாரா?', te:'భవిష్యత్తు చూడటానికి సిద్ధంగా ఉన్నారా?', mr:'भविष्य पाहण्यास तयार आहात का?', gu:'ભવિષ્ય જોવા તૈયાર છો?', kn:'ಭವಿಷ್ಯ ನೋಡಲು ಸಿದ್ಧರಾಗಿದ್ದೀರಾ?' },
        'cta.sub':            { en:'Join top investors and founders using MarketMind today.', hi:'आज MarketMind इस्तेमाल करने वाले निवेशकों और संस्थापकों से जुड़ें।', bn:'আজই MarketMind ব্যবহারকারী বিনিয়োগকারীদের সাথে যোগ দিন।', ta:'இன்று MarketMind பயன்படுத்தும் முதலீட்டாளர்களுடன் சேருங்கள்.', te:'ఈ రోజు MarketMind వాడే పెట్టుబడిదారులతో చేరండి.', mr:'आज MarketMind वापरणाऱ्या गुंतवणूकदारांसह सामील व्हा.', gu:'આજે MarketMind ઉપયોગ કરતા રોકાણકારો સાથે જોડાઓ.', kn:'ಇಂದು MarketMind ಬಳಸುವ ಹೂಡಿಕೆದಾರರೊಂದಿಗೆ ಸೇರಿ.' },
        'cta.btn':            { en:'Get Started', hi:'शुरू करें', bn:'শুরু করুন', ta:'தொடங்குங்கள்', te:'ప్రారంభించండి', mr:'सुरुवात करा', gu:'શરૂ કરો', kn:'ಪ್ರಾರಂಭಿಸಿ' },

        // ── Dashboard ──
        'db.title':           { en:'Market Overview', hi:'बाजार अवलोकन', bn:'বাজার ওভারভিউ', ta:'சந்தை மேலோட்டம்', te:'మార్కెట్ అవలోకన', mr:'बाजार आढावा', gu:'બજાર અવલોકન', kn:'ಮಾರ್ಕೆಟ್ ಅವಲೋಕನ' },
        'db.refresh':         { en:'Refresh', hi:'रिफ्रेश', bn:'রিফ্রেশ', ta:'புதுப்பி', te:'రిఫ్రెష్', mr:'रिफ्रेश', gu:'રિફ્રેશ', kn:'ರಿಫ್ರೆಶ್' },
        'db.analyse':         { en:'Analyse', hi:'विश्लेषण', bn:'বিশ্লেষণ', ta:'பகுப்பாய்வு', te:'విశ్లేషించు', mr:'विश्लेषण', gu:'વિશ્લેષણ', kn:'ವಿಶ್ಲೇಷಿಸಿ' },
        'db.watchlist':       { en:'Watchlist', hi:'वॉचलिस्ट', bn:'ওয়াচলিস্ট', ta:'கண்காணிப்பு', te:'వాచ్‌లిస్ట్', mr:'वॉचलिस्ट', gu:'વૉચલિસ્ટ', kn:'ವಾಚ್‌ಲಿಸ್ಟ್' },
        'db.trending':        { en:'Trending Topics', hi:'ट्रेंडिंग विषय', bn:'ট্রেন্ডিং বিষয়', ta:'பிரபல தலைப்புகள்', te:'ట్రెండింగ్ అంశాలు', mr:'ट्रेंडिंग विषय', gu:'ટ્રેન્ડિંગ વિષય', kn:'ಟ್ರೆಂಡಿಂಗ್ ವಿಷಯಗಳು' },
        'db.aiconf':          { en:'AI Confidence', hi:'AI विश्वास', bn:'AI আস্থা', ta:'AI நம்பிக்கை', te:'AI నమ్మకం', mr:'AI विश्वास', gu:'AI વિશ્વાસ', kn:'AI ನಂಬಿಕೆ' },
        'db.feed.all':        { en:'⚡ All Insights — AI Consequence Feed', hi:'⚡ सभी इनसाइट्स — AI परिणाम फ़ीड', bn:'⚡ সমস্ত অন্তর্দৃষ্টি', ta:'⚡ அனைத்து நுண்ணறிவுகள்', te:'⚡ అన్ని అంతర్దృష్టులు', mr:'⚡ सर्व अंतर्दृष्टी', gu:'⚡ બધી આંતરદૃષ્ટિ', kn:'⚡ ಎಲ್ಲ ಇನ್‌ಸೈಟ್‌ಗಳು' },

        // ── Role tabs ──
        'role.all':           { en:'All',         hi:'सभी',      bn:'সব',      ta:'அனைத்தும்', te:'అన్నీ',     mr:'सर्व',   gu:'બધા',   kn:'ಎಲ್ಲ' },
        'role.founder':       { en:'🚀 Founders',  hi:'🚀 संस्थापक', bn:'🚀 প্রতিষ্ঠাতা', ta:'🚀 நிறுவனர்கள்', te:'🚀 వ్యవస్థాపకులు', mr:'🚀 संस्थापक', gu:'🚀 સ્થાપક', kn:'🚀 ಸ್ಥಾಪಕರು' },
        'role.investor':      { en:'💼 Investors', hi:'💼 निवेशक', bn:'💼 বিনিয়োগকারী', ta:'💼 முதலீட்டாளர்கள்', te:'💼 పెట్టుబడిదారులు', mr:'💼 गुंतवणूकदार', gu:'💼 રોકાણકારો', kn:'💼 ಹೂಡಿಕೆದಾರರು' },
        'role.student':       { en:'🎓 Students',  hi:'🎓 छात्र',  bn:'🎓 শিক্ষার্থী', ta:'🎓 மாணவர்கள்', te:'🎓 విద్యార్థులు', mr:'🎓 विद्यार्थी', gu:'🎓 વિદ્યાર્થી', kn:'🎓 ವಿದ್ಯಾರ್ಥಿಗಳು' },
        'role.analyst':       { en:'📊 Analysts',  hi:'📊 विश्लेषक', bn:'📊 বিশ্লেষক', ta:'📊 ஆய்வாளர்கள்', te:'📊 విశ్లేషకులు', mr:'📊 विश्लेषक', gu:'📊 વિશ્લેષક', kn:'📊 ವಿಶ್ಲೇಷಕರು' },
        'role.researcher':    { en:'🔬 Researchers', hi:'🔬 शोधकर्ता', bn:'🔬 গবেষক', ta:'🔬 ஆராய்ச்சியாளர்கள்', te:'🔬 పరిశోధకులు', mr:'🔬 संशोधक', gu:'🔬 સંશોધક', kn:'🔬 ಸಂಶೋಧಕರು' },
        'role.msme':          { en:'🏭 MSME Owners', hi:'🏭 MSME मालिक', bn:'🏭 MSME মালিক', ta:'🏭 MSME உரிமையாளர்கள்', te:'🏭 MSME యజమానులు', mr:'🏭 MSME मालक', gu:'🏭 MSME માલિક', kn:'🏭 MSME ಮಾಲೀಕರು' },

        // ── Language picker ──
        'lang.title':         { en:'Language', hi:'भाषा', bn:'ভাষা', ta:'மொழி', te:'భాష', mr:'भाषा', gu:'ભાષા', kn:'ಭಾಷೆ' },
        'lang.change':        { en:'Change Language', hi:'भाषा बदलें', bn:'ভাষা পরিবর্তন করুন', ta:'மொழியை மாற்றுங்கள்', te:'భాష మార్చండి', mr:'भाषा बदला', gu:'ભાષા બદલો', kn:'ಭಾಷೆ ಬದಲಾಯಿಸಿ' },

        // ── Footer / Common ──
        'footer.rights':      { en:'© 2026 MarketMind Inc. All rights reserved.', hi:'© 2026 MarketMind Inc. सर्वाधिकार सुरक्षित।', bn:'© 2026 MarketMind Inc. সর্বস্বত্ব সংরক্ষিত।', ta:'© 2026 MarketMind Inc. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.', te:'© 2026 MarketMind Inc. అన్ని హక్కులూ రిజర్వ్ చేయబడ్డాయి.', mr:'© 2026 MarketMind Inc. सर्व हक्क राखीव आहेत.', gu:'© 2026 MarketMind Inc. બધા અધિકાર સુરક્ષિત.', kn:'© 2026 MarketMind Inc. ಎಲ್ಲ ಹಕ್ಕುಗಳೂ ಮೀಸಲಿವೆ.' },
        'footer.tagline':     { en:'Foresight-grade intelligence for capital markets.', hi:'पूंजी बाजारों के लिए अग्रदृष्टि-स्तरीय बुद्धिमत्ता।', bn:'মূলধন বাজারের জন্য দূরদর্শী বুদ্ধিমত্তা।', ta:'மூலதன சந்தைகளுக்கான முன்னோக்கிய நுண்ணறிவு.', te:'క్యాపిటల్ మార్కెట్‌ల కోసం దూరదృష్టి స్థాయి మేధస్సు.', mr:'भांडवल बाजारासाठी पुढेदृष्टी बुद्धिमत्ता.', gu:'મૂડી બજારો માટે ભવિષ્યદ્રષ્ટ આસૂત્તતા.', kn:'ಬಂಡವಾಳ ಮಾರ್ಕೆಟ್‌ಗಳಿಗಾಗಿ ದೂರದೃಷ್ಟಿ ಬುದ್ಧಿಮತ್ತೆ.' },
        'btn.loading':        { en:'Loading…', hi:'लोड हो रहा है…', bn:'লোড হচ্ছে…', ta:'ஏற்றுகிறது…', te:'లోడ్ అవుతోంది…', mr:'लोड होत आहे…', gu:'લોડ થઈ રહ્યું છે…', kn:'ಲೋಡ್ ಆಗುತ್ತಿದೆ…' },
    };

    // ── Current lang ─────────────────────────────────────────────────────────
    let _current = localStorage.getItem(LS_KEY) || DEFAULT;

    // ── Core translate ────────────────────────────────────────────────────────
    function t(key) {
        const entry = DICT[key];
        if (!entry) return key;
        return entry[_current] || entry[DEFAULT] || key;
    }

    // ── Apply translations to the DOM ─────────────────────────────────────────
    function _applyAll() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });
        // innerHTML (for elements that need HTML like &nbsp; etc.)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            el.innerHTML = t(key);
        });
        // Placeholders
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            el.placeholder = t(el.getAttribute('data-i18n-ph'));
        });
        // Title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.title = t(el.getAttribute('data-i18n-title'));
        });
        // Update html lang attribute
        document.documentElement.lang = _current;
        // Update active state in any open language panel
        _updatePickerUI();
    }

    function _updatePickerUI() {
        document.querySelectorAll('.lang-option').forEach(el => {
            el.classList.toggle('active', el.dataset.lang === _current);
        });
        // Update trigger button label
        const curr = LANGUAGES.find(l => l.code === _current);
        document.querySelectorAll('.lang-trigger-label').forEach(el => {
            if (curr) el.textContent = `${curr.flag} ${curr.native}`;
        });
    }

    // ── Language picker HTML ───────────────────────────────────────────────────
    function _buildPickerHTML() {
        return `
        <div class="lang-picker" id="lang-picker">
            <button class="lang-trigger" onclick="I18n.togglePicker()" aria-label="Change language">
                <i class="fa-solid fa-globe" style="font-size:0.9rem;"></i>
                <span class="lang-trigger-label"></span>
                <i class="fa-solid fa-chevron-down lang-chevron" style="font-size:0.65rem;"></i>
            </button>
            <div class="lang-dropdown" id="lang-dropdown">
                <div class="lang-dropdown-header" data-i18n="lang.change"></div>
                <div class="lang-grid">
                    ${LANGUAGES.map(l => `
                    <button class="lang-option${l.code === _current ? ' active' : ''}" 
                            data-lang="${l.code}" 
                            onclick="I18n.setLang('${l.code}')">
                        <span class="lang-flag">${l.flag}</span>
                        <span class="lang-native">${l.native}</span>
                        <span class="lang-en">${l.label}</span>
                    </button>`).join('')}
                </div>
            </div>
        </div>`;
    }

    // ── Inject picker into nav ─────────────────────────────────────────────────
    function _injectPicker() {
        // Avoid double-inject
        if (document.getElementById('lang-picker')) return;

        const targets = [
            document.querySelector('.nav-links'),          // landing page
            document.querySelector('.flex.items-center.gap-3'), // dashboard/inner pages
        ];

        for (const target of targets) {
            if (target) {
                const div = document.createElement('div');
                div.innerHTML = _buildPickerHTML();
                target.insertBefore(div.firstElementChild, target.firstChild);
                break;
            }
        }

        // Close on outside click
        document.addEventListener('click', e => {
            if (!e.target.closest('#lang-picker')) {
                document.getElementById('lang-dropdown')?.classList.remove('open');
            }
        });
    }

    // ── Inject styles ─────────────────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('i18n-styles')) return;
        const style = document.createElement('style');
        style.id = 'i18n-styles';
        style.textContent = `
            /* Language Picker */
            .lang-picker {
                position: relative;
                flex-shrink: 0;
            }
            .lang-trigger {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                padding: 0.38rem 0.75rem;
                border-radius: 8px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: #94a3b8;
                font-size: 0.82rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
                white-space: nowrap;
            }
            .lang-trigger:hover {
                background: rgba(255,255,255,0.09);
                color: #f1f5f9;
                border-color: rgba(255,255,255,0.2);
            }
            .lang-chevron {
                transition: transform 0.2s;
                opacity: 0.6;
            }
            .lang-dropdown.open ~ .lang-trigger .lang-chevron,
            .lang-picker:has(.lang-dropdown.open) .lang-chevron {
                transform: rotate(180deg);
            }
            .lang-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                width: 300px;
                background: #0e1628;
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 14px;
                padding: 0.75rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.6);
                display: none;
                z-index: 9999;
                animation: lang-drop-in 0.18s ease;
            }
            .lang-dropdown.open { display: block; }
            @keyframes lang-drop-in {
                from { opacity:0; transform: translateY(-6px); }
                to   { opacity:1; transform: translateY(0); }
            }
            .lang-dropdown-header {
                font-size: 0.65rem;
                font-weight: 800;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: #475569;
                padding: 0 0.3rem 0.5rem;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                margin-bottom: 0.5rem;
            }
            .lang-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 0.3rem;
            }
            .lang-option {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                padding: 0.45rem 0.6rem;
                border-radius: 8px;
                border: 1px solid transparent;
                background: transparent;
                cursor: pointer;
                text-align: left;
                transition: all 0.15s;
                font-family: inherit;
            }
            .lang-option:hover {
                background: rgba(255,255,255,0.06);
                border-color: rgba(255,255,255,0.1);
            }
            .lang-option.active {
                background: rgba(99,102,241,0.15);
                border-color: rgba(99,102,241,0.4);
            }
            .lang-flag { font-size: 1rem; flex-shrink:0; }
            .lang-native {
                font-size: 0.82rem;
                font-weight: 700;
                color: #f1f5f9;
                flex: 1;
                min-width: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .lang-en {
                font-size: 0.65rem;
                color: #475569;
                white-space: nowrap;
            }
            .lang-option.active .lang-native { color: #a5b4fc; }
            .lang-option.active .lang-en     { color: #6366f1; }

            /* Landing nav specific fix */
            .glass-nav .lang-trigger {
                background: rgba(255,255,255,0.07);
                border-color: rgba(255,255,255,0.12);
                color: rgba(255,255,255,0.75);
            }
            .glass-nav .lang-dropdown {
                top: calc(100% + 12px);
            }
        `;
        document.head.appendChild(style);
    }

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        /** Current language code */
        get lang() { return _current; },

        /** All languages metadata */
        get languages() { return LANGUAGES; },

        /** Translate a key */
        t,

        /** Get language name for Gemini prompt */
        geminiLang() {
            const l = LANGUAGES.find(x => x.code === _current);
            return l ? l.label : 'English';
        },

        /** Switch language */
        setLang(code) {
            if (!LANGUAGES.find(l => l.code === code)) return;
            _current = code;
            localStorage.setItem(LS_KEY, code);
            _applyAll();
            // Close picker
            document.getElementById('lang-dropdown')?.classList.remove('open');
            // Dispatch event so other modules (MarketMind) can react
            document.dispatchEvent(new CustomEvent('mm:langchange', { detail: { lang: code } }));
        },

        /** Toggle picker dropdown */
        togglePicker() {
            document.getElementById('lang-dropdown')?.classList.toggle('open');
        },

        /** Must be called once per page — injects picker + applies translations */
        init() {
            _injectStyles();
            // Wait for DOM to settle before injecting picker
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    _injectPicker();
                    _applyAll();
                });
            } else {
                _injectPicker();
                _applyAll();
            }
        }
    };
})();

// Auto-init when this script loads
I18n.init();
