/**
 * Specialty Mapping Helper
 * Translates clinical specialties into everyday, easy-to-understand layman language with emojis.
 */

export const SPECIALTY_MAP = {
  "Cardiologist": {
    layman: "Heart Care",
    emoji: "❤️",
    color: "#fee2e2",
    textColor: "#991b1b",
    desc: "Chest pain, blood pressure, heart rhythm & cholesterol care"
  },
  "Neurologist": {
    layman: "Brain & Nerves",
    emoji: "🧠",
    color: "#f3e8ff",
    textColor: "#6b21a8",
    desc: "Severe headaches, migraines, stroke, memory & spine nerves"
  },
  "Orthopedic": {
    layman: "Bones & Joints",
    emoji: "🦴",
    color: "#fef3c7",
    textColor: "#92400e",
    desc: "Knee pain, bone fractures, arthritis, back ache & joint surgery"
  },
  "Pediatrician": {
    layman: "Children's Health",
    emoji: "👶",
    color: "#dbeafe",
    textColor: "#1e40af",
    desc: "Newborn care, baby vaccinations, child coughs & growth milestones"
  },
  "Dermatologist": {
    layman: "Skin & Hair",
    emoji: "🧴",
    color: "#fce7f3",
    textColor: "#9d174d",
    desc: "Skin allergies, acne, rashes, hair fall & nail infections"
  },
  "Gynecologist": {
    layman: "Women's Health",
    emoji: "🌸",
    color: "#fae8ff",
    textColor: "#86198f",
    desc: "Pregnancy checkups, fertility, deliveries & women's wellness"
  },
  "ENT Specialist": {
    layman: "Ear, Nose & Throat",
    emoji: "👂",
    color: "#e0e7ff",
    textColor: "#3730a3",
    desc: "Hearing issues, blocked nose, tonsils, sinusitis & sore throat"
  },
  "Dentist": {
    layman: "Dental & Teeth",
    emoji: "🦷",
    color: "#e0f2fe",
    textColor: "#075985",
    desc: "Toothaches, root canals, cleanings, braces & tooth extractions"
  },
  "Ophthalmologist": {
    layman: "Eye Care",
    emoji: "👁️",
    color: "#ccfbf1",
    textColor: "#115e59",
    desc: "Blurry vision, eye testing, cataracts, glasses & dry eyes"
  },
  "Psychiatrist": {
    layman: "Mental Wellness",
    emoji: "😊",
    color: "#fef9c3",
    textColor: "#854d0e",
    desc: "Stress management, anxiety, depression, sleep issues & therapy"
  },
  "General Physician": {
    layman: "General Medicine",
    emoji: "🩺",
    color: "#d1fae5",
    textColor: "#065f46",
    desc: "Fevers, seasonal flu, diabetes, routine checkups & physicals"
  },
  "Gastroenterologist": {
    layman: "Stomach & Digestion",
    emoji: "🍎",
    color: "#ffedd5",
    textColor: "#9a3412",
    desc: "Stomach pain, acidity, gas, constipation & liver health"
  },
  "Urologist": {
    layman: "Kidney & Urinary",
    emoji: "💧",
    color: "#e0f2fe",
    textColor: "#0369a1",
    desc: "Kidney stones, urine infections & prostate treatments"
  },
  "Oncologist": {
    layman: "Cancer Care",
    emoji: "🎗️",
    color: "#fee2e2",
    textColor: "#991b1b",
    desc: "Cancer diagnosis, tumors, chemotherapy & patient support"
  },
  "Pulmonologist": {
    layman: "Lungs & Breathing",
    emoji: "🫁",
    color: "#dbeafe",
    textColor: "#1e3a8a",
    desc: "Asthma, breathing difficulty, persistent cough & chest congestion"
  },
  "Physiotherapist": {
    layman: "Physiotherapy",
    emoji: "🏃",
    color: "#f0fdf4",
    textColor: "#14532d",
    desc: "Muscle pain relief, post-surgery rehabilitation & physical recovery"
  }
};

export const getSpecialtyInfo = (specialtyName) => {
  if (!specialtyName) return { layman: "Specialist", emoji: "🩺", desc: "Expert medical care" };
  
  // Direct match
  if (SPECIALTY_MAP[specialtyName]) {
    return SPECIALTY_MAP[specialtyName];
  }

  // Substring match
  const key = Object.keys(SPECIALTY_MAP).find(k => 
    specialtyName.toLowerCase().includes(k.toLowerCase()) || 
    k.toLowerCase().includes(specialtyName.toLowerCase())
  );

  if (key) return SPECIALTY_MAP[key];

  return {
    layman: specialtyName,
    emoji: "🩺",
    color: "#f1f5f9",
    textColor: "#334155",
    desc: "Specialized clinical diagnosis and treatments"
  };
};
