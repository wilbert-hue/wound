const fs = require('fs');
const path = require('path');

// Years: 2021-2033
const years = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

// India sub-regions with states/UTs
const regions = {
  "North India": ["Delhi", "Haryana", "Punjab", "Himachal Pradesh", "Uttarakhand", "Jammu & Kashmir", "Ladakh", "Chandigarh"],
  "South India": ["Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Kerala", "Puducherry", "Lakshadweep", "Andaman & Nicobar Islands"],
  "West India": ["Maharashtra", "Gujarat", "Rajasthan", "Goa", "Dadra & Nagar Haveli and Daman & Diu"],
  "East India": ["West Bengal", "Odisha", "Bihar", "Jharkhand"],
  "Central India": ["Madhya Pradesh", "Chhattisgarh", "Uttar Pradesh"],
  "Northeast India": ["Assam", "Arunachal Pradesh", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Sikkim", "Tripura"]
};

// Mobile gaming segment definitions with market share splits
const segmentTypes = {
  "By Game Genre": {
    "Action & Shooter Games": 0.18,
    "MOBA Games": 0.12,
    "Role-Playing Games": 0.15,
    "Strategy Games": 0.10,
    "Sports & Racing Games": 0.08,
    "Simulation Games": 0.07,
    "Puzzle & Logic Games": 0.10,
    "Casual & Arcade Games": 0.14,
    "Educational & Word Games": 0.04,
    "Others (Music Games and Card, Board & Casino-Style Games)": 0.02
  },
  "By Revenue Model": {
    "In-App Purchases": 0.55,
    "In-Game Advertising": 0.25,
    "Paid Downloads": 0.10,
    "Subscription-Based Gaming": 0.10
  },
  "By Operating System": {
    "Android": 0.78,
    "iOS": 0.22
  },
  "By Age Group": {
    "Below 18 Years": 0.22,
    "18–24 Years": 0.35,
    "25–34 Years": 0.25,
    "35–44 Years": 0.12,
    "Above 44 Years": 0.06
  },
  "By Gender": {
    "Male": 0.62,
    "Female": 0.36,
    "Other": 0.02
  }
};

// India mobile gaming market ~$2.5B in 2021, growing ~18% CAGR
const indiaBaseValue = 2500;

// Regional base values (USD Million) - share of India total
const regionBaseValues = {
  "North India": 550,
  "South India": 700,
  "West India": 625,
  "East India": 300,
  "Central India": 250,
  "Northeast India": 75
};

// State share within region (raw weights, normalized at runtime)
const stateWeightShares = {
  "North India": { "Delhi": 0.20, "Haryana": 0.15, "Punjab": 0.14, "Himachal Pradesh": 0.06, "Uttarakhand": 0.07, "Jammu & Kashmir": 0.10, "Ladakh": 0.02, "Chandigarh": 0.04 },
  "South India": { "Andhra Pradesh": 0.12, "Telangana": 0.14, "Karnataka": 0.22, "Tamil Nadu": 0.20, "Kerala": 0.10, "Puducherry": 0.03, "Lakshadweep": 0.01, "Andaman & Nicobar Islands": 0.02 },
  "West India": { "Maharashtra": 0.45, "Gujarat": 0.25, "Rajasthan": 0.18, "Goa": 0.05, "Dadra & Nagar Haveli and Daman & Diu": 0.07 },
  "East India": { "West Bengal": 0.35, "Odisha": 0.20, "Bihar": 0.25, "Jharkhand": 0.20 },
  "Central India": { "Madhya Pradesh": 0.30, "Chhattisgarh": 0.15, "Uttar Pradesh": 0.55 },
  "Northeast India": { "Assam": 0.30, "Arunachal Pradesh": 0.05, "Manipur": 0.08, "Meghalaya": 0.10, "Mizoram": 0.06, "Nagaland": 0.08, "Sikkim": 0.05, "Tripura": 0.08 }
};

function normalizeShares(shares) {
  const total = Object.values(shares).reduce((a, b) => a + b, 0);
  const normalized = {};
  for (const [key, val] of Object.entries(shares)) {
    normalized[key] = val / total;
  }
  return normalized;
}

const stateShares = {};
for (const [region, shares] of Object.entries(stateWeightShares)) {
  stateShares[region] = normalizeShares(shares);
}

// Growth rates (CAGR) per region
const regionGrowthRates = {
  "North India": 0.175,
  "South India": 0.195,
  "West India": 0.185,
  "East India": 0.200,
  "Central India": 0.190,
  "Northeast India": 0.210
};

const indiaGrowthRate = 0.185;

// Segment-specific growth multipliers
const segmentGrowthMultipliers = {
  "By Game Genre": {
    "Action & Shooter Games": 1.05,
    "MOBA Games": 1.12,
    "Role-Playing Games": 1.08,
    "Strategy Games": 1.06,
    "Sports & Racing Games": 1.04,
    "Simulation Games": 1.03,
    "Puzzle & Logic Games": 1.02,
    "Casual & Arcade Games": 1.00,
    "Educational & Word Games": 1.15,
    "Others (Music Games and Card, Board & Casino-Style Games)": 0.95
  },
  "By Revenue Model": {
    "In-App Purchases": 1.08,
    "In-Game Advertising": 1.12,
    "Paid Downloads": 0.85,
    "Subscription-Based Gaming": 1.20
  },
  "By Operating System": {
    "Android": 1.02,
    "iOS": 1.10
  },
  "By Age Group": {
    "Below 18 Years": 1.05,
    "18–24 Years": 1.10,
    "25–34 Years": 1.08,
    "35–44 Years": 1.02,
    "Above 44 Years": 0.95
  },
  "By Gender": {
    "Male": 1.03,
    "Female": 1.12,
    "Other": 1.05
  }
};

// Volume: active gamers in millions per USD Million revenue
const volumePerMillionUSD = 8500;

let seed = 42;
function seededRandom() {
  seed = (seed * 16807 + 0) % 2147483647;
  return (seed - 1) / 2147483646;
}

function addNoise(value, noiseLevel = 0.03) {
  return value * (1 + (seededRandom() - 0.5) * 2 * noiseLevel);
}

function roundTo1(val) {
  return Math.round(val * 10) / 10;
}

function roundToInt(val) {
  return Math.round(val);
}

function generateTimeSeries(baseValue, growthRate, roundFn) {
  const series = {};
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const rawValue = baseValue * Math.pow(1 + growthRate, i);
    series[year] = roundFn(addNoise(rawValue));
  }
  return series;
}

function addSegmentData(geoData, baseValue, growthRate, isVolume) {
  const roundFn = isVolume ? roundToInt : roundTo1;
  const multiplier = isVolume ? volumePerMillionUSD : 1;
  const adjustedBase = baseValue * multiplier;

  for (const [segType, segments] of Object.entries(segmentTypes)) {
    geoData[segType] = {};
    for (const [segName, share] of Object.entries(segments)) {
      const segGrowth = growthRate * segmentGrowthMultipliers[segType][segName];
      const segBase = adjustedBase * share;
      geoData[segType][segName] = generateTimeSeries(segBase, segGrowth, roundFn);
    }
  }
}

function generateData(isVolume) {
  const data = {};
  const multiplier = isVolume ? volumePerMillionUSD : 1;
  const indiaBase = indiaBaseValue * multiplier;

  // India (country-level) data
  data["India"] = {};
  addSegmentData(data["India"], indiaBaseValue, indiaGrowthRate, isVolume);

  // By Region hierarchy under India for geography records
  data["India"]["By Region"] = {};

  for (const [regionName, states] of Object.entries(regions)) {
    const regionBase = regionBaseValues[regionName];
    const regionGrowth = regionGrowthRates[regionName];

    // Region-level segment data
    data[regionName] = {};
    addSegmentData(data[regionName], regionBase, regionGrowth, isVolume);

    // By Region nested data for json-processor geography hierarchy
    data["India"]["By Region"][regionName] = {};
    for (const state of states) {
      const sShare = stateShares[regionName][state];
      const stateBase = regionBase * sShare;
      const stateGrowthVariation = 1 + (seededRandom() - 0.5) * 0.06;
      const stateGrowth = regionGrowth * stateGrowthVariation;
      data["India"]["By Region"][regionName][state] = generateTimeSeries(
        stateBase * multiplier,
        stateGrowth,
        isVolume ? roundToInt : roundTo1
      );
    }

    // State-level segment data
    for (const state of states) {
      const sShare = stateShares[regionName][state];
      const stateBase = regionBase * sShare;
      const stateGrowthVariation = 1 + (seededRandom() - 0.5) * 0.04;
      const stateGrowth = regionGrowth * stateGrowthVariation;

      data[state] = {};
      addSegmentData(data[state], stateBase, stateGrowth, isVolume);
    }
  }

  return data;
}

function generateSegmentationAnalysis() {
  const emptyObj = () => ({});

  const segmentStructure = {};
  for (const [segType, segments] of Object.entries(segmentTypes)) {
    segmentStructure[segType] = {};
    for (const segName of Object.keys(segments)) {
      segmentStructure[segType][segName] = emptyObj();
    }
  }

  const byRegion = {};
  for (const [regionName, states] of Object.entries(regions)) {
    byRegion[regionName] = {};
    for (const state of states) {
      byRegion[regionName][state] = emptyObj();
    }
  }

  return {
    India: {
      ...segmentStructure,
      "By Region": byRegion
    }
  };
}

// Generate datasets
seed = 42;
const valueData = generateData(false);
seed = 7777;
const volumeData = generateData(true);
const segmentationData = generateSegmentationAnalysis();

const outDir = path.join(__dirname, 'public', 'data');
fs.writeFileSync(path.join(outDir, 'value.json'), JSON.stringify(valueData, null, 2));
fs.writeFileSync(path.join(outDir, 'volume.json'), JSON.stringify(volumeData, null, 2));
fs.writeFileSync(path.join(outDir, 'segmentation_analysis.json'), JSON.stringify(segmentationData, null, 2));

console.log('Generated value.json, volume.json, and segmentation_analysis.json successfully');
console.log('Value geographies:', Object.keys(valueData).length);
console.log('Segment types:', Object.keys(valueData['India']).filter(k => k !== 'By Region'));
console.log('Regions:', Object.keys(regions));
console.log('Sample - India, By Game Genre:', JSON.stringify(valueData['India']['By Game Genre']['Action & Shooter Games'], null, 2));
