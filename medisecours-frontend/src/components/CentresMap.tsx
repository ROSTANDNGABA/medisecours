'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CAMEROUN_CENTER: [number, number] = [4.0, 12.35]
const DEFAULT_ZOOM = 6

function Recenter({ center }: { center?: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 1 })
  }, [center, map])
  return null
}

export default function CentresMap({ centres, position, onSelect }: {
  centres: any[]
  position?: { lat: number; lng: number }
  onSelect?: (id: number) => void
}) {
  return (
    <MapContainer center={CAMEROUN_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {position && <Recenter center={[position.lat, position.lng]} />}
      {centres.map((c: any) => (
        <Marker
          key={c.id}
          position={[c.latitude, c.longitude]}
          eventHandlers={{ click: () => onSelect?.(c.id) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{c.nom}</p>
              <p>{c.adresse}</p>
              {c.telephone && <p>{c.telephone}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
