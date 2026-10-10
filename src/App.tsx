import { Route, Routes } from "react-router-dom";
import { Missing, Shell } from "./components/Chrome";
import { Landing } from "./pages/Landing";
import { Access, Ask, Explore, MyStudy, ParticipantHome, Summary, Teach } from "./pages/Participant";
import { Documents, Insights, Integrity, Lab, Overview, Settings, Studio } from "./pages/Team";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/participant" element={<Shell mode="participant" />}>
        <Route index element={<ParticipantHome />} />
        <Route path="study" element={<MyStudy />} />
        <Route path="explore" element={<Explore />} />
        <Route path="explore/:sectionId" element={<Explore />} />
        <Route path="ask" element={<Ask />} />
        <Route path="teach" element={<Teach />} />
        <Route path="summary" element={<Summary />} />
        <Route path="access" element={<Access />} />
      </Route>
      <Route path="/team" element={<Shell mode="team" />}>
        <Route index element={<Overview />} />
        <Route path="integrity" element={<Integrity />} />
        <Route path="insights" element={<Insights />} />
        <Route path="studio" element={<Studio />} />
        <Route path="lab" element={<Lab />} />
        <Route path="documents" element={<Documents />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Missing />} />
    </Routes>
  );
}
