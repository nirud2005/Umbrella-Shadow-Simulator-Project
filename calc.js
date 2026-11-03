// สูตรคำนวณเงาร่ม (พอร์ตจากแนวคิดเดิม) — ทิศ: 0=เหนือ, 90=ออก, 180=ใต้, 270=ตก
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

const DIRS = ["ทิศเหนือ", "ทิศตะวันออกเฉียงเหนือ", "ทิศตะวันออก", "ทิศตะวันออกเฉียงใต้",
  "ทิศใต้", "ทิศตะวันตกเฉียงใต้", "ทิศตะวันตก", "ทิศตะวันตกเฉียงเหนือ"];

function directionTh(d) {
  return DIRS[Math.floor((((d % 360) + 360) % 360 + 22.5) / 45) % 8];
}

// ลำดับวันในปี (ใช้ UTC กันปัญหา DST)
function dayOfYear(y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1;
}

function solarTime(clockHours, lon, n, stdLon = 105) {
  const b = rad((360 * (n - 81)) / 364);
  const e = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  return { st: clockHours + (4 * (lon - stdLon) + e) / 60, e };
}

// เดคลิเนชันแบบละเอียด: คำนวณจากลองจิจูดสุริยวิถีของดวงอาทิตย์ (Meeus, Astronomical Algorithms บทที่ 25)
// หนึ่งค่าต่อวัน ณ เที่ยงท้องถิ่นของเขตเวลานั้น (สอดคล้องกับขอบเขตที่ถือ δ คงที่ตลอดวัน)
// คลาดเคลื่อนไม่เกินประมาณ 0.01° (สมการ (1) ของใบงานคลาดได้ราว 0.2–0.3°) คืนค่าเป็นเรเดียน
function declinationAccurate(y, m, d, stdLon = 105) {
  const jd = Date.UTC(y, m - 1, d, 12 - stdLon / 15) / 864e5 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = rad(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const om = rad(125.04 - 1934.136 * T);
  const lam = rad(L0 + C - 0.00569 - 0.00478 * Math.sin(om));
  const eps = rad(23.439291 - 0.0130042 * T + 0.00256 * Math.cos(om));
  return Math.asin(Math.sin(eps) * Math.sin(lam));
}

// declMode: "accurate" = δ ตามตำแหน่งจริงของดวงอาทิตย์ (ค่าเริ่มต้น ใช้ในโปรแกรม) | "worksheet" = สมการ (1) ของใบงาน (ใช้ตรวจสูตรเทียบ ref.json)
function calculateShadow(lat, lon, y, m, d, clockHours, R, h, stdLon = 105, declMode = "accurate") {
  const n = dayOfYear(y, m, d);
  const aUmbrella = Math.PI * R * R;
  const { st, e } = solarTime(clockHours, lon, n, stdLon);
  const delta = declMode === "accurate" ? declinationAccurate(y, m, d, stdLon) : rad(23.45 * Math.sin(rad((360 / 365) * (284 + n))));
  const omegaDeg = 15 * (st - 12);
  const phi = rad(lat);

  const sinA = Math.max(-1, Math.min(1,
    Math.sin(delta) * Math.sin(phi) + Math.cos(delta) * Math.cos(phi) * Math.cos(rad(omegaDeg))));
  const alpha = Math.asin(sinA);
  const base = { n, st, e, delta: deg(delta), omega: omegaDeg, alpha: deg(alpha), aUmbrella };

  if (base.alpha <= 0) {
    return { ...base, psiSun: 0, psiShadow: 0, d: 0, xc: 0, yc: 0, aShadow: 0, theta: 90, sunUp: false, dirName: "-" };
  }

  const cosAz = Math.max(-1, Math.min(1,
    (Math.sin(delta) - Math.sin(phi) * sinA) / (Math.cos(phi) * Math.cos(alpha))));
  let az = deg(Math.acos(cosAz));
  if (omegaDeg > 0) az = 360 - az; // บ่าย: ดวงอาทิตย์อยู่ทางตะวันตก

  const dist = h / Math.tan(alpha);
  const psiShadow = (az >= 180 ? az - 180 : az + 180) % 360;
  return {
    ...base, psiSun: az, psiShadow, d: dist,
    xc: -dist * Math.sin(rad(az)), yc: -dist * Math.cos(rad(az)),
    aShadow: aUmbrella, theta: 90 - base.alpha, sunUp: true, dirName: directionTh(psiShadow),
  };
}

if (typeof module !== "undefined") module.exports = { calculateShadow, dayOfYear, declinationAccurate };
