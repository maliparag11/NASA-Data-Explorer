import { useEffect, useState } from "react";
import api from "../api";
import Loader from "../components/Loader";
import { Card, Modal, Button, Form, Row, Col } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";

export default function ImageSearch() {
  const [query, setQuery] = useState("space");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/imagesearch?q=${query}`);
      const items = res.data.collection?.items || [];
      setResults(items);
    } catch (err) {
      console.error("Image search error:", err);
      alert("Failed to fetch images.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="container my-4">
      <h2 className="text-center mb-4 fw-bold text-primary">
        NASA Image & Video Library
      </h2>

      {/* Search bar */}
      <Form
        className="d-flex justify-content-center mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          fetchImages();
        }}
      >
        <Form.Control
          type="text"
          placeholder="Search NASA media (e.g. Mars, Galaxy, Moon)"
          className="me-2 w-50 shadow-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button variant="primary" onClick={fetchImages}>
          Search
        </Button>
      </Form>

      {loading ? (
        <Loader />
      ) : (
        <Row xs={1} sm={2} md={3} lg={4} className="g-4">
          {results.map((item, idx) => {
            const data = item.data[0];
            const img = item.links ? item.links[0].href : null;
            return (
              <Col key={idx}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="shadow-sm border-0 h-100"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelected(data)}
                  >
                    {img && (
                      <Card.Img
                        variant="top"
                        src={img}
                        alt={data.title}
                        className="rounded-top"
                        style={{
                          objectFit: "cover",
                          height: "200px",
                        }}
                      />
                    )}
                    <Card.Body>
                      <Card.Title className="fs-6 fw-semibold text-center">
                        {data.title.length > 60
                          ? data.title.substring(0, 60) + "..."
                          : data.title}
                      </Card.Title>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Modal Popup */}
      <AnimatePresence>
        {selected && (
          <Modal
            show={true}
            onHide={() => setSelected(null)}
            size="lg"
            centered
            backdrop="static"
            dialogClassName="animated-modal"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Modal.Header closeButton>
                <Modal.Title>{selected.title}</Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {selected.thumbnail && (
                  <img
                    src={selected.thumbnail}
                    alt={selected.title}
                    className="img-fluid rounded shadow-sm mb-3"
                  />
                )}
                <p className="text-muted">{selected.description}</p>
                <p>
                  <strong>Date Created:</strong>{" "}
                  {new Date(selected.date_created).toLocaleDateString()}
                </p>
                <p>
                  <strong>Center:</strong> {selected.center || "NASA"}
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="secondary"
                  onClick={() => setSelected(null)}
                >
                  Close
                </Button>
                {selected.nasa_id && (
                  <Button
                    variant="primary"
                    href={`https://images.nasa.gov/details-${selected.nasa_id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on NASA Site
                  </Button>
                )}
              </Modal.Footer>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
