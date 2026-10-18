import { Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Landing from './pages/public/Landing';
import NotFound from './pages/public/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import Attendance from './pages/admin/Attendance';
import Exercises from './pages/admin/Exercises';
import MemberDetail from './pages/admin/MemberDetail';
import Members from './pages/admin/Members';
import Memberships from './pages/admin/Memberships';
import Payments from './pages/admin/Payments';
import Plans from './pages/admin/Plans';
import Trainers from './pages/admin/Trainers';
import WorkoutDetail from './pages/admin/WorkoutDetail';
import Workouts from './pages/admin/Workouts';
import MemberDashboard from './pages/member/MemberDashboard';
import MyAttendance from './pages/member/MyAttendance';
import MyMembership from './pages/member/MyMembership';
import MyWorkouts from './pages/member/MyWorkouts';
import Profile from './pages/member/Profile';

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/memberships', label: 'Memberships' },
  { to: '/admin/payments', label: 'Payments' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/trainers', label: 'Trainers' },
  { to: '/admin/plans', label: 'Plans' },
  { to: '/admin/exercises', label: 'Exercises' },
  { to: '/admin/workouts', label: 'Workout plans' },
];

const MEMBER_NAV = [
  { to: '/member', label: 'Dashboard', end: true },
  { to: '/member/membership', label: 'Membership' },
  { to: '/member/workouts', label: 'My workouts' },
  { to: '/member/attendance', label: 'Attendance' },
  { to: '/member/profile', label: 'Profile' },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route path="/admin" element={<DashboardLayout nav={ADMIN_NAV} area="Staff area" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="memberships" element={<Memberships />} />
          <Route path="payments" element={<Payments />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="trainers" element={<Trainers />} />
          <Route path="plans" element={<Plans />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="workouts/:id" element={<WorkoutDetail />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="MEMBER" />}>
        <Route path="/member" element={<DashboardLayout nav={MEMBER_NAV} area="Member area" />}>
          <Route index element={<MemberDashboard />} />
          <Route path="membership" element={<MyMembership />} />
          <Route path="workouts" element={<MyWorkouts />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
