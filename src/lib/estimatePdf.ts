import { buildSimplePdf } from '@/lib/pdf';

type Estimate = { id: string; created_at?: string; subtotal: number; tax: number; total: number };
type Item = { description: string; qty: number | string; unit_price: number | string; is_optional?: boolean };

type Branding = {
  businessName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companyWebsite?: string;
};

export function estimateToPdfBytes(est: Estimate, items: Item[], jobName?: string, poNumber?: string, branding?: Branding) {
  const lines: string[] = [];
  if (branding) {
    if (branding.businessName) lines.push(branding.businessName);
    const contactBits = [branding.companyEmail, branding.companyPhone, branding.companyWebsite].filter(Boolean).join('  •  ');
    if (contactBits) lines.push(contactBits);
    if (branding.companyAddress) lines.push(String(branding.companyAddress));
    lines.push('');
  }
  if (jobName) lines.push(`Job: ${jobName}`);
  if ((est as any).created_at) {
    const d = new Date((est as any).created_at as string);
    lines.push(`Date: ${d.toLocaleDateString()}`);
  }
  lines.push(`Estimate ID: ${est.id}`);
  if (poNumber) lines.push(`PO Number: ${poNumber}`);
  lines.push('');
  lines.push('Items:');
  lines.push('Description                  Qty    Unit      Amount   Opt');
  lines.push('--------------------------------------------------------------');
  for (const i of items) {
    const qty = Number(i.qty);
    const unit = Number(i.unit_price);
    const amount = qty * unit;
    const desc = (i.description || '').substring(0, 26).padEnd(26, ' ');
    const qtyStr = qty.toFixed(2).padStart(6, ' ');
    const unitStr = ('$' + unit.toFixed(2)).padStart(9, ' ');
    const amtStr = ('$' + amount.toFixed(2)).padStart(9, ' ');
    const optStr = i.is_optional ? 'Yes' : 'No ';
    lines.push(`${desc}  ${qtyStr}  ${unitStr}  ${amtStr}   ${optStr}`);
  }
  lines.push('');
  lines.push(`Subtotal: $${Number(est.subtotal).toFixed(2)}`);
  lines.push(`Tax:      $${Number(est.tax).toFixed(2)}`);
  lines.push(`Total:    $${Number(est.total).toFixed(2)}`);

  const title = 'Estimate';
  return buildSimplePdf(lines, { title });
}
