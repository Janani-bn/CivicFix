import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { isAcceptablePhone } from '../utils/phoneValidation';
import './LiveChatbot.css';

// ============================================================
// 🇮🇳 INDIA-WIDE LOCATION DATABASE
// ============================================================
const INDIAN_CITIES = [
  'mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'solapur', 'kolhapur', 'thane', 'navi mumbai',
  'chennai', 'coimbatore', 'madurai', 'trichy', 'tiruchirappalli', 'salem', 'vellore', 'tirunelveli',
  'erode', 'thoothukudi', 'tiruppur', 'ranipet', 'kanchipuram', 'dindigul', 'thanjavur', 'karur',
  'bengaluru', 'bangalore', 'mysuru', 'mysore', 'hubli', 'dharwad', 'mangaluru', 'mangalore',
  'belagavi', 'bellary', 'bidar', 'tumkur', 'shivamogga', 'davangere',
  'visakhapatnam', 'vizag', 'vijayawada', 'guntur', 'nellore', 'tirupati', 'kurnool', 'rajahmundry',
  'kakinada', 'anantapur', 'kadapa',
  'hyderabad', 'warangal', 'nizamabad', 'karimnagar', 'khammam', 'secunderabad',
  'thiruvananthapuram', 'trivandrum', 'kochi', 'cochin', 'kozhikode', 'calicut', 'thrissur',
  'kollam', 'palakkad', 'alappuzha', 'kannur', 'kasaragod',
  'delhi', 'new delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad',
  'lucknow', 'kanpur', 'agra', 'varanasi', 'allahabad', 'prayagraj', 'meerut', 'bareilly',
  'aligarh', 'moradabad', 'saharanpur', 'gorakhpur', 'mathura', 'firozabad',
  'kolkata', 'calcutta', 'howrah', 'durgapur', 'asansol', 'siliguri', 'bardhaman',
  'jaipur', 'jodhpur', 'udaipur', 'kota', 'bikaner', 'ajmer', 'bhilwara', 'alwar',
  'ahmedabad', 'surat', 'vadodara', 'baroda', 'rajkot', 'bhavnagar', 'jamnagar', 'gandhinagar',
  'bhopal', 'indore', 'jabalpur', 'gwalior', 'ujjain', 'sagar', 'rewa', 'satna',
  'patna', 'gaya', 'bhagalpur', 'muzaffarpur', 'purnia', 'darbhanga',
  'ludhiana', 'amritsar', 'jalandhar', 'patiala', 'bathinda', 'mohali',
  'chandigarh', 'ambala', 'hisar', 'rohtak', 'panipat', 'karnal', 'sonipat',
  'bhubaneswar', 'cuttack', 'rourkela', 'berhampur', 'sambalpur',
  'guwahati', 'silchar', 'dibrugarh', 'jorhat', 'nagaon',
  'ranchi', 'jamshedpur', 'dhanbad', 'bokaro', 'hazaribagh',
  'raipur', 'bhilai', 'durg', 'bilaspur', 'korba',
  'shimla', 'manali', 'dharamsala', 'solan', 'mandi',
  'dehradun', 'haridwar', 'rishikesh', 'nainital', 'roorkee',
  'panaji', 'margao', 'vasco', 'mapusa',
  'srinagar', 'jammu', 'leh',
  'imphal', 'shillong', 'aizawl', 'kohima', 'itanagar', 'agartala', 'gangtok',
];

const KNOWN_AREAS = [
  'perumbakkam', 'adyar', 'anna nagar', 'velachery', 'tambaram', 'chromepet', 'porur',
  'ambattur', 'avadi', 'sholinganallur', 'pallavaram', 'kodambakkam', 'nungambakkam',
  'egmore', 't nagar', 'mylapore', 'besant nagar', 'thiruvanmiyur', 'medavakkam',
  'perungudi', 'thoraipakkam', 'navalur', 'siruseri', 'kelambakkam', 'kolathur',
  'villivakkam', 'madhavaram', 'tondiarpet', 'royapuram', 'tiruvottiyur', 'madipakkam',
  'poonamallee', 'gerugambakkam', 'valasaravakkam', 'ramapuram', 'virugambakkam',
  'whitefield', 'koramangala', 'indiranagar', 'jayanagar', 'jp nagar', 'bannerghatta',
  'electronic city', 'hsr layout', 'btm layout', 'marathahalli', 'bellandur',
  'hebbal', 'yelahanka', 'rajajinagar', 'malleshwaram', 'basavanagudi',
  'andheri', 'bandra', 'borivali', 'dadar', 'kurla', 'malad', 'kandivali',
  'ghatkopar', 'mulund', 'vile parle', 'santacruz', 'juhu', 'powai',
  'chembur', 'vikhroli', 'govandi', 'dombivli', 'kalyan', 'ulhasnagar', 'worli', 'lower parel',
  'hitech city', 'madhapur', 'gachibowli', 'kukatpally', 'ameerpet',
  'dilsukhnagar', 'lb nagar', 'uppal', 'miyapur', 'kondapur', 'manikonda',
  'hinjewadi', 'kothrud', 'viman nagar', 'hadapsar', 'wakad', 'baner',
  'aundh', 'pimpri', 'chinchwad', 'kharadi', 'magarpatta', 'kalyani nagar',
  'rohini', 'dwarka', 'janakpuri', 'pitampura', 'laxmi nagar', 'preet vihar',
  'saket', 'vasant kunj', 'green park', 'hauz khas', 'karol bagh', 'paharganj',
  'civil lines', 'cantonment', 'old city', 'new town',
];

// ============================================================
// ONE-SHOT PARSER
// ============================================================
const parseMessage = (text) => {
  const lower = text.toLowerCase();

  let issueType = 'Others';
  if (lower.includes('garbage') || lower.includes('trash') || lower.includes('waste') || lower.includes('dump'))
    issueType = 'Garbage overflow';
  else if (lower.includes('pothole') || lower.includes('pot hole')) issueType = 'Pothole';
  else if (lower.includes('water') || lower.includes('leak') || lower.includes('pipe')) issueType = 'Water leakage';
  else if (lower.includes('light') || lower.includes('lamp') || lower.includes('streetlight')) issueType = 'Streetlight not working';
  else if (lower.includes('drain') || lower.includes('sewer') || lower.includes('sewage')) issueType = 'Drainage issue';
  else if (lower.includes('road') || lower.includes('broken') || lower.includes('damaged')) issueType = 'Broken road';
  else if (lower.includes('noise') || lower.includes('sound')) issueType = 'Noise pollution';
  else if (lower.includes('tree') || lower.includes('fallen')) issueType = 'Fallen tree';
  else if (lower.includes('flood') || lower.includes('waterlog')) issueType = 'Flooding';

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  const phoneMatch = text.match(/(?:\+91[-\s]?)?\b[6-9]\d{9}\b/);
  const phone = phoneMatch ? phoneMatch[0] : '';

  const nameMatch = text.match(/(?:my name is|i am|i'm|name[:\s]+)\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  const fullName = nameMatch ? nameMatch[1].trim() : '';

  let duration = '';
  const durationMatch = text.match(/(?:for|since|past|last)\s+(\d+\s*(days?|weeks?|months?|years?))/i);
  if (durationMatch) duration = durationMatch[1];

  let severity = 'medium';
  if (lower.includes('urgent') || lower.includes('dangerous') || lower.includes('high') || lower.includes('serious') || lower.includes('severe')) severity = 'high';
  else if (lower.includes('minor') || lower.includes('low') || lower.includes('small')) severity = 'low';

  let area = '';
  let city = '';

  const locWithPrep = text.match(/\b(?:in|at|near|around)\s+([A-Za-z][A-Za-z\s]{1,30}?)(?:\s*,\s*([A-Za-z][A-Za-z\s]{1,20}?))?(?=\s|,|$|\.|;)/i);
  if (locWithPrep) {
    const part1 = locWithPrep[1]?.trim().toLowerCase() || '';
    const part2 = locWithPrep[2]?.trim().toLowerCase() || '';
    if (INDIAN_CITIES.includes(part2)) { area = locWithPrep[1].trim(); city = locWithPrep[2].trim(); }
    else if (INDIAN_CITIES.includes(part1)) { city = locWithPrep[1].trim(); }
    else { area = locWithPrep[1].trim(); if (part2) city = locWithPrep[2].trim(); }
  }

  if (!area) {
    for (const a of KNOWN_AREAS) {
      if (new RegExp(`\\b${a}\\b`, 'i').test(lower)) {
        area = a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }
  }
  if (!city) {
    for (const c of INDIAN_CITIES) {
      if (new RegExp(`\\b${c}\\b`, 'i').test(lower)) {
        city = c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        break;
      }
    }
  }

  let description = text;
  if (email) description = description.replace(email, '');
  if (phone) description = description.replace(phone, '');
  if (fullName) description = description.replace(nameMatch[0], '');
  if (duration) description = description.replace(/(?:for|since|past|last)\s+\d+\s*(days?|weeks?|months?|years?)/i, '');
  if (area) description = description.replace(new RegExp(`\\b${area}\\b`, 'gi'), '');
  if (city) description = description.replace(new RegExp(`\\b${city}\\b`, 'gi'), '');
  description = description.replace(/\b(?:in|at|near|around)\s+[A-Za-z\s,]+/i, '');
  description = description.replace(/\bmy email is\b|\bemail is\b|\bemail\b|\bphone\b|\bnumber\b|\bcontact\b/gi, '');
  description = description.replace(/\b(?:urgent|dangerous|serious|severe|minor|low|high)\b/gi, '');
  description = description.replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

  return { issueType, email, phone, fullName, area, city, duration, description, severity };
};

// ============================================================
// CONSTANTS
// ============================================================
const ISSUE_OPTIONS = [
  { emoji: '🗑️', label: 'Garbage overflow' },
  { emoji: '🕳️', label: 'Pothole' },
  { emoji: '💧', label: 'Water leakage' },
  { emoji: '💡', label: 'Streetlight not working' },
  { emoji: '🚰', label: 'Drainage issue' },
  { emoji: '🛣️', label: 'Broken road' },
  { emoji: '❓', label: 'Others' },
];

const SEVERITY_OPTIONS = [
  { emoji: '🟢', label: 'Low', value: 'low' },
  { emoji: '🟡', label: 'Medium', value: 'medium' },
  { emoji: '🔴', label: 'High', value: 'high' },
];

const LiveChatbot = ({ onAutoFill, forceOpen, onForceOpened }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState('welcome');
  const [formData, setFormData] = useState({
    issueType: '', description: '', area: '', city: '',
    severity: 'medium', fullName: '', phone: '', email: '',
  });
  const [showOptions, setShowOptions] = useState(null);
  const [started, setStarted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      if (onForceOpened) onForceOpened();
    }
  }, [forceOpen, onForceOpened]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showOptions, isTyping]);

  const botSay = useCallback((text, delay = 0, afterFn = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { sender: 'bot', text }]);
      if (afterFn) afterFn();
    }, delay + 600);
  }, []);

  const userSay = (text) => {
    setMessages(prev => [...prev, { sender: 'user', text }]);
  };

  useEffect(() => {
    if (isOpen && !started) {
      setStarted(true);
      botSay("👋 Hey! I'm your CivicFix assistant. How can I help you today?", 200, () => {
        botSay(
          "I can help you report an issue step-by-step, or you can just describe it to me.",
          400,
          () => setShowOptions('start')
        );
      });
    }
  }, [isOpen, started, botSay]);

  const goToStep = useCallback((nextStep, data) => {
    setStep(nextStep);
    const d = data || formData;
    switch (nextStep) {
      case 'ask_issue':
        botSay("What type of issue are you reporting?", 200, () => setShowOptions('issue'));
        break;
      case 'ask_description':
        botSay("Please describe the problem briefly.", 200);
        break;
      case 'ask_area':
        botSay("Which area in your city is this in?", 200);
        break;
      case 'ask_city':
        botSay("Which city? (e.g. Chennai, Mumbai)", 200);
        break;
      case 'ask_severity':
        botSay("How serious is this issue?", 200, () => setShowOptions('severity'));
        break;
      case 'ask_name':
        botSay("What's your full name?", 200);
        break;
      case 'ask_phone':
        botSay("Your phone number?", 200);
        break;
      case 'confirm':
        setTimeout(() => showSummary(d), 700);
        break;
      default:
        break;
    }
  }, [formData, botSay]);

  const showSummary = (data) => {
    const lines = [
      "✅ Got it! I've prepared your report summary:\n",
      `📋 Issue: ${data.issueType}`,
      `📍 Location: ${data.area}, ${data.city}`,
      `⚠️ Severity: ${data.severity}`,
    ].join('\n');

    botSay(lines, 200, () => {
      setTimeout(() => {
        if (onAutoFill) onAutoFill(data);
        botSay("🎉 I've auto-filled the form for you! Verify and submit.", 200);
      }, 800);
    });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const val = input.trim();
    setInput('');
    setShowOptions(null);
    userSay(val);

    if (step === 'welcome' || step === 'oneshot') {
      const parsed = parseMessage(val);
      const merged = { ...formData, ...parsed };
      if (parsed.issueType !== 'Others' || parsed.area) {
        // A present-but-short number would fail at submit time. Keep the
        // citizen in conversation and ask for a correction instead.
        if (!isAcceptablePhone(merged.phone)) {
          setFormData(merged);
          setStep('ask_phone');
          botSay("That phone number looks too short. Please share a valid 10-digit number, or type skip.", 200);
          return;
        }
        setFormData(merged);
        setStep('confirm');
        showSummary(merged);
      } else {
        botSay("I need a few more details. Let's do it step-by-step.", 200, () => {
          setFormData(prev => ({ ...prev, description: val }));
          goToStep('ask_issue', { ...formData, description: val });
        });
      }
      return;
    }

    const skip = val.toLowerCase() === 'skip';

    // A present-but-short number would fail at submit time. Keep the citizen
    // in conversation instead of auto-filling a value known to fail.
    if (step === 'ask_phone' && !skip && !isAcceptablePhone(val)) {
      botSay("That number still looks short. Please check and resend a 10-digit number, or type skip.", 200);
      return;
    }

    switch (step) {
      case 'ask_description':
        const d_desc = { ...formData, description: val };
        setFormData(d_desc);
        goToStep('ask_area', d_desc);
        break;
      case 'ask_area':
        const d_area = { ...formData, area: val };
        setFormData(d_area);
        goToStep('ask_city', d_area);
        break;
      case 'ask_city':
        const d_city = { ...formData, city: val };
        setFormData(d_city);
        goToStep('ask_severity', d_city);
        break;
      case 'ask_name':
        const d_name = { ...formData, fullName: skip ? '' : val };
        setFormData(d_name);
        goToStep('ask_phone', d_name);
        break;
      case 'ask_phone':
        const d_phone = { ...formData, phone: skip ? '' : val };
        setFormData(d_phone);
        goToStep('confirm', d_phone);
        break;
      default:
        break;
    }
  };

  const handleOption = (type, value) => {
    setShowOptions(null);
    if (type === 'start') {
      if (value === 'guided') {
        userSay('Guide me step by step 🪄');
        goToStep('ask_issue');
      } else {
        userSay('I\'ll describe it myself 💬');
        botSay("Sure! Describe the issue, location, and severity in one message.", 200);
        setStep('oneshot');
      }
    } else if (type === 'issue') {
      userSay(`${value.emoji} ${value.label}`);
      const d = { ...formData, issueType: value.label };
      setFormData(d);
      goToStep('ask_description', d);
    } else if (type === 'severity') {
      userSay(`${value.emoji} ${value.label}`);
      const d = { ...formData, severity: value.value };
      setFormData(d);
      goToStep('ask_name', d);
    }
  };

  return (
    <div className="chatbot-container">
      {!isOpen ? (
        <button className="chatbot-toggle-btn" onClick={() => setIsOpen(true)}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <span className="chatbot-toggle-label">CivicFix Assistant</span>
        </button>
      ) : (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span className="chatbot-title">🤖 CivicFix Assistant</span>
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}><X size={20} /></button>
          </div>
          <div className="chatbot-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.sender === 'user' ? 'user' : 'bot'}`}>{m.text}</div>
            ))}
            {isTyping && <div className="chat-bubble bot typing">...</div>}
            {showOptions === 'start' && (
              <div className="quick-options">
                <button className="option-btn" onClick={() => handleOption('start', 'guided')}>Guide me 🪄</button>
                <button className="option-btn" onClick={() => handleOption('start', 'oneshot')}>I'll describe it 💬</button>
              </div>
            )}
            {showOptions === 'issue' && (
              <div className="quick-options grid">
                {ISSUE_OPTIONS.map(o => <button key={o.label} className="option-btn" onClick={() => handleOption('issue', o)}>{o.emoji} {o.label}</button>)}
              </div>
            )}
            {showOptions === 'severity' && (
              <div className="quick-options">
                {SEVERITY_OPTIONS.map(o => <button key={o.value} className="option-btn" onClick={() => handleOption('severity', o)}>{o.emoji} {o.label}</button>)}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input-area">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." />
            <button className="chatbot-send-btn" onClick={handleSend}><Send size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatbot;