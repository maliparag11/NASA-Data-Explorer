import React, { useEffect, useState } from "react";
import api from "../api";
import { Row, Col, Card } from "react-bootstrap";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Loader from "../components/Loader";
import { Wind, Thermometer, Gauge } from "lucide-react";

export default function Insight() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInsightData = async () => {
    try {
      const res = await api.get("/api/insight");
      const sols = Object.entries(res.data)
        .filter(([sol]) => !isNaN(sol))
        .map(([sol, d]) => ({
          sol,
          avgTemp: d.AT?.av || 0,
          minTemp: d.AT?.mn || 0,
          maxTemp: d.AT?.mx || 0,
          avgWind: d.HWS?.av || 0,
          avgPressure: d.PRE?.av || 0,
          season: d.Season,
          windDir: d.WD?.most_common?.compass_point || "N/A",
          compassDeg: d.WD?.most_common?.compass_degrees || 0,
        }));
      setData(sols.reverse());
    } catch (err) {
      console.error("Error fetching Insight data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightData();
  }, []);

  if (loading) return <Loader />;

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at top, #1a0f0f 0%, #000 70%, #200000 100%)",
        Height: "100%",
        color: "#fff",
        padding: "2rem",
        // overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Mars Glow Background */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,80,0,0.4), rgba(255,0,0,0))",
          filter: "blur(80px)",
          transform: "translateX(-50%)",
          animation: "pulse 6s infinite alternate",
        }}
      />
      <style>
        {`
          @keyframes pulse {
            from { opacity: 0.3; transform: translateX(-50%) scale(1); }
            to { opacity: 0.6; transform: translateX(-50%) scale(1.1); }
          }
        `}
      </style>

      <motion.h1
        className="text-center mb-5 fw-bold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        style={{ color: "#ff784e", textShadow: "0 0 20px #ff4500" }}
      >
        NASA InSight — Mars Weather Dashboard
      </motion.h1>

      {/* Cards */}
      <Row className="mb-4 g-4 justify-content-center">
        <Col md={3}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card className="bg-dark text-light rounded-4 shadow-lg border-0 p-3 text-center">
              <Thermometer size={40} color="#ff784e" />
              <h5 className="mt-3">Average Temperature</h5>
              <h3>{data[0]?.avgTemp?.toFixed(1)} °C</h3>
              <p className="text-secondary">
                Range: {data[0]?.minTemp?.toFixed(1)} to{" "}
                {data[0]?.maxTemp?.toFixed(1)}
              </p>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card className="bg-dark text-light rounded-4 shadow-lg border-0 p-3 text-center">
              <Wind size={40} color="#00c6ff" />
              <h5 className="mt-3">Wind Speed</h5>
              <h3>{data[0]?.avgWind?.toFixed(1)} m/s</h3>
              <p className="text-secondary">
                Direction: {data[0]?.windDir} ({data[0]?.compassDeg}°)
              </p>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card className="bg-dark text-light rounded-4 shadow-lg border-0 p-3 text-center">
              <Gauge size={40} color="#ffaa00" />
              <h5 className="mt-3">Pressure</h5>
              <h3>{data[0]?.avgPressure?.toFixed(1)} Pa</h3>
              <p className="text-secondary">Season: {data[0]?.season}</p>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="bg-dark rounded-4 p-4 shadow-lg"
      >
        <h4 className="text-center text-warning mb-4">Temperature & Pressure Over Sols</h4>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="sol" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip
              contentStyle={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
            />
            <Legend />
            <Line type="monotone" dataKey="avgTemp" stroke="#ff784e" name="Avg Temp (°C)" />
            <Line type="monotone" dataKey="avgPressure" stroke="#ffaa00" name="Pressure (Pa)" />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
