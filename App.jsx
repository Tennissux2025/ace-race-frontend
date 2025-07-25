
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";

export default function App() {
  const [userId, setUserId] = useState(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.id || "demo-user";
  });
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortKey, setSortKey] = useState("week_points");
  const [userSelections, setUserSelections] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [draw, setDraw] = useState([]);
  const [topSelections, setTopSelections] = useState([]);
  const [bottomSelections, setBottomSelections] = useState([]);

  useEffect(() => {
    setLoading(true);
    axios.get("http://localhost:8000/tournaments").then((res) => {
      setTournaments(res.data);
      axios.get(`http://localhost:8000/selections/${userId}`).then((selRes) => {
        setUserSelections(selRes.data);
      });
      axios.get("http://localhost:8000/leaderboard").then((lbRes) => {
        setLeaderboard(lbRes.data.sort((a, b) => b[sortKey] - a[sortKey]));
      });
      setLoading(false);
    });
  }, []);

  const fetchDraw = (id) => {
    setSelectedTournament(id);
    axios.get(`http://localhost:8000/tournament/${id}/draw`).then((res) => {
      const enrichedDraw = res.data.map((entry) => ({
        ...entry,
        nationality: "🇪🇸",
        age: 25,
        handedness: entry.position % 2 === 0 ? "Right" : "Left",
        surface: entry.position % 3 === 0 ? "Clay" : entry.position % 3 === 1 ? "Grass" : "Hard"
      }));
      setDraw(enrichedDraw);
      setTopSelections([]);
      setBottomSelections([]);
    });
  };

  const toggleSelection = (entry) => {
    const isTop = entry.draw_half === "Top";
    const selections = isTop ? topSelections : bottomSelections;
    const setSelections = isTop ? setTopSelections : setBottomSelections;
    const alreadySelected = selections.some((p) => p.player_id === entry.player_id);

    if (alreadySelected) {
      setSelections(selections.filter((p) => p.player_id !== entry.player_id));
    } else {
      if (selections.length < 2) {
        setSelections([...selections, entry]);
      } else {
        alert("You can only select 2 players from each half of the draw.");
      }
    }
  };

  const isSelected = (entry) => {
    const selected = entry.draw_half === "Top" ? topSelections : bottomSelections;
    return selected.some((p) => p.player_id === entry.player_id);
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
      await Promise.all(
        selections.map((sel) => axios.post("http://localhost:8000/selections", sel))
      );
      alert("✅ Picks submitted successfully!");
      setSelectedTournament(null);
    } catch (error) {
      console.error(error);
      alert("❌ Failed to submit picks.");
    }
  };

  if (selectedTournament) {
    if (loading) {
      return (
        <div className="p-4 text-center">
          <h1 className="text-lg font-semibold">Loading...</h1>
        </div>
      );
    }

    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Select 2 players from each half</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {draw.map((entry) => (
            <Card
              key={entry.id}
              onClick={() => toggleSelection(entry)}
              className={`cursor-pointer border-2 ${isSelected(entry) ? "border-green-500" : "border-gray-200"}`}
            >
              <CardContent>
                <p className="font-semibold">Player ID: {entry.player_id}</p>
                <p>Nationality: {entry.nationality}</p>
                <p>Age: {entry.age}</p>
                <p>Hand: {entry.handedness === 'Right' ? '🤚 Right' : '✋ Left'}</p>
                <p>Surface: {entry.surface === 'Clay' ? '🧱 Clay' : entry.surface === 'Grass' ? '🌿 Grass' : '🏟 Hard'}</p>
                <p>Draw Half: {entry.draw_half}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={() => setSelectedTournament(null)}>
            ⬅ Back to Tournaments
          </Button>
          <Button
            onClick={submitPicks}
            disabled={topSelections.length !== 2 || bottomSelections.length !== 2}
          >
            ✅ Submit Picks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tournaments</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tournaments.map((tournament) => (
          <Card key={tournament.id}>
            <CardContent>
              <h2 className="text-lg font-semibold">{tournament.name}</h2>
              <p>{new Date(tournament.start_date).toLocaleDateString()}</p>
              <p>{tournament.location}</p>
              <Button onClick={() => fetchDraw(tournament.id)} className="mt-2">
                View Draw
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Your Past Selections</h2>
        <ul className="list-disc list-inside">
          {userSelections.map((sel) => (
            <li key={sel.id}>
              Tournament ID: {sel.tournament_id}, Player ID: {sel.player_id}, Half: {sel.draw_half}, Date: {new Date(sel.selection_date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        <table className="table-auto w-full text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 cursor-pointer" onClick={() => setSortKey('user_id')}>User</th>
              <th className="px-2 py-1 cursor-pointer" onClick={() => setSortKey('week_points')}>Weekly</th>
              <th className="px-2 py-1 cursor-pointer" onClick={() => setSortKey('month_points')}>Monthly</th>
              <th className="px-2 py-1 cursor-pointer" onClick={() => setSortKey('year_points')}>Yearly</th>
            </tr>
          </thead>
          <tbody>
            {[...leaderboard].sort((a, b) => b[sortKey] - a[sortKey]).map((entry, index) => (
              <tr key={index} className={`border-t ${index === 0 ? 'bg-yellow-100 font-bold' : ''}`}>
                <td className="px-2 py-1">{entry.user_id}</td>
                <td className="px-2 py-1">{entry.week_points}</td>
                <td className="px-2 py-1">{entry.month_points}</td>
                <td className="px-2 py-1">{entry.year_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
