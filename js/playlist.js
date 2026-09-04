export function findStation(stations, id) {
  const station = stations.find((s) => s.id === id);
  if (!station) throw new Error(`Không tìm thấy station id: ${id}`);
  return station;
}

export function buildPlaylist(stationIds, stations) {
  return stationIds.map((id) => findStation(stations, id));
}

export function validateStations(stations) {
  const seen = new Set();
  const dupes = [];
  for (const s of stations) {
    if (seen.has(s.id)) dupes.push(s.id);
    seen.add(s.id);
  }
  return dupes;
}

export function validateStandardSet(standardSet, stations) {
  const knownIds = new Set(stations.map((s) => s.id));
  return standardSet.filter((id) => !knownIds.has(id));
}
