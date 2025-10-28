import React from "react";
import { motion } from "framer-motion";
import { Container, Row, Col, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { Rocket, Thermometer, Telescope } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Mars Weather (InSight)",
      desc: "Live weather insights from NASA’s Mars lander.",
      color: "#ff784e",
      icon: <Thermometer size={50} color="#ff784e" />,
      path: "/insight",
    },
    {
      title: "Asteroid Tracker (NeoWs)",
      desc: "Track Near-Earth Objects and their approach distance.",
      color: "#00c6ff",
      icon: <Rocket size={50} color="#00c6ff" />,
      path: "/neo",
    },
    {
      title: "NASA Image Library",
      desc: "Explore stunning images from space missions.",
      color: "#ffaa00",
      icon: <Telescope size={50} color="#ffaa00" />,
      path: "/imagesearch",
    },
  ];

  return (
    <div
      style={{
        background: "radial-gradient(circle at top, #000010 0%, #0a0a2a 60%, #000 100%)",
        color: "#fff",
        minHeight: "100vh",
        padding: "100px 0",
      }}
    >
      <Container>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center fw-bold mb-5"
          style={{ color: "#00d9ff",  }}
        >
          NASA Data Explorer
        </motion.h1>

        <Row className="g-4 justify-content-center">
          {sections.map((item, i) => (
            <Col md={4} key={i}>
              <motion.div whileHover={{ scale: 1.05 }}>
                <Card
                  className="text-center rounded-4 border-0 p-4 shadow-lg"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${item.color}40`,
                    cursor: "pointer",
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <div className="mb-3">{item.icon}</div>
                  <h4 style={{ color: item.color }}>{item.title}</h4>
                  <p className="text-light small">{item.desc}</p>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
}
