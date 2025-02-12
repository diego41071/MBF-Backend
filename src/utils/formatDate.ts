/* eslint-disable prettier/prettier */
export default function formatDate(dateString: string): string {
  if (!dateString) return 'No disponible';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Fecha inválida';

  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
}
