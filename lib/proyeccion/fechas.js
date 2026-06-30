import { hoyArgentina } from "@/lib/format";

export function numeroMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  return y * 12 + m;
}

export function compararMeses(a, b) {
  return numeroMes(a) - numeroMes(b);
}

export function sumarMeses(mes, delta) {
  const [y, m] = mes.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

export function mesActualAR() {
  return hoyArgentina().slice(0, 7);
}

export function rangoMes(mes) {
  const [y, m] = mes.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimoDia).padStart(2, "0")}` };
}
