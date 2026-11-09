import React, { Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';

// Public Pages
import { Home } from './pages/Home';
import { Doctors } from './pages/Doctors';
import { DoctorDetails } from './pages/DoctorDetails';
import { BookAppointment } from './pages/BookAppointment';
import { Hospitals } from './pages/Hospitals';
import { HospitalDetails } from './pages/HospitalDetails';
import { Specializations } from './pages/Specializations';
import { SpecializationDoctors } from './pages/SpecializationDoctors';
import { Emergency } from './pages/Emergency';
import { Ambulance } from './pages/Ambulance';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AcceptInvitation } from './pages/auth/AcceptInvitation';
import { NotFound } from './pages/NotFound';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Hospital Reception / Admin Portal Pages
const ReceptionLayout = React.lazy(() => import('./pages/admin/ReceptionLayout').then(m => ({ default: m.ReceptionLayout })));
const ReceptionDashboard = React.lazy(() => import('./pages/admin/ReceptionDashboard').then(m => ({ default: m.ReceptionDashboard })));
const PatientCheckIn = React.lazy(() => import('./pages/admin/PatientCheckIn').then(m => ({ default: m.PatientCheckIn })));
const ReceptionAppointments = React.lazy(() => import('./pages/admin/ReceptionAppointments').then(m => ({ default: m.ReceptionAppointments })));
const RegisterPatient = React.lazy(() => import('./pages/admin/RegisterPatient').then(m => ({ default: m.RegisterPatient })));
const PatientSearch = React.lazy(() => import('./pages/admin/PatientSearch').then(m => ({ default: m.PatientSearch })));
const DoctorForm = React.lazy(() => import('./pages/admin/DoctorForm').then(m => ({ default: m.DoctorForm })));

// Platform Owner Portal Pages
const OwnerLayout = React.lazy(() => import('./pages/owner/OwnerLayout').then(m => ({ default: m.OwnerLayout })));
const OwnerDashboard = React.lazy(() => import('./pages/owner/OwnerDashboard').then(m => ({ default: m.OwnerDashboard })));
const ManagePlatformHospitals = React.lazy(() => import('./pages/owner/ManagePlatformHospitals').then(m => ({ default: m.ManagePlatformHospitals })));
const ManagePlatformInvitations = React.lazy(() => import('./pages/owner/ManagePlatformInvitations').then(m => ({ default: m.ManagePlatformInvitations })));
const PlatformAuditLogs = React.lazy(() => import('./pages/owner/PlatformAuditLogs').then(m => ({ default: m.PlatformAuditLogs })));

// Hospital Super Admin Portal Pages
const SuperAdminLayout = React.lazy(() => import('./pages/superadmin/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })));
const SuperAdminDashboard = React.lazy(() => import('./pages/superadmin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const ManageHospitalStaff = React.lazy(() => import('./pages/superadmin/ManageHospitalStaff').then(m => ({ default: m.ManageHospitalStaff })));
const HospitalDoctors = React.lazy(() => import('./pages/superadmin/HospitalDoctors').then(m => ({ default: m.HospitalDoctors })));
const HospitalDepartments = React.lazy(() => import('./pages/superadmin/HospitalDepartments').then(m => ({ default: m.HospitalDepartments })));
const SuperAdminAppointments = React.lazy(() => import('./pages/superadmin/SuperAdminAppointments').then(m => ({ default: m.SuperAdminAppointments })));
const SuperAdminReports = React.lazy(() => import('./pages/superadmin/SuperAdminReports').then(m => ({ default: m.SuperAdminReports })));
const SuperAdminAmbulances = React.lazy(() => import('./pages/superadmin/SuperAdminAmbulances').then(m => ({ default: m.SuperAdminAmbulances })));
const HospitalSettings = React.lazy(() => import('./pages/superadmin/HospitalSettings').then(m => ({ default: m.HospitalSettings })));

// Doctor Portal Pages
const DoctorLayout = React.lazy(() => import('./pages/doctor/DoctorLayout').then(m => ({ default: m.DoctorLayout })));
const DoctorDashboard = React.lazy(() => import('./pages/doctor/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const DoctorAppointments = React.lazy(() => import('./pages/doctor/DoctorAppointments').then(m => ({ default: m.DoctorAppointments })));
const DoctorPatients = React.lazy(() => import('./pages/doctor/DoctorPatients').then(m => ({ default: m.DoctorPatients })));
const DoctorSchedule = React.lazy(() => import('./pages/doctor/DoctorSchedule').then(m => ({ default: m.DoctorSchedule })));
const DoctorProfile = React.lazy(() => import('./pages/doctor/DoctorProfile').then(m => ({ default: m.DoctorProfile })));

// Patient Portal Pages
const PatientLayout = React.lazy(() => import('./pages/patient/PatientLayout').then(m => ({ default: m.PatientLayout })));
const PatientDashboard = React.lazy(() => import('./pages/patient/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const PatientAppointments = React.lazy(() => import('./pages/patient/PatientAppointments').then(m => ({ default: m.PatientAppointments })));
const SearchDoctors = React.lazy(() => import('./pages/patient/SearchDoctors').then(m => ({ default: m.SearchDoctors })));
const SearchHospitals = React.lazy(() => import('./pages/patient/SearchHospitals').then(m => ({ default: m.SearchHospitals })));
const PatientMedicalRecords = React.lazy(() => import('./pages/patient/PatientMedicalRecords').then(m => ({ default: m.PatientMedicalRecords })));
const PatientProfile = React.lazy(() => import('./pages/patient/PatientProfile').then(m => ({ default: m.PatientProfile })));

const PortalLoadingFallback = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '0.75rem',
    color: '#0284c7'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid #e0f2fe',
      borderTop: '3px solid #0284c7',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Loading MEDICONNECT...</span>
  </div>
);

export const App = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') ||
                       location.pathname.startsWith('/superadmin') ||
                       location.pathname.startsWith('/owner') ||
                       location.pathname.startsWith('/doctor') ||
                       location.pathname.startsWith('/patient');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />

      {/* Hide public Navbar & Footer on staff & admin portals for clean professional dashboard view */}
      {!isAdminRoute && <Navbar />}

      <div style={{ flexGrow: 1 }}>
        <Suspense fallback={<PortalLoadingFallback />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/accept/:token" element={<AcceptInvitation />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
          <Route path="/invite/:token" element={<AcceptInvitation />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/ambulance" element={<Ambulance />} />
          <Route path="/emergency" element={<Emergency />} />

          {/* Protected Specialist & Healthcare Directory Routes */}
          <Route
            path="/doctors"
            element={
              <ProtectedRoute>
                <Doctors />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctors/:id"
            element={
              <ProtectedRoute>
                <DoctorDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments/book/:doctorId"
            element={
              <ProtectedRoute>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospitals"
            element={
              <ProtectedRoute>
                <Hospitals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospitals/:id"
            element={
              <ProtectedRoute>
                <HospitalDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/specializations"
            element={
              <ProtectedRoute>
                <Specializations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/specializations/:name"
            element={
              <ProtectedRoute>
                <SpecializationDoctors />
              </ProtectedRoute>
            }
          />

          {/* Standalone Add/Edit Doctor (Admin Only) */}
          <Route
            path="/doctors/add"
            element={
              <ProtectedRoute adminOnly={true}>
                <DoctorForm isEdit={false} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctors/edit/:id"
            element={
              <ProtectedRoute adminOnly={true}>
                <DoctorForm isEdit={true} />
              </ProtectedRoute>
            }
          />

          {/* Patient / User Portal Protected Routes */}
          <Route
            path="/patient"
            element={
              <RoleRoute allowedRoles={['PATIENT', 'USER']}>
                <PatientLayout />
              </RoleRoute>
            }
          >
            <Route index element={<PatientDashboard />} />
            <Route path="appointments" element={<PatientAppointments />} />
            <Route path="records" element={<PatientMedicalRecords />} />
            <Route path="medical-records" element={<Navigate to="/patient/records" replace />} />
            <Route path="doctors" element={<SearchDoctors />} />
            <Route path="hospitals" element={<SearchHospitals />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="profile" element={<PatientProfile />} />
          </Route>

          {/* Legacy Routes - Backward Compatibility Redirects */}
          <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/patient" replace /></ProtectedRoute>} />
          <Route path="/appointments" element={<ProtectedRoute><Navigate to="/patient/appointments" replace /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Navigate to="/patient/profile" replace /></ProtectedRoute>} />

          {/* Platform Owner Protected Routes */}
          <Route
            path="/owner"
            element={
              <RoleRoute allowedRoles={['PLATFORM_OWNER']}>
                <OwnerLayout />
              </RoleRoute>
            }
          >
            <Route index element={<OwnerDashboard />} />
            <Route path="hospitals" element={<ManagePlatformHospitals />} />
            <Route path="invitations" element={<ManagePlatformInvitations />} />
            <Route path="audit-logs" element={<PlatformAuditLogs />} />
          </Route>

          {/* Hospital Super Admin Protected Routes */}
          <Route
            path="/superadmin"
            element={
              <RoleRoute allowedRoles={['HOSPITAL_SUPER_ADMIN']} requireHospital={true}>
                <SuperAdminLayout />
              </RoleRoute>
            }
          >
            <Route index element={<SuperAdminDashboard />} />
            <Route path="staff" element={<ManageHospitalStaff />} />
            <Route path="doctors" element={<HospitalDoctors />} />
            <Route path="departments" element={<HospitalDepartments />} />
            <Route path="appointments" element={<SuperAdminAppointments />} />
            <Route path="reports" element={<SuperAdminReports />} />
            <Route path="ambulances" element={<SuperAdminAmbulances />} />
            <Route path="settings" element={<HospitalSettings />} />
          </Route>

          {/* Hospital Admin / Reception Protected Routes */}
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={['RECEPTIONIST']} requireHospital={true}>
                <ReceptionLayout />
              </RoleRoute>
            }
          >
            <Route index element={<ReceptionDashboard />} />
            <Route path="check-in" element={<PatientCheckIn />} />
            <Route path="appointments" element={<ReceptionAppointments />} />
            <Route path="register-patient" element={<RegisterPatient />} />
            <Route path="patients" element={<PatientSearch />} />
          </Route>

          {/* Doctor Protected Routes */}
          <Route
            path="/doctor"
            element={
              <RoleRoute allowedRoles={['DOCTOR']}>
                <DoctorLayout />
              </RoleRoute>
            }
          >
            <Route index element={<DoctorDashboard />} />
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="patients" element={<DoctorPatients />} />
            <Route path="schedule" element={<DoctorSchedule />} />
            <Route path="profile" element={<DoctorProfile />} />
          </Route>

          {/* 404 Pages */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </div>

      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default App;
