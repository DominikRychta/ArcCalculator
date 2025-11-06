(function () {
  const form = document.getElementById('arcForm');
  const angleInput = document.getElementById('angle');
  const unitSelect = document.getElementById('unit');
  const radiusInput = document.getElementById('radius');
  const msg = document.getElementById('msg');

  const arcLengthEl = document.getElementById('arcLength');
  const chordLengthEl = document.getElementById('chordLength');
  const sectorAreaEl = document.getElementById('sectorArea');
  const angleDegEl = document.getElementById('angleDeg');
  const angleRadEl = document.getElementById('angleRad');

  const svg = document.getElementById('arcSvg');

  function showMessage(text, type = 'danger') {
    msg.innerHTML = `<div class="alert alert-${type} py-1">${text}</div>`;
    setTimeout(() => { msg.innerHTML = ''; }, 3000);
  }

  function format(n) {
    if (!isFinite(n)) return '—';
    return Math.round(n * 100000) / 100000;
  }

  function drawArcSVG(radius, angleRad) {
    // clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // použij viewBox pro přesné rozmístění, ale také fallback na renderované rozměry
    const vb = svg.viewBox && svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    const W = (vb && vb.width) ? vb.width : (rect.width || 800);
    const H = (vb && vb.height) ? vb.height : (rect.height || 480);

    const cx = W / 2;
    const cy = H / 2;

    const margin = 20;
    const maxR = Math.min(W, H) / 2 - margin;
    // pixely na jednotku (cm) — zvýší velikost malých poloměrů pro lepší vizualizaci
    const pixelsPerUnit = 20; // upravte dle potřeby (px na 1 cm)
    const scale = (radius === 0) ? 1 : Math.min(1, maxR / (radius * pixelsPerUnit));
    const rPx = Math.max(8, radius * pixelsPerUnit * scale);

    // background circle for reference
    const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circ.setAttribute('cx', cx);
    circ.setAttribute('cy', cy);
    circ.setAttribute('r', rPx);
    circ.setAttribute('fill', 'none');
    circ.setAttribute('stroke', '#e9ecef');
    circ.setAttribute('stroke-width', '1');
    svg.appendChild(circ);

    // pokud je úhel >= 2π, vykresli celé kruhy (plné otáčky)
    const fullCircles = Math.floor(angleRad / (2 * Math.PI));
    const residual = angleRad % (2 * Math.PI);

    if (fullCircles > 0) {
      const full = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      full.setAttribute('cx', cx);
      full.setAttribute('cy', cy);
      full.setAttribute('r', rPx);
      full.setAttribute('fill', 'none');
      full.setAttribute('stroke', '#0d6efd');
      full.setAttribute('stroke-width', '3');
      full.setAttribute('opacity', '0.25');
      svg.appendChild(full);
      // pro více než jednu otočku stačí naznačit, opacity/dash - necháme jednu, popis je v textu výsledků
    }

    // pokud zbytkový úhel > 0, vykresli ho jako oblouk (centered)
    if (residual > 1e-9) {
      // compute start/end so arc centers horizontally
      const startAngle = -residual / 2;
      const endAngle = startAngle + residual;

      const sx = cx + rPx * Math.cos(startAngle);
      const sy = cy + rPx * Math.sin(startAngle);
      const ex = cx + rPx * Math.cos(endAngle);
      const ey = cy + rPx * Math.sin(endAngle);

      const largeArc = residual > Math.PI ? 1 : 0;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${sx} ${sy} A ${rPx} ${rPx} 0 ${largeArc} 1 ${ex} ${ey}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#0d6efd');
      path.setAttribute('stroke-width', '3');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);

      // draw radius lines for the residual arc
      const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line1.setAttribute('x1', cx);
      line1.setAttribute('y1', cy);
      line1.setAttribute('x2', sx);
      line1.setAttribute('y2', sy);
      line1.setAttribute('stroke', '#6c757d');
      line1.setAttribute('stroke-width', '1');
      svg.appendChild(line1);

      const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line2.setAttribute('x1', cx);
      line2.setAttribute('y1', cy);
      line2.setAttribute('x2', ex);
      line2.setAttribute('y2', ey);
      line2.setAttribute('stroke', '#6c757d');
      line2.setAttribute('stroke-width', '1');
      svg.appendChild(line2);
    } else {
      // pokud žádný zbytek, označ střed pouze a vykresli plný kruh už výše
      const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      centerDot.setAttribute('cx', cx);
      centerDot.setAttribute('cy', cy);
      centerDot.setAttribute('r', 3);
      centerDot.setAttribute('fill', '#212529');
      svg.appendChild(centerDot);
    }
  }

  function compute(angleVal, unit, radius) {
    if (isNaN(angleVal) || isNaN(radius)) {
      showMessage('Zadejte platné číselné hodnoty.', 'danger');
      return;
    }
    if (radius <= 0) {
      showMessage('Poloměr musí být větší než 0.', 'danger');
      return;
    }
    if (angleVal <= 0) {
      showMessage('Úhel musí být větší než 0.', 'danger');
      return;
    }

    const angleRadTotal = (unit === 'deg') ? (angleVal * Math.PI / 180) : angleVal;
    const angleDegTotal = (unit === 'rad') ? (angleVal * 180 / Math.PI) : angleVal;

    const arcLength = radius * angleRadTotal; // s = r * θ

    // Pro výpočet délky tětivy použijeme normalizovaný úhel v rozmezí [0, 2π)
    // a pro tětivu vezmeme menší centrální úhel (<= π), aby sin(...) zůstal kladný.
    let theta = angleRadTotal % (2 * Math.PI);
    if (theta < 0) theta += 2 * Math.PI;
    const chordTheta = (theta > Math.PI) ? (2 * Math.PI - theta) : theta;
    const chordLength = 2 * Math.abs(radius) * Math.sin(chordTheta / 2); // vždy >= 0

    const sectorArea = 0.5 * radius * radius * angleRadTotal; // A = 1/2 r^2 θ

    arcLengthEl.textContent = format(arcLength);
    chordLengthEl.textContent = format(chordLength);
    sectorAreaEl.textContent = format(sectorArea);

    // ošetření výstupů větších než 360°
    const normalizedDeg = angleDegTotal % 360;
    const normalizedRad = angleRadTotal % (2 * Math.PI);

    if (angleDegTotal > 360) {
      angleDegEl.textContent = `${format(angleDegTotal)}° (${format(normalizedDeg)}°)`;
    } else {
      angleDegEl.textContent = `${format(angleDegTotal)}°`;
    }

    if (angleRadTotal > 2 * Math.PI) {
      angleRadEl.textContent = `${format(angleRadTotal)} rad (${format(normalizedRad)} rad)`;
    } else {
      angleRadEl.textContent = `${format(angleRadTotal)} rad`;
    }

    drawArcSVG(radius, angleRadTotal);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const angleVal = parseFloat(angleInput.value);
    const unit = unitSelect.value;
    const radius = parseFloat(radiusInput.value);
    compute(angleVal, unit, radius);
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    form.reset();
    arcLengthEl.textContent = '—';
    chordLengthEl.textContent = '—';
    sectorAreaEl.textContent = '—';
    angleDegEl.textContent = '—';
    angleRadEl.textContent = '—';
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  });

  // demo values
  angleInput.value = 60;
  unitSelect.value = 'deg';
  radiusInput.value = 5;
  // initial render
  compute(60, 'deg', 5);
})();