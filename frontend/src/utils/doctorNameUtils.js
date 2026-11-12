/**
 * Doctor Name Formatting & Deduplication Utilities
 * Ensures the "Dr." / "డాక్టర్" prefix is never duplicated (e.g. avoiding "Dr. Dr. Rajesh Kumar").
 */

/**
 * Strips any leading doctor prefixes (Dr, Dr., డాక్టర్, డా.) repeatedly
 * and returns the clean personal name.
 * 
 * @param {string} rawName 
 * @returns {string}
 */
export const cleanDoctorName = (rawName) => {
  if (!rawName || typeof rawName !== 'string') return '';
  let clean = rawName.trim();
  
  // Continuously remove leading Dr., Dr, డాక్టర్, డా. prefixes to prevent "Dr. Dr." or "డాక్టర్ Dr."
  const prefixRegex = /^(?:dr\.?|dr\b|డాక్టర్\.?|డా\.)\s*/i;
  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '').trim();
  }
  return clean;
};

/**
 * Formats a doctor's display name with exactly one localized prefix.
 * 
 * @param {string} rawName - Doctor's raw name from DB or Auth
 * @param {string} lang - 'en' | 'te'
 * @param {string} defaultName - fallback if clean name is empty
 * @returns {string} - e.g. "Dr. Rajesh Kumar" or "డాక్టర్ రాజేష్ కుమార్"
 */
export const formatDoctorDisplayName = (rawName, lang = 'en', defaultName = 'Doctor') => {
  const clean = cleanDoctorName(rawName) || defaultName;
  if (lang === 'te') {
    return `డాక్టర్ ${clean}`;
  }
  return `Dr. ${clean}`;
};

/**
 * Generates 2-letter uppercase initials from doctor's name, ignoring "Dr." prefix.
 * 
 * @param {string} rawName 
 * @returns {string} - e.g. "RK" for "Dr. Rajesh Kumar"
 */
export const getDoctorInitials = (rawName) => {
  const clean = cleanDoctorName(rawName);
  if (!clean) return 'DR';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

