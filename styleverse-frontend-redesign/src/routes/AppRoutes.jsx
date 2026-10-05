import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   CUSTOMER PAGES
========================================================= */

import Home from "../pages/Home";
import Shop from "../pages/Shop";
import ProductDetail from "../pages/ProductDetail";
import Cart from "../pages/Cart";
import Wishlist from "../pages/Wishlist";
import Checkout from "../pages/Checkout";
import Orders from "../pages/Orders";
import OrderDetail from "../pages/OrderDetail";
import Profile from "../pages/Profile";
import Studio from "../pages/Studio";
import Builder from "../pages/Builder";
import SharedOutfit from "../pages/SharedOutfit";
import InfoPage from "../pages/InfoPage";

/* =========================================================
   AUTH PAGES
========================================================= */

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";

/* =========================================================
   ADMIN PAGES
========================================================= */

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminProducts from "../pages/admin/AdminProducts";
import AdminProductForm from "../pages/admin/AdminProductForm";
import AdminOrders from "../pages/admin/AdminOrders";
import AdminUsers from "../pages/admin/AdminUsers";
import AdminCoupons from "../pages/admin/AdminCoupons";
import AdminReports from "../pages/admin/AdminReports";

/* =========================================================
   PROTECTED ROUTE
========================================================= */

function ProtectedRoute({ children }) {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  const location = useLocation();

  /* -------------------------------------------------------
     AUTH CHECK LOADING
  ------------------------------------------------------- */

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f1ea] px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#d9cec4] border-t-[#6f5763]" />

          <p className="mt-4 text-sm font-medium text-[#6f645c]">
            Checking your account...
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     NOT LOGGED IN
  ------------------------------------------------------- */

  if (!isAuthenticated) {
    const returnPath =
      location.pathname +
      location.search +
      location.hash;

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: returnPath,
        }}
      />
    );
  }

  return children;
}

/* =========================================================
   ADMIN ROUTE
========================================================= */

function AdminRoute({ children }) {
  const {
    user,
    isAuthenticated,
    loading,
  } = useAuth();

  /* -------------------------------------------------------
     AUTH CHECK LOADING
  ------------------------------------------------------- */

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f1ea] px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#d9cec4] border-t-[#6f5763]" />

          <p className="mt-4 text-sm font-medium text-[#6f645c]">
            Verifying administrator access...
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     NOT AUTHENTICATED
  ------------------------------------------------------- */

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  /* -------------------------------------------------------
     ADMIN ROLE CHECK
  ------------------------------------------------------- */

  if (user?.role !== "admin") {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
}

/* =========================================================
   APP ROUTES
========================================================= */

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =================================================
            NORMAL STORE
        ================================================== */}

        <Route element={<MainLayout />}>

          {/* Home */}

          <Route
            path="/"
            element={<Home />}
          />

          {/* Shop */}

          <Route
            path="/shop"
            element={<Shop />}
          />

          {/* Product */}

          <Route
            path="/product/:id"
            element={<ProductDetail />}
          />

          {/* Cart */}

          <Route
            path="/cart"
            element={<Cart />}
          />

          {/* Wishlist */}

          <Route
            path="/wishlist"
            element={<Wishlist />}
          />

          {/* Checkout */}

          <Route
            path="/checkout"
            element={<Checkout />}
          />

          {/* CUSTOMER INFORMATION */}
          <Route path="/about" element={<InfoPage type="about" />} />
          <Route path="/contact" element={<InfoPage type="contact" />} />
          <Route path="/shipping" element={<InfoPage type="shipping" />} />
          <Route path="/returns" element={<InfoPage type="returns" />} />
          <Route path="/privacy" element={<InfoPage type="privacy" />} />
          <Route path="/policies" element={<InfoPage type="policies" />} />

          {/* =================================================
              PROTECTED CUSTOMER AREA
          ================================================== */}

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetail />
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

          {/* =================================================
              CUSTOM OUTFIT STUDIO
          ================================================== */}

          <Route
            path="/studio"
            element={
              <ProtectedRoute>
                <Studio />
              </ProtectedRoute>
            }
          />

          {/* =================================================
              VIRTUAL OUTFIT BUILDER
          ================================================== */}

          <Route path="/builder" element={<ProtectedRoute><Builder /></ProtectedRoute>} />

        </Route>

        {/* =================================================
            PUBLIC SHARED OUTFIT
        ================================================== */}

        <Route
          path="/shared-outfit/:token"
          element={<SharedOutfit />}
        />

        {/* =================================================
            AUTHENTICATION
        ================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/verify-email"
          element={<VerifyEmail />}
        />

        {/* =================================================
            ADMIN DASHBOARD
        ================================================== */}

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN PRODUCTS
        ================================================== */}

        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/products/new"
          element={
            <AdminRoute>
              <AdminProductForm />
            </AdminRoute>
          }
        />

        {/* New edit URL */}

        <Route
          path="/admin/products/:id/edit"
          element={
            <AdminRoute>
              <AdminProductForm />
            </AdminRoute>
          }
        />

        {/* Old edit URL kept for compatibility */}

        <Route
          path="/admin/products/edit/:id"
          element={
            <AdminRoute>
              <AdminProductForm />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN ORDERS
        ================================================== */}

        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN USERS
        ================================================== */}

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN COUPONS
        ================================================== */}

        <Route
          path="/admin/coupons"
          element={
            <AdminRoute>
              <AdminCoupons />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN REPORTS
        ================================================== */}

        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <AdminReports />
            </AdminRoute>
          }
        />

        {/* =================================================
            UNKNOWN ROUTE
        ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}