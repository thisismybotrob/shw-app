// app.js — Shared utilities

function checkAuth() {
  if (sessionStorage.getItem('shw_pin') !== '1234') {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Store quote data in localStorage for cross-page use
function saveQuoteData(key, data) {
  localStorage.setItem('shw_' + key, JSON.stringify(data));
}

function loadQuoteData(key) {
  try { return JSON.parse(localStorage.getItem('shw_' + key)); } catch { return null; }
}

function generatePO(lastName, address) {
  const street = (address || '').match(/^(\d+)/);
  const num = street ? street[1] : '000';
  return `${(lastName || 'NA').toUpperCase()}/${num}`;
}

// Format quote as text for clipboard/email
function formatQuoteText(customer, units, totals) {
  let text = '═══════════════════════════════\n';
  text += '  SEATTLE HOME WINDOWS\n';
  text += '  Window Replacement Quote\n';
  text += '═══════════════════════════════\n\n';
  text += `Customer: ${customer.firstName || ''} ${customer.lastName || ''}\n`;
  text += `Phone: ${customer.phone || ''}\n`;
  text += `Address: ${customer.address || ''}\n`;
  text += `PO#: ${customer.po || ''}\n`;
  text += `Date: ${new Date().toLocaleDateString()}\n\n`;
  text += '───────────────────────────────\n';
  text += 'GLASS UNITS\n';
  text += '───────────────────────────────\n\n';

  totals.lines.forEach((line, i) => {
    text += `Unit ${i + 1}: ${line.location || 'Unlabeled'}\n`;
    text += `  Size: ${formatDimension(line.widthWhole, line.widthFrac)} × ${formatDimension(line.heightWhole, line.heightFrac)}\n`;
    text += `  Glass: ${line.glassType}\n`;
    text += `  Frame: ${line.frameType}\n`;
    if (line.hasGrids) text += `  Grids: ${line.gridColor || ''} ${line.gridPattern || ''}\n`;
    if (line.needsTemplate) text += `  Template: Yes (+$200)\n`;
    text += `  Qty: ${line.qty} × ${formatCurrency(line.unitPrice)} = ${formatCurrency(line.lineTotal)}\n`;
    if (line.notes) text += `  Notes: ${line.notes}\n`;
    text += '\n';
  });

  text += '───────────────────────────────\n';
  text += `Subtotal:  ${formatCurrency(totals.subtotal)}\n`;
  text += `Tax (9.5%): ${formatCurrency(totals.tax)}\n`;
  text += `TOTAL:     ${formatCurrency(totals.total)}\n`;
  text += `\nDeposit (50%): ${formatCurrency(totals.deposit)}\n`;
  text += `Balance Due:   ${formatCurrency(totals.balance)}\n`;
  text += '\n═══════════════════════════════\n';
  text += 'Thank you for choosing\nSeattle Home Windows!\n';
  return text;
}

// Format NW Glass order email
function formatNWGlassOrder(customer, units, totals) {
  let text = `NW Glass Order — ${customer.firstName || ''} ${customer.lastName || ''}\n`;
  text += `PO#: ${customer.po || ''}\n`;
  text += `Date: ${new Date().toLocaleDateString()}\n\n`;

  totals.lines.forEach((line, i) => {
    text += `${i + 1}. ${line.location || 'Unit'}\n`;
    text += `   ${formatDimension(line.widthWhole, line.widthFrac)} W × ${formatDimension(line.heightWhole, line.heightFrac)} H\n`;
    text += `   ${line.glassType} | ${line.frameType}\n`;
    if (line.hasGrids) {
      text += `   Grids: ${line.gridColor || ''} ${line.gridPattern || ''}`;
      if (line.begMeasurements) text += ` | BEG: ${line.begMeasurements}`;
      text += '\n';
    }
    if (line.needsTemplate) text += `   TEMPLATE NEEDED\n`;
    text += `   Qty: ${line.qty}\n`;
    if (line.notes) text += `   Notes: ${line.notes}\n`;
    text += '\n';
  });

  return text;
}
