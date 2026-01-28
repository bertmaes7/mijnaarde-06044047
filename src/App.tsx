import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import ChangePassword from "./pages/ChangePassword";
import MemberPortal from "./pages/MemberPortal";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import MemberDetail from "./pages/MemberDetail";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Finance from "./pages/Finance";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Invoices from "./pages/Invoices";
import OrganizationSettings from "./pages/OrganizationSettings";
import MailingTemplates from "./pages/MailingTemplates";
import Mailings from "./pages/Mailings";
import Events from "./pages/Events";
import EventRegistrations from "./pages/EventRegistrations";
import PublicEvent from "./pages/PublicEvent";
import Tools from "./pages/Tools";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/events/:id" element={<PublicEvent />} />
            {/* Member portal (logged in members) */}
            <Route
              path="/member"
              element={
                <ProtectedRoute>
                  <MemberPortal />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute requireAdmin>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute requireAdmin>
                  <Members />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <MemberDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies"
              element={
                <ProtectedRoute requireAdmin>
                  <Companies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companies/:id"
              element={
                <ProtectedRoute requireAdmin>
                  <CompanyDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute requireAdmin>
                  <Finance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/income"
              element={
                <ProtectedRoute requireAdmin>
                  <Income />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/expenses"
              element={
                <ProtectedRoute requireAdmin>
                  <Expenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/invoices"
              element={
                <ProtectedRoute requireAdmin>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mailing"
              element={
                <ProtectedRoute requireAdmin>
                  <Mailings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mailing/templates"
              element={
                <ProtectedRoute requireAdmin>
                  <MailingTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mailing/templates"
              element={
                <ProtectedRoute requireAdmin>
                  <MailingTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute requireAdmin>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id/registrations"
              element={
                <ProtectedRoute requireAdmin>
                  <EventRegistrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools"
              element={
                <ProtectedRoute requireAdmin>
                  <Tools />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tools/organization"
              element={
                <ProtectedRoute requireAdmin>
                  <OrganizationSettings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
