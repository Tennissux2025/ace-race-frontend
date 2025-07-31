import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "https://11cfeae5-933f-4588-9955-b779a6137201-00-26hop5mjii2go.worf.replit.dev";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [tournaments, setTournaments] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userSelections, setUserSelections] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [draw, setDraw] = useState([]);
  const [topSelections, setTopSelections] = useState([]);
  const [bottomSelections, setBottomSelections] = useState([]);
  const [sortKey, setSortKey] = useState("week_points");

  useEffect(() => {
    if (!user) {
      const name = prompt("Welcome! What’s your name?");
      if (name) {
        const newUser = {
          id: `user-${Math.floor(Math.random() * 1000000)}`,
          name,
        };
        localStorage.setItem("user", JSON.stringify(newUser));
        setUser(newUser);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    axios.get(`${API_BASE}/tournaments`).then((res) => setTournaments(res.data));
    axios.get(`${API_BASE}/selections/${user.id}`).then((res) => setUserSelections(res.data));
    axios.get(`${API_BASE}/leaderboard`).then((res) =>
      setLeaderboard(res.data.sort((a, b) => b[sortKey] - a[sortKey]))
    );
  }, [sortKey, user]);

  const fetchDraw = (tournamentId) => {
    setSelectedTournament(tournamentId);
    axios.get(`${API_BASE}/tournament/${tournamentId}/draw`).then((res) => {
      const enriched = res.data.map((player, i) => ({
        ...player,
        nationality: "🇪🇸",
        age: 25,
        handedness: i % 2 === 0 ? "Right" : "Left",
        surface: ["Clay", "Grass", "Hard"][i % 3],
        uid: `${player.player_id}_${player.draw_half}_${i}`
      }));
      setDraw(enriched);
      setTopSelections([]);
      setBottomSelections([]);
    });
  };

  const toggleSelection = (entry) => {
    const isTop = entry.draw_half === "Top";
    const selections = isTop ? topSelections : bottomSelections;
    const setSelections = isTop ? setTopSelections : setBottomSelections;

    const alreadySelected = selections.find((p) => p.uid === entry.uid);
    if (alreadySelected) {
      setSelections(selections.filter((p) => p.uid !== entry.uid));
    } else if (selections.length < 2) {
      setSelections([...selections, entry]);
    } else {
      alert("You can only select 2 players from each half.");
    }
  };

  const isSelected = (entry) => {
    const list = entry.draw_half === "Top" ? topSelections : bottomSelections;
    return list.some((p) => p.uid === entry.uid);
  };

  const submitPicks = async () => {
    const selections = [...topSelections, ...bottomSelections].map((entry) => ({
      user_id: user.id,
      tournament_id: selectedTournament,
      player_id: entry.player_id,
      draw_half: entry.draw_half,
      selection_date: new Date().toISOString(),
    }));

    try {
      await Promise.all(selections.map((sel) => axios.post(`${API_BASE}/selections`, sel)));
      alert("✅ Picks submitted!");
      setSelectedTournament(null);
    } catch {
      alert("❌ Submission failed.");
    }
  };

  const groupedSelections = userSelections.reduce((acc, sel) => {
    if (!acc[sel.tournament_id]) acc[sel.tournament_id] = [];
    acc[sel.tournament_id].push(sel);
    return acc;
  }, {});

  const canEditTournament = (tournamentId) => {
    const tournament = tournaments.find((t) => t.id === tournamentId);
    if (!tournament) return false;
    return new Date(tournament.start_date) > new Date();
  };

  if (!user) return <div className="text-center p-8 text-lg">Loading...</div>;

  if (selectedTournament) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Select 2 players from each half</h2>
        <p className="text-sm text-gray-600 mb-4">
          Top: {topSelections.length} / 2 — Bottom: {bottomSelections.length} / 2
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {draw.map((entry) => (
            <div
              key={entry.uid}
              onClick={() => toggleSelection(entry)}
              className={`p-4 rounded shadow cursor-pointer transition ${
                isSelected(entry)
                  ? "border-2 border-green-500 bg-green-100"
                  : "border border-gray-300 hover:border-blue-400"
              }`}
            >
              <p className="font-semibold">Player ID: {entry.player_id}</p>
              <p>Nationality: {entry.nationality}</p>
              <p>Age: {entry.age}</p>
              <p>Hand: {entry.hand}</p>
              <p>Surface: {entry.surface}</p>
              <p>Half: {entry.draw_half}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={submitPicks}
            disabled={topSelections.length !== 2 || bottomSelections.length !== 2}
            className={`px-4 py-2 rounded font-semibold text-white ${
              topSelections.length === 2 && bottomSelections.length === 2
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Submit Picks
          </button>
          <button
            onClick={() => setSelectedTournament(null)}
            className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-100"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Ace Race 🎾</h1>
      <p className="text-gray-600 mb-6 italic">Welcome, {user.name}!</p>

      <h2 className="text-xl font-semibold mb-2">Weekly Tournaments</h2>
      <ul className="mb-6 space-y-2">
        {tournaments.map((t) => (
          <li key={t.id} className="flex justify-between items-center bg-white border p-3 rounded shadow-sm">
            <div>
              {t.name} — {t.location} — {new Date(t.start_date).toLocaleDateString()}
            </div>
            <button
              onClick={() => fetchDraw(t.id)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Draw
            </button>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mb-2">Past Selections</h2>
      <ul className="mb-6 space-y-4">
        {Object.entries(groupedSelections).map(([tournamentId, picks]) => (
          <li key={tournamentId}>
            <div className="flex justify-between items-center">
              <strong>{tournamentId}</strong>
              {canEditTournament(tournamentId) && (
                <button
                  onClick={() => fetchDraw(tournamentId)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  📝 Edit Picks
                </button>
              )}
            </div>
            <ul className="ml-4 list-disc">
              {picks.map((sel, i) => (
                <li key={i}>
                  Player {sel.player_id} ({sel.draw_half})
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-semibold mb-2">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="table-auto w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => setSortKey("user_id")}>User</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => setSortKey("week_points")}>Weekly</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => setSortKey("month_points")}>Monthly</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => setSortKey("year_points")}>Yearly</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={index} className="border-t">
                <td className="px-3 py-2">{entry.user_id}</td>
                <td className="px-3 py-2">{entry.week_points}</td>
                <td className="px-3 py-2">{entry.month_points}</td>
                <td className="px-3 py-2">{entry.year_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
