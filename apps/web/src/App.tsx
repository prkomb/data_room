import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { RequireAuth } from "@/components/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import RoomsPage from "@/pages/RoomsPage";
import RoomBrowserPage from "@/pages/RoomBrowserPage";
import SharedWithMePage from "@/pages/SharedWithMePage";
import PublicViewPage from "@/pages/PublicViewPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/public/:token" element={<PublicViewPage />} />
            <Route path="/public/:token/folders/:folderId" element={<PublicViewPage />} />

            <Route
              path="/rooms"
              element={
                <RequireAuth>
                  <RoomsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/rooms/:roomId"
              element={
                <RequireAuth>
                  <RoomBrowserPage />
                </RequireAuth>
              }
            />
            <Route
              path="/rooms/:roomId/folders/:folderId"
              element={
                <RequireAuth>
                  <RoomBrowserPage />
                </RequireAuth>
              }
            />
            <Route
              path="/shared-with-me"
              element={
                <RequireAuth>
                  <SharedWithMePage />
                </RequireAuth>
              }
            />

            <Route path="/" element={<Navigate to="/rooms" replace />} />
            <Route path="*" element={<Navigate to="/rooms" replace />} />
          </Routes>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
