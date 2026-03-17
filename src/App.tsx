import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import Stock from "./pages/Stock";
import Reservations from "./pages/Reservations";
import Sales from "./pages/Sales";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import AdminCatalogs from "./pages/admin/AdminCatalogs";
import ClientCatalogs from "./pages/client/ClientCatalogs";
import ClientCatalogDetails from "./pages/client/ClientCatalogDetails";
import ClientCheckout from "./pages/client/ClientCheckout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeInitializer />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
              <Route path="/dashboard/products/:id" element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
              <Route path="/dashboard/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/dashboard/customers/:id" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />
              <Route path="/dashboard/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
              <Route path="/dashboard/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
              <Route path="/dashboard/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/dashboard/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/dashboard/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/dashboard/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
              <Route path="/admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
              <Route path="/admin/stores" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
              <Route path="/admin/users" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
              <Route path="/admin/catalogs" element={<SuperAdminRoute><AdminCatalogs /></SuperAdminRoute>} />
              {/* Portal do Cliente */}
              <Route path="/client/catalogs" element={<ProtectedRoute><ClientCatalogs /></ProtectedRoute>} />
              <Route path="/client/catalogs/:id" element={<ProtectedRoute><ClientCatalogDetails /></ProtectedRoute>} />
              <Route path="/client/checkout" element={<ProtectedRoute><ClientCheckout /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
