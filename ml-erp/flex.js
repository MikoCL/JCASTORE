function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function optimizeAndAssignRoute(pool, driverId, shipmentIds, depotLat, depotLon) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `SELECT id, ml_shipment_id, delivery_latitude, delivery_longitude FROM shipments WHERE id = ANY($1::int[])`,
      [shipmentIds]
    );
    let unassignedStops = res.rows.filter(s => s.delivery_latitude && s.delivery_longitude);
    if (unassignedStops.length === 0) throw new Error('No hay coordenadas válidas.');

    const routeRes = await client.query(
      `INSERT INTO delivery_routes (driver_id, route_date, status, total_packages) VALUES ($1, CURRENT_DATE, 'planned', $2) RETURNING id`,
      [driverId, unassignedStops.length]
    );
    const routeId = routeRes.rows[0].id;

    let currentLat = depotLat;
    let currentLon = depotLon;
    let sequence = 1;

    while (unassignedStops.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;
      for (let i = 0; i < unassignedStops.length; i++) {
        const dist = calculateDistance(currentLat, currentLon, unassignedStops[i].delivery_latitude, unassignedStops[i].delivery_longitude);
        if (dist < minDistance) { minDistance = dist; nearestIndex = i; }
      }
      const nextStop = unassignedStops.splice(nearestIndex, 1)[0];
      await client.query(
        `UPDATE shipments SET driver_id = $1, route_id = $2, delivery_sequence = $3, status = 'ready_to_ship' WHERE id = $4`,
        [driverId, routeId, sequence, nextStop.id]
      );
      currentLat = nextStop.delivery_latitude;
      currentLon = nextStop.delivery_longitude;
      sequence++;
    }
    await client.query('COMMIT');
    return { success: true, routeId, totalStops: sequence - 1 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { optimizeAndAssignRoute };