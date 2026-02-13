import { useState } from "react";
import PinLogin from "../components/PinLogin";
import CreateTournament from "../components/CreateTournament";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  if (!token) {
    return <PinLogin onLogin={setToken} />;
  }

  return <CreateTournament token={token} />;
}
