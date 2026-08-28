// Export CSV cote client (pas d'endpoint dedie) : les pages admin qui l'utilisent (Commandes,
// Clients) ont deja la liste complete en memoire - inutile de refaire un appel serveur. Separateur
// point-virgule (convention Excel FR, evite le conflit avec les decimales a virgule) + BOM UTF-8
// (sinon les accents s'affichent mal a l'ouverture dans Excel).
function escapeCsvField(value: string): string {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const BOM = String.fromCharCode(0xfeff);

export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(";"));
  const csvContent = BOM + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
