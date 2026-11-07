-- ==========================================================
-- Doctor & Hospital Management System Database Schema
-- Database: MySQL 8.0+
-- Relational Design with Foreign Keys, Indexes & Seed Data
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `doctor_hospital_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `doctor_hospital_db`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `ambulance_requests`;
DROP TABLE IF EXISTS `ambulances`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `doctors`;
DROP TABLE IF EXISTS `hospitals`;
DROP TABLE IF EXISTS `specializations`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(25) NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  `avatar` VARCHAR(255) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: specializations
-- --------------------------------------------------------
CREATE TABLE `specializations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `icon` VARCHAR(50) DEFAULT 'FaStethoscope',
  `image` VARCHAR(255) NULL,
  INDEX `idx_spec_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: hospitals
-- --------------------------------------------------------
CREATE TABLE `hospitals` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL UNIQUE,
  `image` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(120) NULL,
  `emergency_number` VARCHAR(30) NOT NULL,
  `facilities` TEXT NULL,
  `working_hours` VARCHAR(100) DEFAULT '24 Hours / 7 Days',
  `rating` FLOAT DEFAULT 4.8,
  `total_reviews` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_hospital_city` (`city`),
  INDEX `idx_hospital_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: doctors
-- --------------------------------------------------------
CREATE TABLE `doctors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `gender` VARCHAR(20) DEFAULT 'Not Specified',
  `image` VARCHAR(255) NOT NULL,
  `qualification` VARCHAR(150) NOT NULL,
  `experience` INT NOT NULL DEFAULT 1,
  `specialization_id` INT NOT NULL,
  `hospital_id` INT NOT NULL,
  `location` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(120) NULL,
  `consultation_fee` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  `available_days` VARCHAR(100) DEFAULT 'Monday - Saturday',
  `available_time` VARCHAR(100) DEFAULT '09:00 AM - 05:00 PM',
  `languages` VARCHAR(150) DEFAULT 'English, Hindi',
  `about` TEXT NULL,
  `consultation_type` VARCHAR(50) DEFAULT 'In-Person & Video',
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `rating` FLOAT DEFAULT 4.9,
  `total_reviews` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_doctors_specialization` (`specialization_id`),
  INDEX `idx_doctors_hospital` (`hospital_id`),
  INDEX `idx_doctors_location` (`location`),
  INDEX `idx_doctors_status` (`status`),
  CONSTRAINT `fk_doctors_spec` FOREIGN KEY (`specialization_id`) REFERENCES `specializations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_doctors_hosp` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: appointments
-- --------------------------------------------------------
CREATE TABLE `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `hospital_id` INT NOT NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` VARCHAR(30) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  `active_slot_key` VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN `status` IN ('Pending', 'Confirmed') THEN CONCAT(`doctor_id`, '_', `appointment_date`, '_', `appointment_time`) ELSE NULL END) STORED,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_appointments_user` (`user_id`),
  INDEX `idx_appointments_doctor` (`doctor_id`),
  INDEX `idx_appointments_status` (`status`),
  UNIQUE KEY `uq_active_doctor_slot` (`active_slot_key`),
  CONSTRAINT `fk_appts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_appts_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_appts_hosp` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: ambulances
-- --------------------------------------------------------
CREATE TABLE `ambulances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vehicle_number` VARCHAR(50) NOT NULL UNIQUE,
  `driver_name` VARCHAR(100) NOT NULL,
  `driver_phone` VARCHAR(30) NOT NULL,
  `ambulance_type` ENUM('Basic Life Support', 'Advanced Life Support', 'ICU Ambulance', 'Patient Transport') NOT NULL DEFAULT 'Basic Life Support',
  `current_location` VARCHAR(150) NOT NULL,
  `status` ENUM('Available', 'On Duty', 'Maintenance') NOT NULL DEFAULT 'Available',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ambulances_status` (`status`),
  CONSTRAINT `chk_ambulance_status` CHECK (`status` IN ('Available', 'On Duty', 'Maintenance'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: ambulance_requests
-- --------------------------------------------------------
CREATE TABLE `ambulance_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `idempotency_key` VARCHAR(64) NULL UNIQUE,
  `user_id` INT NULL,
  `patient_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `emergency_type` VARCHAR(100) NOT NULL,
  `pickup_location` VARCHAR(255) NOT NULL,
  `destination_hospital` VARCHAR(150) NOT NULL,
  `patients_count` INT NOT NULL DEFAULT 1,
  `additional_info` TEXT NULL,
  `status` ENUM('Pending', 'Dispatched', 'Arrived', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `assigned_ambulance_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_requests_status` (`status`),
  CONSTRAINT `chk_ambulance_request_status` CHECK (`status` IN ('Pending', 'Dispatched', 'Arrived', 'Completed', 'Cancelled')),
  CONSTRAINT `fk_req_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_req_amb` FOREIGN KEY (`assigned_ambulance_id`) REFERENCES `ambulances` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: reviews
-- --------------------------------------------------------
CREATE TABLE `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `appointment_id` INT NULL,
  `rating` INT NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `comment` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reviews_doctor` (`doctor_id`),
  UNIQUE KEY `uq_review_appointment` (`appointment_id`),
  CONSTRAINT `fk_rev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rev_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rev_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: favorites
-- --------------------------------------------------------
CREATE TABLE `favorites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `doctor_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_user_doctor_fav` (`user_id`, `doctor_id`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fav_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- SEED DATA
-- ==========================================================

-- 1. Users (Admin password: Admin@123, Patient: Patient@123, Sarah: Sarah@123)
-- PBKDF2:SHA256 Hashes generated via Werkzeug security
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `role`, `avatar`) VALUES
(1, 'Super Administrator', 'admin@medicare.com', '+91 98765 43210', 'scrypt:32768:8:1$hUa71rQ6q87Dk98a$9f4bb59a35e751ebccb9dae3c03ecb8e8f81a704f05a5a1e7b6d13ff03ba24227fca24ca86057a66fbc0ee7bb32057d36372ec0b457e5e33d069b09945a0bca2', 'ADMIN', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'),
(2, 'Rahul Sharma', 'patient@medicare.com', '+91 91234 56789', 'scrypt:32768:8:1$kF98sa0jkaL2k1la$aa27453f684826b527878d6b677a2818151240212f861e6871a2a4b8ec8095ca1d0b7d78a83424164b38d3fe7c9a419266a26df0eb82643a68285514fbf82da3', 'USER', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80'),
(3, 'Sarah Jenkins', 'sarah@medicare.com', '+91 99887 76655', 'scrypt:32768:8:1$bC984akm98124bha$ec113a7c667083040e6ce78d8a7c18171120401a8848128414981881881729012a90184819481948194819481948194819481948194819481948194819481948', 'USER', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80');

-- 2. Specializations (20 items)
INSERT INTO `specializations` (`id`, `name`, `slug`, `description`, `icon`, `image`) VALUES
(1, 'Cardiologist', 'cardiologist', 'Specialists in diagnosing and treating heart, blood vessel, and cardiovascular disorders.', 'FaHeartbeat', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500&auto=format&fit=crop&q=80'),
(2, 'Neurologist', 'neurologist', 'Expert care for brain, spinal cord, nerves, and neurological conditions.', 'FaBrain', 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500&auto=format&fit=crop&q=80'),
(3, 'Orthopedic', 'orthopedic', 'Comprehensive bone, joint, ligament, and musculoskeletal surgical care.', 'FaBone', 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&auto=format&fit=crop&q=80'),
(4, 'Dermatologist', 'dermatologist', 'Specialized skin, hair, nail treatments, and advanced cosmetic dermatology.', 'FaSpa', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&auto=format&fit=crop&q=80'),
(5, 'Pediatrician', 'pediatrician', 'Compassionate pediatric healthcare, child immunization, and newborn care.', 'FaBaby', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&auto=format&fit=crop&q=80'),
(6, 'Gynecologist', 'gynecologist', 'Womens reproductive health, obstetric care, maternity, and prenatal guidance.', 'FaFemale', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&auto=format&fit=crop&q=80'),
(7, 'ENT Specialist', 'ent-specialist', 'Ear, nose, throat, sinuses, and head & neck medical/surgical treatments.', 'FaHeadSideCough', 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500&auto=format&fit=crop&q=80'),
(8, 'Dentist', 'dentist', 'Preventative dental health, root canals, oral surgery, and smile aesthetics.', 'FaTooth', 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500&auto=format&fit=crop&q=80'),
(9, 'Ophthalmologist', 'ophthalmologist', 'Eye examinations, cataract surgery, glaucoma therapy, and vision care.', 'FaEye', 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=500&auto=format&fit=crop&q=80'),
(10, 'Psychiatrist', 'psychiatrist', 'Mental wellness, therapy, behavioral health, and psychiatric counseling.', 'FaSmileBeam', 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=500&auto=format&fit=crop&q=80'),
(11, 'General Physician', 'general-physician', 'Primary preventive healthcare, general medical diagnosis, and routine wellness.', 'FaUserMd', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80'),
(12, 'Gastroenterologist', 'gastroenterologist', 'Digestive system disorders, liver care, endoscopy, and stomach treatments.', 'FaProcedures', 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=500&auto=format&fit=crop&q=80'),
(13, 'Urologist', 'urologist', 'Urinary tract, kidney stone therapy, and male reproductive health.', 'FaSyringe', 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80'),
(14, 'Oncologist', 'oncologist', 'Comprehensive cancer diagnosis, chemotherapy, surgical oncology, and care.', 'FaRibbon', 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&auto=format&fit=crop&q=80'),
(15, 'Pulmonologist', 'pulmonologist', 'Respiratory care, asthma, COPD, lung infection management, and critical care.', 'FaLungs', 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=500&auto=format&fit=crop&q=80'),
(16, 'Nephrologist', 'nephrologist', 'Kidney diseases, dialysis supervision, hypertension, and renal transplantation.', 'FaFilter', 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=500&auto=format&fit=crop&q=80'),
(17, 'Endocrinologist', 'endocrinologist', 'Hormonal imbalances, diabetes management, thyroid disorders, and metabolism.', 'FaCapsules', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'),
(18, 'Radiologist', 'radiologist', 'Diagnostic medical imaging, MRI, CT scans, ultrasound, and X-ray interpretation.', 'FaXRay', 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&auto=format&fit=crop&q=80'),
(19, 'General Surgeon', 'general-surgeon', 'Abdominal surgery, minimally invasive laparoscopy, trauma, and hernia repair.', 'FaCut', 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=500&auto=format&fit=crop&q=80'),
(20, 'Physiotherapist', 'physiotherapist', 'Physical rehabilitation, mobility restoration, sports injury, and post-surgery therapy.', 'FaRunning', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&auto=format&fit=crop&q=80');

-- 3. Hospitals (6 Major Hospitals)
INSERT INTO `hospitals` (`id`, `name`, `slug`, `image`, `address`, `city`, `state`, `phone`, `email`, `emergency_number`, `facilities`, `working_hours`, `rating`, `total_reviews`) VALUES
(1, 'Apollo Hospitals', 'apollo-hospitals-visakhapatnam', 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80', 'Health City, Arilova, Chinagadila', 'Visakhapatnam', 'Andhra Pradesh', '+91 891 272 7272', 'info_vizag@apollohospitals.com', '+91 891 1066', '24/7 Emergency, Cardiac Catheterization Lab, Modern ICU, Advanced Radiology, Dialysis Unit, Helipad Ambulance', '24 Hours / 7 Days', 4.9, 340),
(2, 'Fortis Escorts Hospital', 'fortis-hospital-delhi', 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80', 'Okhla Road, Sukhdev Vihar Metro Station', 'New Delhi', 'Delhi NCR', '+91 11 4713 5000', 'contactus.delhi@fortishealthcare.com', '+91 11 105010', 'Advanced Heart Institute, 24x7 Stroke Unit, Robotic Surgery, Level-1 Trauma Care, Blood Bank, Pharmacy', '24 Hours / 7 Days', 4.8, 412),
(3, 'Manipal Super Speciality Hospital', 'manipal-hospital-bengaluru', 'https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=800&auto=format&fit=crop&q=80', '98, HAL Old Airport Road, Kodihalli', 'Bengaluru', 'Karnataka', '+91 80 2502 4444', 'info@manipalhospitals.com', '+91 80 2526 6666', 'Comprehensive Cancer Center, Organ Transplant Wing, Pediatric ICU, 24/7 Trauma, Advanced Neuro-Navigation', '24 Hours / 7 Days', 4.9, 520),
(4, 'Max Super Speciality Hospital', 'max-hospital-mumbai', 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80', '1, 2, Press Enclave Marg, Saket District Centre', 'Mumbai', 'Maharashtra', '+91 22 2655 5555', 'mumbai@maxhealthcare.com', '+91 22 4055 4055', 'Critical Care Unit, Comprehensive Maternity, Linear Accelerator, Neonatal ICU, Digital Pathology', '24 Hours / 7 Days', 4.7, 290),
(5, 'AIIMS Multi-Speciality Medical Center', 'aiims-hospital-delhi', 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80', 'Sri Aurobindo Marg, Ansari Nagar', 'New Delhi', 'Delhi', '+91 11 2658 8500', 'care@aiims.edu', '+91 11 2659 3444', 'National Referral Center, Super-Speciality Surgeries, High Dependency Units, Research Diagnostics, 24/7 Ambulance', '24 Hours / 7 Days', 4.9, 890),
(6, 'Care Hospitals', 'care-hospitals-hyderabad', 'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&auto=format&fit=crop&q=80', 'Road No. 1, Banjara Hills', 'Hyderabad', 'Telangana', '+91 40 6165 6565', 'care.banjara@carehospitals.com', '+91 40 105711', 'Cardio-Thoracic Surgery, Minimally Invasive Surgery, Emergency Cath Lab, Bone Marrow Transplant, 24/7 Pharmacy', '24 Hours / 7 Days', 4.8, 310);

-- 4. Doctors (14 Clinical Specialists)
INSERT INTO `doctors` (`id`, `name`, `gender`, `image`, `qualification`, `experience`, `specialization_id`, `hospital_id`, `location`, `phone`, `email`, `consultation_fee`, `available_days`, `available_time`, `languages`, `about`, `consultation_type`, `status`, `rating`, `total_reviews`) VALUES
(1, 'Dr. Rajesh Kumar', 'Male', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Internal Medicine), DM (Cardiology)', 14, 1, 1, 'Visakhapatnam', '+91 891 2233 441', 'dr.rajesh.kumar@apollohospitals.com', 800.00, 'Monday - Saturday', '09:00 AM - 01:00 PM, 05:00 PM - 08:00 PM', 'English, Telugu, Hindi', 'Dr. Rajesh Kumar is a Senior Interventional Cardiologist with over 14 years of clinical excellence. He has performed more than 4,500 coronary angiographies and angioplasties with special focus on primary angioplasty in acute myocardial infarction and pacemaker implantation.', 'In-Person & Video', 'Active', 4.9, 128),
(2, 'Dr. Ananya Sen', 'Female', 'https://images.unsplash.com/photo-1594824813576-a21235122709?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Medicine), DM (Neurology), FINR', 11, 2, 2, 'New Delhi', '+91 11 4455 6677', 'dr.ananya.sen@fortishealthcare.com', 900.00, 'Monday - Friday', '10:00 AM - 04:00 PM', 'English, Hindi, Bengali', 'Dr. Ananya Sen is a leading Neurologist specializing in comprehensive stroke management, epilepsy management, neuromuscular disorders, Parkinsons disease, and neuro-critical care.', 'In-Person & Video', 'Active', 4.8, 95),
(3, 'Dr. Vikramaditya Rao', 'Male', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&auto=format&fit=crop&q=80', 'MBBS, MS (Orthopedics), MCh (Ortho - UK)', 16, 3, 3, 'Bengaluru', '+91 80 4321 8899', 'dr.vikram.rao@manipalhospitals.com', 850.00, 'Monday - Saturday', '09:30 AM - 02:00 PM', 'English, Kannada, Telugu, Hindi', 'Dr. Vikramaditya Rao has over 16 years of expertise in robotic joint replacements, computer-assisted knee & hip arthroplasty, complex trauma management, and sports medicine arthroscopy.', 'In-Person & Video', 'Active', 4.9, 164),
(4, 'Dr. Priya Nair', 'Female', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Dermatology, Venereology & Leprosy)', 9, 4, 4, 'Mumbai', '+91 22 3344 5566', 'dr.priya.nair@maxhealthcare.com', 700.00, 'Tuesday - Sunday', '11:00 AM - 06:00 PM', 'English, Hindi, Malayalam, Marathi', 'Dr. Priya Nair is a celebrated consultant dermatologist with advanced training in laser therapy, clinical dermatology, hair loss therapies, and scar revision procedures.', 'In-Person & Video', 'Active', 4.8, 84),
(5, 'Dr. Amitav Ghosh', 'Male', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Pediatrics), DNB (Pediatrics)', 12, 5, 5, 'New Delhi', '+91 11 8899 7766', 'dr.amitav.ghosh@aiims.edu', 600.00, 'Monday - Friday', '08:30 AM - 01:30 PM', 'English, Hindi, Bengali', 'Dr. Amitav Ghosh is a dedicated pediatrician focused on newborn care, neonatal resuscitation, developmental milestones, childhood asthma, and preventive pediatric vaccinations.', 'In-Person', 'Active', 4.9, 110),
(6, 'Dr. Sunita Mehra', 'Female', 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=600&auto=format&fit=crop&q=80', 'MBBS, MS (Obstetrics & Gynecology), FMAS', 15, 6, 6, 'Hyderabad', '+91 40 5566 7788', 'dr.sunita.mehra@carehospitals.com', 750.00, 'Monday - Saturday', '09:00 AM - 03:00 PM', 'English, Telugu, Hindi, Urdu', 'Dr. Sunita Mehra is an expert gynecologist, high-risk pregnancy specialist, and laparoscopic surgeon with over 15 years handling painless deliveries and reproductive wellness.', 'In-Person & Video', 'Active', 4.9, 142),
(7, 'Dr. Arvind Swamy', 'Male', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=600&auto=format&fit=crop&q=80', 'MBBS, MS (ENT), DLO', 10, 7, 1, 'Visakhapatnam', '+91 891 4455 112', 'dr.arvind.swamy@apollohospitals.com', 650.00, 'Monday - Saturday', '10:00 AM - 02:00 PM, 04:00 PM - 07:00 PM', 'English, Telugu, Hindi', 'Dr. Arvind Swamy specializes in microscopic ear surgeries, endoscopic sinus surgeries (FESS), snoring and sleep apnea treatments, and pediatric ENT care.', 'In-Person', 'Active', 4.7, 72),
(8, 'Dr. Meenakshi Sundaram', 'Female', 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80', 'BDS, MDS (Conservative Dentistry & Endodontics)', 8, 8, 3, 'Bengaluru', '+91 80 6677 8811', 'dr.meenakshi@manipalhospitals.com', 500.00, 'Monday - Friday', '09:00 AM - 05:00 PM', 'English, Kannada, Tamil, Hindi', 'Dr. Meenakshi Sundaram is an experienced dental surgeon specializing in pain-free single-sitting root canals, cosmetic smile designing, dental crowns, and teeth whitening.', 'In-Person', 'Active', 4.8, 65),
(9, 'Dr. Farhan Akhtar', 'Male', 'https://images.unsplash.com/photo-1536064479547-7ee40b74b807?w=600&auto=format&fit=crop&q=80', 'MBBS, MS (Ophthalmology), FICO (UK)', 13, 9, 2, 'New Delhi', '+91 11 9900 1122', 'dr.farhan@fortishealthcare.com', 750.00, 'Tuesday - Saturday', '10:00 AM - 04:00 PM', 'English, Hindi, Urdu', 'Dr. Farhan Akhtar is a renowned eye specialist with over 13 years of expertise in robotic blade-free LASIK, micro-incision cataract surgery (MICS), and diabetic retinopathy.', 'In-Person', 'Active', 4.9, 98),
(10, 'Dr. Shalini Verma', 'Female', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Psychiatry)', 10, 10, 4, 'Mumbai', '+91 22 8899 4433', 'dr.shalini.verma@maxhealthcare.com', 900.00, 'Monday - Friday', '11:00 AM - 05:00 PM', 'English, Hindi, Marathi', 'Dr. Shalini Verma is a compassionate psychiatrist dealing with stress management, anxiety disorders, depression therapy, insomnia, and cognitive behavioral psychotherapy.', 'In-Person & Video', 'Active', 4.8, 76),
(11, 'Dr. Suresh Varma', 'Male', 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (General Medicine)', 18, 11, 1, 'Visakhapatnam', '+91 891 9988 771', 'dr.suresh.varma@apollohospitals.com', 500.00, 'Monday - Saturday', '08:00 AM - 12:00 PM, 04:00 PM - 08:00 PM', 'English, Telugu, Hindi', 'Dr. Suresh Varma brings 18 years of comprehensive clinical diagnosis in diabetes management, hypertension, seasonal infectious fevers, thyroid disease, and elder care.', 'In-Person & Video', 'Active', 4.9, 210),
(12, 'Dr. Deepa Chawla', 'Female', 'https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Medicine), DM (Medical Gastroenterology)', 12, 12, 6, 'Hyderabad', '+91 40 4433 2211', 'dr.deepa.chawla@carehospitals.com', 850.00, 'Monday - Friday', '09:30 AM - 03:30 PM', 'English, Telugu, Hindi', 'Dr. Deepa Chawla is a senior gastroenterologist specializing in therapeutic endoscopy, fatty liver disease, irritable bowel syndrome (IBS), acidity, and pancreas disorders.', 'In-Person & Video', 'Active', 4.8, 88),
(13, 'Dr. K. Ramanathan', 'Male', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Medicine), DM (Medical Oncology), ECMO', 20, 14, 5, 'New Delhi', '+91 11 3322 1100', 'dr.k.ramanathan@aiims.edu', 1200.00, 'Monday, Wednesday, Friday', '09:00 AM - 02:00 PM', 'English, Tamil, Hindi', 'Dr. K. Ramanathan has two decades of distinguished medical oncology leadership in targeted immunotherapy, precision cancer therapeutics, breast and lung oncology.', 'In-Person & Video', 'Active', 4.9, 175),
(14, 'Dr. Nidhi Bansal', 'Female', 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=600&auto=format&fit=crop&q=80', 'MBBS, MD (Pulmonary Medicine), FACP', 11, 15, 2, 'New Delhi', '+91 11 5544 3322', 'dr.nidhi.bansal@fortishealthcare.com', 800.00, 'Tuesday - Saturday', '10:00 AM - 04:00 PM', 'English, Hindi, Punjabi', 'Dr. Nidhi Bansal is an acclaimed pulmonologist specializing in chronic obstructive pulmonary disease (COPD), bronchial asthma, sleep apnea, post-viral respiratory fibrosis, and allergy care.', 'In-Person & Video', 'Active', 4.8, 92);

-- 5. Ambulances (6 Emergency Vehicles)
INSERT INTO `ambulances` (`id`, `vehicle_number`, `driver_name`, `driver_phone`, `ambulance_type`, `current_location`, `status`) VALUES
(1, 'AP31-AB-1080', 'Ramesh Babu', '+91 94401 23456', 'Basic Life Support', 'Health City, Visakhapatnam', 'Available'),
(2, 'AP31-EM-2020', 'Satish Kumar', '+91 94402 34567', 'Advanced Life Support', 'Gajuwaka Junction, Visakhapatnam', 'Available'),
(3, 'DL01-ICU-9901', 'Harish Singh', '+91 98110 98765', 'ICU Ambulance', 'Okhla Phase 3, New Delhi', 'Available'),
(4, 'KA03-EM-4500', 'Manjunath K', '+91 98450 11223', 'Advanced Life Support', 'Indiranagar, Bengaluru', 'On Duty'),
(5, 'MH02-BLS-7788', 'Dilip Patil', '+91 98200 44556', 'Basic Life Support', 'Bandra West, Mumbai', 'Available'),
(6, 'TS09-ICU-1122', 'Mohammed Raheem', '+91 98490 66778', 'ICU Ambulance', 'Banjara Hills, Hyderabad', 'Available');

-- 6. Sample Appointments
INSERT INTO `appointments` (`id`, `user_id`, `doctor_id`, `hospital_id`, `appointment_date`, `appointment_time`, `reason`, `status`, `notes`) VALUES
(1, 2, 1, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:30 AM', 'Routine cardiovascular health checkup and hypertension review.', 'Confirmed', 'Please carry recent ECG and blood test reports.'),
(2, 2, 2, 2, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '11:30 AM', 'Frequent migraine episodes and tension headaches.', 'Pending', ''),
(3, 2, 11, 1, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '04:30 PM', 'Annual physical examination and fasting lipid profile.', 'Completed', 'Patient advised mild cardio exercises and dietary modifications.');

-- 7. Reviews
INSERT INTO `reviews` (`id`, `user_id`, `doctor_id`, `rating`, `comment`) VALUES
(1, 2, 1, 5, 'Dr. Rajesh Kumar was exceptionally patient and thorough. He explained the cardiac angiography report clearly and relieved all my worries!'),
(2, 3, 1, 5, 'Very polite, highly skilled doctor and outstanding medical facility at Apollo. Zero waiting time with online booking.'),
(3, 2, 2, 5, 'Dr. Ananya Sen solved my recurring migraine issues within 2 weeks. Very knowledgeable neurologist.');

-- 8. Ambulance Request
INSERT INTO `ambulance_requests` (`id`, `user_id`, `patient_name`, `phone`, `emergency_type`, `pickup_location`, `destination_hospital`, `patients_count`, `additional_info`, `status`, `assigned_ambulance_id`) VALUES
(1, 2, 'Venkatesh Rao', '+91 94403 99887', 'Heart Emergency', 'Flat 302, Green Meadows, Siripuram, Visakhapatnam', 'Apollo Hospitals, Health City', 1, 'Patient experiencing severe sudden chest pain and shortness of breath.', 'Dispatched', 4);
