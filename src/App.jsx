import React, { useEffect, useState } from "react";
import axios from "axios";

export default function App() {
  const [userId, setUserId] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.id || "demo-user";
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
    axios.get("http://localhost:8000/tournaments").then((res) => {
      setTournaments(res.data);
    });
    axios.get(`http://localhost:8000/selections/${userId}`).then((res) => {
      setUserSelections(res.data);
    });
    axios.get("http://localhost:8000/leaderboard").then((res) => {
      setLeaderboard(res.data.sort((a, b) => b[sortKey] - a[sortKey]));
    });
  }, [sortKey, userId]);

  const fetchDraw = (tournamentId) => {
    setSelectedTournament(tournamentId);
    axios.get(`http://localhost:8000/tournament/${tournamentId}/draw`).then((res) => {
      const enriched = res.data.map((player, i) => ({
        ...player,
        nationality: "🇪🇸",
        age: 25,
        handedness: i % 2 === 0 ? "Right" : "Left",
        surface: ["Clay", "Grass", "Hard"][i % 3],
      }));
      setDraw(enriched);
    });
  };

  const toggleSelection = (entry) => {
    const isTop = entry.draw_half === "Top";
    const selections = isTop ? topSelections : bottomSelections;
    const setSelections = isTop ? setTopSelections : setBottomSelections;

    if (selections.find((p) => p.player_id === entry.player_id)) {
      setSelections(selections.filter((p) => p.player_id !== entry.player_id));
    } else if (selections.length < 2) {
      setSelections([...selections, entry]);
    } else {
      alert("You can only select 2 players from each half.");
    }
  };

  const isSelected = (entry) => {
    const selections = entry.draw_half === "Top" ? topSelections : bottomSelections;
    return selections.find((p) => p.player_id === entry.player_id);
  };

  const submitPicks = async () => {
    const selections = [...topSelections, ...bottomSelections].map((entry) => ({
      user_id: userId,
      tournament_id: selectedTournament,
      player_id: entry.player_id,
      draw_half: entry.draw_half,
      selection_date: new Date().toISOString(),
    }));

    try {
      await Promise.all(selections.map((sel) => axios.post("http://localhost:8000/selections", sel)));
      alert("✅ Picks submitted!");
      setSelectedTournament(null);
    } catch {
      alert("❌ Submission failed.");
    }
  };

  if (selectedTournament) {
    return (
      <div>
        <h2>Select 2 players from each half</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {draw.map((entry) => (
            <div
              key={entry.player_id}
              style={{
                border: isSelected(entry) ? "2px solid green" : "1px solid #ccc",
                padding: "10px",
                cursor: "pointer",
                width: "180px",
              }}
              onClick={() => toggleSelection(entry)}
            >
              <strong>Player ID:</strong> {entry.player_id}<br />
              <strong>Nationality:</strong> {entry.nationality}<br />
              <strong>Age:</strong> {entry.age}<br />
              <strong>Hand:</strong> {entry.handedness}<br />
              <strong>Surface:</strong> {entry.surface}<br />
              <strong>Half:</strong> {entry.draw_half}
            </div>
          ))}
        </div>
        <br />
        <button onClick={submitPicks} disabled={topSelections.length !== 2 || bottomSelections.length !== 2}>
          Submit Picks
        </button>
        <button onClick={() => setSelectedTournament(null)}>Back</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Ace Race: Pick Your Players</h1>

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
        {userSelections.map((sel) => (
          <li key={sel.id}>
            Tournament {sel.tournament_id} — Player {sel.player_id} ({sel.draw_half})
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
