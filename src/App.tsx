import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { Missing, RequireRole } from "./components/Chrome";
import { Login, Register } from "./pages/Auth";
import { Landing } from "./pages/Landing";
import { Access, Ask, Explore, MyStudy, ParticipantHome, Summary, Teach } from "./pages/Participant";
import { Documents, Insights, Integrity, Lab, Overview, Settings, Studio } from "./pages/Team";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireRole role="participant" />}>
        <Route path="/participant/home" element={<ParticipantHome />} />
        <Route path="/participant/my-study" element={<MyStudy />} />
        <Route path="/participant/explore-consent" element={<Explore />} />
        <Route path="/participant/explore-consent/:sectionId" element={<Explore />} />
        <Route path="/participant/ask" element={<Ask />} />
        <Route path="/participant/teach-back" element={<Teach />} />
        <Route path="/participant/summary" element={<Summary />} />
        <Route path="/participant/accessibility" element={<Access />} />
      </Route>

      <Route element={<RequireRole role="researcher" />}>
        <Route path="/researcher/overview" element={<Overview />} />
        <Route path="/researcher/document-integrity" element={<Integrity />} />
        <Route path="/researcher/insights" element={<Insights />} />
        <Route path="/researcher/plain-language" element={<Studio />} />
        <Route path="/researcher/test-lab" element={<Lab />} />
        <Route path="/researcher/documents" element={<Documents />} />
        <Route path="/researcher/settings" element={<Settings />} />
      </Route>

      <Route path="/participant" element={<Navigate to="/participant/home" replace />} />
      <Route path="/participant/study" element={<Navigate to="/participant/my-study" replace />} />
      <Route path="/participant/explore" element={<Navigate to="/participant/explore-consent" replace />} />
      <Route path="/participant/explore/:sectionId" element={<SectionRedirect />} />
      <Route path="/participant/teach" element={<Navigate to="/participant/teach-back" replace />} />
      <Route path="/participant/access" element={<Navigate to="/participant/accessibility" replace />} />
      <Route path="/team" element={<Navigate to="/researcher/overview" replace />} />
      <Route path="/team/integrity" element={<Navigate to="/researcher/document-integrity" replace />} />
      <Route path="/team/insights" element={<Navigate to="/researcher/insights" replace />} />
      <Route path="/team/studio" element={<Navigate to="/researcher/plain-language" replace />} />
      <Route path="/team/lab" element={<Navigate to="/researcher/test-lab" replace />} />
      <Route path="/team/documents" element={<Navigate to="/researcher/documents" replace />} />
      <Route path="/team/settings" element={<Navigate to="/researcher/settings" replace />} />
      <Route path="*" element={<Missing />} />
    </Routes>
  );
}

function SectionRedirect() {
  const { sectionId } = useParams();
  return <Navigate to={`/participant/explore-consent/${sectionId ?? "procedures"}`} replace />;
}
