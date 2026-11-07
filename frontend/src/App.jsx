import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

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
import { NotFound } from './pages/NotFound';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Patient Protected Pages
import { Appointments } from './pages/Appointments';
import { UserDashboard } from './pages/UserDashboard';
import { Profile } from './pages/Profile';

// Admin Portal Pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageDoctors } from './pages/admin/ManageDoctors';
import { DoctorForm } from './pages/admin/DoctorForm';
import { ManageHospitals } from './pages/admin/ManageHospitals';
import { ManageAppointments } from './pages/admin/ManageAppointments';
import { ManageAmbulances } from './pages/admin/ManageAmbulances';
import { ManageSpecializations } from './pages/admin/ManageSpecializations';
import { ManageUsers } from './pages/admin/ManageUsers';

export const App = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />

      {/* Hide public Navbar & Footer on Admin Portal for clean professional dashboard view */}
      {!isAdminRoute && <Navbar />}

      <div style={{ flexGrow: 1 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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

          {/* Patient Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/appointments" 
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* Admin Protected Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="doctors" element={<ManageDoctors />} />
            <Route path="doctors/add" element={<DoctorForm isEdit={false} />} />
            <Route path="doctors/edit/:id" element={<DoctorForm isEdit={true} />} />
            <Route path="hospitals" element={<ManageHospitals />} />
            <Route path="appointments" element={<ManageAppointments />} />
            <Route path="ambulances" element={<ManageAmbulances />} />
            <Route path="specializations" element={<ManageSpecializations />} />
            <Route path="users" element={<ManageUsers />} />
          </Route>

          {/* 404 Pages */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {!isAdminRoute && <Footer />}
    </div>
  );
};

export default App;
