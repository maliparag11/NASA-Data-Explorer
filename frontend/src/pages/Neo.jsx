import { useEffect, useState } from "react";
import api from "../api";
import Loader from "../components/Loader";

export default function Neo() {
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);
  const [neoData, setNeoData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNeo = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/neo?start_date=${startDate}&end_date=${endDate}`);
      const objects = Object.values(res.data.near_earth_objects || {}).flat();
      setNeoData(objects);
    } catch (err) {
      console.error("NEO fetch error:", err);
      alert("Failed to fetch NEO data. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeo(); // load default data for the past week
  }, []);

  return (
    <div className="container my-4">
      <h2 className="text-center mb-4 fw-bold text-primary">Near Earth Objects (NEO)</h2>

      {/* Date Filters */}
      <div className="row justify-content-center mb-4">
        <div className="col-md-3 mb-2">
          <label className="form-label fw-semibold">From:</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate}
          />
        </div>
        <div className="col-md-3 mb-2">
          <label className="form-label fw-semibold">To:</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
        </div>
        <div className="col-md-2 d-flex align-items-end mb-2">
          <button onClick={fetchNeo} className="btn btn-primary w-100">
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Name</th>
                <th>Close Approach Date</th>
                <th>Diameter (m)</th>
                <th>Hazardous?</th>
                <th>Miss Distance (km)</th>
              </tr>
            </thead>
            <tbody>
              {neoData.length > 0 ? (
                neoData.map((obj) => (
                  <tr key={obj.id}>
                    <td>{obj.name}</td>
                    <td>{obj.close_approach_data[0]?.close_approach_date_full}</td>
                    <td>
                      {(
                        (obj.estimated_diameter.meters.estimated_diameter_min +
                          obj.estimated_diameter.meters.estimated_diameter_max) /
                        2
                      ).toFixed(2)}
                    </td>
                    <td>
                      {obj.is_potentially_hazardous_asteroid ? (
                        <span className="badge bg-danger">Yes</span>
                      ) : (
                        <span className="badge bg-success">No</span>
                      )}
                    </td>
                    <td>
                      {Number(
                        obj.close_approach_data[0]?.miss_distance.kilometers
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    No data available for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
