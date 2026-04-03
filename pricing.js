// pricing.js — Seattle Home Windows Pricing Constants
// Update these values when Sergei's spreadsheet changes

const PRICING = {
  glass: {
    'Annealed Clear':      20.06,
    'Annealed Low-E 272':  29.70,
    'Annealed Low-E 366':  39.16,
    'Tempered Clear':      28.78,
    'Tempered Low-E 272':  41.16,
    'Tempered Low-E 366':  55.32,
  },
  grid: 7.40, // per SF add-on (3/16 x 5/8 flat)
  labor: {
    'Vinyl':      207.90,
    'Aluminum':   242.55,
    'Wood':       304.92,
    'Fiberglass': 341.25,
  },
  template: 200.00,
  taxRate: 0.095,
  depositRate: 0.50,
};

const FRACTIONS = [
  { label: '0',     value: 0 },
  { label: '1/16',  value: 1/16 },
  { label: '1/8',   value: 1/8 },
  { label: '3/16',  value: 3/16 },
  { label: '1/4',   value: 1/4 },
  { label: '5/16',  value: 5/16 },
  { label: '3/8',   value: 3/8 },
  { label: '7/16',  value: 7/16 },
  { label: '1/2',   value: 1/2 },
  { label: '9/16',  value: 9/16 },
  { label: '5/8',   value: 5/8 },
  { label: '11/16', value: 11/16 },
  { label: '3/4',   value: 3/4 },
  { label: '13/16', value: 13/16 },
  { label: '7/8',   value: 7/8 },
  { label: '15/16', value: 15/16 },
];

function calcRawDims(widthWhole, widthFrac, heightWhole, heightFrac) {
  const w = (parseInt(widthWhole) || 0) + (parseFloat(widthFrac) || 0);
  const h = (parseInt(heightWhole) || 0) + (parseFloat(heightFrac) || 0);
  return { w, h };
}

function calcOverallDims(widthWhole, widthFrac, heightWhole, heightFrac) {
  const { w, h } = calcRawDims(widthWhole, widthFrac, heightWhole, heightFrac);
  return { width: w > 0 ? Math.ceil(w) : 0, height: h > 0 ? Math.ceil(h) : 0 };
}

function calcSF(widthWhole, widthFrac, heightWhole, heightFrac) {
  const oa = calcOverallDims(widthWhole, widthFrac, heightWhole, heightFrac);
  return (oa.width * oa.height) / 144;
}

function calcUnitPrice(unit) {
  const sf = calcSF(unit.widthWhole, unit.widthFrac, unit.heightWhole, unit.heightFrac);
  const glassRate = PRICING.glass[unit.glassType] || 0;
  const gridCost = unit.hasGrids ? PRICING.grid * sf : 0;
  const laborRate = PRICING.labor[unit.frameType] || 0;
  const templateCost = unit.needsTemplate ? PRICING.template : 0;
  const qty = parseInt(unit.quantity) || 1;
  const unitPrice = (glassRate * sf) + gridCost + laborRate + templateCost;
  console.log('calcUnitPrice →', { sf, glassRate, laborRate, gridCost, unitPrice });
  return { sf, unitPrice, lineTotal: unitPrice * qty, qty };
}

function calcQuoteTotal(units) {
  let subtotal = 0;
  const lines = [];
  units.forEach(u => {
    const calc = calcUnitPrice(u);
    subtotal += calc.lineTotal;
    lines.push({ ...u, ...calc });
  });
  const tax = subtotal * PRICING.taxRate;
  const total = subtotal + tax;
  const deposit = total * PRICING.depositRate;
  const balance = total - deposit;
  return { lines, subtotal, tax, total, deposit, balance };
}

function formatDimension(whole, frac) {
  const w = parseInt(whole) || 0;
  const f = parseFloat(frac) || 0;
  if (f === 0) return `${w}"`;
  const fracLabel = FRACTIONS.find(fr => Math.abs(fr.value - f) < 0.001);
  return `${w} ${fracLabel ? fracLabel.label : f}"`;
}

function formatCurrency(n) {
  return '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
