/**
 * Generate wound care market JSON data with the correct segment hierarchy
 * and India-only geography (6 macro-regions, no state-level data).
 */
const fs = require('fs')
const path = require('path')

const YEARS = Array.from({ length: 13 }, (_, i) => 2021 + i) // 2021-2033
const USD_MN_TO_INR_CR = 8.3 // Convert USD Million to INR Crore (83 INR/USD ÷ 10)

const HIERARCHICAL_SEGMENTS = {
  'By Product Type': {
    'Advanced Wound Dressings': [
      'Standard Bordered Foam Dressings',
      'Standard Non-bordered Foam Dressings',
      'Alginate and Fiber Dressings',
      'Hydrocolloid Dressings',
      'Hydrogel Dressings',
      'Collagen Dressings',
      'Antimicrobial Dressings',
      'Others (Film Dressings & Others)',
    ],
    'Wound Therapy Devices': [
      'Negative Pressure Wound Therapy Systems',
      'Pressure Relief and Offloading Devices',
      'Hyperbaric Oxygen Therapy Equipment',
      'Others (Electrical Stimulation Wound Therapy Devices & Others)',
    ],
    'Biologics and Regenerative Wound Care': [
      'Acellular Skin Substitutes',
      'Growth Factor-based Wound Products',
      'Advanced Topical Wound Healing Agents',
      'Others (Platelet-rich Plasma Products & Others)',
    ],
    'Wound Closure and Adjunctive Products': [
      'Adhesive Wound Closure Products',
      'Sealants and Hemostatic Products',
      'Fixation and Advanced Compression Products',
      'Others (Scar Management Products & Others)',
    ],
    'Wound Cleansing and Debridement Products': [
      'Wound Cleansing Solutions',
      'Wound Irrigation Products',
      'Enzymatic Debridement Products',
      'Others (Mechanical Debridement Products & Others)',
    ],
  },
  'By Wound Type': {
    'Chronic Wounds': [
      'Diabetic Foot Ulcers',
      'Pressure Ulcers',
      'Venous Leg Ulcers',
      'Arterial Ulcers',
      'Others (Non-healing Chronic Wounds & Others)',
    ],
    'Acute Wounds': [
      'Surgical Wounds',
      'Burns',
      'Others (Traumatic Wounds & Others)',
    ],
  },
}

const FLAT_SEGMENTS = {
  'By End User': [
    'Hospitals',
    'Clinics',
    'Homecare Settings',
    'Ambulatory Surgical Centers',
    'Others (Academics and Research Institutes, Rehabilitation Centers & Others)',
  ],
  'By Distribution Channel': [
    'Hospital Pharmacies',
    'Online Pharmacies',
    'Retail Pharmacies',
  ],
}

const REGIONS = [
  'North India',
  'South India',
  'East India',
  'West India',
  'Northeast India',
  'Central India',
]

const REGION_WEIGHTS = {
  'North India': 0.22,
  'South India': 0.28,
  'East India': 0.14,
  'West India': 0.24,
  'Northeast India': 0.04,
  'Central India': 0.08,
}

// Deterministic pseudo-random (mulberry32)
function seededRandom(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function toInrCr(value) {
  return Math.round(value * USD_MN_TO_INR_CR * 10) / 10
}

function generateYearSeries(base2021, growthRate, seed) {
  const rand = seededRandom(seed)
  const series = {}
  let value = base2021 * (0.92 + rand() * 0.16)
  for (const year of YEARS) {
    series[String(year)] = toInrCr(value)
    value *= 1 + growthRate + (rand() - 0.5) * 0.015
  }
  return series
}

function sumYearSeries(seriesList) {
  const result = {}
  for (const year of YEARS) {
    const key = String(year)
    result[key] = Math.round(seriesList.reduce((sum, s) => sum + (s[key] || 0), 0) * 10) / 10
  }
  return result
}

function buildHierarchicalSegmentType(parentMap, geoScale, geoName) {
  const result = {}
  for (const [parent, children] of Object.entries(parentMap)) {
    const childSeries = {}
    const childDataList = []
    children.forEach((child, idx) => {
      const seed = hashString(`${geoName}|${parent}|${child}|${idx}`)
      const base = 80 + (seed % 400) * geoScale
      const growth = 0.07 + (seed % 50) / 1000
      const series = generateYearSeries(base, growth, seed)
      childSeries[child] = series
      childDataList.push(series)
    })
    const parentTotals = sumYearSeries(childDataList)
    result[parent] = { ...parentTotals, ...childSeries }
  }
  return result
}

function buildFlatSegmentType(items, geoScale, geoName, typeName) {
  const result = {}
  items.forEach((item, idx) => {
    const seed = hashString(`${geoName}|${typeName}|${item}|${idx}`)
    const base = 120 + (seed % 350) * geoScale
    const growth = 0.06 + (seed % 60) / 1000
    result[item] = generateYearSeries(base, growth, seed)
  })
  return result
}

function buildByRegion(geoScale, geoName) {
  const result = {}
  REGIONS.forEach((region, idx) => {
    const seed = hashString(`${geoName}|By Region|${region}|${idx}`)
    const weight = REGION_WEIGHTS[region]
    const base = 600 * weight * geoScale + (seed % 100)
    const growth = 0.08 + (seed % 40) / 1000
    result[region] = generateYearSeries(base, growth, seed)
  })
  return result
}

function buildGeoData(geoName, scale) {
  const geo = {}
  for (const [typeName, parentMap] of Object.entries(HIERARCHICAL_SEGMENTS)) {
    geo[typeName] = buildHierarchicalSegmentType(parentMap, scale, geoName)
  }
  for (const [typeName, items] of Object.entries(FLAT_SEGMENTS)) {
    geo[typeName] = buildFlatSegmentType(items, scale, geoName, typeName)
  }
  geo['By Region'] = buildByRegion(scale, geoName)
  return geo
}

function buildSegmentationStructure() {
  const india = {}
  for (const [typeName, parentMap] of Object.entries(HIERARCHICAL_SEGMENTS)) {
    india[typeName] = {}
    for (const [parent, children] of Object.entries(parentMap)) {
      india[typeName][parent] = Object.fromEntries(children.map((c) => [c, {}]))
    }
  }
  for (const [typeName, items] of Object.entries(FLAT_SEGMENTS)) {
    india[typeName] = Object.fromEntries(items.map((item) => [item, {}]))
  }
  india['By Region'] = Object.fromEntries(REGIONS.map((r) => [r, {}]))
  return { India: india }
}

function generateVolumeFromValue(valueData) {
  function convertNode(node, seed) {
    const rand = seededRandom(seed)
    const hasYearData = Object.keys(node).some((k) => /^\d{4}$/.test(k))
    const hasChildren = Object.entries(node).some(
      ([k, v]) => !/^\d{4}$/.test(k) && typeof v === 'object' && v !== null
    )

    if (hasYearData && !hasChildren) {
      const factor = 800 + rand() * 1200
      const result = {}
      for (const [k, v] of Object.entries(node)) {
        result[k] = typeof v === 'number' ? Math.round(v * factor) : v
      }
      return result
    }

    if (hasYearData && hasChildren) {
      const factor = 800 + rand() * 1200
      const result = {}
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'object' && v !== null) {
          result[k] = convertNode(v, hashString(`${seed}|${k}`))
        } else if (typeof v === 'number') {
          result[k] = Math.round(v * factor)
        } else {
          result[k] = v
        }
      }
      return result
    }

    const result = {}
    for (const [k, v] of Object.entries(node)) {
      result[k] =
        typeof v === 'object' && v !== null ? convertNode(v, hashString(`${seed}|${k}`)) : v
    }
    return result
  }

  const volume = {}
  for (const [geo, geoData] of Object.entries(valueData)) {
    volume[geo] = convertNode(geoData, hashString(geo))
  }
  return volume
}

function main() {
  const valueData = { India: buildGeoData('India', 1) }
  REGIONS.forEach((region) => {
    valueData[region] = buildGeoData(region, REGION_WEIGHTS[region] * 3.5)
  })

  const segmentation = buildSegmentationStructure()
  const volumeData = generateVolumeFromValue(valueData)

  const outDir = path.join(__dirname, '..', 'public', 'data')
  fs.writeFileSync(path.join(outDir, 'segmentation_analysis.json'), JSON.stringify(segmentation, null, 2))
  fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2))
  fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2))

  console.log('Generated wound care data:')
  console.log('  Geographies:', Object.keys(valueData).join(', '))
  console.log('  Segment types:', Object.keys(valueData.India).filter((k) => k !== 'By Region').join(', '))
  console.log('  Regions:', REGIONS.join(', '))
}

main()
