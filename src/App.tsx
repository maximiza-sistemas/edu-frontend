import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BooksProvider } from './contexts/BooksContext';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';

// Pages
import Login from './pages/Login';
import ContentViewer from './pages/ContentViewer';
import { MATERIAL_SECTIONS, DEFAULT_SECTION } from './utils/materialSections';

// Admin Pages
import ManageBooks from './pages/Admin/ManageBooks';
import ManageUsers from './pages/Admin/ManageUsers';
import ManageCurriculum from './pages/Admin/ManageCurriculum';
import ManageSeries from './pages/Admin/ManageSeries';
import ManageLevels from './pages/Admin/ManageLevels';
import NiveisLibrary from './pages/Niveis/NiveisLibrary';

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

            {/* Material viewer (PDF, video, presentation) - accessible by all authenticated users */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'professor', 'student', 'niveis']} />}>
              <Route path="/reader/:bookId" element={<ContentViewer />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<MainLayout />}>
                <Route path="/admin" element={<Navigate to={`/admin/books/${DEFAULT_SECTION.slug}`} replace />} />
                <Route path="/admin/books" element={<Navigate to={`/admin/books/${DEFAULT_SECTION.slug}`} replace />} />
                {MATERIAL_SECTIONS.map(section => (
                  <Route key={section.slug} path={`/admin/books/${section.slug}`} element={<ManageBooks section={section} />} />
                ))}
                <Route path="/admin/users" element={<ManageUsers />} />
                <Route path="/admin/curriculum" element={<ManageCurriculum />} />
                <Route path="/admin/series" element={<ManageSeries />} />
                <Route path="/admin/levels" element={<ManageLevels />} />
              </Route>
            </Route>

            {/* Professor Routes */}
            <Route element={<ProtectedRoute allowedRoles={['professor']} />}>
              <Route element={<MainLayout />}>
                <Route path="/professor" element={<Navigate to={`/professor/my-books/${DEFAULT_SECTION.slug}`} replace />} />
                <Route path="/professor/my-books" element={<Navigate to={`/professor/my-books/${DEFAULT_SECTION.slug}`} replace />} />
                {MATERIAL_SECTIONS.map(section => (
                  <Route key={section.slug} path={`/professor/my-books/${section.slug}`} element={<ProfessorMyBooks section={section} />} />
                ))}
                <Route path="/professor/students" element={<ProfessorStudents />} />
              </Route>
            </Route>

            {/* Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route element={<MainLayout />}>
                <Route path="/student" element={<Navigate to={`/student/library/${DEFAULT_SECTION.slug}`} replace />} />
                <Route path="/student/library" element={<Navigate to={`/student/library/${DEFAULT_SECTION.slug}`} replace />} />
                {MATERIAL_SECTIONS.map(section => (
                  <Route key={section.slug} path={`/student/library/${section.slug}`} element={<StudentLibrary section={section} />} />
                ))}
              </Route>
            </Route>

            {/* Níveis Routes */}
            <Route element={<ProtectedRoute allowedRoles={['niveis']} />}>
              <Route element={<MainLayout />}>
                <Route path="/niveis" element={<Navigate to={`/niveis/library/${DEFAULT_SECTION.slug}`} replace />} />
                <Route path="/niveis/library" element={<Navigate to={`/niveis/library/${DEFAULT_SECTION.slug}`} replace />} />
                {MATERIAL_SECTIONS.map(section => (
                  <Route key={section.slug} path={`/niveis/library/${section.slug}`} element={<NiveisLibrary section={section} />} />
                ))}
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
