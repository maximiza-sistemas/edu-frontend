import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BooksProvider } from './contexts/BooksContext';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';

// Pages
import Login from './pages/Login';
import BookReader from './pages/BookReader';

// Admin Pages
import ManageBooks from './pages/Admin/ManageBooks';
import ManageUsers from './pages/Admin/ManageUsers';
import ManageCurriculum from './pages/Admin/ManageCurriculum';
import ManageSeries from './pages/Admin/ManageSeries';

// Professor Pages
// Professor Pages
import ProfessorMyBooks from './pages/Professor/MyBooks';
import ProfessorStudents from './pages/Professor/Students';

// Student Pages
import StudentLibrary from './pages/Student/MyLibrary';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BooksProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Book Reader - accessible by all authenticated users */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'professor', 'student']} />}>
              <Route path="/reader/:bookId" element={<BookReader />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<MainLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/books" replace />} />
                <Route path="/admin/books" element={<ManageBooks />} />
                <Route path="/admin/users" element={<ManageUsers />} />
                <Route path="/admin/curriculum" element={<ManageCurriculum />} />
                <Route path="/admin/series" element={<ManageSeries />} />
              </Route>
            </Route>

            {/* Professor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['professor']} />}>
              <Route element={<MainLayout />}>
                <Route path="/professor" element={<Navigate to="/professor/my-books" replace />} />
                <Route path="/professor/my-books" element={<ProfessorMyBooks />} />
                <Route path="/professor/students" element={<ProfessorStudents />} />
              </Route>
            </Route>

            {/* Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route element={<MainLayout />}>
                <Route path="/student" element={<Navigate to="/student/library" replace />} />
                <Route path="/student/library" element={<StudentLibrary />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BooksProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
