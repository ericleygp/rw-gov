import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './MapPage.css'
import { getRealData, isRealData } from '../../data/realData.js'
import { paraContorno } from '../../data/geo/paraContorno.js'
import { paraMunicipios } from '../../data/geo/paraMunicipios.js'
import { BANDS, STORE, WEIGHTS, buildCityMap } from '../../domain/geo/cityMap.js'
import { getSessionTiming } from '../dashboard/utils/sessionTiming.js'
import { listOpportunities } from '../opportunities/repositories/opportunityRepository.js'

// Mapa de fundo do OpenStreetMap (nomes de cidades, rodovias e divisas). Só a área visível é pedida à internet; nenhum dado da empresa é enviado.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
const PARA_BOUNDS = [[-9.9, -58.95], [2.65, -46.0]]
const NORTHEAST_BOUNDS = [[-4.2, -49.9], [-0.4, -46.0]]
const PARA_OUTLINE = paraContorno.map((ring) => ring.map(([lon, lat]) => [lat, lon]))
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
// Tamanho do círculo em pixels (fica igual em qualquer zoom): 7 a 19 px conforme o valor potencial.
const radiusOf = (city) => 7 + 12 * Math.sqrt(Math.min(1, city.potentialValue / 2_000_000))

function deadlineText(sessionAt) {
  const days = getSessionTiming(sessionAt, new Date()).daysRemaining
  if (days === null || days === undefined) return { text: 'prazo não informado', short: false }
  if (days <= 0) return { text: 'encerra hoje', short: true }
  return { text: days === 1 ? '1 dia restante' : `${days} dias restantes`, short: days <= 2 }
}

function ScoreBar({ label, points, max }) {
  return <div className="score-bar"><span>{label}</span><div className="score-bar-track"><i style={{ width: `${Math.round((points / max) * 100)}%` }} /></div><b>{Math.round(points)}/{max}</b></div>
}

function MapPage({ onNavigate }) {
  const real = isRealData()
  const data = useMemo(() => {
    if (!real) return null
    return buildCityMap({ municipalities: paraMunicipios, opportunities: listOpportunities(), items: getRealData().itens })
  }, [real])
  const [selectedIbge, setSelectedIbge] = useState(null)
  const [tilesFailed, setTilesFailed] = useState(false)
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef(new Map())
  const activeIbge = data ? (data.cities.find((city) => city.ibge === selectedIbge)?.ibge ?? data.cities[0]?.ibge ?? null) : null

  // Cria o mapa uma vez (e o desmonta ao sair da tela).
  useEffect(() => {
    if (!data || !mapElement.current) return undefined
    const map = L.map(mapElement.current, { minZoom: 5, maxZoom: 17, zoomSnap: 0.5 })
    mapRef.current = map
    const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map)
    let failures = 0
    tiles.on('tileerror', () => { failures += 1; if (failures === 3) setTilesFailed(true) })
    tiles.on('tileload', () => { if (failures >= 3) { failures = 0; setTilesFailed(false) } })
    // Divisa do Pará em destaque, em qualquer zoom (e como único fundo se a internet cair).
    L.polygon(PARA_OUTLINE, { color: '#0f6b4a', weight: 2.5, fillColor: '#16835d', fillOpacity: 0.04, interactive: false }).addTo(map)
    map.fitBounds(PARA_BOUNDS)

    const markers = new Map()
    data.cities.forEach((city, rank) => {
      const radius = radiusOf(city)
      const marker = L.circleMarker([city.lat, city.lon], { radius, fillColor: city.band.color, fillOpacity: 0.88, color: '#ffffff', weight: 2 }).addTo(map)
      marker.bindTooltip(city.name, { permanent: true, direction: 'right', offset: [radius + 2, 0], className: `map-tip${rank < 6 ? '' : ' minor'}` })
      marker.on('click', () => setSelectedIbge(city.ibge))
      markers.set(city.ibge, marker)
    })
    markersRef.current = markers
    const store = L.marker([STORE.lat, STORE.lon], { icon: L.divIcon({ className: 'map-store-icon', html: '<span></span>', iconSize: [18, 18] }), keyboard: false, zIndexOffset: 1000 }).addTo(map)
    store.bindTooltip(`Sua loja (${STORE.name})`, { permanent: true, direction: 'left', offset: [-8, 0], className: 'map-tip map-tip-store' })

    // Em zoom baixo só as cidades mais bem ranqueadas mostram o nome; ao aproximar, todas mostram.
    const syncLabels = () => mapElement.current?.classList.toggle('map-zoom-low', map.getZoom() < 8)
    map.on('zoomend', syncLabels)
    syncLabels()
    return () => { map.remove(); mapRef.current = null; markersRef.current = new Map() }
  }, [data])

  // Destaca a cidade selecionada.
  useEffect(() => {
    for (const [ibge, marker] of markersRef.current) {
      const isActive = ibge === activeIbge
      marker.setStyle({ weight: isActive ? 4 : 2, color: isActive ? '#17211e' : '#ffffff' })
      if (isActive) marker.bringToFront()
    }
  }, [activeIbge, data])

  if (!data) {
    return <div className="map-page"><div className="map-empty"><strong>O mapa usa as oportunidades reais do PNCP.</strong><p>Rode a atualização (<code>scripts\atualizar.cmd</code>) para gerar a lista e recarregue a página.</p></div></div>
  }

  const { cities, unresolved } = data
  const selected = cities.find((city) => city.ibge === activeIbge) ?? null
  const countByBand = (key) => cities.filter((city) => city.band.key === key).length
  const fitTo = (bounds) => mapRef.current?.fitBounds(bounds, { padding: [24, 24] })
  const focusCity = (city) => {
    setSelectedIbge(city.ibge)
    const map = mapRef.current
    if (map) map.flyTo([city.lat, city.lon], Math.max(map.getZoom(), 9), { duration: 0.8 })
  }

  return <div className="map-page">
    <header className="map-header">
      <div><span className="map-eyebrow">RADAR DE COMPRAS PÚBLICAS</span><h1>Mapa de oportunidades</h1><p>Onde estão as licitações abertas que mais combinam com o seu catálogo, a partir de {STORE.name}.</p></div>
      <span className="map-source"><i /> Fonte: PNCP · {cities.length} cidades com oportunidades</span>
    </header>
    <section className="map-legend" aria-label="Legenda">
      {BANDS.map((band) => <span key={band.key} className="legend-item"><i style={{ background: band.color }} />{band.label} <small>({countByBand(band.key)})</small></span>)}
      <span className="legend-item"><i className="legend-store" />Sua loja ({STORE.name})</span>
      <span className="legend-note">Tamanho do círculo = valor potencial dos itens que combinam</span>
    </section>
    <div className="map-layout">
      <section className="map-card" aria-label="Mapa do Pará">
        <div className="map-toolbar">
          <div className="map-views" role="group" aria-label="Região exibida">
            <button type="button" onClick={() => fitTo(PARA_BOUNDS)}>Pará inteiro</button>
            <button type="button" onClick={() => fitTo(NORTHEAST_BOUNDS)}>Nordeste e Belém</button>
            <button type="button" onClick={() => fitTo(L.latLngBounds(cities.map((city) => [city.lat, city.lon])).pad(0.2))}>Ver oportunidades</button>
          </div>
        </div>
        <div ref={mapElement} className="map-canvas" role="application" aria-label="Mapa do Pará com as cidades que têm oportunidades abertas" />
        {tilesFailed && <p className="map-offline">Sem conexão com o mapa de fundo (OpenStreetMap). Mostrando só a divisa do Pará e as cidades com oportunidades.</p>}
        <p className="map-hint">Role o mouse para ampliar · arraste para mover · os nomes das cidades aparecem conforme você se aproxima</p>
      </section>
      <aside className="map-side">
        {selected && <section className="map-panel" aria-live="polite">
          <div className="city-head"><div><h2>{selected.name}</h2><small>{Math.round(selected.km)} km em linha reta de {STORE.name}</small></div><span className="city-score" style={{ background: selected.band.color }}>{selected.score}<small>{selected.band.label}</small></span></div>
          <ScoreBar label="Afinidade com o catálogo" points={selected.parts.fit} max={WEIGHTS.fit} />
          <ScoreBar label="Valor potencial" points={selected.parts.value} max={WEIGHTS.value} />
          <ScoreBar label="Proximidade da loja" points={selected.parts.proximity} max={WEIGHTS.proximity} />
          <p className="city-value">Valor potencial dos itens que combinam: <strong>{selected.potentialValue > 0 ? money.format(selected.potentialValue) : 'não informado'}</strong></p>
          <ul className="city-opps">{selected.opportunities.map((opportunity) => { const deadline = deadlineText(opportunity.sessionAt); return <li key={opportunity.id}>
            <strong>{opportunity.agency}</strong><span>{opportunity.title}</span>
            <span className="city-opp-meta"><em className={`chip chip-${opportunity.relevancia}`}>relevância {opportunity.relevancia} · {opportunity.produtosDistintos} produtos</em><em>{dateFormat.format(new Date(opportunity.sessionAt))} · {deadline.text}</em>{deadline.short && <em className="chip chip-short">prazo curto</em>}</span>
            {opportunity.link && <a href={opportunity.link} target="_blank" rel="noreferrer">Abrir edital no PNCP ↗</a>}
          </li> })}</ul>
          <button type="button" className="map-link-button" onClick={() => onNavigate?.('Radar de Oportunidades')}>Ver todas no Radar</button>
        </section>}
        <section className="map-panel">
          <h2>Ranking de cidades</h2>
          <ol className="city-rank">{cities.map((city) => <li key={city.ibge}><button type="button" className={selected?.ibge === city.ibge ? 'active' : ''} onClick={() => focusCity(city)}><i style={{ background: city.band.color }} /><span>{city.name}</span><b>{city.score}</b></button></li>)}</ol>
          <details className="map-how"><summary>Como o índice é calculado</summary><p>De 0 a 100: {WEIGHTS.fit} pontos pela afinidade (quantos produtos diferentes do seu catálogo aparecem), {WEIGHTS.value} pelo valor potencial dos itens e {WEIGHTS.proximity} pela proximidade de {STORE.name}. A distância é em linha reta, sem considerar estradas ou rios. É uma ajuda para priorizar, não substitui a leitura do edital.</p></details>
          {unresolved.length > 0 && <p className="map-unresolved">Sem localização no mapa: {unresolved.join(', ')}.</p>}
        </section>
      </aside>
    </div>
  </div>
}

export default MapPage
