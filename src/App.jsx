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
        uid: `${player.player_id}-${player.draw_half}`, // 👈 unique id
      }));
      setDraw(enriched);
      setTopSelections([]);
      setBottomSelections([]);
    });
  };

  const toggleSelection = (entry) => {
    const isTop = entry.draw_half === "Top";
    const selections = isTop ? topSelections : bottom
