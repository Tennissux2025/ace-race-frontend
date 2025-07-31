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
        id: `${player.player_id}-${player.draw_half}`, // unique key
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

    const alreadySelected = selections.find((p) => p.id === entry.id);
    if (alreadySelected) {
      setSelections(selections.filter((p) => p.id !== entry.id));
    } else if (selections.length < 2) {
      setSelections([...selections, entry]);
    } else {
      alert("You can only select 2 players from each half.");
    }
  };

  const isSelected = (entry) => {
    const list = entry.draw_half === "Top" ? topSelections : bottomSelections;
    return list.some((p) => p.id === entry.id);
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

  if (!user) return <div>Loading...</div>;

  if (selectedTournament) {
    return (
      <div className="p-4">
        <h2>Select 2 players from each half</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {draw.map((entry) => (
            <div
              key={entry.id}
              onClick={() => toggleSelection(entry)}
              style={{
                border: isSelected(entry) ? "2px solid green" : "1px solid #ccc",
                padding: "10px",
                cursor: "pointer",
                width: "180px",
              }}
            >
              <strong>Player ID:</strong> {entry.player_id}<br />
              <strong>Nationality:</strong> {entry.nationality}<br />
              <strong>Age:</strong> {entry.age}<br />
              <strong>Hand:</strong> {entry.hand}<br />
              <strong>Surface:</strong> {entry.surface}<br />
              <strong>Half:</strong> {entry.draw_half}
            </div>
          ))}
        </div>
        <br />
        <button
          onClick={submitPicks}
          disabled={topSelections.length !== 2 || bottomSelections.length !== 2}
        >
          Submit Picks
        </button>
        <button onClick={() => setSelectedTournament(null)}>Back</button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1>Ace Race: Pick Your Players</h1>
      <p style={{ fontStyle: "italic" }}>Welcome, {user.name}!</p>

      <h2>Weekly Tournaments</h2>
      <ul>
        {tournaments.map((t) => (
          <li key={t.id}>
            {t.name} — {t.location} — {new Date(t.start_date).toLocaleDateString()}
            <button onClick={() => fetchDraw(t.id)} style={{ marginLeft: "10px" }}>View Draw</button>
          </li>
        ))}
      </ul>

      <h2>Past Selections</h2>
      <ul>
        {Object.entries(groupedSelections).map(([tournamentId, picks]) => (
          <li key={tournamentId}>
            <strong>{tournamentId}</strong> —
            {canEditTournament(tournamentId) && (
              <button onClick={() => fetchDraw(tournamentId)} style={{ marginLeft: "10px" }}>📝 Edit Picks</button>
            )}
            <ul>
              {picks.map((sel, i) => (
                <li key={i}>
                  Player {sel.player_id} ({sel.draw_half})
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h2>Leaderboard</h2>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th onClick={() => setSortKey("user_id")}>User</th>
            <th onClick={() => setSortKey("week_points")}>Weekly</th>
            <th onClick={() => setSortKey("month_points")}>Monthly</th>
            <th onClick={() => setSortKey("year_points")}>Yearly</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={index}>
              <td>{entry.user_id}</td>
              <td>{entry.week_points}</td>
              <td>{entry.month_points}</td>
              <td>{entry.year_points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
